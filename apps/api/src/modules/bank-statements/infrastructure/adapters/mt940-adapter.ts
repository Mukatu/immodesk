import type {
  BankStatementAdapter,
  CanonicalStatement,
  CanonicalStatementLine,
} from '../../domain/canonical-statement';

interface Mt940Field {
  tag: string;
  value: string;
}

interface Mt940Balance {
  mark: 'C' | 'D';
  date: string;
  currency: string;
  amount: number;
}

/**
 * Adaptateur MT940 (SWIFT), formats `:20:`/`:25:`/`:28C:`/`:60F:`/`:62F:`/
 * `:61:`/`:86:`. Simplification déclarative assumée : le sous-libellé
 * structuré de `:86:` (souvent `?00…?20…`) n'est PAS décodé champ par champ —
 * le texte est repris tel quel comme libellé brut, ce qui suffit au
 * rapprochement (`normalizeLabel` fera le tri) et reste fidèle à l'esprit
 * « un descripteur, pas de code » du CSV : ici, aucune variante bancaire du
 * format `:86:` ne justifierait la complexité d'un décodage par sous-champs.
 */
function splitFields(file: Buffer): Mt940Field[] {
  const text = file.toString('utf8');
  const rawLines = text.split(/\r\n|\r|\n/);
  const fields: Mt940Field[] = [];
  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (line.length === 0 || line === '-') continue;
    const match = line.match(/^:(\d{2}[A-Z]?):(.*)$/);
    if (match) {
      fields.push({ tag: match[1], value: match[2] });
    } else if (fields.length > 0) {
      fields[fields.length - 1].value += ` ${line}`;
    }
  }
  return fields;
}

function parseBalance(value: string): Mt940Balance | null {
  const match = value.match(/^([CD])(\d{6})([A-Z]{3})([0-9]+(?:,[0-9]{1,2})?)$/);
  if (!match) return null;
  const [, mark, date, currency, amountRaw] = match;
  return {
    mark: mark as 'C' | 'D',
    date: toIsoDate(date),
    currency,
    amount: parseMt940Amount(amountRaw),
  };
}

function toIsoDate(yymmdd: string): string {
  const year = 2000 + parseInt(yymmdd.slice(0, 2), 10);
  const month = yymmdd.slice(2, 4);
  const day = yymmdd.slice(4, 6);
  return `${year}-${month}-${day}`;
}

function parseMt940Amount(raw: string): number {
  const integerPart = raw.split(',')[0].replace(/[^\d]/g, '');
  return integerPart === '' ? 0 : parseInt(integerPart, 10);
}

/** `:61:` — mouvement. Format retenu : `YYMMDD` + `C|D` + montant + code (4) + référence [`//`banque]. */
function parseMovement(value: string, lineNumber: number): CanonicalStatementLine {
  const match = value.match(
    /^(\d{6})([CD])([0-9]+(?:,[0-9]{1,2})?)([A-Z]{4})([^/]*)(?:\/\/(.*))?$/,
  );
  if (!match) {
    throw new Error(`MT940 : ligne :61: illisible (position ${lineNumber}) : "${value}".`);
  }
  const [, date, mark, amountRaw, , reference, bankReference] = match;
  return {
    lineNumber,
    direction: mark === 'C' ? 'CREDIT' : 'DEBIT',
    operationDate: toIsoDate(date),
    amount: parseMt940Amount(amountRaw),
    label: '',
    bankReference: bankReference?.trim() || undefined,
    endToEndReference: reference?.trim() || undefined,
    raw: { field61: value },
  };
}

function tryBuildStatement(file: Buffer): CanonicalStatement {
  const fields = splitFields(file);
  let statementReference: string | undefined;
  let opening: Mt940Balance | null = null;
  let closing: Mt940Balance | null = null;
  const lines: CanonicalStatementLine[] = [];

  for (const field of fields) {
    if (field.tag === '20') {
      statementReference = field.value.trim();
    } else if (field.tag === '60F' || field.tag === '60M') {
      opening = parseBalance(field.value.trim());
    } else if (field.tag === '62F' || field.tag === '62M') {
      closing = parseBalance(field.value.trim());
    } else if (field.tag === '61') {
      lines.push(parseMovement(field.value.trim(), lines.length + 1));
    } else if (field.tag === '86') {
      const last = lines[lines.length - 1];
      if (last) {
        last.label = field.value.trim();
        (last.raw as Record<string, unknown>).field86 = field.value.trim();
      }
    }
  }

  if (!opening || !closing) {
    throw new Error('MT940 : solde d’ouverture (:60F:) ou de clôture (:62F:) absent.');
  }
  const dates = lines.map((l) => l.operationDate).sort();
  return {
    statementReference,
    periodStart: dates[0] ?? opening.date,
    periodEnd: dates[dates.length - 1] ?? closing.date,
    openingBalance: opening.mark === 'D' ? -opening.amount : opening.amount,
    closingBalance: closing.mark === 'D' ? -closing.amount : closing.amount,
    // Le type canonique fige `currency` à `'XAF'`, mais la devise RÉELLEMENT
    // lue dans `:60F:` est conservée au runtime (cast) : c'est ce qui permet
    // au contrôle défensif du service (`statement.currency !== 'XAF'`) de
    // détecter un relevé MT940 exporté dans une autre devise.
    currency: opening.currency as CanonicalStatement['currency'],
    lines,
  };
}

export const MT940_ADAPTER: BankStatementAdapter = {
  code: 'MT940',
  label: 'Relevé SWIFT MT940',
  format: 'MT940',

  detect(file: Buffer): boolean {
    try {
      const fields = splitFields(file);
      return fields.some((f) => f.tag === '20') && fields.some((f) => f.tag === '61');
    } catch {
      return false;
    }
  },

  parse(file: Buffer): CanonicalStatement {
    return tryBuildStatement(file);
  },
};
