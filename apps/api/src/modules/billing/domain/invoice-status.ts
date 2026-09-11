import { DomainError } from '../../../shared/errors/domain-error';
import { compareDates } from '../../leases/domain/calendar';

/** Énumération SQL `invoice_status`. */
export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Factures ouvertes : imputables, relançables, pénalisables. */
export const OPEN_INVOICE_STATUSES: readonly InvoiceStatus[] = [
  'ISSUED',
  'PARTIALLY_PAID',
  'OVERDUE',
];

/**
 * Machine à états de la facture (docs/api/phase3-contract.md, § « Machine à
 * états facture »), DÉCLARATIVE et exhaustive : toute transition absente est
 * refusée.
 *
 * - DRAFT → ISSUED (émission, numéro attribué) ou CANCELLED (abandon) ;
 * - ISSUED → PARTIALLY_PAID / PAID (encaissement), OVERDUE (cron), CANCELLED ;
 * - PARTIALLY_PAID → PAID, OVERDUE (cron), ISSUED (contre-passation totale) ;
 * - OVERDUE → PARTIALLY_PAID / PAID (encaissement), CANCELLED ;
 * - PAID → PARTIALLY_PAID / ISSUED / OVERDUE : contre-passation uniquement ;
 * - CANCELLED est terminal : le numéro n'est jamais réattribué.
 */
export const INVOICE_TRANSITIONS: Readonly<Record<InvoiceStatus, readonly InvoiceStatus[]>> = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
  PARTIALLY_PAID: ['ISSUED', 'PAID', 'OVERDUE'],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
  PAID: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'],
  CANCELLED: [],
};

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from].includes(to);
}

export function assertInvoiceTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  if (!canTransitionInvoice(from, to)) {
    throw new DomainError('BILLING.INVALID_TRANSITION', { from, to });
  }
}

/** Lignes modifiables uniquement en brouillon (409 BILLING.INVOICE_NOT_EDITABLE). */
export function assertInvoiceEditable(status: InvoiceStatus): void {
  if (status !== 'DRAFT') {
    throw new DomainError('BILLING.INVOICE_NOT_EDITABLE', { status });
  }
}

/**
 * Annulation : DRAFT, ISSUED ou OVERDUE, et jamais une facture qui porte un
 * encaissement — l'argent reçu doit d'abord être contre-passé.
 */
export function assertInvoiceCancellable(status: InvoiceStatus, paidAmount: bigint): void {
  if (paidAmount > 0n) {
    throw new DomainError('BILLING.INVOICE_HAS_PAYMENTS', { status });
  }
  assertInvoiceTransition(status, 'CANCELLED');
}

/**
 * Statut d'une facture après une imputation ou une contre-passation.
 *
 * Soldée → PAID ; rien d'encaissé → ISSUED, ou OVERDUE si la tolérance est
 * dépassée ; entre les deux → PARTIALLY_PAID (le cron la repasse OVERDUE si
 * la tolérance est dépassée, conformément au contrat). Brouillon et facture
 * annulée ne bougent pas : on n'impute jamais sur elles.
 */
export function settlementStatus(input: {
  current: InvoiceStatus;
  totalAmount: bigint;
  paidAmount: bigint;
  graceUntilDate: Date | null;
  today: Date;
}): InvoiceStatus {
  if (input.current === 'DRAFT' || input.current === 'CANCELLED') return input.current;
  if (input.paidAmount >= input.totalAmount) return 'PAID';
  if (input.paidAmount === 0n) {
    return isPastGrace(input.graceUntilDate, input.today) ? 'OVERDUE' : 'ISSUED';
  }
  return 'PARTIALLY_PAID';
}

/** Vrai si la tolérance est dépassée : `graceUntilDate < today`. */
export function isPastGrace(graceUntilDate: Date | null, today: Date): boolean {
  return graceUntilDate !== null && compareDates(graceUntilDate, today) < 0;
}
