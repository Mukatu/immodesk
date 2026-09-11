/**
 * Mock MSW — Phase 3 (règles de pénalité), état en mémoire et données de
 * démonstration, conformes à docs/api/phase3-contract.md.
 */

export type PenaltyBasisMock =
  'RATE_BPS_PER_DAY' | 'RATE_BPS_PER_MONTH' | 'FLAT_AMOUNT' | 'FLAT_AMOUNT_PER_DAY';

export interface MockPenaltyRule {
  id: string;
  organizationId: string;
  name: string;
  basis: PenaltyBasisMock;
  rateBps: number | null;
  flatAmount: number | null;
  graceDays: number | null;
  capAmount: number | null;
  capRateBps: number | null;
  maxPeriods: number | null;
  appliesToCharges: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export const penaltyRules = new Map<string, MockPenaltyRule>();

export interface SeedPenaltyRulesDeps {
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
}

/** Seed d'une règle de pénalité par défaut (retard de loyer, 1 %/mois). */
export function seedPenaltyRulesDemoData(deps: SeedPenaltyRulesDeps): void {
  const { DEMO_ORG_ID, nextId } = deps;
  const rule: MockPenaltyRule = {
    id: nextId('penaltyrule'),
    organizationId: DEMO_ORG_ID,
    name: 'Retard de loyer',
    basis: 'RATE_BPS_PER_MONTH',
    rateBps: 100,
    flatAmount: null,
    graceDays: 5,
    capAmount: null,
    capRateBps: 1000,
    maxPeriods: 3,
    appliesToCharges: false,
    isActive: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  };
  penaltyRules.set(rule.id, rule);
}
