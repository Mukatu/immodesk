import {
  billableExtraUnits,
  ceilDiv,
  computeRecurringAmount,
  computeSubscriptionInvoiceAmounts,
  computeVatAmount,
  type SubscriptionPriceInput,
} from '../../src/modules/subscriptions/domain/subscription-pricing';

/**
 * `recurring_amount` (contrat phase 10, § « Montant ») : prix de base + prix
 * unitaire × lots hors forfait, diminué de `discount_rate_bps`, arrondi au
 * SUPÉRIEUR, jamais un flottant. Domaine pur : aucune date, donc aucun piège
 * "jour courant" ici — mais les autres specs du module ancrent toutes leurs
 * dates explicitement (aucun `new Date()` implicite).
 */
function input(overrides: Partial<SubscriptionPriceInput> = {}): SubscriptionPriceInput {
  return {
    basePriceAmount: 10_000n,
    pricePerUnitAmount: 500n,
    includedUnits: 5,
    unitsCount: 5,
    discountRateBps: 0,
    ...overrides,
  };
}

describe('ceilDiv — division entière arrondie au supérieur', () => {
  it('renvoie le quotient exact quand la division tombe juste', () => {
    expect(ceilDiv(100n, 10n)).toBe(10n);
  });

  it('arrondit au supérieur en présence d’un reste', () => {
    expect(ceilDiv(101n, 10n)).toBe(11n);
    expect(ceilDiv(1n, 3n)).toBe(1n);
  });

  it('renvoie zéro pour un numérateur nul ou négatif', () => {
    expect(ceilDiv(0n, 10n)).toBe(0n);
    expect(ceilDiv(-5n, 10n)).toBe(0n);
  });

  it('refuse un diviseur nul ou négatif', () => {
    expect(() => ceilDiv(10n, 0n)).toThrow(RangeError);
    expect(() => ceilDiv(10n, -1n)).toThrow(RangeError);
  });
});

describe('billableExtraUnits — lots hors forfait', () => {
  it('zéro tant que le nombre de lots ne dépasse pas le forfait inclus', () => {
    expect(billableExtraUnits(5, 5)).toBe(0);
    expect(billableExtraUnits(3, 5)).toBe(0);
  });

  it('compte les lots au-delà du forfait, jamais négatif', () => {
    expect(billableExtraUnits(12, 5)).toBe(7);
  });
});

describe('computeRecurringAmount — lots inclus, lots hors forfait et remise', () => {
  it('vaut le prix de base seul quand tous les lots sont inclus, sans remise', () => {
    expect(computeRecurringAmount(input({ unitsCount: 5, includedUnits: 5 }))).toBe(10_000n);
  });

  it('ajoute le prix unitaire pour chaque lot au-delà du forfait inclus', () => {
    // base 10 000 + 3 lots hors forfait × 500 = 11 500.
    expect(computeRecurringAmount(input({ unitsCount: 8, includedUnits: 5 }))).toBe(11_500n);
  });

  it('applique la remise puis arrondit au SUPÉRIEUR (jamais au plus proche)', () => {
    // gross = 10 000 + 3×500 = 11 500 ; remise 15 % (1500 bps) → 11 500 × 0.85 = 9 775 (exact).
    expect(
      computeRecurringAmount(input({ unitsCount: 8, includedUnits: 5, discountRateBps: 1500 })),
    ).toBe(9_775n);
    // gross = 10 000 (aucun lot hors forfait) ; remise 33,33 % (3333 bps) →
    // 10 000 × 6667 / 10 000 = 6 667 (exact, pas de reste ici : on vérifie
    // aussi un cas avec reste juste après).
    expect(
      computeRecurringAmount(input({ unitsCount: 5, includedUnits: 5, discountRateBps: 3333 })),
    ).toBe(6_667n);
  });

  it('arrondit au supérieur quand la remise laisse un reste (jamais un franc perdu pour la plateforme)', () => {
    // gross = 1n ; remise 1 bps → 1 × 9999 / 10000 = 0,9999 → ceil = 1.
    expect(
      computeRecurringAmount({
        basePriceAmount: 1n,
        pricePerUnitAmount: 0n,
        includedUnits: 0,
        unitsCount: 0,
        discountRateBps: 1,
      }),
    ).toBe(1n);
  });

  it('borne silencieusement un discount_rate_bps hors [0, 10000]', () => {
    const gross = input({ unitsCount: 5, includedUnits: 5 }); // gross = 10 000
    expect(computeRecurringAmount({ ...gross, discountRateBps: -500 })).toBe(10_000n); // ramené à 0
    expect(computeRecurringAmount({ ...gross, discountRateBps: 15_000 })).toBe(0n); // ramené à 10000 (remise totale)
  });
});

describe('computeVatAmount', () => {
  it('applique le taux et arrondit au supérieur', () => {
    expect(computeVatAmount(10_000n, 1800)).toBe(1_800n);
    expect(computeVatAmount(1n, 1800)).toBe(1n); // 0,18 → ceil = 1
  });
});

describe('computeSubscriptionInvoiceAmounts — décomposition d’une facture d’abonnement', () => {
  it('discount_amount est nul quand aucune remise ne s’applique', () => {
    const amounts = computeSubscriptionInvoiceAmounts({
      ...input({ unitsCount: 5, includedUnits: 5 }),
      vatRateBps: 1800,
    });
    expect(amounts.subtotalAmount).toBe(10_000n);
    expect(amounts.discountAmount).toBe(0n);
    expect(amounts.vatAmount).toBe(1_800n);
    expect(amounts.totalAmount).toBe(11_800n);
  });

  it('discount_amount reprend l’écart réel entre le prix plein et le montant net', () => {
    const amounts = computeSubscriptionInvoiceAmounts({
      ...input({ unitsCount: 8, includedUnits: 5, discountRateBps: 1500 }),
      vatRateBps: 1800,
    });
    // gross = 11 500, subtotal net = 9 775 (voir test ci-dessus).
    expect(amounts.subtotalAmount).toBe(9_775n);
    expect(amounts.discountAmount).toBe(1_725n);
    expect(amounts.totalAmount).toBe(amounts.subtotalAmount + amounts.vatAmount);
  });
});
