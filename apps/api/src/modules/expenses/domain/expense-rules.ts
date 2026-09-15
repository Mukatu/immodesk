import { DomainError } from '../../../shared/errors/domain-error';
import { roundHalfUp } from '../../billing/domain/invoice-lines';

/** Énumération SQL `expense_status`. */
export const EXPENSE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PAID',
  'REBILLED',
  'REJECTED',
  'CANCELLED',
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** Énumération SQL `expense_bearer`. */
export const EXPENSE_BEARERS = ['LANDLORD', 'TENANT', 'ORGANIZATION'] as const;
export type ExpenseBearer = (typeof EXPENSE_BEARERS)[number];

/** Énumération SQL `expense_category`. */
export const EXPENSE_CATEGORIES = [
  'REPAIR',
  'MAINTENANCE',
  'PLUMBING',
  'ELECTRICITY',
  'CLEANING',
  'SECURITY',
  'UTILITY_BILL',
  'TAX',
  'INSURANCE',
  'SYNDIC_FEE',
  'LEGAL_FEE',
  'TRAVEL',
  'SUPPLIES',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * `vat_amount = round(amount × vat_rate_bps / 10 000)`, arrondi au plus
 * proche (moitié vers le haut), jamais de flottant. Réutilise
 * `roundHalfUp` de `billing/domain/invoice-lines.ts` : même règle
 * d'arrondi que les lignes de facture, un seul endroit qui la définit.
 */
export function computeVat(amount: bigint, vatRateBps: number): bigint {
  if (vatRateBps <= 0) return 0n;
  return roundHalfUp(amount * BigInt(vatRateBps), 10_000n);
}

export interface ExpenseAmounts {
  amount: bigint;
  vatAmount: bigint;
  totalAmount: bigint;
}

export function computeAmounts(amount: bigint, vatRateBps: number): ExpenseAmounts {
  const vatAmount = computeVat(amount, vatRateBps);
  return { amount, vatAmount, totalAmount: amount + vatAmount };
}

const EDITABLE_STATUSES: readonly ExpenseStatus[] = ['DRAFT', 'SUBMITTED'];

/**
 * `PATCH /{id}` (contrat, règle 5) : modifiable seulement DRAFT/SUBMITTED
 * ET si `owner_statement_id IS NULL`. Le verrou de relevé prime sur le
 * statut : une dépense `APPROVED` déjà rattachée à un relevé émis reste
 * verrouillée même si un futur statut l'aurait rendue éditable.
 */
export function assertExpenseEditable(
  status: ExpenseStatus,
  ownerStatementId: string | null,
): void {
  if (ownerStatementId !== null) {
    throw new DomainError('AGENCY.EXPENSE_LOCKED', { ownerStatementId });
  }
  if (!EDITABLE_STATUSES.includes(status)) {
    throw new DomainError('AGENCY.EXPENSE_INVALID_TRANSITION', {
      status,
      allowed: EDITABLE_STATUSES,
      action: 'PATCH',
    });
  }
}

export function assertSubmittable(status: ExpenseStatus): void {
  if (status !== 'DRAFT') {
    throw new DomainError('AGENCY.EXPENSE_INVALID_TRANSITION', {
      status,
      target: 'SUBMITTED',
      allowed: ['DRAFT'],
    });
  }
}

export function assertApprovable(status: ExpenseStatus): void {
  if (status !== 'SUBMITTED') {
    throw new DomainError('AGENCY.EXPENSE_INVALID_TRANSITION', {
      status,
      target: 'APPROVED',
      allowed: ['SUBMITTED'],
    });
  }
}

export function assertRejectable(status: ExpenseStatus, reason: string | undefined): void {
  if (status !== 'SUBMITTED') {
    throw new DomainError('AGENCY.EXPENSE_INVALID_TRANSITION', {
      status,
      target: 'REJECTED',
      allowed: ['SUBMITTED'],
    });
  }
  if (!reason?.trim()) {
    throw new DomainError('AGENCY.EXPENSE_REJECTION_REASON_REQUIRED', {});
  }
}
