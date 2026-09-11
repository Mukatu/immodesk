import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { InvoiceLedgerService } from '../../billing/application/invoice-ledger.service';
import type { InvoiceRow } from '../../billing/application/invoice-views';
import { OPEN_INVOICE_STATUSES, type InvoiceStatus } from '../../billing/domain/invoice-status';
import {
  assertAllocationInvariant,
  planAutoAllocation,
  planExplicitAllocation,
  type AllocationRequest,
  type OpenInvoice,
} from '../domain/allocation-engine';
import type { PaymentRow } from './payment-views';

export type AllocationMode =
  { mode: 'AUTO' } | { mode: 'EXPLICIT'; allocations: AllocationRequest[] };

export interface AllocationOutcome {
  /** Factures passées PAID par cette imputation : elles appellent une quittance. */
  paidInvoiceIds: string[];
  allocatedAmount: bigint;
  creditAmount: bigint;
  creditId: string | null;
}

function toOpenInvoice(row: InvoiceRow): OpenInvoice {
  return {
    id: row.id,
    dueDate: row.due_date,
    periodStart: row.period_start,
    createdAt: row.created_at,
    balance: row.balance_amount,
  };
}

/**
 * Imputation d'un paiement, dans la transaction de l'appelant.
 *
 * Chaque affectation écrit `payment_allocations` (append-only), met à jour la
 * facture par le grand livre de `billing`, puis `payments.allocated_amount /
 * unallocated_amount` — le tout dans la MÊME transaction. Le reliquat devient
 * un avoir `tenant_credits` et une affectation portant `tenant_credit_id`,
 * de sorte que « imputations + avoir = montant » soit vrai en base comme dans
 * le plan.
 */
@Injectable()
export class AllocationService {
  constructor(
    private readonly ledger: InvoiceLedgerService,
    private readonly auditService: AuditService,
  ) {}

  async allocate(
    tx: TenantClient,
    payment: PaymentRow,
    request: AllocationMode,
    options: { settle: boolean; today: Date; actorUserId: string | null },
  ): Promise<AllocationOutcome> {
    if (!payment.tenant_id) {
      throw new DomainError('PAYMENTS.INVOICE_TENANT_MISMATCH', { paymentId: payment.id });
    }
    const available = payment.unallocated_amount;

    const locked =
      request.mode === 'AUTO'
        ? await this.ledger.lockOpenForTenant(tx, payment.tenant_id)
        : await this.ledger.lockByIds(
            tx,
            request.allocations.map((a) => a.invoiceId),
          );
    for (const invoice of locked) {
      if (invoice.tenant_id !== payment.tenant_id) {
        throw new DomainError('PAYMENTS.INVOICE_TENANT_MISMATCH', { invoiceId: invoice.id });
      }
    }
    const open = locked
      .filter(
        (i) => OPEN_INVOICE_STATUSES.includes(i.status as InvoiceStatus) && i.balance_amount > 0n,
      )
      .map(toOpenInvoice);

    const plan =
      request.mode === 'AUTO'
        ? planAutoAllocation(available, open)
        : planExplicitAllocation(available, request.allocations, open, options.settle);
    assertAllocationInvariant(available, plan);

    const byId = new Map(locked.map((i) => [i.id, i]));
    const paidInvoiceIds: string[] = [];
    let allocated = 0n;
    for (const planned of plan.allocations) {
      await tx.payment_allocations.create({
        data: {
          id: newId(),
          organization_id: payment.organization_id,
          payment_id: payment.id,
          invoice_id: planned.invoiceId,
          amount: planned.amount,
          allocation_date: options.today,
          allocation_order: planned.order,
          created_by_user_id: options.actorUserId,
        },
      });
      const updated = await this.ledger.applyAmount(
        tx,
        byId.get(planned.invoiceId) as InvoiceRow,
        planned.amount,
        options.today,
        payment.id,
      );
      allocated += planned.amount;
      if (updated.status === 'PAID') paidInvoiceIds.push(updated.id);
    }

    let creditId: string | null = null;
    if (plan.creditAmount > 0n) {
      creditId = newId();
      await tx.tenant_credits.create({
        data: {
          id: creditId,
          organization_id: payment.organization_id,
          tenant_id: payment.tenant_id,
          lease_id: payment.lease_id,
          status: 'OPEN',
          origin: 'OVERPAYMENT',
          amount: plan.creditAmount,
          used_amount: 0n,
          remaining_amount: plan.creditAmount,
          source_payment_id: payment.id,
          reason: `Trop-perçu du paiement ${payment.reference}`,
        },
      });
      await tx.payment_allocations.create({
        data: {
          id: newId(),
          organization_id: payment.organization_id,
          payment_id: payment.id,
          tenant_credit_id: creditId,
          amount: plan.creditAmount,
          allocation_date: options.today,
          allocation_order: plan.allocations.length + 1,
          created_by_user_id: options.actorUserId,
        },
      });
      await audit(this.auditService, tx, {
        organizationId: payment.organization_id,
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.TENANT_CREDIT_CREATED,
        entityType: 'tenant_credits',
        entityId: creditId,
        newState: toJsonState({ amount: plan.creditAmount, sourcePaymentId: payment.id }),
      });
    }

    const delta = allocated + plan.creditAmount;
    if (delta > 0n) {
      await tx.$executeRawUnsafe(
        `UPDATE payments
            SET allocated_amount = allocated_amount + $2::bigint,
                unallocated_amount = unallocated_amount - $2::bigint,
                updated_at = now()
          WHERE id = $1::uuid`,
        payment.id,
        delta.toString(),
      );
      await audit(this.auditService, tx, {
        organizationId: payment.organization_id,
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.PAYMENT_ALLOCATED,
        entityType: 'payments',
        entityId: payment.id,
        newState: toJsonState({
          allocations: plan.allocations,
          creditAmount: plan.creditAmount,
          unallocatedAmount: plan.unallocatedAmount,
        }),
      });
    }
    return {
      paidInvoiceIds,
      allocatedAmount: allocated,
      creditAmount: plan.creditAmount,
      creditId,
    };
  }
}
