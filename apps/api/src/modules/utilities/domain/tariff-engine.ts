/** Énumération SQL `tariff_basis` (docs/api/phase8-contract.md). */
export const TARIFF_BASES = [
  'PER_UNIT_CONSUMED',
  'FLAT_MONTHLY',
  'PER_OCCUPANT',
  'PER_SQUARE_METER',
  'SHARED_PRORATA',
] as const;
export type TariffBasis = (typeof TARIFF_BASES)[number];

/** Division entière arrondie à l'entier XAF SUPÉRIEUR (contrat, § Valorisation). */
export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('Dénominateur nul ou négatif.');
  if (numerator <= 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

export interface TariffTerms {
  basis: TariffBasis;
  unitPriceAmount: bigint;
  flatAmount: bigint;
  standingChargeAmount: bigint;
  minimumAmount: bigint;
}

export interface ValorizationContext {
  /** Consommation en millièmes d'unité (`NUMERIC(14,3)`), pour `PER_UNIT_CONSUMED`/`SHARED_PRORATA`. */
  consumptionMilli?: bigint;
  /** Nombre d'occupants du lot, pour `PER_OCCUPANT`. */
  occupantsCount?: number;
  /** Surface en millièmes de m², pour `PER_SQUARE_METER`. */
  squareMetersMilli?: bigint;
  /** Quote-part du lot sur un compteur partagé, en points de base, pour `SHARED_PRORATA`. */
  sharedRatioBps?: number;
}

export interface ValorizationResult {
  /** Montant avant abonnement fixe et minimum. */
  baseAmount: bigint;
  /** Montant final, après abonnement fixe puis application du minimum. */
  amount: bigint;
}

/**
 * Moteur de valorisation d'une consommation selon les cinq bases du contrat.
 *
 * Ordre des opérations (contrat, § Valorisation) : montant selon la base,
 * PUIS ajout de l'abonnement fixe, PUIS application d'un minimum de
 * facturation. Le résultat est arrondi à l'entier XAF supérieur.
 */
export function valorize(tariff: TariffTerms, context: ValorizationContext): ValorizationResult {
  let base: bigint;
  switch (tariff.basis) {
    case 'PER_UNIT_CONSUMED': {
      base = ceilDiv((context.consumptionMilli ?? 0n) * tariff.unitPriceAmount, 1000n);
      break;
    }
    case 'FLAT_MONTHLY': {
      base = tariff.flatAmount;
      break;
    }
    case 'PER_OCCUPANT': {
      base = tariff.flatAmount * BigInt(Math.max(1, context.occupantsCount ?? 1));
      break;
    }
    case 'PER_SQUARE_METER': {
      base = ceilDiv((context.squareMetersMilli ?? 0n) * tariff.unitPriceAmount, 1000n);
      break;
    }
    case 'SHARED_PRORATA': {
      const total = ceilDiv((context.consumptionMilli ?? 0n) * tariff.unitPriceAmount, 1000n);
      base = ceilDiv(total * BigInt(context.sharedRatioBps ?? 0), 10_000n);
      break;
    }
  }
  const withStanding = base + tariff.standingChargeAmount;
  const amount = withStanding < tariff.minimumAmount ? tariff.minimumAmount : withStanding;
  return { baseAmount: base, amount };
}
