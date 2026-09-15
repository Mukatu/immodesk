import { DomainError } from '../../../shared/errors/domain-error';

/** Énumération SQL `payout_status`. */
export const PAYOUT_STATUSES = [
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** Statuts de relevé (`statement_status`) admis en source d'un reversement (contrat, § Reversements). */
export const PAYABLE_STATEMENT_STATUSES = ['ISSUED', 'SENT'] as const;

/**
 * `PENDING` → `APPROVED` uniquement (contrat : validation par un `OWNER`).
 */
export function assertApprovable(status: PayoutStatus): void {
  if (status !== 'PENDING') {
    throw new DomainError('AGENCY.PAYOUT_INVALID_TRANSITION', {
      status,
      target: 'APPROVED',
      allowed: ['PENDING'],
    });
  }
}

/**
 * `APPROVED` → `PROCESSING` (exécution normale), `FAILED` → `PROCESSING`
 * (contrat : « nouvelle tentative possible sans recréer le reversement » —
 * DÉCISION documentée ici : plutôt qu'une route dédiée, `POST /{id}/execute`
 * rejoué accepte aussi un reversement `FAILED` en entrée) ET `PROCESSING` →
 * `PROCESSING`/`PAID` (contrat : « une route `POST /{id}/execute` rejouée
 * peut réinterroger `getStatus` si déjà `PROCESSING` avec un
 * `momo_transaction_id` » — Mobile Money seulement, voir
 * `owner-payouts.service.ts`, `executeMobileMoney`).
 */
const EXECUTABLE_STATUSES: readonly PayoutStatus[] = ['APPROVED', 'FAILED', 'PROCESSING'];

export function assertExecutable(status: PayoutStatus): void {
  if (!EXECUTABLE_STATUSES.includes(status)) {
    throw new DomainError('AGENCY.PAYOUT_INVALID_TRANSITION', {
      status,
      target: 'PROCESSING',
      allowed: EXECUTABLE_STATUSES,
    });
  }
}

/**
 * `PROCESSING` → `FAILED` (échec en cours d'exécution) ET `APPROVED` →
 * `FAILED` (contrat : « ou APPROVED si l'exécution échoue avant même de
 * démarrer », par exemple un opérateur Mobile Money indisponible avant tout
 * appel `initiate`). Motif obligatoire.
 */
const FAILABLE_STATUSES: readonly PayoutStatus[] = ['PROCESSING', 'APPROVED'];

export function assertFailable(status: PayoutStatus, reason: string | undefined): void {
  if (!FAILABLE_STATUSES.includes(status)) {
    throw new DomainError('AGENCY.PAYOUT_INVALID_TRANSITION', {
      status,
      target: 'FAILED',
      allowed: FAILABLE_STATUSES,
    });
  }
  if (!reason?.trim()) {
    throw new DomainError('AGENCY.PAYOUT_FAILURE_REASON_REQUIRED', {});
  }
}

/**
 * Précondition de création (contrat, § Reversements) : le relevé cible doit
 * être `ISSUED` ou `SENT`. DÉCISION (demandée par le prompt de tâche) : un
 * statut hors de cet ensemble lève `AGENCY.PAYOUT_INVALID_TRANSITION` avec le
 * statut du relevé en détail — `AGENCY.STATEMENT_BALANCE_NOT_POSITIVE` reste
 * réservé au seul cas du solde nul ou négatif (contrôle distinct, voir
 * `assertStatementBalancePositive`), pour ne jamais mélanger « mauvais
 * statut » et « mauvais solde » dans le même code d'erreur.
 */
export function assertStatementPayoutSource(status: string): void {
  if (!PAYABLE_STATEMENT_STATUSES.includes(status as (typeof PAYABLE_STATEMENT_STATUSES)[number])) {
    throw new DomainError('AGENCY.PAYOUT_INVALID_TRANSITION', {
      statementStatus: status,
      allowed: PAYABLE_STATEMENT_STATUSES,
      action: 'create',
    });
  }
}

export function assertStatementBalancePositive(netPayableAmount: bigint): void {
  if (netPayableAmount <= 0n) {
    throw new DomainError('AGENCY.STATEMENT_BALANCE_NOT_POSITIVE', {});
  }
}

export function assertNoExistingPayout(hasNonCancelledPayout: boolean): void {
  if (hasNonCancelledPayout) {
    throw new DomainError('AGENCY.PAYOUT_ALREADY_EXISTS', {});
  }
}
