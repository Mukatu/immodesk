import { foldSearchText } from '../../../../shared/search/search-text';
import type {
  BankStatementAdapter,
  CanonicalStatement,
  CanonicalStatementLine,
} from '../../domain/canonical-statement';
import type { CsvBankDescriptor, CsvColumnMapping } from './csv-descriptors';

/** Découpe une ligne CSV en respectant les champs entre guillemets doubles. */
export function splitCsvLine(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
}

function headerIndex(headerRow: string[], columnName: string | undefined): number | null {
  if (!columnName) return null;
  const target = foldSearchText(columnName);
  const index = headerRow.findIndex((cell) => foldSearchText(cell) === target);
  return index >= 0 ? index : null;
}

interface ResolvedColumns {
  operationDate: number;
  label: number;
  valueDate: number | null;
  debit: number | null;
  credit: number | null;
  amount: number | null;
  direction: number | null;
  balance: number | null;
  reference: number | null;
  endToEndReference: number | null;
}

/** Résout la position de chaque colonne mappée, ou `null` si l'en-tête ne correspond pas. */
function resolveColumns(headerRow: string[], columns: CsvColumnMapping): ResolvedColumns | null {
  const operationDate = headerIndex(headerRow, columns.operationDate);
  const label = headerIndex(headerRow, columns.label);
  if (operationDate === null || label === null) return null;
  const hasAmountSource =
    (columns.debit || columns.credit) !== undefined || columns.amount !== undefined;
  if (!hasAmountSource) return null;
  if (columns.debit && headerIndex(headerRow, columns.debit) === null) return null;
  if (columns.credit && headerIndex(headerRow, columns.credit) === null) return null;
  if (columns.amount && headerIndex(headerRow, columns.amount) === null) return null;
  return {
    operationDate,
    valueDate: headerIndex(headerRow, columns.valueDate),
    label,
    debit: headerIndex(headerRow, columns.debit),
    credit: headerIndex(headerRow, columns.credit),
    amount: headerIndex(headerRow, columns.amount),
    direction: headerIndex(headerRow, columns.direction),
    balance: headerIndex(headerRow, columns.balance),
    reference: headerIndex(headerRow, columns.reference),
    endToEndReference: headerIndex(headerRow, columns.endToEndReference),
  };
}

/** `"12 500"`, `"12,500"`, `"-1 250,00"` → entier XAF (positif ou négatif). */
function parseAmount(raw: string | undefined): number {
  const cleaned = (raw ?? '').replace(/[^\d-]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  return parseInt(cleaned, 10);
}

function parseCsvDate(raw: string, format: CsvBankDescriptor['dateFormat']): string {
  const trimmed = (raw ?? '').trim();
  if (format === 'YYYY-MM-DD') return trimmed.slice(0, 10);
  const [day, month, year] = trimmed.split(/[/\-.]/);
  return `${year}-${(month ?? '').padStart(2, '0')}-${(day ?? '').padStart(2, '0')}`;
}

/** Ligne d'en-tête + lignes de données, après retrait du bandeau et des lignes vides. */
function readRows(file: Buffer, descriptor: CsvBankDescriptor): string[][] {
  const text = file.toString(descriptor.encoding);
  const rawLines = splitLines(text).slice(descriptor.headerLinesToSkip);
  return rawLines.map((line) => splitCsvLine(line, descriptor.separator));
}

/**
 * Fabrique d'adaptateur CSV, pilotée entièrement par un descripteur : aucune
 * logique spécifique à une banque n'est écrite ici. `detect()` s'appuie
 * uniquement sur le contenu (aucun nom de fichier n'est disponible côté
 * `BankStatementAdapter`) : l'en-tête doit porter les noms de colonnes
 * attendus par le descripteur.
 */
export function createCsvAdapter(descriptor: CsvBankDescriptor): BankStatementAdapter {
  return {
    code: descriptor.code,
    label: descriptor.label,
    format: 'CSV',

    detect(file: Buffer): boolean {
      try {
        const rows = readRows(file, descriptor);
        if (rows.length < 1) return false;
        return resolveColumns(rows[0], descriptor.columns) !== null;
      } catch {
        return false;
      }
    },

    parse(file: Buffer): CanonicalStatement {
      const rows = readRows(file, descriptor);
      if (rows.length < 1) {
        throw new Error(`CSV ${descriptor.code} : fichier sans ligne d'en-tête.`);
      }
      const [headerRow, ...dataRows] = rows;
      const columns = resolveColumns(headerRow, descriptor.columns);
      if (!columns) {
        throw new Error(`CSV ${descriptor.code} : en-tête inattendu.`);
      }

      const lines: CanonicalStatementLine[] = [];
      let lineNumber = 0;
      let runningOpening: number | null = null;
      let runningClosing = 0;

      for (const row of dataRows) {
        if (row.every((cell) => cell === '')) continue;
        lineNumber += 1;
        const raw: Record<string, unknown> = {};
        headerRow.forEach((name, index) => (raw[name] = row[index] ?? ''));

        let direction: 'CREDIT' | 'DEBIT';
        let amount: number;
        if (descriptor.amountSign === 'separate-columns') {
          const debit = columns.debit !== null ? parseAmount(row[columns.debit]) : 0;
          const credit = columns.credit !== null ? parseAmount(row[columns.credit]) : 0;
          if (Math.abs(credit) >= Math.abs(debit)) {
            direction = 'CREDIT';
            amount = Math.abs(credit);
          } else {
            direction = 'DEBIT';
            amount = Math.abs(debit);
          }
        } else {
          const signed = columns.amount !== null ? parseAmount(row[columns.amount]) : 0;
          const explicitDirection =
            columns.direction !== null ? (row[columns.direction] ?? '').toUpperCase() : '';
          if (explicitDirection.startsWith('D')) direction = 'DEBIT';
          else if (explicitDirection.startsWith('C')) direction = 'CREDIT';
          else direction = signed < 0 ? 'DEBIT' : 'CREDIT';
          amount = Math.abs(signed);
        }

        const balance = columns.balance !== null ? parseAmount(row[columns.balance]) : undefined;
        if (balance !== undefined) {
          if (runningOpening === null) {
            runningOpening = direction === 'CREDIT' ? balance - amount : balance + amount;
          }
          runningClosing = balance;
        }

        lines.push({
          lineNumber,
          direction,
          operationDate: parseCsvDate(row[columns.operationDate], descriptor.dateFormat),
          valueDate:
            columns.valueDate !== null
              ? parseCsvDate(row[columns.valueDate], descriptor.dateFormat)
              : undefined,
          amount,
          label: row[columns.label] ?? '',
          bankReference:
            columns.reference !== null ? row[columns.reference] || undefined : undefined,
          endToEndReference:
            columns.endToEndReference !== null
              ? row[columns.endToEndReference] || undefined
              : undefined,
          runningBalance: balance,
          raw,
        });
      }

      const totalCredit = lines
        .filter((l) => l.direction === 'CREDIT')
        .reduce((sum, l) => sum + l.amount, 0);
      const totalDebit = lines
        .filter((l) => l.direction === 'DEBIT')
        .reduce((sum, l) => sum + l.amount, 0);
      const openingBalance = runningOpening ?? 0;
      const closingBalance =
        columns.balance !== null ? runningClosing : openingBalance + totalCredit - totalDebit;
      const dates = lines.map((l) => l.operationDate).sort();

      return {
        periodStart: dates[0] ?? new Date().toISOString().slice(0, 10),
        periodEnd: dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10),
        openingBalance,
        closingBalance,
        currency: 'XAF',
        lines,
      };
    },
  };
}
