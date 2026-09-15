import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkBalance } from '../../src/modules/bank-statements/domain/balance-check';
import type { CanonicalStatement } from '../../src/modules/bank-statements/domain/canonical-statement';
import { normalizeLabel } from '../../src/modules/bank-statements/domain/label-normalization';
import { computeLineState, LINE_STATES } from '../../src/modules/bank-statements/domain/line-state';
import { createCsvAdapter } from '../../src/modules/bank-statements/infrastructure/adapters/csv-adapter';
import {
  BGFI_DESCRIPTOR,
  ECOBANK_DESCRIPTOR,
  LCB_DESCRIPTOR,
  UBA_DESCRIPTOR,
} from '../../src/modules/bank-statements/infrastructure/adapters/csv-descriptors';
import { MT940_ADAPTER } from '../../src/modules/bank-statements/infrastructure/adapters/mt940-adapter';

const fixture = (name: string): Buffer =>
  readFileSync(join(__dirname, '..', 'integration', 'fixtures', name));

describe('bank-statements — normalizeLabel', () => {
  it('retire accents, majuscule et ponctuation', () => {
    expect(normalizeLabel('Virement de M. Jean Mabîala, loyer')).toBe('JEAN MABIALA');
  });

  it('retire les mentions bancaires courantes', () => {
    expect(normalizeLabel('VRST ESPECES PAR SARL ETS KOUMBA')).toBe('ESPECES KOUMBA');
  });

  it('compacte les espaces multiples et coupe', () => {
    expect(normalizeLabel('  RECU   PAIEMENT   loyer  ')).toBe('');
  });

  it('est stable sur une chaîne déjà normalisée', () => {
    expect(normalizeLabel('ONDONGO SARAH')).toBe('ONDONGO SARAH');
  });
});

describe('bank-statements — computeLineState', () => {
  const base = {
    isIgnored: false,
    isMatched: false,
    amount: 1000n,
    matchedAmount: 0n,
    proposedCount: 0,
  };

  it('IGNORED prime sur tout le reste', () => {
    expect(computeLineState({ ...base, isIgnored: true, isMatched: true })).toBe('IGNORED');
  });

  it('MATCHED prime sur PARTIALLY_MATCHED et SUGGESTED', () => {
    expect(
      computeLineState({ ...base, isMatched: true, matchedAmount: 1000n, proposedCount: 3 }),
    ).toBe('MATCHED');
  });

  it('PARTIALLY_MATCHED quand matchedAmount < amount et > 0', () => {
    expect(computeLineState({ ...base, matchedAmount: 400n, proposedCount: 2 })).toBe(
      'PARTIALLY_MATCHED',
    );
  });

  it('SUGGESTED quand au moins une proposition et rien de rapproché', () => {
    expect(computeLineState({ ...base, proposedCount: 1 })).toBe('SUGGESTED');
  });

  it('UNMATCHED par défaut', () => {
    expect(computeLineState(base)).toBe('UNMATCHED');
  });

  it("couvre les cinq états de l'énumération", () => {
    expect(LINE_STATES).toHaveLength(5);
  });
});

describe('bank-statements — checkBalance', () => {
  const statement = (openingBalance: number, closingBalance: number): CanonicalStatement => ({
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    openingBalance,
    closingBalance,
    currency: 'XAF',
    lines: [
      {
        lineNumber: 1,
        direction: 'CREDIT',
        operationDate: '2026-01-05',
        amount: 500000,
        label: 'A',
        raw: {},
      },
      {
        lineNumber: 2,
        direction: 'DEBIT',
        operationDate: '2026-01-10',
        amount: 50000,
        label: 'B',
        raw: {},
      },
    ],
  });

  it('cas équilibré : balanced=true, difference=0', () => {
    const result = checkBalance(statement(1000000, 1450000));
    expect(result).toEqual({ balanced: true, expected: 1450000, actual: 1450000, difference: 0 });
  });

  it('cas déséquilibré : difference = actual - expected', () => {
    const result = checkBalance(statement(1000000, 1500000));
    expect(result.balanced).toBe(false);
    expect(result.expected).toBe(1450000);
    expect(result.actual).toBe(1500000);
    expect(result.difference).toBe(50000);
  });
});

describe('bank-statements — adaptateurs CSV déclaratifs', () => {
  it('BGFI : 3 lignes, montants et sens corrects', () => {
    const adapter = createCsvAdapter(BGFI_DESCRIPTOR);
    const file = fixture('bgfi.csv');
    expect(adapter.detect(file)).toBe(true);
    const statement = adapter.parse(file);
    expect(statement.lines).toHaveLength(3);
    expect(statement.lines[0]).toMatchObject({ direction: 'CREDIT', amount: 150000 });
    expect(statement.lines[1]).toMatchObject({ direction: 'DEBIT', amount: 25000 });
    expect(checkBalance(statement).balanced).toBe(true);
  });

  it('LCB : montant signé unique avec colonne Sens', () => {
    const adapter = createCsvAdapter(LCB_DESCRIPTOR);
    const file = fixture('lcb.csv');
    expect(adapter.detect(file)).toBe(true);
    const statement = adapter.parse(file);
    expect(statement.lines).toHaveLength(2);
    expect(statement.lines[0]).toMatchObject({ direction: 'CREDIT', amount: 220000 });
    expect(statement.lines[1]).toMatchObject({ direction: 'DEBIT', amount: 5000 });
  });

  it('Ecobank : séparateur pipe, deux bandeaux ignorés', () => {
    const adapter = createCsvAdapter(ECOBANK_DESCRIPTOR);
    const file = fixture('ecobank.csv');
    expect(adapter.detect(file)).toBe(true);
    const statement = adapter.parse(file);
    expect(statement.lines).toHaveLength(2);
    expect(statement.lines[0].endToEndReference).toBe('E2E00123');
  });

  it('UBA : solde progressif dérive ouverture et clôture', () => {
    const adapter = createCsvAdapter(UBA_DESCRIPTOR);
    const file = fixture('uba.csv');
    const statement = adapter.parse(file);
    expect(statement.lines).toHaveLength(3);
    expect(statement.openingBalance).toBe(500000);
    expect(statement.closingBalance).toBe(870000);
    expect(checkBalance(statement).balanced).toBe(true);
  });

  it("un adaptateur ne détecte pas l'échantillon d'une autre banque", () => {
    const adapter = createCsvAdapter(BGFI_DESCRIPTOR);
    expect(adapter.detect(fixture('lcb.csv'))).toBe(false);
  });
});

describe('bank-statements — adaptateur MT940', () => {
  it('reconnaît un fichier SWIFT MT940', () => {
    expect(MT940_ADAPTER.detect(fixture('sample.mt940'))).toBe(true);
    expect(MT940_ADAPTER.detect(fixture('bgfi.csv'))).toBe(false);
  });

  it('analyse les blocs :60F:/:61:/:86:/:62F:', () => {
    const statement = MT940_ADAPTER.parse(fixture('sample.mt940'));
    expect(statement.statementReference).toBe('REL202601001');
    expect(statement.openingBalance).toBe(1000000);
    expect(statement.closingBalance).toBe(1380000);
    expect(statement.lines).toHaveLength(2);
    expect(statement.lines[0]).toMatchObject({ direction: 'CREDIT', amount: 400000 });
    expect(statement.lines[0].label).toContain('KOUMBA');
    expect(statement.lines[1]).toMatchObject({ direction: 'DEBIT', amount: 20000 });
    expect(checkBalance(statement).balanced).toBe(true);
  });
});
