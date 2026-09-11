import { DomainError } from '../../../shared/errors/domain-error';

/** Énumération SQL `deposit_status`. */
export const DEPOSIT_STATUSES = [
  'PENDING',
  'PARTIALLY_PAID',
  'HELD',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FORFEITED',
] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

/** Énumération SQL `deposit_movement_type`. */
export const DEPOSIT_MOVEMENT_TYPES = [
  'COLLECTION',
  'REFUND',
  'DEDUCTION',
  'TRANSFER',
  'ADJUSTMENT',
] as const;
export type DepositMovementType = (typeof DEPOSIT_MOVEMENT_TYPES)[number];

/** Statuts de bail autorisant une restitution (contrat de la phase 2). */
export const CLOSED_LEASE_STATUSES = ['TERMINATED', 'EXPIRED'] as const;

/** Mouvement réduit à ce dont le recalcul a besoin. */
export interface DepositMovementEffect {
  movementType: DepositMovementType;
  amount: bigint;
  /** Contre-passation : inverse l'effet du mouvement d'origine. */
  isReversal: boolean;
}

export interface DepositBalances {
  collectedAmount: bigint;
  deductedAmount: bigint;
  refundedAmount: bigint;
  heldAmount: bigint;
}

export const ZERO_BALANCES: DepositBalances = {
  collectedAmount: 0n,
  deductedAmount: 0n,
  refundedAmount: 0n,
  heldAmount: 0n,
};

/**
 * Recalcul intégral des soldes À PARTIR DES MOUVEMENTS.
 *
 * POURQUOI RECALCULER PLUTÔT QU'INCRÉMENTER — `deposit_movements` est la
 * seule vérité : les quatre colonnes de `deposits` n'en sont qu'un résumé.
 * Incrémenter à l'aveugle laisserait, à la première anomalie, un résumé qui
 * ne correspond plus à ses pièces ; le bailleur ne saurait pas laquelle
 * croire. Le recalcul complet, fait dans la MÊME transaction que l'insertion
 * du mouvement, garantit que les deux disent toujours la même chose.
 *
 * Effets par type :
 *   COLLECTION  → encaissé          ADJUSTMENT → encaissé (correction)
 *   DEDUCTION   → retenu            REFUND     → restitué
 *   TRANSFER    → neutre : change de dépositaire, pas de montant.
 *
 * Une contre-passation (`reversalOfId` renseigné) porte le MÊME type que le
 * mouvement qu'elle annule et en inverse l'effet : les deux lignes restent
 * visibles, ce qu'exige la règle append-only.
 */
export function recomputeBalances(movements: readonly DepositMovementEffect[]): DepositBalances {
  let collected = 0n;
  let deducted = 0n;
  let refunded = 0n;

  for (const movement of movements) {
    const signed = movement.isReversal ? -movement.amount : movement.amount;
    switch (movement.movementType) {
      case 'COLLECTION':
      case 'ADJUSTMENT':
        collected += signed;
        break;
      case 'DEDUCTION':
        deducted += signed;
        break;
      case 'REFUND':
        refunded += signed;
        break;
      case 'TRANSFER':
        break;
    }
  }

  return {
    collectedAmount: collected,
    deductedAmount: deducted,
    refundedAmount: refunded,
    heldAmount: collected - deducted - refunded,
  };
}

/**
 * Statut DÉRIVÉ des soldes : il n'est jamais saisi, seulement déduit.
 *
 * L'ordre des tests compte. Un dépôt entièrement retenu pour dégradations
 * (`held = 0`, aucune restitution) est FORFEITED et non REFUNDED : le
 * locataire n'a rien récupéré, et l'écrire autrement fausserait le compte
 * rendu remis au bailleur.
 */
export function deriveStatus(balances: DepositBalances, requiredAmount: bigint): DepositStatus {
  const { collectedAmount, deductedAmount, refundedAmount, heldAmount } = balances;

  if (collectedAmount <= 0n) return 'PENDING';
  if (heldAmount <= 0n) {
    if (refundedAmount > 0n) return 'REFUNDED';
    if (deductedAmount > 0n) return 'FORFEITED';
    return 'PENDING';
  }
  if (refundedAmount > 0n) return 'PARTIALLY_REFUNDED';
  if (collectedAmount >= requiredAmount) return 'HELD';
  return 'PARTIALLY_PAID';
}

/** Solde restituable : ce que l'organisation détient encore, jamais négatif. */
export function refundableAmount(balances: DepositBalances): bigint {
  return balances.heldAmount > 0n ? balances.heldAmount : 0n;
}

/**
 * Contrôles préalables à l'enregistrement d'un mouvement.
 *
 * Une retenue ou une restitution supérieure au solde détenu est refusée :
 * l'agence ne peut pas rendre ce qu'elle n'a jamais reçu, et la contrainte
 * `deposits_balance_chk` du DDL la refuserait de toute façon — autant lever
 * un code métier explicite plutôt qu'une erreur SQL brute.
 */
export function assertMovementAllowed(input: {
  movementType: DepositMovementType;
  amount: bigint;
  isReversal: boolean;
  balances: DepositBalances;
  leaseStatus: string;
}): void {
  if (input.amount <= 0n) {
    throw new DomainError('DEPOSITS.MOVEMENT_INVALID', { amount: input.amount.toString(10) });
  }

  if (input.isReversal) return;

  if (input.movementType === 'REFUND' || input.movementType === 'DEDUCTION') {
    if (input.amount > input.balances.heldAmount) {
      throw new DomainError('DEPOSITS.INSUFFICIENT_BALANCE', {
        requested: input.amount.toString(10),
        heldAmount: input.balances.heldAmount.toString(10),
        movementType: input.movementType,
      });
    }
  }

  if (input.movementType === 'REFUND') {
    if (!(CLOSED_LEASE_STATUSES as readonly string[]).includes(input.leaseStatus)) {
      throw new DomainError('DEPOSITS.LEASE_NOT_CLOSED', {
        leaseStatus: input.leaseStatus,
        allowed: [...CLOSED_LEASE_STATUSES],
      });
    }
  }
}
