import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { InvoiceRow } from '../../billing/application/invoice-views';
import { toIsoDate } from '../../leases/domain/calendar';
import { NumberingService } from '../../numbering/application/numbering.service';
import type { ReceiptIssuer } from '../../payments/domain/ports';
import {
  newVerificationToken,
  receiptContentHash,
  verificationUrlOf,
} from '../domain/receipt-rules';
import { FinancialDocumentsPipeline } from '../infrastructure/financial-documents.pipeline';

/**
 * Port `RECEIPT_ISSUER` : naissance et annulation des quittances, dans la
 * transaction du paiement.
 *
 * Une facture qui passe PAID reçoit UNE quittance `QUI-{YYYYMM}-{seq}` au
 * statut GENERATING ; le rendu PDF et l'envoi viennent APRÈS le COMMIT, par
 * le pipeline. Un paiement partiel n'émet rien : le reçu de caisse en tient
 * lieu (contrat).
 */
@Injectable()
export class ReceiptIssuerService implements ReceiptIssuer {
  constructor(
    private readonly numbering: NumberingService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
    @Inject(forwardRef(() => FinancialDocumentsPipeline))
    private readonly pipeline: FinancialDocumentsPipeline,
  ) {}

  async issueForPaidInvoices(
    tx: TenantClient,
    input: {
      organizationId: string;
      paymentId: string;
      invoiceIds: readonly string[];
      today: Date;
    },
  ): Promise<string[]> {
    const created: string[] = [];
    for (const invoiceId of new Set(input.invoiceIds)) {
      const existing = await tx.receipts.findFirst({
        where: { invoice_id: invoiceId, status: { not: 'CANCELLED' } },
        select: { id: true },
      });
      if (existing) continue;
      const rows = await tx.$queryRawUnsafe<InvoiceRow[]>(
        `SELECT * FROM rent_invoices WHERE id = $1::uuid`,
        invoiceId,
      );
      const invoice = rows[0];
      if (!invoice || invoice.status !== 'PAID') continue;

      const remaining = await tx.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT coalesce(sum(balance_amount), 0)::bigint AS total FROM rent_invoices
          WHERE lease_id = $1::uuid AND status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')`,
        invoice.lease_id,
      );
      const { number } = await this.numbering.nextNumber(
        tx,
        input.organizationId,
        'RECEIPT',
        input.today,
      );
      const token = newVerificationToken();
      const url = verificationUrlOf(this.config.get('PUBLIC_WEB_BASE_URL'), token);
      const id = newId();
      const contentHash = receiptContentHash({
        receiptNumber: number,
        organizationId: input.organizationId,
        tenantId: invoice.tenant_id,
        paymentId: input.paymentId,
        invoiceId: invoice.id,
        periodStart: toIsoDate(invoice.period_start),
        periodEnd: toIsoDate(invoice.period_end),
        rentAmount: invoice.rent_amount,
        chargesAmount: invoice.charges_amount,
        penaltyAmount: invoice.penalty_amount,
        totalAmount: invoice.total_amount,
      });

      await tx.receipts.create({
        data: {
          id,
          organization_id: input.organizationId,
          payment_id: input.paymentId,
          invoice_id: invoice.id,
          lease_id: invoice.lease_id,
          tenant_id: invoice.tenant_id,
          landlord_id: invoice.landlord_id,
          unit_id: invoice.unit_id,
          receipt_number: number,
          status: 'GENERATING',
          period_start: invoice.period_start,
          period_end: invoice.period_end,
          issue_date: input.today,
          rent_amount: invoice.rent_amount,
          charges_amount: invoice.charges_amount,
          penalty_amount: invoice.penalty_amount,
          total_amount: invoice.total_amount,
          remaining_balance_amount: remaining[0]?.total ?? 0n,
          verification_token: token,
          verification_url: url,
          qr_payload: url,
          content_hash: contentHash,
        },
      });
      await audit(this.auditService, tx, {
        organizationId: input.organizationId,
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.RECEIPT_CREATED,
        entityType: 'receipts',
        entityId: id,
        newState: toJsonState({
          receiptNumber: number,
          invoiceId: invoice.id,
          paymentId: input.paymentId,
        }),
      });
      created.push(id);
    }
    return created;
  }

  async cancelForReversal(
    tx: TenantClient,
    input: {
      organizationId: string;
      paymentId: string;
      invoiceIds: readonly string[];
      reason: string;
    },
  ): Promise<string[]> {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
      `WITH target AS (
         SELECT id, status::text AS status FROM receipts
          WHERE (payment_id = $1::uuid OR invoice_id = ANY($2::uuid[])) AND status <> 'CANCELLED'
          FOR UPDATE
       )
       UPDATE receipts r SET status = 'CANCELLED', cancelled_at = now(), cancellation_reason = $3, updated_at = now()
         FROM target WHERE r.id = target.id
       RETURNING r.id, target.status`,
      input.paymentId,
      [...input.invoiceIds],
      input.reason,
    );
    for (const row of rows) {
      await audit(this.auditService, tx, {
        organizationId: input.organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.RECEIPT_CANCELLED,
        entityType: 'receipts',
        entityId: row.id,
        previousState: toJsonState({ status: row.status }),
        newState: toJsonState({ status: 'CANCELLED', reason: input.reason }),
      });
    }
    return rows.map((r) => r.id);
  }

  async scheduleGeneration(organizationId: string, receiptIds: readonly string[]): Promise<void> {
    await this.pipeline.enqueueReceipts(organizationId, receiptIds);
  }
}
