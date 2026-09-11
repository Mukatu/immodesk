import { DomainError } from '../../src/shared/errors/domain-error';
import { businessToday, monthBounds } from '../../src/shared/time/business-date';
import {
  DEFAULT_OPERATIONAL_SETTINGS,
  mergeOperationalSettings,
  readOperationalSettings,
} from '../../src/shared/settings/operational-settings';
import { parseIsoDate, toIsoDate } from '../../src/modules/leases/domain/calendar';
import { prorata } from '../../src/modules/leases/domain/prorata';
import {
  billingPeriods,
  dueDateOf,
  periodAmount,
  type LeaseBillingTerms,
} from '../../src/modules/billing/domain/billing-periods';
import {
  assertInvoiceCancellable,
  assertInvoiceEditable,
  canTransitionInvoice,
  INVOICE_STATUSES,
  INVOICE_TRANSITIONS,
  settlementStatus,
} from '../../src/modules/billing/domain/invoice-status';
import {
  bucketOf,
  computeLineAmount,
  computeTotals,
  milliToDecimalString,
} from '../../src/modules/billing/domain/invoice-lines';
import {
  cashReceiptPrefix,
  collectorShortCode,
  formatSequenceNumber,
  organizationShortCode,
  SEQUENCE_FORMATS,
  sequencePeriod,
} from '../../src/modules/numbering/domain/sequence-kind';

const d = parseIsoDate;
const iso = (dates: Date[]) => dates.map(toIsoDate);

function terms(overrides: Partial<LeaseBillingTerms> = {}): LeaseBillingTerms {
  return {
    startDate: d('2026-09-01'),
    endDate: null,
    terminationDate: null,
    rentPeriod: 'MONTHLY',
    paymentDueDay: 5,
    graceDays: 5,
    ...overrides,
  };
}

describe('Machine à états de la facture', () => {
  it('éprouve les 36 couples (from, to) contre la table déclarative', () => {
    let checked = 0;
    for (const from of INVOICE_STATUSES) {
      for (const to of INVOICE_STATUSES) {
        expect(canTransitionInvoice(from, to)).toBe(INVOICE_TRANSITIONS[from].includes(to));
        checked += 1;
      }
    }
    expect(checked).toBe(36);
    expect(INVOICE_TRANSITIONS.CANCELLED).toEqual([]);
    expect(canTransitionInvoice('PARTIALLY_PAID', 'CANCELLED')).toBe(false);
    expect(canTransitionInvoice('PAID', 'CANCELLED')).toBe(false);
  });

  it('refuse d’annuler une facture encaissée, et de modifier une facture émise', () => {
    expect(() => assertInvoiceCancellable('ISSUED', 1n)).toThrow(DomainError);
    expect(() => assertInvoiceCancellable('ISSUED', 0n)).not.toThrow();
    expect(() => assertInvoiceCancellable('PAID', 0n)).toThrow(DomainError);
    expect(() => assertInvoiceEditable('ISSUED')).toThrow(DomainError);
    expect(() => assertInvoiceEditable('DRAFT')).not.toThrow();
  });

  it('dérive le statut après encaissement ou contre-passation', () => {
    const base = { totalAmount: 160_000n, graceUntilDate: d('2026-09-10'), today: d('2026-09-08') };
    expect(settlementStatus({ ...base, current: 'ISSUED', paidAmount: 100_000n })).toBe(
      'PARTIALLY_PAID',
    );
    expect(settlementStatus({ ...base, current: 'PARTIALLY_PAID', paidAmount: 160_000n })).toBe(
      'PAID',
    );
    expect(settlementStatus({ ...base, current: 'PAID', paidAmount: 0n })).toBe('ISSUED');
    expect(
      settlementStatus({ ...base, current: 'PAID', paidAmount: 0n, today: d('2026-09-11') }),
    ).toBe('OVERDUE');
    expect(settlementStatus({ ...base, current: 'OVERDUE', paidAmount: 50_000n })).toBe(
      'PARTIALLY_PAID',
    );
    expect(settlementStatus({ ...base, current: 'DRAFT', paidAmount: 0n })).toBe('DRAFT');
  });
});

