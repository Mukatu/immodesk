import { parseIsoDate } from '../../src/modules/leases/domain/calendar';
import {
  computePenalty,
  penaltyPrincipal,
  type PenaltyInvoiceState,
  type PenaltyRuleTerms,
} from '../../src/modules/billing/domain/penalties';

const d = parseIsoDate;

function rule(overrides: Partial<PenaltyRuleTerms>): PenaltyRuleTerms {
  return {
    basis: 'RATE_BPS_PER_DAY',
    rateBps: null,
    flatAmount: null,
    graceDays: 5,
    capAmount: null,
    capRateBps: null,
    maxPeriods: null,
    appliesToCharges: false,
    ...overrides,
  };
}

function state(overrides: Partial<PenaltyInvoiceState> = {}): PenaltyInvoiceState {
  return {
    dueDate: d('2026-09-05'),
    graceUntilDate: d('2026-09-10'),
    rentAmount: 100_000n,
    chargesAmount: 10_000n,
    penaltyAmount: 0n,
    paidAmount: 0n,
    balanceAmount: 110_000n,
    periodsApplied: 0,
    lastPenaltyRunDate: null,
    ...overrides,
  };
}

describe('Pénalités de retard — quatre bases et plafonds', () => {
  it('ne pénalise rien avant la fin de la tolérance, ni un principal nul', () => {
    const perDay = rule({ basis: 'RATE_BPS_PER_DAY', rateBps: 100 });
    expect(computePenalty(perDay, state(), d('2026-09-10'))).toBeNull();
    expect(computePenalty(perDay, state({ balanceAmount: 0n }), d('2026-09-20'))).toBeNull();
  });

  it('RATE_BPS_PER_DAY : une unité par jour écoulé, plafond en montant', () => {
    const perDay = rule({ basis: 'RATE_BPS_PER_DAY', rateBps: 100 });
    const first = computePenalty(perDay, state(), d('2026-09-13'));
    expect(first).toMatchObject({ units: 3, unitAmount: 1_000n, amount: 3_000n });
    const next = computePenalty(
      perDay,
      state({ lastPenaltyRunDate: d('2026-09-13'), penaltyAmount: 3_000n, periodsApplied: 3 }),
      d('2026-09-14'),
    );
    expect(next).toMatchObject({ units: 1, amount: 1_000n });
    const capped = computePenalty({ ...perDay, capAmount: 2_500n }, state(), d('2026-09-13'));
    expect(capped?.amount).toBe(2_500n);
    const exhausted = computePenalty(
      { ...perDay, capAmount: 2_500n },
      state({ penaltyAmount: 2_500n, lastPenaltyRunDate: d('2026-09-13') }),
      d('2026-09-20'),
    );
    expect(exhausted).toBeNull();
  });

  it('RATE_BPS_PER_MONTH : une unité par mois, plafond en points de base', () => {
    const monthly = rule({ basis: 'RATE_BPS_PER_MONTH', rateBps: 500, capRateBps: 1_000 });
    expect(computePenalty(monthly, state(), d('2026-09-11'))).toMatchObject({
      units: 1,
      amount: 5_000n,
    });
    expect(
      computePenalty(monthly, state({ lastPenaltyRunDate: d('2026-09-11') }), d('2026-09-30')),
    ).toBeNull();
    // Plafond : 10 % de 100 000 = 10 000, dont 8 000 déjà facturés.
    const nearCap = computePenalty(
      monthly,
      state({
        lastPenaltyRunDate: d('2026-09-11'),
        penaltyAmount: 8_000n,
        balanceAmount: 118_000n,
      }),
      d('2026-10-11'),
    );
    expect(nearCap?.amount).toBe(2_000n);
  });

  it('FLAT_AMOUNT : une seule fois par facture', () => {
    const flat = rule({ basis: 'FLAT_AMOUNT', flatAmount: 10_000n });
    expect(computePenalty(flat, state(), d('2026-09-11'))?.amount).toBe(10_000n);
    expect(
      computePenalty(flat, state({ penaltyAmount: 10_000n, periodsApplied: 1 }), d('2026-10-30')),
    ).toBeNull();
  });

  it('FLAT_AMOUNT_PER_DAY : forfait journalier borné par maxPeriods', () => {
    const perDay = rule({ basis: 'FLAT_AMOUNT_PER_DAY', flatAmount: 500n, maxPeriods: 5 });
    const result = computePenalty(
      perDay,
      state({ periodsApplied: 3, penaltyAmount: 1_500n, lastPenaltyRunDate: d('2026-09-13') }),
      d('2026-09-17'),
    );
    expect(result).toMatchObject({ units: 2, amount: 1_000n });
  });

  it('ne calcule jamais une pénalité sur une pénalité antérieure', () => {
    // Loyer 100 000 + charges 10 000 + pénalité 5 000 ; 7 000 payés couvrent
    // d'abord la pénalité (5 000) puis 2 000 de charges.
    const partial = state({ penaltyAmount: 5_000n, paidAmount: 7_000n, balanceAmount: 108_000n });
    expect(penaltyPrincipal(partial, false)).toBe(100_000n);
    expect(penaltyPrincipal(partial, true)).toBe(108_000n);
    const penaltyUnpaid = state({
      penaltyAmount: 5_000n,
      paidAmount: 3_000n,
      balanceAmount: 112_000n,
    });
    expect(penaltyPrincipal(penaltyUnpaid, true)).toBe(110_000n);
  });
});
