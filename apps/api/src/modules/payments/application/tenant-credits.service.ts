import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { InvoiceLedgerService } from '../../billing/application/invoice-ledger.service';
import { InvoicesQueryService } from '../../billing/application/invoices-query.service';
import type { InvoiceDetailView } from '../../billing/application/invoice-views';
import { OPEN_INVOICE_STATUSES, type InvoiceStatus } from '../../billing/domain/invoice-status';
import { creditStatusOf } from '../domain/payment-rules';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../domain/ports';
import { toTenantCreditView, type TenantCreditRow, type TenantCreditView } from './payment-views';

/**
 * Avoirs locataire : consultation et imputation sur une facture ultérieure.
 *
 * `payment_allocations_target_chk` exige UNE seule cible par ligne (facture,
 * dépôt OU avoir). L'imputation d'un avoir s'écrit donc en DEUX lignes sur le
 * paiement source : une contre-imputation de l'avoir (`is_reversal`,
 * `tenant_credit_id`) et une imputation de la facture. La somme des
 * imputations nettes du paiement reste égale à son montant, et aucun nouveau
 * paiement n'est créé (contrat).
 */
@Injectable()
export class TenantCreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: InvoiceLedgerService,
    private readonly invoices: InvoicesQueryService,
    private readonly auditService: AuditService,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    tenantId: string,
  ): Promise<{ remainingAmount: number; items: TenantCreditView[] }> {
    const rows = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const tenant = await tx.tenants.findFirst({ where: { id: tenantId }, select: { id: true } });
      if (!tenant) throw new DomainError('PARTIES.TENANT_NOT_FOUND', { tenantId });
      return tx.$queryRawUnsafe<TenantCreditRow[]>(
        `SELECT * FROM tenant_credits WHERE tenant_id = $1::uuid ORDER BY created_at DESC, id DESC`,
        tenantId,
      );
    });
    const remaining = rows
      .filter((r) => r.status === 'OPEN' || r.status === 'PARTIALLY_USED')
      .reduce((total, r) => total + r.remaining_amount, 0n);
    return { remainingAmount: toJsonAmount(remaining), items: rows.map(toTenantCreditView) };
  }

  async apply(
    organizationId: string,
    userId: string,
    tenantId: string,
    creditId: string,
    input: { invoiceId: string; amount?: bigint },
  ): Promise<{ credit: TenantCreditView; invoice: InvoiceDetailView }> {
    const today = businessToday();
    const { result, receiptIds } = await this.prisma.withTenant(
      organizationId,
      userId,
      async (tx) => {
        const credits = await tx.$queryRawUnsafe<TenantCreditRow[]>(
          `SELECT * FROM tenant_credits WHERE id = $1::uuid AND tenant_id = $2::uuid FOR UPDATE`,
          creditId,
          tenantId,
        );
        const credit = credits[0];
        if (!credit) throw new DomainError('PAYMENTS.CREDIT_NOT_FOUND', { creditId });
        if (
          !['OPEN', 'PARTIALLY_USED'].includes(credit.status) ||
          credit.remaining_amount <= 0n ||
          !credit.source_payment_id
        ) {
          throw new DomainError('PAYMENTS.CREDIT_NOT_APPLICABLE', {
            creditId,
            status: credit.status,
          });
        }
        const sourcePaymentId = credit.source_payment_id;

        const [invoice] = await this.ledger.lockByIds(tx, [input.invoiceId]);
        if (!invoice)
          throw new DomainError('BILLING.INVOICE_NOT_FOUND', { invoiceId: input.invoiceId });
        if (invoice.tenant_id !== tenantId) {
          throw new DomainError('PAYMENTS.INVOICE_TENANT_MISMATCH', { invoiceId: invoice.id });
        }
        if (
          !OPEN_INVOICE_STATUSES.includes(invoice.status as InvoiceStatus) ||
          invoice.balance_amount <= 0n
        ) {
          throw new DomainError('PAYMENTS.INVOICE_NOT_OPEN', {
            invoiceId: invoice.id,
            status: invoice.status,
          });
        }
        const ceiling =
          credit.remaining_amount < invoice.balance_amount
            ? credit.remaining_amount
            : invoice.balance_amount;
        const amount = input.amount ?? ceiling;
        if (amount <= 0n || amount > ceiling) {
          throw new DomainError('PAYMENTS.OVER_ALLOCATED', {
            requested: amount.toString(),
            available: ceiling.toString(),
          });
        }

        const creditAllocation = await tx.payment_allocations.findFirst({
          where: { tenant_credit_id: creditId, payment_id: sourcePaymentId, is_reversal: false },
          select: { id: true },
        });
        await tx.payment_allocations.create({
          data: {
            id: newId(),
            organization_id: organizationId,
            payment_id: sourcePaymentId,
            tenant_credit_id: creditId,
            amount,
            allocation_date: today,
            is_reversal: true,
            reversal_of_id: creditAllocation?.id ?? null,
            created_by_user_id: userId,
          },
        });
        await tx.payment_allocations.create({
          data: {
            id: newId(),
            organization_id: organizationId,
            payment_id: sourcePaymentId,
            invoice_id: invoice.id,
            amount,
            allocation_date: today,
            created_by_user_id: userId,
          },
        });
        const updated = await this.ledger.applyAmount(tx, invoice, amount, today, sourcePaymentId);

        const used = credit.used_amount + amount;
        await tx.$executeRawUnsafe(
          `UPDATE tenant_credits
            SET used_amount = $2::bigint, remaining_amount = amount - $2::bigint,
                status = $3::credit_status, updated_at = now()
          WHERE id = $1::uuid`,
          creditId,
          used.toString(),
          creditStatusOf(credit.amount, used),
        );
        await audit(this.auditService, tx, {
          action: 'UPDATE',
          operation: AUDIT_OPERATIONS.TENANT_CREDIT_APPLIED,
          entityType: 'tenant_credits',
          entityId: creditId,
          previousState: toJsonState({ usedAmount: credit.used_amount, status: credit.status }),
          newState: toJsonState({ usedAmount: used, invoiceId: invoice.id, amount }),
        });

        const receiptIds =
          updated.status === 'PAID' && this.receipts
            ? await this.receipts.issueForPaidInvoices(tx, {
                organizationId,
                paymentId: sourcePaymentId,
                invoiceIds: [updated.id],
                today,
              })
            : [];
        const refreshed = await tx.$queryRawUnsafe<TenantCreditRow[]>(
          `SELECT * FROM tenant_credits WHERE id = $1::uuid`,
          creditId,
        );
        return {
          result: {
            credit: toTenantCreditView(refreshed[0]),
            invoice: await this.invoices.detailIn(tx, invoice.id),
          },
          receiptIds,
        };
      },
    );
    await this.receipts?.scheduleGeneration(organizationId, receiptIds);
    return result;
  }
}
