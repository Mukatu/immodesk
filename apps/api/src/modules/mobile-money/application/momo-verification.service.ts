import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { IdempotencyService } from '../../platform/application/idempotency.service';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../../payments/domain/ports';
import { AllocationService } from '../../payments/application/allocation.service';
import { PaymentsQueryService } from '../../payments/application/payments-query.service';
import { computeFee } from '../domain/momo-rules';
import { MobileMoneyProviderRegistry } from '../infrastructure/mobile-money-provider.registry';
import { MomoQueryService, type MomoReader } from './momo-query.service';
import type { MomoTransactionView } from './momo-views';

/**
 * Confirmation d'une transaction Mobile Money agrégateur (contrat phase 4,
 * § « Confirmation ») : seule cette méthode — jamais le webhook — peut
 * passer un paiement `CONFIRMED`, après re-interrogation du fournisseur.
 */
@Injectable()
export class MomoVerificationService {
  private readonly logger = new Logger(MomoVerificationService.name);
  private admin: PrismaClient | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly queries: MomoQueryService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly idempotency: IdempotencyService,
    private readonly paymentsQueries: PaymentsQueryService,
    private readonly allocation: AllocationService,
    private readonly auditService: AuditService,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
  ) {}

  async refresh(
    organizationId: string,
    reader: MomoReader,
    id: string,
  ): Promise<MomoTransactionView> {
    await this.verifyStatus(organizationId, id, true);
    return this.queries.get(organizationId, reader, id);
  }

  async verifyStatus(organizationId: string, transactionId: string, force = false): Promise<void> {
    const scope = `momo:verify-status:${transactionId}`;
    let recordId: string | null = null;
    if (!force) {
      const lookup = await this.idempotency
        .begin({
          organizationId,
          userId: null,
          key: transactionId,
          scope,
          method: 'JOB',
          path: scope,
          requestHash: scope,
        })
        .catch((error: unknown) => {
          if (error instanceof DomainError && error.code === 'PLATFORM.IDEMPOTENCY_IN_PROGRESS')
            return null;
          throw error;
        });
      if (!lookup) return;
      if (lookup.replay) return;
      recordId = lookup.recordId ?? null;
    }

    try {
      let receiptIds: string[] = [];
      await this.prisma.withTenant(organizationId, null, async (tx) => {
        const row = await this.queries.lock(tx, transactionId);
        if (row.channel !== 'AGGREGATOR' || row.status !== 'PENDING') return;
        const providerRef = row.aggregator_transaction_id ?? row.merchant_reference;
        const provider = this.registry.forCode(row.aggregator ?? 'SIMULATOR');
        const status = await provider.getStatus(providerRef);
        await tx.mobile_money_transactions.update({
          where: { id: transactionId },
          data: { status_checked_at: new Date(), status_check_count: { increment: 1 } },
        });
        if (status.state === 'FAILED') {
          await this.markFailed(
            tx,
            organizationId,
            row,
            status.failureCode ?? null,
            status.failureMessage ?? null,
          );
        } else if (status.state === 'SUCCEEDED') {
          const outcome = await this.confirmOrMismatch(
            tx,
            organizationId,
            row,
            status.amount ?? row.amount,
            status.feeAmount,
          );
          receiptIds = outcome.receiptIds;
        }
      });
      await this.receipts?.scheduleGeneration(organizationId, receiptIds);
    } finally {
      if (recordId)
        await this.idempotency.complete({
          organizationId,
          userId: null,
          recordId,
          status: 200,
          body: {},
        });
    }
  }

  private async markFailed(
    tx: TenantClient,
    organizationId: string,
    row: { id: string; payment_id: string | null; status: string; amount: bigint },
    failureCode: string | null,
    failureMessage: string | null,
  ): Promise<void> {
    await tx.mobile_money_transactions.update({
      where: { id: row.id },
      data: {
        status: 'FAILED',
        failure_code: failureCode,
        failure_message: failureMessage,
        completed_at: new Date(),
      },
    });
    if (row.payment_id) {
      await tx.payments.update({
        where: { id: row.payment_id },
        data: {
          status: 'REJECTED',
          rejected_at: new Date(),
          rejection_reason: failureMessage ?? 'Échec fournisseur.',
        },
      });
    }
    await audit(this.auditService, tx, {
      organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.MOMO_FAILED,
      entityType: 'mobile_money_transactions',
      entityId: row.id,
      newState: toJsonState({ status: 'FAILED', failureCode, failureMessage }),
    });
  }

  private async confirmOrMismatch(
    tx: TenantClient,
    organizationId: string,
    row: {
      id: string;
      payment_id: string | null;
      amount: bigint;
      fee_bearer: string;
      invoice_id: string | null;
    },
    confirmedAmount: bigint,
    providerFee: bigint | undefined,
  ): Promise<{ receiptIds: string[] }> {
    if (confirmedAmount !== row.amount) {
      if (row.payment_id) {
        await tx.payments.update({
          where: { id: row.payment_id },
          data: { status: 'PENDING_VERIFICATION' },
        });
      }
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MOMO_STATUS_MISMATCH,
        entityType: 'mobile_money_transactions',
        entityId: row.id,
        newState: toJsonState({ expected: row.amount, confirmed: confirmedAmount }),
      });
      this.logger.warn(
        `MOMO.STATUS_MISMATCH transaction=${row.id} attendu=${row.amount} recu=${confirmedAmount}`,
      );
      return { receiptIds: [] };
    }

    const feeAmount = providerFee ?? computeFee(row.amount, 0);
    await tx.mobile_money_transactions.update({
      where: { id: row.id },
      data: {
        status: 'SUCCEEDED',
        fee_amount: feeAmount,
        net_amount: row.amount - feeAmount,
        completed_at: new Date(),
      },
    });
    if (!row.payment_id) return { receiptIds: [] };
    await tx.payments.update({
      where: { id: row.payment_id },
      data: {
        status: 'CONFIRMED',
        confirmed_at: new Date(),
        fee_amount: feeAmount,
        net_amount: row.amount - feeAmount,
      },
    });
    const payment = await this.paymentsQueries.lock(tx, row.payment_id);
    const outcome = await this.allocation.allocate(
      tx,
      payment,
      row.invoice_id
        ? { mode: 'EXPLICIT', allocations: [{ invoiceId: row.invoice_id, amount: row.amount }] }
        : { mode: 'AUTO' },
      { settle: true, today: new Date(), actorUserId: null },
    );
    await audit(this.auditService, tx, {
      organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.MOMO_CONFIRMED,
      entityType: 'mobile_money_transactions',
      entityId: row.id,
      newState: toJsonState({ status: 'SUCCEEDED', feeAmount }),
    });
    if (!this.receipts || outcome.paidInvoiceIds.length === 0) return { receiptIds: [] };
    return {
      receiptIds: await this.receipts.issueForPaidInvoices(tx, {
        organizationId: payment.organization_id,
        paymentId: payment.id,
        invoiceIds: outcome.paidInvoiceIds,
        today: new Date(),
      }),
    };
  }

  adminClient(): PrismaClient {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    return this.admin;
  }
}
