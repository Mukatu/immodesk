import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import { PaymentMethodsService } from '../../organizations/application/payment-methods.service';
import {
  assertAmountInRange,
  detectOperator,
  quoteMomo,
  type MomoQuoteResult,
} from '../domain/momo-rules';
import { MobileMoneyProviderRegistry } from '../infrastructure/mobile-money-provider.registry';
import { MomoVerifyQueue } from '../infrastructure/momo-verify.queue';
import { MomoQueryService, type MomoReader } from './momo-query.service';
import { toMomoTransactionView, type MomoTransactionView } from './momo-views';

export interface MomoInitiateInput {
  invoiceId?: string | null;
  tenantId: string;
  leaseId?: string | null;
  amount: bigint;
  payerMsisdn: string;
  clientRef: string;
}

@Injectable()
export class MomoAggregatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly queries: MomoQueryService,
    private readonly paymentMethods: PaymentMethodsService,
    private readonly registry: MobileMoneyProviderRegistry,
    private readonly verifyQueue: MomoVerifyQueue,
    private readonly auditService: AuditService,
  ) {}

  async quote(organizationId: string, userId: string, amount: bigint): Promise<MomoQuoteResult> {
    const settings = await this.paymentMethods.get(organizationId, userId);
    return quoteMomo(
      amount,
      settings.mobileMoneyAggregator.feeRateBps,
      settings.mobileMoneyAggregator.feeBearer,
    );
  }

  async initiate(
    organizationId: string,
    reader: MomoReader,
    input: MomoInitiateInput,
  ): Promise<{
    transaction: MomoTransactionView;
    payment: { id: string; reference: string; status: string };
  }> {
    const settings = await this.paymentMethods.get(organizationId, reader.userId);
    const aggregator = settings.mobileMoneyAggregator;
    if (!aggregator.enabled || !settings.aggregatorAvailable) {
      throw new DomainError('MOMO.AGGREGATOR_DISABLED');
    }
    const payerMsisdn = normalizePhoneE164(input.payerMsisdn);
    const operator = detectOperator(payerMsisdn);
    if (!operator) throw new DomainError('MOMO.OPERATOR_UNKNOWN', { payerMsisdn });
    assertAmountInRange(input.amount, aggregator.minAmount, aggregator.maxAmount);

    const existing = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.queries.findByClientRef(tx, input.clientRef),
    );
    if (existing)
      return {
        transaction: toMomoTransactionView(existing),
        payment: { id: existing.payment_id as string, reference: '', status: existing.status },
      };

    const today = businessToday();
    const paymentId = newId();
    const transactionId = newId();
    const provider = this.registry.forCode(aggregator.provider);

    const { merchantReference } = await this.prisma.withTenant(
      organizationId,
      reader.userId,
      async (tx) => {
        const { number: paymentReference } = await this.numbering.nextNumber(
          tx,
          organizationId,
          'PAYMENT',
          today,
        );
        await tx.payments.create({
          data: {
            id: paymentId,
            organization_id: organizationId,
            tenant_id: input.tenantId,
            lease_id: input.leaseId ?? null,
            direction: 'INBOUND',
            method: 'MOBILE_MONEY',
            status: 'PENDING',
            reference: paymentReference,
            amount: input.amount,
            net_amount: input.amount,
            allocated_amount: 0n,
            unallocated_amount: input.amount,
            payment_date: today,
            received_by_user_id: reader.userId,
            client_ref: input.clientRef,
          },
        });
        const { number: merchantRef } = await this.numbering.nextNumber(
          tx,
          organizationId,
          'MOMO_AGGREGATOR',
          today,
        );
        await tx.mobile_money_transactions.create({
          data: {
            id: transactionId,
            organization_id: organizationId,
            payment_id: paymentId,
            tenant_id: input.tenantId,
            lease_id: input.leaseId ?? null,
            invoice_id: input.invoiceId ?? null,
            provider: operator === 'MTN' ? 'MTN_MOMO' : 'AIRTEL_MONEY',
            aggregator: aggregator.provider,
            channel: 'AGGREGATOR',
            status: 'INITIATED',
            merchant_reference: merchantRef,
            payer_msisdn: payerMsisdn,
            amount: input.amount,
            fee_bearer: aggregator.feeBearer,
            client_ref: input.clientRef,
          },
        });
        await audit(this.auditService, tx, {
          organizationId,
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.MOMO_INITIATED,
          entityType: 'mobile_money_transactions',
          entityId: transactionId,
          newState: toJsonState({
            merchantReference: merchantRef,
            amount: input.amount,
            payerMsisdn,
          }),
        });
        return { merchantReference: merchantRef };
      },
    );

    const result = await this.callInitiate(provider, {
      amount: input.amount,
      currency: 'XAF',
      payerMsisdn,
      operator,
      externalReference: merchantReference,
      description: `Paiement Mobile Money ${merchantReference}`,
      callbackUrl: '',
    });

    await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      await tx.mobile_money_transactions.update({
        where: { id: transactionId },
        data: {
          status: result.state === 'FAILED' ? 'FAILED' : 'PENDING',
          aggregator_transaction_id: result.providerReference,
          raw_payload: (result.rawPayload ?? {}) as object,
        },
      });
      if (result.state === 'FAILED') {
        await tx.payments.update({
          where: { id: paymentId },
          data: {
            status: 'REJECTED',
            rejected_at: new Date(),
            rejection_reason: 'Initiation refusée par le fournisseur.',
          },
        });
      }
    });
    if (result.state !== 'FAILED') {
      await this.verifyQueue.enqueue({ organizationId, transactionId }, { delay: 4000 });
    }

    const view = await this.queries.get(organizationId, reader, transactionId);
    return {
      transaction: view,
      payment: {
        id: paymentId,
        reference: '',
        status: result.state === 'FAILED' ? 'REJECTED' : 'PENDING',
      },
    };
  }

  private async callInitiate(
    provider: ReturnType<MobileMoneyProviderRegistry['forCode']>,
    input: Parameters<ReturnType<MobileMoneyProviderRegistry['forCode']>['initiate']>[0],
  ) {
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
}
