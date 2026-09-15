import { DomainError } from '../../../shared/errors/domain-error';
import { monthBounds } from '../../../shared/time/business-date';

/** Énumération SQL `statement_status`. Ni `VALIDATED` ni `APPROVED` : « valider » = `ISSUED`. */
export const STATEMENT_STATUSES = ['DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELLED'] as const;
export type StatementStatus = (typeof STATEMENT_STATUSES)[number];

/** Énumération SQL `owner_statement_line_type`. */
export const OWNER_STATEMENT_LINE_TYPES = [
  'RENT_COLLECTED',
  'CHARGE_COLLECTED',
  'COMMISSION',
  'EXPENSE',
  'VAT',
  'DEPOSIT_HELD',
  'CARRY_FORWARD',
  'ADJUSTMENT',
  'OTHER',
] as const;
export type OwnerStatementLineType = (typeof OWNER_STATEMENT_LINE_TYPES)[number];

/** `DRAFT` → `ISSUED` uniquement (contrat, § Machine à états). */
export function assertIssuable(status: StatementStatus): void {
  if (status !== 'DRAFT') {
    throw new DomainError('AGENCY.STATEMENT_NOT_ISSUABLE', { status });
  }
}

const CANCELLABLE_STATUSES: readonly StatementStatus[] = ['DRAFT', 'ISSUED'];

/** `DRAFT` ou `ISSUED` → `CANCELLED`, motif obligatoire ; `SENT`/`PAID` : jamais. */
export function assertCancellable(status: StatementStatus, reason: string | undefined): void {
  if (!CANCELLABLE_STATUSES.includes(status)) {
    throw new DomainError('AGENCY.STATEMENT_NOT_CANCELLABLE', { status });
  }
  if (!reason?.trim()) {
    throw new DomainError('AGENCY.STATEMENT_CANCEL_REASON_REQUIRED', {});
  }
}

/** `ISSUED` → `SENT` (message remis) : voir `OwnerStatementsService.markSent`. */
export function assertSendable(status: StatementStatus): void {
  if (status !== 'ISSUED' && status !== 'SENT') {
    throw new DomainError('AGENCY.STATEMENT_INVALID_TRANSITION', { status, target: 'SENT' });
  }
}

/**
 * `ISSUED` ou `SENT` → `PAID` (contrat : posé par le futur module
 * `owner-payouts` via `OwnerStatementsService.markPaid`, pas exposé en HTTP
 * par ce module). Idempotent : `PAID` → `PAID` ne lève pas.
 */
export function assertPayable(status: StatementStatus): void {
  if (status === 'PAID') return;
  if (status !== 'ISSUED' && status !== 'SENT') {
    throw new DomainError('AGENCY.STATEMENT_INVALID_TRANSITION', { status, target: 'PAID' });
  }
}

/**
 * `netPayableAmount = collecté − honoraires − TVA − dépenses + report`. Le
 * report (`carryForwardAmount`) est déjà SIGNÉ (négatif s'il réduit le net à
 * reverser, contrat arbitrage n°5) : on l'ADDITIONNE, ce qui revient bien à
 * le retrancher puisqu'il est négatif.
 */
export function computeNetPayable(
  rentCollectedAmount: bigint,
  chargesCollectedAmount: bigint,
  commissionAmount: bigint,
  commissionVatAmount: bigint,
  expensesAmount: bigint,
  carryForwardAmount: bigint,
): bigint {
  return (
    rentCollectedAmount +
    chargesCollectedAmount -
    commissionAmount -
    commissionVatAmount -
    expensesAmount +
    carryForwardAmount
  );
}

/**
 * Taux de recouvrement `encaissé / appelé`, en points de base. `null` si le
 * dû est nul ou négatif (rien d'appelé, aucun taux à afficher) — le contrat
 * ne teste pas strictement ce champ (§ Campagne, étape 8).
 */
export function computeCollectionRateBps(
  rentCollectedAmount: bigint,
  rentDueAmount: bigint,
): number | null {
  if (rentDueAmount <= 0n) return null;
  const bps = (rentCollectedAmount * 10_000n) / rentDueAmount;
  return Number(bps > 10_000n ? 10_000n : bps);
}

/**
 * Bornes du mois civil PRÉCÉDENT une date métier (contrat, § Campagne :
 * « pour la période du mois civil précédent »). Réutilise `monthBounds`
 * (`shared/time/business-date.ts`), déjà éprouvé par la facturation.
 */
export function previousMonthPeriod(today: Date): { start: Date; end: Date } {
  const firstOfCurrentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const prev = new Date(firstOfCurrentMonth.getTime() - 1);
  const period = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
  const bounds = monthBounds(period);
  if (!bounds) throw new Error(`Période inattendue : ${period}.`);
  return bounds;
}
