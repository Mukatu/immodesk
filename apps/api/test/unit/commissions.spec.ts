import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertSupportedBasis,
  computeCommissionAmounts,
} from '../../src/modules/commissions/domain/commission-rules';

describe('Calcul de la commission (RATE_BPS_ON_RENT_COLLECTED)', () => {
  it('applique le taux du mandat sur la base encaissée, montant et TVA exacts', () => {
    // 1 000 000 × 10 % = 100 000 pile ; 100 000 × 19,25 % = 19 250 pile.
    const result = computeCommissionAmounts(1_000_000n, 1_000, 1_925);
    expect(result).toEqual({ amount: 100_000n, vatAmount: 19_250n, totalAmount: 119_250n });
  });

  it('arrondit le montant de commission au plus proche, moitié vers le haut', () => {
    // 1 000 × 1,05 % = 10,5 : troncature → 10, arrondi au plus proche → 11.
    const result = computeCommissionAmounts(1_000n, 105, 0);
    expect(result.amount).toBe(11n);
    expect(result.vatAmount).toBe(0n);
    expect(result.totalAmount).toBe(11n);
  });

  it('arrondit la TVA sur la commission indépendamment, avec la même règle', () => {
    // base 3 000 (déjà arrondie) × 19,25 % = 577,5 : arrondi au plus proche → 578.
    const result = computeCommissionAmounts(30_000n, 1_000, 1_925);
    expect(result.amount).toBe(3_000n);
    expect(result.vatAmount).toBe(578n);
    expect(result.totalAmount).toBe(3_578n);
  });

  it('sans TVA sur le mandat, seule la commission est due', () => {
    const result = computeCommissionAmounts(500_000n, 800, 0);
    expect(result.vatAmount).toBe(0n);
    expect(result.totalAmount).toBe(result.amount);
  });

  it('se base sur le montant IMPUTÉ (base_amount), pas sur le brut du paiement', () => {
    // Un paiement de 500 000 dont seuls 300 000 sont imputés à ce bailleur
    // (reliquat en avoir locataire, ou versement partagé entre bailleurs) :
    // la commission ne se calcule QUE sur les 300 000 imputés.
    const paymentAmount = 500_000n;
    const allocatedAmount = 300_000n;
    const onAllocated = computeCommissionAmounts(allocatedAmount, 1_000, 1_925);
    const onRawPayment = computeCommissionAmounts(paymentAmount, 1_000, 1_925);
    expect(onAllocated.amount).toBe(30_000n);
    expect(onAllocated.amount).not.toBe(onRawPayment.amount);
  });
});

describe('Base de commission supportée', () => {
  it('RATE_BPS_ON_RENT_COLLECTED est la seule base implémentée', () => {
    expect(() => assertSupportedBasis('RATE_BPS_ON_RENT_COLLECTED')).not.toThrow();
  });

  it.each(['RATE_BPS_ON_RENT_DUE', 'FLAT_AMOUNT_PER_MONTH', 'FLAT_AMOUNT_PER_LEASE'] as const)(
    '%s lève AGENCY.COMMISSION_BASIS_UNSUPPORTED',
    (basis) => {
      try {
        assertSupportedBasis(basis);
        throw new Error('La base non supportée aurait dû être refusée.');
      } catch (error) {
        const domain = error as DomainError;
        expect(domain).toBeInstanceOf(DomainError);
        expect(domain.code).toBe('AGENCY.COMMISSION_BASIS_UNSUPPORTED');
      }
    },
  );
});
