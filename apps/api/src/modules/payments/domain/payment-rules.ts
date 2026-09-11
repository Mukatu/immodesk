import { DomainError } from '../../../shared/errors/domain-error';
import type { MemberRole } from '../../../shared/tenant/tenant-context';

export const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'BANK_CHECK'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'PENDING_VERIFICATION',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'REVERSED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FEE_BEARERS = ['TENANT', 'ORGANIZATION', 'LANDLORD', 'SHARED'] as const;
export type FeeBearer = (typeof FEE_BEARERS)[number];

export const CREDIT_STATUSES = ['OPEN', 'PARTIALLY_USED', 'USED', 'REFUNDED', 'EXPIRED'] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

/**
 * Machine à états d'un paiement (docs/02_architecture_technique.md, § 8.5).
 * REJECTED, CANCELLED et REVERSED sont terminaux. En phase 3, la
 * contre-passation ne modifie PAS le paiement d'origine (contrat) : l'écriture
 * miroir naît directement au statut REVERSED.
 */
export const PAYMENT_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  PENDING: ['PENDING_VERIFICATION', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
  PENDING_VERIFICATION: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: [],
  REJECTED: [],
  CANCELLED: [],
  REVERSED: [],
};

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!PAYMENT_TRANSITIONS[from].includes(to)) {
    throw new DomainError('PAYMENTS.INVALID_TRANSITION', { from, to });
  }
}

const CONFIRMING_ROLES: readonly MemberRole[] = ['OWNER', 'MANAGER', 'ACCOUNTANT'];

/**
 * Statut initial : CONFIRMED pour les espèces (le reçu signé est la preuve)
 * et pour un paiement saisi par un MANAGER / ACCOUNTANT avec `confirmed:
 * true` ; PENDING_VERIFICATION sinon — jamais CONFIRMED sur la seule
 * déclaration d'un tiers.
 */
export function initialPaymentStatus(
  method: PaymentMethod,
  role: MemberRole,
  confirmed: boolean | undefined,
): PaymentStatus {
  if (method === 'CASH') return 'CONFIRMED';
  if (confirmed && CONFIRMING_ROLES.includes(role)) return 'CONFIRMED';
  return 'PENDING_VERIFICATION';
}

/** Montant net reçu : les frais ne diminuent l'encaissement que s'ils ne sont pas à la charge du locataire. */
export function netAmountOf(amount: bigint, feeAmount: bigint, feeBearer: FeeBearer): bigint {
  if (feeBearer === 'TENANT') return amount;
  const net = amount - feeAmount;
  return net > 0n ? net : 0n;
}

/** Statut d'un avoir après utilisation. */
export function creditStatusOf(amount: bigint, usedAmount: bigint): CreditStatus {
  if (usedAmount <= 0n) return 'OPEN';
  if (usedAmount >= amount) return 'USED';
  return 'PARTIALLY_USED';
}
