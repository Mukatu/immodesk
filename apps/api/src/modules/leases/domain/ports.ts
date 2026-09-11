import type { TenantClient } from '../../../shared/prisma/prisma.service';

/**
 * Ports sortants du module `leases`.
 *
 * `leases` et `deposits` se lisent mutuellement : l'activation d'un bail crée
 * le dépôt, et un mouvement de dépôt vérifie l'état du bail. Le cycle est
 * levé par deux ports `Symbol` — même procédé qu'en phase 1 avec
 * `PROPERTY_READER` ou `DOCUMENT_READER` —, si bien qu'aucun module n'importe
 * l'autre et qu'aucun `forwardRef` n'est nécessaire.
 *
 * Les ports prennent le client TRANSACTIONNEL : le dépôt naît dans la
 * transaction qui active le bail, jamais dans une seconde.
 */
export const DEPOSIT_WRITER = Symbol('DEPOSIT_WRITER');

export interface DepositCreationInput {
  leaseId: string;
  tenantId: string;
  requiredAmount: bigint;
  monthsEquivalent: number | null;
  dueDate: Date | null;
}

export interface DepositWriter {
  /** Crée la ligne `deposits` d'un bail activé. Idempotent par bail. */
  createForLease(tx: TenantClient, input: DepositCreationInput): Promise<{ id: string }>;

  /** Fixe `refund_due_date` à la clôture du bail. Sans effet si aucun dépôt. */
  scheduleRefund(tx: TenantClient, leaseId: string, refundDueDate: Date): Promise<void>;

  /** Détail du dépôt d'un bail, ou `null`. Sert à composer `LeaseDetail`. */
  findDetail(tx: TenantClient, leaseId: string): Promise<unknown | null>;
}
