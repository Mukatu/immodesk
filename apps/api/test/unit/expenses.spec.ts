import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertApprovable,
  assertExpenseEditable,
  assertRejectable,
  assertSubmittable,
  computeAmounts,
  computeVat,
} from '../../src/modules/expenses/domain/expense-rules';

describe('TVA et montants de dépense en XAF (BigInt, arrondi au plus proche)', () => {
  it('un montant sans reliquat ne laisse aucun doute sur l’arrondi', () => {
    // 100 000 × 19,25 % = 19 250 pile, aucun arrondi à trancher.
    expect(computeVat(100_000n, 1_925)).toBe(19_250n);
  });

  it('un résidu exactement à 0,5 arrondit vers le haut, jamais vers le bas', () => {
    // 1 000 × 19,25 % = 192,5 : troncature → 192, arrondi au plus proche → 193.
    expect(computeVat(1_000n, 1_925)).toBe(193n);
  });

  it('un résidu supérieur à 0,5 arrondit aussi vers le haut', () => {
    // 100 × 19,76 % = 19,76 : troncature → 19, arrondi au plus proche → 20.
    expect(computeVat(100n, 1_976)).toBe(20n);
  });

  it('un résidu inférieur à 0,5 arrondit vers le bas, comme la troncature', () => {
    // 100 × 19,33 % = 19,33 : les deux méthodes donnent 19.
    expect(computeVat(100n, 1_933)).toBe(19n);
  });

  it('un taux de TVA nul ou négatif ne produit aucune TVA', () => {
    expect(computeVat(100_000n, 0)).toBe(0n);
    expect(computeVat(100_000n, -1)).toBe(0n);
  });

  it('computeAmounts combine montant, TVA et total, toujours en BigInt', () => {
    const amounts = computeAmounts(1_000n, 1_925);
    expect(amounts).toEqual({ amount: 1_000n, vatAmount: 193n, totalAmount: 1_193n });
    expect(typeof amounts.totalAmount).toBe('bigint');
  });

  it('sans TVA, le total égale le montant', () => {
    expect(computeAmounts(50_000n, 0)).toEqual({
      amount: 50_000n,
      vatAmount: 0n,
      totalAmount: 50_000n,
    });
  });
});

describe('Gardes de transition de la dépense', () => {
  it('une dépense rattachée à un relevé reste verrouillée, même DRAFT', () => {
    expect(() => assertExpenseEditable('DRAFT', 'releve-1')).toThrow(DomainError);
    expect(() => assertExpenseEditable('DRAFT', null)).not.toThrow();
  });

  it('seules DRAFT et SUBMITTED restent modifiables par PATCH', () => {
    expect(() => assertExpenseEditable('SUBMITTED', null)).not.toThrow();
    expect(() => assertExpenseEditable('APPROVED', null)).toThrow(DomainError);
  });

  it('seule une dépense DRAFT peut être soumise', () => {
    expect(() => assertSubmittable('DRAFT')).not.toThrow();
    expect(() => assertSubmittable('SUBMITTED')).toThrow(DomainError);
  });

  it('seule une dépense SUBMITTED peut être approuvée', () => {
    expect(() => assertApprovable('SUBMITTED')).not.toThrow();
    expect(() => assertApprovable('DRAFT')).toThrow(DomainError);
  });

  it('le rejet exige SUBMITTED et un motif', () => {
    expect(() => assertRejectable('SUBMITTED', undefined)).toThrow(DomainError);
    expect(() => assertRejectable('DRAFT', 'motif')).toThrow(DomainError);
    expect(() => assertRejectable('SUBMITTED', 'Justificatif manquant')).not.toThrow();
  });
});
