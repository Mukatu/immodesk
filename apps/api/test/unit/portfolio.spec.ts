import {
  BPS_SCALE,
  computeOccupancy,
  formatOccupancyRate,
} from '../../src/modules/portfolio/domain/occupancy';
import {
  defaultUnitLabel,
  generateUnitCodes,
  MAX_BULK_UNITS,
} from '../../src/modules/portfolio/domain/unit-code';
import { DomainError } from '../../src/shared/errors/domain-error';

describe('Taux d’occupation en points de base', () => {
  it('vaut 0 bps sur un immeuble entièrement vacant', () => {
    // Scénario Gherkin de la phase 1 : 12 lots créés en série, taux à 0 %.
    expect(computeOccupancy({ unitsCount: 12, occupiedCount: 0, availableCount: 12 })).toEqual({
      unitsCount: 12,
      occupiedCount: 0,
      availableCount: 12,
      occupancyRateBps: 0,
    });
  });

  it('vaut 10 000 bps sur un immeuble plein', () => {
    expect(
      computeOccupancy({ unitsCount: 12, occupiedCount: 12, availableCount: 0 }).occupancyRateBps,
    ).toBe(BPS_SCALE);
  });

  it('arrondit au point de base le plus proche', () => {
    // 1/3 et 2/3 ne tombent pas juste : l'arrondi doit rester symétrique.
    expect(
      computeOccupancy({ unitsCount: 3, occupiedCount: 1, availableCount: 2 }).occupancyRateBps,
    ).toBe(3333);
    expect(
      computeOccupancy({ unitsCount: 3, occupiedCount: 2, availableCount: 1 }).occupancyRateBps,
    ).toBe(6667);
    expect(
      computeOccupancy({ unitsCount: 12, occupiedCount: 4, availableCount: 8 }).occupancyRateBps,
    ).toBe(3333);
  });

  it('vaut 0 bps sur un immeuble sans lot, plutôt qu’une division par zéro', () => {
    expect(
      computeOccupancy({ unitsCount: 0, occupiedCount: 0, availableCount: 0 }).occupancyRateBps,
    ).toBe(0);
  });

  it('compte les lots ni occupés ni disponibles au dénominateur seulement', () => {
    // 2 occupés, 1 disponible, 1 en travaux : le lot en travaux ne rapporte
    // rien et doit peser sur le taux.
    const occupancy = computeOccupancy({ unitsCount: 4, occupiedCount: 2, availableCount: 1 });
    expect(occupancy.occupancyRateBps).toBe(5000);
    expect(occupancy.unitsCount - occupancy.occupiedCount - occupancy.availableCount).toBe(1);
  });

  it('ne produit jamais de compteur négatif', () => {
    expect(computeOccupancy({ unitsCount: -5, occupiedCount: -2, availableCount: -1 })).toEqual({
      unitsCount: 0,
      occupiedCount: 0,
      availableCount: 0,
      occupancyRateBps: 0,
    });
  });

  it('formate en français avec la virgule décimale', () => {
    expect(formatOccupancyRate(3333)).toBe('33,33 %');
    expect(formatOccupancyRate(10000)).toBe('100,00 %');
    expect(formatOccupancyRate(0)).toBe('0,00 %');
  });
});

describe('Génération d’une série de codes de lots', () => {
  it('engendre A1..A12', () => {
    const codes = generateUnitCodes({ prefix: 'A', from: 1, to: 12 });
    expect(codes).toHaveLength(12);
    expect(codes[0]).toBe('A1');
    expect(codes[11]).toBe('A12');
  });

  it('applique le remplissage pour que le tri alphabétique soit correct', () => {
    const codes = generateUnitCodes({ prefix: 'A', from: 1, to: 12, padding: 2 });
    expect(codes[0]).toBe('A01');
    expect(codes[8]).toBe('A09');
    expect(codes[11]).toBe('A12');
    // C'est tout l'intérêt : trié comme du texte, A02 précède bien A10.
    expect([...codes].sort()).toEqual(codes);
  });

  it('ne tronque jamais un nombre plus long que le remplissage', () => {
    // Tronquer A100 en A00 fabriquerait un doublon silencieux.
    const codes = generateUnitCodes({ prefix: 'B', from: 99, to: 101, padding: 2 });
    expect(codes).toEqual(['B99', 'B100', 'B101']);
  });

  it('accepte un préfixe vide et une série d’un seul lot', () => {
    expect(generateUnitCodes({ prefix: '', from: 7, to: 7, padding: 3 })).toEqual(['007']);
  });

  it('refuse une borne inversée', () => {
    expect(() => generateUnitCodes({ prefix: 'A', from: 12, to: 1 })).toThrow(DomainError);
    try {
      generateUnitCodes({ prefix: 'A', from: 12, to: 1 });
    } catch (error) {
      expect((error as DomainError).code).toBe('PORTFOLIO.BULK_RANGE_INVALID');
      expect((error as DomainError).status).toBe(422);
    }
  });

  it(`refuse une série de plus de ${MAX_BULK_UNITS} lots`, () => {
    expect(() => generateUnitCodes({ prefix: 'A', from: 1, to: MAX_BULK_UNITS })).not.toThrow();
    expect(() => generateUnitCodes({ prefix: 'A', from: 1, to: MAX_BULK_UNITS + 1 })).toThrow(
      DomainError,
    );
  });

  it('refuse un remplissage aberrant', () => {
    expect(() => generateUnitCodes({ prefix: 'A', from: 1, to: 2, padding: -1 })).toThrow(
      DomainError,
    );
    expect(() => generateUnitCodes({ prefix: 'A', from: 1, to: 2, padding: 99 })).toThrow(
      DomainError,
    );
  });

  it('étiquette par défaut un lot engendré par son code', () => {
    expect(defaultUnitLabel('A7')).toBe('A7');
  });
});
