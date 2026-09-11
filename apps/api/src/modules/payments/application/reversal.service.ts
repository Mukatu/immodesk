import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { InvoiceLedgerService } from '../../billing/application/invoice-ledger.service';
import { NumberingService } from '../../numbering/application/numbering.service';
import {
  CASH_RECEIPT_CANCELLER,
  RECEIPT_ISSUER,
  type CashReceiptCanceller,
  type ReceiptIssuer,
} from '../domain/ports';
import { PaymentsQueryService, type PaymentReader } from './payments-query.service';
import type { PaymentDetailView } from './payment-views';

interface AllocationToReverse {
  id: string;
  invoice_id: string | null;
  tenant_credit_id: string | null;
  amount: bigint;
}

/**
 * Contre-passation (docs/api/phase3-contract.md, § « Contre-passation »).
 *
 * Le paiement d'origine n'est PAS modifié : `guard_financial_row` verrouille
 * ses colonnes financières, et le contrat étend la règle à la ligne entière.
 * Une écriture miroir de sens opposé naît au statut REVERSED, chaque
 * imputation reçoit son imputation miroir (`is_reversal`), les factures
 * repassent ISSUED ou OVERDUE, l'avoir inutilisé est remboursé, quittances
 * et reçus de caisse liés sont annulés — le tout en une transaction.
 */
@Injectable()
export class ReversalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly ledger: InvoiceLedgerService,
    private readonly queries: PaymentsQueryService,
    private readonly auditService: AuditService,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
    @Optional()
    @Inject(CASH_RECEIPT_CANCELLER)
    private readonly cash: CashReceiptCanceller | null = null,
  ) {}

  async reverse(
    organizationId: string,
    reader: PaymentReader,
    paymentId: string,
    reason: string,
  ): Promise<{ original: PaymentDetailView; reversal: PaymentDetailView }> {
    const today = businessToday();
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const original = await this.queries.lock(tx, paymentId);
      const mirrorExists = await tx.payments.findFirst({
        where: { reversal_of_id: paymentId },
        select: { id: true },
      });
      if (mirrorExists || original.status === 'REVERSED') {
        throw new DomainError('PAYMENTS.ALREADY_REVERSED', { paymentId });
      }
      if (original.status !== 'CONFIRMED' || original.direction !== 'INBOUND') {
        throw new DomainError('PAYMENTS.INVALID_TRANSITION', {
          status: original.status,
          to: 'REVERSED',
        });
      }

      const credits = await tx.$queryRawUnsafe<
        Array<{ id: string; used_amount: bigint; status: string }>
      >(
        `SELECT id, used_amount, status::text AS status FROM tenant_credits
          WHERE source_payment_id = $1::uuid FOR UPDATE`,
        paymentId,
      );
      if (credits.some((c) => c.used_amount > 0n)) {
        throw new DomainError('PAYMENTS.CREDIT_ALREADY_USED', { paymentId });
      }

      const { number } = await this.numbering.nextNumber(tx, organizationId, 'REVERSAL', today);
      const reversalId = newId();
      await tx.payments.create({
        data: {
          id: reversalId,
          organization_id: organizationId,
          tenant_id: original.tenant_id,
          lease_id: original.lease_id,
          landlord_id: original.landlord_id,
          direction: 'OUTBOUND',
          method: original.method as never,
          status: 'REVERSED',
          reference: number,
          amount: original.amount,
          net_amount: original.amount,
          allocated_amount: original.amount,
          unallocated_amount: 0n,
          payment_date: today,
          received_by_user_id: reader.userId,
          reversed_at: new Date(),
          reversal_of_id: original.id,
          reversal_reason: reason,
        },
      });

      const toReverse = await tx.$queryRawUnsafe<AllocationToReverse[]>(
        `SELECT pa.id, pa.invoice_id, pa.tenant_credit_id, pa.amount
           FROM payment_allocations pa
          WHERE pa.payment_id = $1::uuid AND NOT pa.is_reversal
            AND NOT EXISTS (SELECT 1 FROM payment_allocations r WHERE r.reversal_of_id = pa.id)
          ORDER BY pa.allocation_order, pa.id`,
        paymentId,
      );
      const invoiceIds = toReverse.filter((a) => a.invoice_id).map((a) => a.invoice_id as string);
      const invoices = new Map((await this.ledger.lockByIds(tx, invoiceIds)).map((i) => [i.id, i]));
      const reopened: string[] = [];

      for (const allocation of toReverse) {
        await tx.payment_allocations.create({
          data: {
            id: newId(),
            organization_id: organizationId,
            payment_id: reversalId,
            invoice_id: allocation.invoice_id,
            tenant_credit_id: allocation.tenant_credit_id,
            amount: allocation.amount,
            allocation_date: today,
            is_reversal: true,
            reversal_of_id: allocation.id,
            created_by_user_id: reader.userId,
          },
        });
        if (allocation.invoice_id) {
          const current = invoices.get(allocation.invoice_id);
          if (!current) continue;
          const updated = await this.ledger.revertAmount(
            tx,
            current,
            allocation.amount,
            today,
            reversalId,
          );
          invoices.set(updated.id, updated);
          if (updated.status !== 'PAID') reopened.push(updated.id);
        }
      }

      for (const credit of credits) {
        await tx.$executeRawUnsafe(
          `UPDATE tenant_credits
              SET status = 'REFUNDED', remaining_amount = 0, refunded_at = now(),
                  reason = concat_ws(' — ', reason, $2::text), updated_at = now()
            WHERE id = $1::uuid`,
          credit.id,
          `Contre-passation ${number}`,
        );
        await audit(this.auditService, tx, {
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.TENANT_CREDIT_REFUNDED,
          entityType: 'tenant_credits',
          entityId: credit.id,
          previousState: toJsonState({ status: credit.status }),
          newState: toJsonState({ status: 'REFUNDED', reversalId }),
        });
      }

      await this.receipts?.cancelForReversal(tx, {
        organizationId,
        paymentId,
        invoiceIds: [...new Set(reopened)],
        reason,
      });
      await this.cash?.cancelForPayment(tx, { organizationId, paymentId, reason });

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.PAYMENT_REVERSED,
        entityType: 'payments',
        entityId: paymentId,
        previousState: toJsonState({ status: original.status }),
        newState: toJsonState({
          reversalId,
          reversalReference: number,
          reason,
          invoices: reopened,
        }),
      });

      return {
        original: await this.queries.detailIn(tx, paymentId),
        reversal: await this.queries.detailIn(tx, reversalId),
      };
    });
  }
}
