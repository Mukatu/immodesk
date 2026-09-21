import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import { detectOperator } from '../../mobile-money/domain/momo-rules';
import type {
  InitiatePaymentInput,
  InitiateResult,
  MobileMoneyProvider,
} from '../../mobile-money/domain/ports';
import { MobileMoneyProviderRegistry } from '../../mobile-money/infrastructure/mobile-money-provider.registry';
import {
  ReferralQualificationService,
  type PaidSubscriptionInvoiceEvent,
} from '../../referral/application/referral-qualification.service';
import { statusAfterPaymentConfirmed } from '../domain/subscription-lifecycle';
import { SubscriptionMomoVerifyQueue } from '../infrastructure/subscription-momo-verify.queue';

export interface PayInvoiceResult {
  transactionId: string;
  status: 'PENDING' | 'FAILED';
}

interface MobileMoneyTransactionRow {
  id: string;
  organization_id: string;
  status: string;
  aggregator: string | null;
  aggregator_transaction_id: string | null;
  merchant_reference: string;
  amount: bigint;
}

/**
 * Paiement Mobile Money d'une facture d'abonnement (contrat phase 10, route
 * `POST /v1/subscription-invoices/{id}/pay`).
 *
 * DISTINCT du paiement des loyers (`mobile-money/application/momo-aggregator.service.ts`) :
 * ici c'est l'ORGANISATION qui règle la PLATEFORME, avec l'agrégateur
 * PLATEFORME (`MOMO_PROVIDER_DEFAULT`), jamais les réglages Mobile Money
 * propres à l'organisation (`PaymentMethodsService`, qui sert à ENCAISSER les
 * loyers des locataires). `mobile_money_transactions.tenant_id/lease_id/
 * invoice_id` (facture de LOYER) restent `null` : seul `subscription_invoices
 * .momo_transaction_id` relie la transaction à la facture réglée.
 *
 * Comme en phase 4 : le webhook ne confirme jamais seul (`verifyStatus`
 * re-interroge toujours `provider.getStatus()`), et l'appel s'accompagne
 * d'une ré-interrogation différée par file — jamais une confirmation
 * synchrone sur la seule réponse d'initiation.
 */
@Injectable()
export class SubscriptionPaymentsService {
  private readonly logger = new Logger(SubscriptionPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly verifyQueue: SubscriptionMomoVerifyQueue,
    private readonly numbering: NumberingService,
    private readonly referralQualification: ReferralQualificationService,
  ) {}

