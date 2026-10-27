/**
 * Recevabilité d'un effacement (contrat phase 11, § « Effacement », lignes
 * 94-96) : vérifiée AVANT toute écriture, motif précis dans `details`.
 * Domaine pur — les faits sont rassemblés par une requête SQL en amont
 * (`application/eligibility.service.ts`), ce fichier ne fait que les juger.
 */

export type BlockingReason =
  | 'SELF_LANDLORD'
  | 'ACTIVE_OR_NOTICE_LEASE'
  | 'BALANCE_NOT_SETTLED'
  | 'DEPOSIT_HELD'
  | 'RECENT_LEASE_CLOSURE';

export interface EligibilityFacts {
  /** Uniquement pertinent pour un bailleur : `landlords.is_self` (arbitrage : jamais effacé, c'est l'organisation elle-même). */
  isSelfLandlord: boolean;
  /** Un bail `ACTIVE` ou `NOTICE_GIVEN` implique le tiers (locataire, bailleur de la propriété, ou garant). */
  hasActiveOrNoticeLease: boolean;
  /** Un bail du tiers porte un `balance_amount` différent de zéro (dû ou avoir non soldé). */
  hasNonZeroBalance: boolean;
  /** Un dépôt de garantie lié au tiers n'est ni `REFUNDED` ni `FORFEITED`. */
  hasHeldDeposit: boolean;
  /** Date de clôture du DERNIER bail du tiers (`terminated_at`, `move_out_date` ou `end_date`), `null` si le tiers n'a jamais eu de bail. */
  lastLeaseClosedAt: Date | null;
}

export interface EligibilityVerdict {
  eligible: boolean;
  blockingReasons: BlockingReason[];
}

/** Mois pleins écoulés entre deux dates (approximation à 30,44 jours, suffisante pour un seuil en mois). */
export function monthsSince(from: Date, now: Date): number {
  const msPerMonth = 30.436_875 * 24 * 60 * 60 * 1000;
  return (now.getTime() - from.getTime()) / msPerMonth;
}

export function evaluateEligibility(
  facts: EligibilityFacts,
  identityMonths: number,
  now: Date = new Date(),
): EligibilityVerdict {
  const reasons: BlockingReason[] = [];

  if (facts.isSelfLandlord) reasons.push('SELF_LANDLORD');
  if (facts.hasActiveOrNoticeLease) reasons.push('ACTIVE_OR_NOTICE_LEASE');
  if (facts.hasNonZeroBalance) reasons.push('BALANCE_NOT_SETTLED');
  if (facts.hasHeldDeposit) reasons.push('DEPOSIT_HELD');
  if (facts.lastLeaseClosedAt && monthsSince(facts.lastLeaseClosedAt, now) < identityMonths) {
    reasons.push('RECENT_LEASE_CLOSURE');
  }

  return { eligible: reasons.length === 0, blockingReasons: reasons };
}
