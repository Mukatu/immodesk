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
  currency: 'XAF';
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
    currency: 'XAF',
    createdAt: new Date().toISOString(),
  };
  penaltyRules.set(rule.id, rule);
}

/**
 * Calcul de pénalité partagé par le moteur de relances (dunning-handlers.ts)
 * et la route de simulation. Suit exactement le tableau du contrat phase 9 :
 * l'assiette est le loyer seul, ou loyer + charges si `appliesToCharges`,
 * plafonnée par `capAmount` et `capRateBps` (le plus contraignant l'emporte),
 * limitée à `maxPeriods` périodes, arrondie à l'entier XAF supérieur.
 */
export function computePenalty(
  rule: MockPenaltyRule,
  balanceAmount: number,
  daysOverdue: number,
): { penaltyAmount: number; cappedBy: 'capAmount' | 'capRateBps' | null; periods: number } {
  const graceDays = rule.graceDays ?? 0;
  const overdueBeyondGrace = Math.max(0, daysOverdue - graceDays);
  let periods = 0;
  let rawAmount = 0;

  if (overdueBeyondGrace <= 0) {
    return { penaltyAmount: 0, cappedBy: null, periods: 0 };
  }

  switch (rule.basis) {
    case 'RATE_BPS_PER_DAY':
      periods = overdueBeyondGrace;
      rawAmount = (balanceAmount * (rule.rateBps ?? 0) * periods) / 10_000;
      break;
    case 'RATE_BPS_PER_MONTH':
      periods = Math.ceil(overdueBeyondGrace / 30);
      rawAmount = (balanceAmount * (rule.rateBps ?? 0) * periods) / 10_000;
      break;
    case 'FLAT_AMOUNT':
      periods = 1;
      rawAmount = rule.flatAmount ?? 0;
      break;
    case 'FLAT_AMOUNT_PER_DAY':
      periods = overdueBeyondGrace;
      rawAmount = (rule.flatAmount ?? 0) * periods;
      break;
  }

  if (rule.maxPeriods && periods > rule.maxPeriods) {
    // Le montant est reproportionné aux périodes effectivement plafonnées
    // (sauf FLAT_AMOUNT, toujours une seule fois quel que soit maxPeriods).
    if (rule.basis !== 'FLAT_AMOUNT') {
      rawAmount = (rawAmount / periods) * rule.maxPeriods;
    }
    periods = rule.maxPeriods;
  }

  // Le plafond le plus contraignant (la valeur la plus basse) l'emporte.
  const capFromAmount = rule.capAmount ?? null;
  const capFromRate = rule.capRateBps ? (balanceAmount * rule.capRateBps) / 10_000 : null;
  let cappedBy: 'capAmount' | 'capRateBps' | null = null;
  let effectiveCap: number | null = null;
  if (capFromAmount !== null && (capFromRate === null || capFromAmount <= capFromRate)) {
    effectiveCap = capFromAmount;
    cappedBy = 'capAmount';
  } else if (capFromRate !== null) {
    effectiveCap = capFromRate;
    cappedBy = 'capRateBps';
  }

  let amount = rawAmount;
  if (effectiveCap !== null && amount > effectiveCap) {
    amount = effectiveCap;
  } else {
    cappedBy = null;
  }

  return { penaltyAmount: Math.ceil(Math.max(0, amount)), cappedBy, periods };
}
