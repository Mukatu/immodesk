import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { PrismaClient } from '../../../generated/prisma/client';
import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../../payments/domain/ports';
import { AllocationService } from '../../payments/application/allocation.service';
import { PaymentsQueryService } from '../../payments/application/payments-query.service';
import {
  assertMomoTransition,
  computeFee,
  providerConfirmsAmount,
  type MomoStatus,
} from '../domain/momo-rules';
import type { MobileMoneyProvider, ProviderStatus } from '../domain/ports';
import type { CheckOrigin } from '../domain/reconcile-rules';
import { MobileMoneyProviderRegistry } from '../infrastructure/mobile-money-provider.registry';
import { MomoPayoutService } from './momo-payout.service';
import { MomoQueryService, type MomoReader } from './momo-query.service';
import { MomoStatusChecker } from './momo-status-checker';
import type { MomoTransactionSummaryRow, MomoTransactionView } from './momo-views';

/**
 * Confirmation d'une transaction Mobile Money agrégateur (contrat phase 4,
 * § « Confirmation ») : seule cette méthode — jamais le webhook — peut
 * passer un paiement `CONFIRMED`, après re-interrogation du fournisseur.
 */
@Injectable()
export class MomoVerificationService {
  private readonly logger = new Logger(MomoVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queries: MomoQueryService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly paymentsQueries: PaymentsQueryService,
    private readonly allocation: AllocationService,
    private readonly payouts: MomoPayoutService,
    private readonly statusChecker: MomoStatusChecker,
    private readonly auditService: AuditService,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
  ) {}

  async refresh(
    organizationId: string,
    reader: MomoReader,
    id: string,
  ): Promise<MomoTransactionView> {
    await this.verifyStatus(organizationId, id);
    return this.queries.get(organizationId, reader, id);
  }

  /**
   * Pas d'idempotence à réponse mémorisée ici : une première vérification
   * PENDING ne doit jamais empêcher la suivante (webhook SUCCEEDED, rattrapage)
   * d'interroger le fournisseur. `SELECT ... FOR UPDATE` sérialise déjà les
   * appels concurrents, et un appel sur une transaction terminale est sans effet.
   */
  async verifyStatus(
    organizationId: string,
    transactionId: string,
    hint?: { providerReference?: string; origin?: CheckOrigin },
  ): Promise<void> {
    const origin = hint?.origin ?? 'REFRESH';
    const meta = await this.prisma.withTenant(organizationId, null, (tx) =>
      tx.mobile_money_transactions.findFirst({
        where: { id: transactionId },
        select: { purpose: true },
      }),
    );
    if (!meta) throw new DomainError('MOMO.NOT_FOUND', { momoTransactionId: transactionId });
    // Garde-fou : un abonnement n'est jamais traité ici (sa facture ne serait
    // pas payée).
    if (meta.purpose === 'SUBSCRIPTION') {
      this.logger.warn(
        `MOMO.VERIFY_PURPOSE_MISMATCH transaction=${transactionId} purpose=${meta.purpose} : ignorée par le flux loyer`,
      );
      return;
    }
    // Une vérification est d'abord RÉSERVÉE dans sa propre transaction (anti-abus, compteur) :
    // elle reste comptée même si l'appel au fournisseur échoue et annule la suite.
    if (!(await this.statusChecker.claim(organizationId, transactionId, origin))) return;
    // Un reversement est délégué au décaissement, qui n'appelle le fournisseur qu'HORS
    // transaction (l'ordre d'exécution d'un retrait est un virement réel, jamais rejouable).
    if (meta.purpose === 'OWNER_PAYOUT') {
      await this.payouts.verifyPayout(organizationId, transactionId);
      return;
    }
    let receiptIds: string[] = [];
    await this.prisma.withTenant(organizationId, null, async (tx) => {
      const row = await this.queries.lock(tx, transactionId);
      if (row.channel !== 'AGGREGATOR') return;
      const provider = this.registry.forCode(row.aggregator ?? 'SIMULATOR');
      // Callback sur une transaction déjà EXPIRED : jamais de transition silencieuse, mais un
      // succès conforme du fournisseur est un paiement perdu à signaler (alerte d'exploitation).
      if (row.status === 'EXPIRED') {
        await this.flagLateSuccess(tx, provider, row, hint);
        return;
      }
      // INITIATED est vérifiable : un webhook peut précéder la réponse d'initiation.
      if (!['INITIATED', 'PENDING'].includes(row.status)) return;
      const status = await this.statusChecker.check(tx, provider, row, 'COLLECTION', hint);
      if (!status) return;
      if (status.state === 'FAILED') {
        await this.markFailed(
          tx,
          organizationId,
          row,
          status.failureCode ?? null,
          status.failureMessage ?? null,
        );
      } else if (status.state === 'SUCCEEDED') {
        const outcome = await this.confirmOrMismatch(tx, organizationId, row, status);
        receiptIds = outcome.receiptIds;
      }
    });
    await this.receipts?.scheduleGeneration(organizationId, receiptIds);
  }

  /** Succès conforme sur une transaction expirée : journal d'erreur, aucune écriture. */
  private async flagLateSuccess(
    tx: TenantClient,
    provider: MobileMoneyProvider,
    row: MomoTransactionSummaryRow,
    hint?: { providerReference?: string },
  ): Promise<void> {
    if (provider.webhookTrust !== 'UNSIGNED_TRIGGER' || !row.aggregator_transaction_id) return;
    const status = await this.statusChecker.check(tx, provider, row, 'COLLECTION', hint);
    if (
      status?.state === 'SUCCEEDED' &&
      status.matched === true &&
      providerConfirmsAmount(status, row)
    ) {
      this.logger.error(
        `MOMO.LATE_SUCCESS_ON_EXPIRED transaction=${row.id} organisation=${row.organization_id} reference=${status.providerReference} : paiement réussi chez le fournisseur sur une transaction EXPIRED, aucune écriture automatique : décision humaine requise.`,
      );
    }
  }

  private async markFailed(
    tx: TenantClient,
    organizationId: string,
    row: { id: string; payment_id: string | null; status: string; amount: bigint },
    failureCode: string | null,
    failureMessage: string | null,
  ): Promise<void> {
    assertMomoTransition(row.status as MomoStatus, 'FAILED');
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
      status: string;
      amount: bigint;
      currency: string;
      fee_bearer: string;
      invoice_id: string | null;
    },
    status: ProviderStatus,
  ): Promise<{ receiptIds: string[] }> {
    const providerFee = status.feeAmount;
    if (!providerConfirmsAmount(status, row)) {
      const confirmedAmount = status.amount ?? null;
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
        newState: toJsonState({
          expected: row.amount,
          confirmed: confirmedAmount,
          expectedCurrency: row.currency,
          confirmedCurrency: status.currency ?? null,
        }),
      });
      this.logger.warn(
        `MOMO.STATUS_MISMATCH transaction=${row.id} attendu=${row.amount} ${row.currency} recu=${confirmedAmount ?? 'absent'} ${status.currency ?? 'devise absente'}`,
      );
      return { receiptIds: [] };
    }

    const feeAmount = providerFee ?? computeFee(row.amount, 0);
    assertMomoTransition(row.status as MomoStatus, 'SUCCEEDED');
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
    const admin = this.prisma.adminClient();
    if (!admin)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'DATABASE_ADMIN_URL absent' });
    return admin;
  }
}