  async pay(
    organizationId: string,
    userId: string,
    invoiceId: string,
    payerMsisdnInput?: string,
  ): Promise<PayInvoiceResult> {
    const aggregatorCode = this.config.get('MOMO_PROVIDER_DEFAULT');
    const provider = this.registry.forCode(aggregatorCode);

    const prepared = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const invoice = await tx.subscription_invoices.findFirst({
        where: { id: invoiceId, organization_id: organizationId },
      });
      if (!invoice) throw new DomainError('SUBSCRIPTIONS.INVOICE_NOT_FOUND', { invoiceId });
      if (invoice.status !== 'ISSUED' && invoice.status !== 'OVERDUE') {
        throw new DomainError('SUBSCRIPTIONS.ALREADY_PAID', { invoiceId, status: invoice.status });
      }
      const subscription = await tx.subscriptions.findUnique({
        where: { id: invoice.subscription_id },
      });
      const msisdnRaw = payerMsisdnInput ?? subscription?.momo_msisdn;
      if (!msisdnRaw) {
        throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
          payerMsisdn: 'Numéro Mobile Money requis (aucun enregistré sur l’abonnement).',
        });
      }
      const payerMsisdn = normalizePhoneE164(msisdnRaw);
      const operator = detectOperator(payerMsisdn);
      if (!operator) throw new DomainError('MOMO.OPERATOR_UNKNOWN', { payerMsisdn });

      const transactionId = newId();
      const { number: merchantReference } = await this.numbering.nextNumber(
        tx,
        organizationId,
        'MOMO_AGGREGATOR',
        businessToday(),
      );
      await tx.mobile_money_transactions.create({
        data: {
          id: transactionId,
          organization_id: organizationId,
          provider: operator === 'MTN' ? 'MTN_MOMO' : 'AIRTEL_MONEY',
          aggregator: aggregatorCode,
          channel: 'AGGREGATOR',
          status: 'INITIATED',
          merchant_reference: merchantReference,
          payer_msisdn: payerMsisdn,
          amount: invoice.total_amount,
        },
      });
      await tx.subscription_invoices.update({
        where: { id: invoice.id },
        data: { momo_transaction_id: transactionId },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.SUBSCRIPTION_PAYMENT_INITIATED,
        entityType: 'mobile_money_transactions',
        entityId: transactionId,
        actorUserId: userId,
        newState: toJsonState({ invoiceId, merchantReference, amount: invoice.total_amount }),
      });
      return {
        transactionId,
        merchantReference,
        amount: invoice.total_amount,
        payerMsisdn,
        operator,
      };
    });

    const initiated = await this.callInitiate(provider, {
      amount: prepared.amount,
      currency: 'XAF',
      payerMsisdn: prepared.payerMsisdn,
      operator: prepared.operator,
      externalReference: prepared.merchantReference,
      description: `Abonnement Immodesk ${prepared.merchantReference}`,
      callbackUrl: '',
    });

    await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.mobile_money_transactions.update({
        where: { id: prepared.transactionId },
        data: {
          status: initiated.state === 'FAILED' ? 'FAILED' : 'PENDING',
          aggregator_transaction_id: initiated.providerReference,
          raw_payload: (initiated.rawPayload ?? {}) as object,
        },
      }),
    );
    if (initiated.state !== 'FAILED') {
      await this.verifyQueue.enqueue(
        { organizationId, transactionId: prepared.transactionId },
        { delay: 4000 },
      );
    }
    return {
      transactionId: prepared.transactionId,
      status: initiated.state === 'FAILED' ? 'FAILED' : 'PENDING',
    };
  }

  private async callInitiate(
    provider: MobileMoneyProvider,
    input: InitiatePaymentInput,
  ): Promise<InitiateResult> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await provider.initiate(input);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new DomainError('MOMO.PROVIDER_UNAVAILABLE');
  }

  /**
   * Re-interrogation (jamais le webhook seul) : appelée après le délai
   * d'initiation, ou immédiatement au reçu d'un webhook. Idempotente — ne
   * fait rien si la transaction n'est plus `INITIATED`/`PENDING`.
   */
  async verifyStatus(organizationId: string, transactionId: string): Promise<void> {
    const paidEvent = await this.prisma.withTenant(organizationId, null, async (tx) => {
      const rows = await tx.$queryRawUnsafe<MobileMoneyTransactionRow[]>(
        `SELECT id, organization_id, status, aggregator, aggregator_transaction_id, merchant_reference, amount
           FROM mobile_money_transactions WHERE id = $1::uuid AND organization_id = $2::uuid FOR UPDATE`,
        transactionId,
        organizationId,
      );
      const row = rows[0];
      if (!row || (row.status !== 'INITIATED' && row.status !== 'PENDING')) return null;

      const provider = this.registry.forCode(
        row.aggregator ?? this.config.get('MOMO_PROVIDER_DEFAULT'),
      );
      const providerRef = row.aggregator_transaction_id ?? row.merchant_reference;
      const status = await provider.getStatus(providerRef);
      await tx.mobile_money_transactions.update({
        where: { id: transactionId },
        data: { status_checked_at: new Date(), status_check_count: { increment: 1 } },
      });

      if (status.state === 'SUCCEEDED') {
        return this.confirmPayment(tx, organizationId, row, status.amount ?? row.amount);
      } else if (status.state === 'FAILED') {
        await this.markFailed(tx, organizationId, row, status.failureCode, status.failureMessage);
      }
      // PENDING/EXPIRED/UNKNOWN : rien à faire ici, une prochaine
      // ré-interrogation (délai suivant, webhook, ou rejeu manuel) tranchera.
      return null;
    });

    // Point d'intégration `referral` (docs/api/phase10-contract.md, § Apport
    // d'affaires, arbitrage 6) — appelé APRÈS le commit de la transaction
    // ci-dessus, jamais depuis l'intérieur : `ReferralQualificationService`
    // ouvre sa propre transaction sur une connexion distincte, et ne doit
    // constater une commission que sur un encaissement déjà acquis.
    if (paidEvent) {
      await this.referralQualification.onSubscriptionInvoicePaid(paidEvent);
    }
  }

  private async confirmPayment(
    tx: TenantClient,
    organizationId: string,
    row: MobileMoneyTransactionRow,
    confirmedAmount: bigint,
  ): Promise<PaidSubscriptionInvoiceEvent | null> {
    if (confirmedAmount !== row.amount) {
      this.logger.warn(
        `SUBSCRIPTIONS.MOMO_STATUS_MISMATCH transaction=${row.id} attendu=${row.amount} recu=${confirmedAmount}`,
      );
      return null;
    }
    await tx.mobile_money_transactions.update({
      where: { id: row.id },
      data: { status: 'SUCCEEDED', completed_at: new Date() },
    });
    const invoice = await tx.subscription_invoices.findFirst({
      where: { momo_transaction_id: row.id, organization_id: organizationId },
    });
    if (!invoice || invoice.status === 'PAID') return null;
    const paidAt = new Date();
    await tx.subscription_invoices.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paid_amount: invoice.total_amount, paid_at: paidAt },
    });
    await audit(this.auditService, tx, {
      organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.SUBSCRIPTION_INVOICE_PAID,
      entityType: 'subscription_invoices',
      entityId: invoice.id,
      newState: toJsonState({ status: 'PAID', paidAmount: invoice.total_amount }),
    });

    const subscription = await tx.subscriptions.findUnique({
      where: { id: invoice.subscription_id },
    });
    const paidEvent: PaidSubscriptionInvoiceEvent = {
      invoiceId: invoice.id,
      organizationId,
      subtotalAmount: invoice.subtotal_amount,
      paidAt,
    };
    if (!subscription) return paidEvent;
    const nextStatus = statusAfterPaymentConfirmed(subscription.status);
    if (nextStatus !== subscription.status) {
      await tx.subscriptions.update({
        where: { id: subscription.id },
        data: { status: nextStatus, suspended_at: null },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.SUBSCRIPTION_STATUS_CHANGED,
        entityType: 'subscriptions',
        entityId: subscription.id,
        previousState: toJsonState({ status: subscription.status }),
        newState: toJsonState({ status: nextStatus }),
      });
    }
    return paidEvent;
  }

  private async markFailed(
    tx: TenantClient,
    organizationId: string,
    row: MobileMoneyTransactionRow,
    failureCode?: string,
    failureMessage?: string,
  ): Promise<void> {
    await tx.mobile_money_transactions.update({
      where: { id: row.id },
      data: {
        status: 'FAILED',
        failure_code: failureCode ?? null,
        failure_message: failureMessage ?? null,
        completed_at: new Date(),
      },
    });
    await audit(this.auditService, tx, {
      organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.SUBSCRIPTION_PAYMENT_FAILED,
      entityType: 'mobile_money_transactions',
      entityId: row.id,
      newState: toJsonState({ status: 'FAILED', failureCode, failureMessage }),
    });
  }
}
