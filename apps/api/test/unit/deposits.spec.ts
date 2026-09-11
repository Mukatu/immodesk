import {
  assertMovementAllowed,
  deriveStatus,
  recomputeBalances,
  refundableAmount,
  ZERO_BALANCES,
  type DepositMovementEffect,
} from '../../src/modules/deposits/domain/deposit-rules';
import {
  DEFAULT_CONTRACT_TEMPLATE,
  mergeContractTemplate,
  patchContractTemplate,
} from '../../src/modules/pdf/domain/contract-template';
import { frenchDate } from '../../src/modules/pdf/infrastructure/contract-renderer';
import { DomainError } from '../../src/shared/errors/domain-error';

const collection = (amount: bigint): DepositMovementEffect => ({
  movementType: 'COLLECTION',
  amount,
  isReversal: false,
});
const deduction = (amount: bigint): DepositMovementEffect => ({
  movementType: 'DEDUCTION',
  amount,
  isReversal: false,
});
const refund = (amount: bigint): DepositMovementEffect => ({
  movementType: 'REFUND',
  amount,
  isReversal: false,
});

describe('Soldes du dépôt de garantie', () => {
  it('détenu = encaissé − retenu − restitué', () => {
    const balances = recomputeBalances([
      collection(200_000n),
      collection(100_000n),
      deduction(45_000n),
    ]);
    expect(balances).toEqual({
      collectedAmount: 300_000n,
      deductedAmount: 45_000n,
      refundedAmount: 0n,
      heldAmount: 255_000n,
    });
    expect(refundableAmount(balances)).toBe(255_000n);
  });

  it('le scénario Gherkin : 300 000 encaissés, 45 000 retenus, 255 000 restitués', () => {
    const movements = [collection(300_000n), deduction(45_000n)];
    expect(refundableAmount(recomputeBalances(movements))).toBe(255_000n);

    movements.push(refund(255_000n));
    const final = recomputeBalances(movements);
    expect(final.heldAmount).toBe(0n);
    expect(final.refundedAmount).toBe(255_000n);
    expect(deriveStatus(final, 300_000n)).toBe('REFUNDED');
    // Aucun mouvement n'a été modifié : la liste ne fait que croître.
    expect(movements).toHaveLength(3);
  });

  it('un ADJUSTMENT corrige l’encaissé, un TRANSFER ne touche à aucun solde', () => {
    const withAdjustment = recomputeBalances([
      collection(100_000n),
      { movementType: 'ADJUSTMENT', amount: 50_000n, isReversal: false },
    ]);
    expect(withAdjustment.collectedAmount).toBe(150_000n);

    const withTransfer = recomputeBalances([
      collection(100_000n),
      { movementType: 'TRANSFER', amount: 100_000n, isReversal: false },
    ]);
    expect(withTransfer.heldAmount).toBe(100_000n);
  });

  it('une contre-passation inverse l’effet du mouvement d’origine', () => {
    const balances = recomputeBalances([
      collection(150_000n),
      { movementType: 'COLLECTION', amount: 150_000n, isReversal: true },
    ]);
    expect(balances).toEqual(ZERO_BALANCES);
  });
});

describe('Statut dérivé du dépôt', () => {
  const required = 300_000n;

  it.each([
    [[], 'PENDING'],
    [[collection(100_000n)], 'PARTIALLY_PAID'],
    [[collection(300_000n)], 'HELD'],
    [[collection(400_000n)], 'HELD'],
    [[collection(300_000n), refund(100_000n)], 'PARTIALLY_REFUNDED'],
    [[collection(300_000n), deduction(45_000n), refund(255_000n)], 'REFUNDED'],
    [[collection(300_000n), deduction(300_000n)], 'FORFEITED'],
  ] as const)('%#', (movements, expected) => {
    expect(deriveStatus(recomputeBalances([...movements]), required)).toBe(expected);
  });

  it('une retenue partielle ne fait pas basculer en FORFEITED tant qu’il reste du solde', () => {
    const balances = recomputeBalances([collection(300_000n), deduction(45_000n)]);
    expect(deriveStatus(balances, required)).toBe('HELD');
  });
});

