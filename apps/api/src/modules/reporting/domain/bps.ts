/**
 * Points de base (1 bp = 0,01 %), jamais de pourcentage flottant — même
 * convention que `occupancy_rate_bps` et `collection_rate_bps` du DDL.
 *
 * Domaine pur : aucune dépendance Nest ni Prisma.
 */

/**
 * Part de `numerator` dans `denominator`, en points de base, arrondie à
 * l'entier le plus proche (arrondi commercial, jamais tronqué).
 *
 * `denominator <= 0` renvoie 0 plutôt que de diviser par zéro : un immeuble
 * sans facture émise n'a pas de taux de recouvrement négatif ou indéfini.
 */
export function toBps(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) return 0;
  const scaled = numerator * 10_000n;
  const half = denominator / 2n;
  return Number((scaled + half) / denominator);
}

/** Part d'un compte parmi un total, en points de base (mêmes garanties que `toBps`). */
export function shareBps(part: bigint, total: bigint): number {
  return toBps(part, total);
}