describe('Périodes et échéances', () => {
  it('découpe en mois civils avec prorata d’entrée au jour près', () => {
    const periods = billingPeriods(terms({ startDate: d('2026-03-12') }), d('2026-05-31'));
    expect(iso(periods.map((p) => p.periodStart))).toEqual([
      '2026-03-12',
      '2026-04-01',
      '2026-05-01',
    ]);
    expect(iso(periods.map((p) => p.periodEnd))).toEqual([
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
    expect(periods[0].isPartial).toBe(true);
    expect(periods[1].isPartial).toBe(false);
    // Exemple de l'architecture (§ 7.5) : 120 000 × 20 / 31 = 77 419.
    expect(periodAmount(120_000n, periods[0], 'MONTHLY')).toBe(77_419n);
    expect(periodAmount(120_000n, periods[1], 'MONTHLY')).toBe(120_000n);
  });

  it('respecte les mois courts : février à 28 et 29 jours', () => {
    const feb = billingPeriods(terms({ startDate: d('2026-02-15') }), d('2026-02-28'))[0];
    expect(toIsoDate(feb.periodEnd)).toBe('2026-02-28');
    expect(periodAmount(140_000n, feb, 'MONTHLY')).toBe(70_000n);
    const leap = billingPeriods(terms({ startDate: d('2028-02-15') }), d('2028-02-29'))[0];
    expect(toIsoDate(leap.periodEnd)).toBe('2028-02-29');
    expect(periodAmount(145_000n, leap, 'MONTHLY')).toBe(
      prorata(145_000n, d('2028-02-15'), d('2028-02-29')),
    );
  });

  it('borne le jour d’échéance et ne précède jamais le premier jour facturé', () => {
    expect(toIsoDate(dueDateOf(d('2026-02-01'), 31, 5).dueDate)).toBe('2026-02-28');
    const entry = dueDateOf(d('2026-03-12'), 5, 5);
    expect(toIsoDate(entry.dueDate)).toBe('2026-03-12');
    expect(toIsoDate(entry.graceUntilDate)).toBe('2026-03-17');
    const normal = dueDateOf(d('2026-04-01'), 5, 10);
    expect(toIsoDate(normal.dueDate)).toBe('2026-04-05');
    expect(toIsoDate(normal.graceUntilDate)).toBe('2026-04-15');
  });

  it('aligne les trimestres sur le mois d’entrée et proratise la dernière période', () => {
    const periods = billingPeriods(
      terms({ rentPeriod: 'QUARTERLY', startDate: d('2026-02-10'), endDate: d('2026-09-15') }),
      d('2026-12-31'),
    );
    expect(iso(periods.map((p) => p.periodStart))).toEqual([
      '2026-02-10',
      '2026-05-01',
      '2026-08-01',
    ]);
    expect(iso(periods.map((p) => p.periodEnd))).toEqual([
      '2026-04-30',
      '2026-07-31',
      '2026-09-15',
    ]);
    expect(periodAmount(300_000n, periods[1], 'QUARTERLY')).toBe(300_000n);
    // 1er août → 15 septembre = 1,5 mois : 150 000 d'un trimestre de 300 000.
    expect(periodAmount(300_000n, periods[2], 'QUARTERLY')).toBe(150_000n);
  });

  it('s’arrête à la date d’effet de résiliation et ne facture rien au-delà', () => {
    const periods = billingPeriods(
      terms({ startDate: d('2026-01-01'), terminationDate: d('2026-06-09') }),
      d('2026-12-31'),
    );
    expect(periods).toHaveLength(6);
    expect(toIsoDate(periods[5].periodEnd)).toBe('2026-06-09');
    expect(periodAmount(120_000n, periods[5], 'MONTHLY')).toBe(36_000n);
  });

  it('fusionne une période d’un seul jour avec sa voisine', () => {
    const periods = billingPeriods(terms({ startDate: d('2026-08-31') }), d('2026-09-30'));
    expect(periods).toHaveLength(1);
    expect(toIsoDate(periods[0].periodStart)).toBe('2026-08-31');
    expect(toIsoDate(periods[0].periodEnd)).toBe('2026-09-30');
    const tail = billingPeriods(
      terms({ startDate: d('2026-01-01'), endDate: d('2026-03-01') }),
      d('2026-12-31'),
    );
    expect(iso(tail.map((p) => p.periodEnd))).toEqual(['2026-01-31', '2026-03-01']);
  });
});

describe('Lignes et totaux de facture', () => {
  it('calcule quantité décimale, arrondi et TVA sans flottant', () => {
    const line = computeLineAmount({ quantity: 1.5, unitPriceAmount: 15_001n, vatRateBps: 1_890 });
    expect(line.quantityMilli).toBe(1_500n);
    expect(line.amount).toBe(22_502n);
    expect(line.vatAmount).toBe(4_253n);
    expect(milliToDecimalString(line.quantityMilli)).toBe('1.500');
    expect(() => computeLineAmount({ quantity: 1.0005, unitPriceAmount: 1n })).toThrow(DomainError);
  });

  it('cumule les rubriques : total = loyer + charges + pénalités + autres − remises', () => {
    expect(bucketOf('WATER_CHARGE', false)).toBe('charges');
    expect(bucketOf('OTHER', true)).toBe('discount');
    const totals = computeTotals([
      { lineType: 'RENT', isCredit: false, amount: 150_000n, vatAmount: 0n },
      { lineType: 'SERVICE_CHARGE', isCredit: false, amount: 10_000n, vatAmount: 0n },
      { lineType: 'PENALTY', isCredit: false, amount: 1_500n, vatAmount: 0n },
      { lineType: 'REPAIR_REBILL', isCredit: false, amount: 5_000n, vatAmount: 0n },
      { lineType: 'DISCOUNT', isCredit: true, amount: 6_500n, vatAmount: 0n },
    ]);
    expect(totals).toEqual({
      rentAmount: 150_000n,
      chargesAmount: 10_000n,
      penaltyAmount: 1_500n,
      otherAmount: 5_000n,
      discountAmount: 6_500n,
      totalAmount: 160_000n,
    });
    expect(() =>
      computeTotals([{ lineType: 'DISCOUNT', isCredit: true, amount: 1n, vatAmount: 0n }]),
    ).toThrow(DomainError);
  });
});

describe('Numérotation, date métier et paramètres', () => {
  it('formate les numéros LOY, QUI, PAY, REV et CASH', () => {
    expect(formatSequenceNumber('LOY', '202609', 42n, 5)).toBe('LOY-202609-00042');
    expect(formatSequenceNumber('QUI', sequencePeriod('MONTHLY', d('2026-09-30')), 7n, 5)).toBe(
      'QUI-202609-00007',
    );
    expect(SEQUENCE_FORMATS.CASH_RECEIPT.scope).toBe('CONTINUOUS');
    expect(organizationShortCode('agence-mpila-immo')).toBe('AMI');
    expect(organizationShortCode('x')).toBe('XORG');
    expect(collectorShortCode('0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b')).toBe('3F4A5B');
    const prefix = cashReceiptPrefix('agence-mpila-immo', '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b');
    expect(formatSequenceNumber(prefix, '', 12n, 6)).toBe('CASH-AMI-3F4A5B-000012');
  });

  it('raisonne en jour civil de Brazzaville (UTC+1)', () => {
    expect(toIsoDate(businessToday(new Date('2026-09-04T23:30:00Z')))).toBe('2026-09-05');
    expect(toIsoDate(businessToday(new Date('2026-09-04T22:59:00Z')))).toBe('2026-09-04');
    expect(monthBounds('2026-02')?.end.toISOString().slice(0, 10)).toBe('2026-02-28');
    expect(monthBounds('2026-13')).toBeNull();
  });

  it('lit les paramètres avec leurs défauts et fusionne sans rien effacer', () => {
    expect(readOperationalSettings({})).toEqual(DEFAULT_OPERATIONAL_SETTINGS);
    const merged = mergeOperationalSettings(
      { contractTemplate: { title: 'x' }, billing: { generateDaysBefore: 7 } },
      { billing: { applyPenalties: true }, messaging: { receiptChannelOrder: ['SMS'] } },
    );
    expect(merged.contractTemplate).toEqual({ title: 'x' });
    const read = readOperationalSettings(merged);
    expect(read.billing.generateDaysBefore).toBe(7);
    expect(read.billing.applyPenalties).toBe(true);
    expect(read.messaging.receiptChannelOrder).toEqual(['SMS']);
    expect(
      readOperationalSettings({ messaging: { receiptChannelOrder: ['FAX'] } }).messaging
        .receiptChannelOrder,
    ).toEqual(['WHATSAPP', 'SMS']);
  });
});