describe('Contrôles préalables à un mouvement', () => {
  const balances = recomputeBalances([collection(300_000n)]);

  it('refuse une retenue supérieure au solde détenu', () => {
    expect(() =>
      assertMovementAllowed({
        movementType: 'DEDUCTION',
        amount: 300_001n,
        isReversal: false,
        balances,
        leaseStatus: 'TERMINATED',
      }),
    ).toThrow(DomainError);
  });

  it('refuse une restitution tant que le bail n’est ni résilié ni expiré', () => {
    try {
      assertMovementAllowed({
        movementType: 'REFUND',
        amount: 100_000n,
        isReversal: false,
        balances,
        leaseStatus: 'ACTIVE',
      });
      throw new Error('La restitution aurait dû être refusée.');
    } catch (error) {
      const domain = error as DomainError;
      expect(domain.code).toBe('DEPOSITS.LEASE_NOT_CLOSED');
      expect(domain.status).toBe(409);
    }
  });

  it.each(['TERMINATED', 'EXPIRED'])('autorise la restitution sur un bail %s', (status) => {
    expect(() =>
      assertMovementAllowed({
        movementType: 'REFUND',
        amount: 300_000n,
        isReversal: false,
        balances,
        leaseStatus: status,
      }),
    ).not.toThrow();
  });

  it('refuse un montant nul ou négatif', () => {
    expect(() =>
      assertMovementAllowed({
        movementType: 'COLLECTION',
        amount: 0n,
        isReversal: false,
        balances,
        leaseStatus: 'ACTIVE',
      }),
    ).toThrow(DomainError);
  });

  it('un encaissement reste possible sur un bail actif', () => {
    expect(() =>
      assertMovementAllowed({
        movementType: 'COLLECTION',
        amount: 50_000n,
        isReversal: false,
        balances,
        leaseStatus: 'ACTIVE',
      }),
    ).not.toThrow();
  });
});

describe('Gabarit de contrat', () => {
  it('retombe sur le gabarit par défaut quand rien n’est enregistré', () => {
    expect(mergeContractTemplate(undefined)).toEqual(DEFAULT_CONTRACT_TEMPLATE);
    expect(mergeContractTemplate({})).toEqual(DEFAULT_CONTRACT_TEMPLATE);
    expect(mergeContractTemplate({ headerTitle: 42 })).toEqual(DEFAULT_CONTRACT_TEMPLATE);
  });

  it('conserve les champs personnalisés et complète le reste', () => {
    const merged = mergeContractTemplate({
      headerTitle: 'BAIL COMMERCIAL',
      showOhadaBlock: true,
    });
    expect(merged.headerTitle).toBe('BAIL COMMERCIAL');
    expect(merged.showOhadaBlock).toBe(true);
    expect(merged.legalMentions).toBe(DEFAULT_CONTRACT_TEMPLATE.legalMentions);
  });

  it('applique une modification partielle sans toucher au reste', () => {
    const patched = patchContractTemplate(DEFAULT_CONTRACT_TEMPLATE, {
      signatureCity: 'Pointe-Noire',
    });
    expect(patched.signatureCity).toBe('Pointe-Noire');
    expect(patched.headerTitle).toBe(DEFAULT_CONTRACT_TEMPLATE.headerTitle);
  });

  it('ignore des clauses mal formées plutôt que d’empêcher d’imprimer', () => {
    const merged = mergeContractTemplate({ optionalClauses: [{ title: 'Sans corps' }, 42] });
    expect(merged.optionalClauses).toEqual(DEFAULT_CONTRACT_TEMPLATE.optionalClauses);
  });
});

describe('Dates françaises du contrat', () => {
  it('écrit « 1er » pour le premier du mois', () => {
    expect(frenchDate('2026-06-01')).toBe('1er juin 2026');
    expect(frenchDate('2026-02-28')).toBe('28 février 2026');
    expect(frenchDate('2026-08-15')).toBe('15 août 2026');
  });
});
