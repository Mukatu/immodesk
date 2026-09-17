import { simulatePenalty, type PenaltyRuleTerms } from '../../src/modules/billing/domain/penalties';

/**
 * `simulatePenalty` (phase 9, `POST /penalty-rules/{id}/simulate`) ne fait
 * que traduire `{ balanceAmount, daysOverdue }` en un état de facture pour
 * `computePenalty` (phase 3, inchangé) : ces tests figent le comportement du
 * seul code neuf, pas le calcul déjà couvert par `test/unit/penalties.spec.ts`.
 */
function rule(overrides: Partial<PenaltyRuleTerms> = {}): PenaltyRuleTerms {
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

describe('simulatePenalty — simulation sans écriture', () => {
  it('rend un montant nul avant la fin de la tolérance', () => {
    const result = simulatePenalty(rule({ basis: 'RATE_BPS_PER_DAY', rateBps: 100 }), 100_000n, 3);
    expect(result).toEqual({ penaltyAmount: 0n, cappedBy: null, periods: 0 });
  });

  it('RATE_BPS_PER_DAY : même montant que computePenalty pour un retard donné', () => {
    // 100 000 × 1 % × 8 jours au-delà des 5 jours de tolérance = 8 000.
    const result = simulatePenalty(rule({ basis: 'RATE_BPS_PER_DAY', rateBps: 100 }), 100_000n, 13);
    expect(result.penaltyAmount).toBe(8_000n);
    expect(result.periods).toBe(8);
    expect(result.cappedBy).toBeNull();
  });

  it('signale un plafonnement en montant absolu', () => {
    const result = simulatePenalty(
      rule({ basis: 'RATE_BPS_PER_DAY', rateBps: 100, capAmount: 3_000n }),
      100_000n,
      13,
    );
    expect(result.penaltyAmount).toBe(3_000n);
    expect(result.cappedBy).toBe('AMOUNT');
  });

  it('signale un plafonnement en pourcentage du solde', () => {
    const result = simulatePenalty(
      rule({ basis: 'RATE_BPS_PER_MONTH', rateBps: 2_000, capRateBps: 500 }),
      100_000n,
      40,
    );
    // Plafond : 5 % de 100 000 = 5 000, très inférieur au taux nominal (20 %/mois).
    expect(result.penaltyAmount).toBe(5_000n);
    expect(result.cappedBy).toBe('RATE');
  });

  it('signale un plafonnement en nombre de périodes', () => {
    const result = simulatePenalty(
      rule({ basis: 'FLAT_AMOUNT_PER_DAY', flatAmount: 500n, maxPeriods: 3 }),
      100_000n,
      20,
    );
    expect(result.periods).toBe(3);
    expect(result.penaltyAmount).toBe(1_500n);
    expect(result.cappedBy).toBe('PERIODS');
  });

  it('FLAT_AMOUNT : une seule fois, jamais de plafond mentionné à tort', () => {
    const result = simulatePenalty(
      rule({ basis: 'FLAT_AMOUNT', flatAmount: 10_000n }),
      50_000n,
      10,
    );
    expect(result.penaltyAmount).toBe(10_000n);
    expect(result.periods).toBe(1);
  });
});
