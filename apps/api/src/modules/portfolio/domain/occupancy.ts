/** Énumérations du DDL (docs/schema/schema.sql, partie 03b). */
export const PROPERTY_TYPES = [
  'HOUSE',
  'VILLA',
  'APARTMENT_BUILDING',
  'COMPOUND',
  'COMMERCIAL_BUILDING',
  'MIXED_USE',
  'LAND',
  'WAREHOUSE',
  'OTHER',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const UNIT_TYPES = [
  'STUDIO',
  'ROOM',
  'APARTMENT',
  'HOUSE',
  'SHOP',
  'OFFICE',
  'WAREHOUSE',
  'PARKING',
  'LAND_PLOT',
  'OTHER',
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'UNDER_MAINTENANCE',
  'UNAVAILABLE',
] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

/** 100 % = 10 000 points de base. Aucun pourcentage flottant nulle part. */
export const BPS_SCALE = 10_000;

export interface Occupancy {
  unitsCount: number;
  occupiedCount: number;
  availableCount: number;
  occupancyRateBps: number;
}

/**
 * Taux d'occupation en points de base : `occupés / total`.
 *
 * Le calcul est en entiers et l'arrondi est au plus proche : 1 lot occupé sur
 * 3 donne 3333 bps (33,33 %), 2 sur 3 donne 6667 bps. Un immeuble sans lot
 * vaut 0 bps — et non « indéfini » : l'interface affiche « 0 % » et le web
 * n'a pas à gérer un cas nul.
 *
 * Seuls `OCCUPIED` comptent comme occupés ; `RESERVED`,
 * `UNDER_MAINTENANCE` et `UNAVAILABLE` ne sont ni occupés ni disponibles :
 * ils pèsent dans le dénominateur sans compter au numérateur, ce qui est
 * l'effet voulu (un lot en travaux est un lot qui ne rapporte pas).
 */
export function computeOccupancy(counts: {
  unitsCount: number;
  occupiedCount: number;
  availableCount: number;
}): Occupancy {
  const unitsCount = Math.max(0, Math.trunc(counts.unitsCount));
  const occupiedCount = Math.max(0, Math.trunc(counts.occupiedCount));
  const availableCount = Math.max(0, Math.trunc(counts.availableCount));

  const occupancyRateBps =
    unitsCount === 0 ? 0 : Math.round((occupiedCount * BPS_SCALE) / unitsCount);

  return { unitsCount, occupiedCount, availableCount, occupancyRateBps };
}

/** Rendu d'affichage, pour les journaux et les tests : `33,33 %`. */
export function formatOccupancyRate(bps: number): string {
  const percent = (bps / 100).toFixed(2).replace('.', ',');
  return `${percent} %`;
}
