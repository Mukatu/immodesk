import { DomainError } from '../../src/shared/errors/domain-error';
import {
  computeReading,
  decimalToMilli,
  meterCapacityMilli,
  milliToDecimal,
  toMilli,
} from '../../src/modules/meters/domain/meter-rules';
import {
  ceilDiv,
  valorize,
  type TariffTerms,
} from '../../src/modules/utilities/domain/tariff-engine';

describe('Calcul de consommation entre deux relevés', () => {
  it('consommation = index courant − index précédent', () => {
    const result = computeReading({
      previousIndexMilli: toMilli(1240),
      currentIndexMilli: toMilli(1258.5),
      digitsCount: 6,
    });
    expect(milliToDecimal(result.consumptionMilli)).toBe('18.500');
    expect(result.rolloverApplied).toBe(false);
  });

  it('un index égal au précédent donne une consommation nulle', () => {
    const result = computeReading({
      previousIndexMilli: toMilli(100),
      currentIndexMilli: toMilli(100),
      digitsCount: 6,
    });
    expect(result.consumptionMilli).toBe(0n);
  });
});

describe('Règle de non-régression d’index (contrat, arbitrage 1)', () => {
  it('refuse un index régressif sans confirmation explicite', () => {
    expect(() =>
      computeReading({
        previousIndexMilli: toMilli(1240),
        currentIndexMilli: toMilli(1180),
        digitsCount: 6,
      }),
    ).toThrow(DomainError);
    try {
      computeReading({
        previousIndexMilli: toMilli(1240),
        currentIndexMilli: toMilli(1180),
        digitsCount: 6,
      });
    } catch (error) {
      expect((error as DomainError).code).toBe('METERS.INDEX_REGRESSION');
    }
  });

  it('calcule la consommation sur la capacité du compteur en cas de passage par zéro confirmé', () => {
    // Compteur à 4 chiffres : capacité 10 000. Ancien index 9995, nouveau 3 : 5 + 3 = 8.
    const result = computeReading({
      previousIndexMilli: toMilli(9995),
      currentIndexMilli: toMilli(3),
      digitsCount: 4,
      rolloverApplied: true,
    });
    expect(result.rolloverApplied).toBe(true);
    expect(milliToDecimal(result.consumptionMilli)).toBe('8.000');
  });

  it('capacité déduite du nombre de chiffres', () => {
    expect(meterCapacityMilli(6)).toBe(1_000_000_000n);
  });

  it('aller-retour décimal ↔ millièmes', () => {
    expect(decimalToMilli('12.500')).toBe(12_500n);
    expect(milliToDecimal(12_500n)).toBe('12.500');
  });
});

describe('Valorisation d’une consommation selon chaque base (contrat § Valorisation)', () => {
  const base: TariffTerms = {
    basis: 'PER_UNIT_CONSUMED',
    unitPriceAmount: 500n,
    flatAmount: 8_000n,
    standingChargeAmount: 1_000n,
    minimumAmount: 2_000n,
  };

  it('PER_UNIT_CONSUMED : consommation × prix unitaire, arrondi à l’entier XAF supérieur', () => {
    const result = valorize(base, { consumptionMilli: 12_500n }); // 12,5 m³ × 500 = 6250
    expect(result.baseAmount).toBe(6_250n);
    expect(result.amount).toBe(6_250n + 1_000n); // + abonnement fixe
  });

  it('arrondit au supérieur une valeur fractionnaire', () => {
    // 1 001 millièmes × 3 = 3,003 → arrondi à 4 (ceil), pas 3.
    expect(ceilDiv(1_001n * 3n, 1000n)).toBe(4n);
  });

  it('FLAT_MONTHLY : forfait mensuel, indépendant de la consommation', () => {
    const result = valorize({ ...base, basis: 'FLAT_MONTHLY' }, { consumptionMilli: 999_000n });
    expect(result.baseAmount).toBe(8_000n);
  });

  it('PER_OCCUPANT : forfait × nombre d’occupants', () => {
    const result = valorize({ ...base, basis: 'PER_OCCUPANT' }, { occupantsCount: 3 });
    expect(result.baseAmount).toBe(24_000n);
  });

  it('PER_SQUARE_METER : prix unitaire × surface', () => {
    const result = valorize(
      { ...base, basis: 'PER_SQUARE_METER' },
      { squareMetersMilli: 45_000n }, // 45 m²
    );
    expect(result.baseAmount).toBe(22_500n); // 45 × 500
  });

  it('SHARED_PRORATA : quote-part en bps du coût total du compteur partagé', () => {
    const result = valorize(
      { ...base, basis: 'SHARED_PRORATA' },
      { consumptionMilli: 100_000n, sharedRatioBps: 2_500 }, // 100 m³ × 500 = 50 000, × 25 %
    );
    expect(result.baseAmount).toBe(12_500n);
  });

  it('applique le minimum de facturation quand le montant calculé est inférieur', () => {
    const result = valorize(
      { ...base, unitPriceAmount: 10n, standingChargeAmount: 0n, minimumAmount: 5_000n },
      { consumptionMilli: 1_000n }, // 1 × 10 = 10, bien en dessous du minimum
    );
    expect(result.amount).toBe(5_000n);
  });
});
