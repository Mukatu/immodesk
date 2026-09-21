/**
 * Calcul du montant récurrent d'un abonnement (contrat phase 10, § « Montant »).
 *
 * `recurring_amount` vaut le prix de base plus le prix unitaire multiplié par
 * les lots au-delà de l'inclus, diminué de `discount_rate_bps`. Le résultat
 * est un entier XAF arrondi AU SUPÉRIEUR — jamais un flottant, jamais un
 * arrondi au plus proche qui ferait perdre un franc à la plateforme.
 *
 * Domaine pur : aucune dépendance Nest ni Prisma.
 */
export interface SubscriptionPriceInput {
  basePriceAmount: bigint;
  pricePerUnitAmount: bigint;
  includedUnits: number;
  /** Nombre de lots gérés par l'organisation, recalculé à chaque facturation. */
  unitsCount: number;
  discountRateBps: number;
}

/** Division entière arrondie au supérieur (`ceil`), sans jamais passer par un flottant. */
export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new RangeError('ceilDiv : le diviseur doit être strictement positif.');
  }
  if (numerator <= 0n) return 0n;
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder === 0n ? quotient : quotient + 1n;
}

/** Nombre de lots facturables au-delà du forfait inclus (jamais négatif). */
export function billableExtraUnits(unitsCount: number, includedUnits: number): number {
  return Math.max(0, Math.trunc(unitsCount) - Math.trunc(includedUnits));
}

/**
 * `recurring_amount = ceil((base + prix_unitaire × lots_hors_forfait) × (1 - remise))`.
 *
 * `discount_rate_bps` est borné à [0, 10000] : une valeur hors bornes en base
 * (ce qui ne devrait jamais arriver, la colonne n'étant pas contrainte par un
 * CHECK) est ramenée silencieusement plutôt que de produire un montant
 * négatif ou supérieur au prix plein.
 */
export function computeRecurringAmount(input: SubscriptionPriceInput): bigint {
  const extraUnits = BigInt(billableExtraUnits(input.unitsCount, input.includedUnits));
  const gross = input.basePriceAmount + input.pricePerUnitAmount * extraUnits;
  const bps = BigInt(Math.min(10_000, Math.max(0, Math.trunc(input.discountRateBps))));
  const discounted = gross * (10_000n - bps);
  return ceilDiv(discounted, 10_000n);
}

/** TVA appliquée à une facture d'abonnement, même règle d'arrondi. */
export function computeVatAmount(subtotalAmount: bigint, vatRateBps: number): bigint {
  const bps = BigInt(Math.max(0, Math.trunc(vatRateBps)));
  return ceilDiv(subtotalAmount * bps, 10_000n);
}

export interface SubscriptionInvoiceAmounts {
  subtotalAmount: bigint;
  discountAmount: bigint;
  vatAmount: bigint;
  totalAmount: bigint;
}

/**
 * Décomposition d'une facture d'abonnement : `subtotal_amount` reprend
 * `recurring_amount` (déjà net de remise), `discount_amount` est la remise
 * réellement soustraite du prix plein (affichage seul, jamais réappliquée),
 * et `total_amount` ajoute la TVA. Une facture d'abonnement ne connaît que
 * ISSUED/PAID/OVERDUE/CANCELLED (contrat, arbitrage 2) : ce calcul ne se
 * préoccupe donc jamais d'un règlement partiel.
 */
export function computeSubscriptionInvoiceAmounts(
  input: SubscriptionPriceInput & { vatRateBps: number },
): SubscriptionInvoiceAmounts {
  const extraUnits = BigInt(billableExtraUnits(input.unitsCount, input.includedUnits));
  const gross = input.basePriceAmount + input.pricePerUnitAmount * extraUnits;
  const subtotalAmount = computeRecurringAmount(input);
  const discountAmount = gross - subtotalAmount > 0n ? gross - subtotalAmount : 0n;
  const vatAmount = computeVatAmount(subtotalAmount, input.vatRateBps);
  return { subtotalAmount, discountAmount, vatAmount, totalAmount: subtotalAmount + vatAmount };
}
