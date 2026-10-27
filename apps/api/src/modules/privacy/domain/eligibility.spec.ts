import { evaluateEligibility, monthsSince, type EligibilityFacts } from './eligibility';

const NOW = new Date('2026-09-23T00:00:00Z');

function facts(overrides: Partial<EligibilityFacts> = {}): EligibilityFacts {
  return {
    isSelfLandlord: false,
    hasActiveOrNoticeLease: false,
    hasNonZeroBalance: false,
    hasHeldDeposit: false,
    lastLeaseClosedAt: null,
    ...overrides,
  };
}

describe('evaluateEligibility', () => {
  it('un tiers sans aucun bail est éligible', () => {
    const verdict = evaluateEligibility(facts(), 60, NOW);
    expect(verdict.eligible).toBe(true);
    expect(verdict.blockingReasons).toEqual([]);
  });

  it('refuse le bailleur self de l’organisation', () => {
    const verdict = evaluateEligibility(facts({ isSelfLandlord: true }), 60, NOW);
    expect(verdict.eligible).toBe(false);
    expect(verdict.blockingReasons).toContain('SELF_LANDLORD');
  });

  it('refuse un bail actif ou en préavis', () => {
    const verdict = evaluateEligibility(facts({ hasActiveOrNoticeLease: true }), 60, NOW);
    expect(verdict.blockingReasons).toEqual(['ACTIVE_OR_NOTICE_LEASE']);
  });

  it('refuse un solde dû ou un avoir non soldé', () => {
    const verdict = evaluateEligibility(facts({ hasNonZeroBalance: true }), 60, NOW);
    expect(verdict.blockingReasons).toEqual(['BALANCE_NOT_SETTLED']);
  });

  it('refuse un dépôt de garantie encore détenu', () => {
    const verdict = evaluateEligibility(facts({ hasHeldDeposit: true }), 60, NOW);
    expect(verdict.blockingReasons).toEqual(['DEPOSIT_HELD']);
  });

  it('refuse un dernier bail clos depuis moins que identityMonths', () => {
    const closedRecently = new Date(NOW.getTime() - 10 * 30 * 24 * 60 * 60 * 1000); // ~10 mois
    const verdict = evaluateEligibility(facts({ lastLeaseClosedAt: closedRecently }), 60, NOW);
    expect(verdict.blockingReasons).toEqual(['RECENT_LEASE_CLOSURE']);
  });

  it('accepte un dernier bail clos depuis plus que identityMonths', () => {
    const closedLongAgo = new Date(NOW.getTime() - 65 * 30 * 24 * 60 * 60 * 1000); // ~65 mois
    const verdict = evaluateEligibility(facts({ lastLeaseClosedAt: closedLongAgo }), 60, NOW);
    expect(verdict.eligible).toBe(true);
  });

  it('cumule tous les motifs de refus applicables', () => {
    const verdict = evaluateEligibility(
      facts({ hasActiveOrNoticeLease: true, hasNonZeroBalance: true, hasHeldDeposit: true }),
      60,
      NOW,
    );
    expect(verdict.eligible).toBe(false);
    expect(verdict.blockingReasons).toEqual(
      expect.arrayContaining(['ACTIVE_OR_NOTICE_LEASE', 'BALANCE_NOT_SETTLED', 'DEPOSIT_HELD']),
    );
    expect(verdict.blockingReasons).toHaveLength(3);
  });
});

describe('monthsSince', () => {
  it('compte environ 12 mois sur une année pleine', () => {
    const from = new Date('2025-09-23T00:00:00Z');
    expect(monthsSince(from, NOW)).toBeGreaterThan(11.9);
    expect(monthsSince(from, NOW)).toBeLessThan(12.1);
  });
});
