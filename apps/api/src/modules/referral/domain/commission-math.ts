/**
 * Calculs purs de l'apport d'affaires (docs/api/phase10-contract.md,
 * § Apport d'affaires, arbitrages 6 et 7 ; `docs/schema/schema.sql`,
 * commentaires de `referral_commissions`).
 */

/**
 * `commission_amount = base_amount * rate_bps / 10000`, arrondi à l'unité
 * XAF INFÉRIEURE (comment SQL de `referral_commissions.commission_amount`).
 * Tout en `bigint` : les montants XAF n'ont jamais de décimales et les
 * colonnes sont `BIGINT`.
 */
export function computeCommissionAmount(baseAmount: bigint, rateBps: number): bigint {
  if (baseAmount < 0n) throw new RangeError('baseAmount ne peut pas être négatif.');
  if (rateBps < 0 || rateBps > 10_000) throw new RangeError('rateBps hors bornes [0, 10000].');
  return (baseAmount * BigInt(rateBps)) / 10_000n;
}

/**
 * Date d'expiration de la fenêtre de commissionnement : `qualified_at` +
 * `duration_months` (comment SQL de `referrals.expires_at`).
 */
export function computeReferralExpiry(qualifiedAt: Date, durationMonths: number): Date {
  const expiry = new Date(qualifiedAt);
  expiry.setUTCMonth(expiry.getUTCMonth() + durationMonths);
  return expiry;
}

/** Premier jour du mois (UTC) d'une date — imputation du plafond mensuel. */
export function periodMonthOf(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Répartit un montant de commission entre part approuvable et part retenue
 * par le plafond mensuel du programme (`referral_programs.monthly_cap_amount`,
 * arbitrage 6 : « au-delà du plafond mensuel, l'excédent n'est pas versé, il
 * reste ACCRUED et se reporte »). `alreadyApprovedThisMonth` est le cumul déjà
 * APPROVED/PAID du partenaire sur le mois considéré, avant cette commission.
 */
export function splitByMonthlyCap(
  commissionAmount: bigint,
  alreadyApprovedThisMonth: bigint,
  monthlyCapAmount: bigint | null,
): { approvable: bigint; heldByCap: bigint } {
  if (monthlyCapAmount === null) {
    return { approvable: commissionAmount, heldByCap: 0n };
  }
  const remainingRoom = monthlyCapAmount - alreadyApprovedThisMonth;
  if (remainingRoom <= 0n) {
    return { approvable: 0n, heldByCap: commissionAmount };
  }
  if (remainingRoom >= commissionAmount) {
    return { approvable: commissionAmount, heldByCap: 0n };
  }
  return { approvable: remainingRoom, heldByCap: commissionAmount - remainingRoom };
}
