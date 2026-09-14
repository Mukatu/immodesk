import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { notifyManagers } from '../../../shared/notify/notify-managers';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { NumberingService } from '../../numbering/application/numbering.service';
import { PaymentMethodsService } from '../../organizations/application/payment-methods.service';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../../payments/domain/ports';
import { PaymentsQueryService } from '../../payments/application/payments-query.service';
import { PaymentsService } from '../../payments/application/payments.service';
import type { PaymentDetailView } from '../../payments/application/payment-views';
import {
  assertMomoTransition,
  normalizeOperatorReference,
  type MomoStatus,
} from '../domain/momo-rules';
import { MomoQueryService, type MomoReader } from './momo-query.service';
import { toMomoTransactionView, type MomoTransactionView } from './momo-views';

export interface MomoDeclarationInput {
  tenantId: string;
  leaseId?: string | null;
  invoiceId?: string | null;
  provider: 'MTN_MOMO' | 'AIRTEL_MONEY';
  operatorReference: string;
  payerMsisdn: string;
  payeeMsisdn: string;
  amount: bigint;
  proofDocumentId?: string | null;
  clientRef: string;
  notes?: string | null;
}

export interface MomoApproveInput {
  approvedAmount?: bigint;
  reason?: string | null;
  allocations?: Array<{ invoiceId: string; amount: bigint }>;
}

@Injectable()
export class MomoDeclarationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly queries: MomoQueryService,
    private readonly paymentMethods: PaymentMethodsService,
    private readonly payments: PaymentsService,
    private readonly paymentsQueries: PaymentsQueryService,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null = null,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receiptIssuer: ReceiptIssuer | null = null,
  ) {}

  async declare(
    organizationId: string,
    reader: MomoReader,
    input: MomoDeclarationInput,
  ): Promise<{ view: MomoTransactionView; replayed: boolean }> {
    const settings = await this.paymentMethods.get(organizationId, reader.userId);
    if (!settings.mobileMoneyDeclared.enabled) throw new DomainError('MOMO.DECLARED_DISABLED');
    if (input.amount <= 0n) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        amount: 'Montant strictement positif attendu.',
      });
    }
    const existing = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.queries.findByClientRef(tx, input.clientRef),
    );
    if (existing) return { view: toMomoTransactionView(existing), replayed: true };

    const operatorReference = normalizeOperatorReference(input.operatorReference);
    const payerMsisdn = normalizePhoneE164(input.payerMsisdn);
    const payeeMsisdn = normalizePhoneE164(input.payeeMsisdn);
    const id = newId();

    try {
      const view = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
        // Contrôle applicatif en amont de la contrainte SQL `momo_provider_tx_uk` :
        // le pilote Postgres de Prisma ne restitue pas toujours le nom de la
        // contrainte composite dans l'erreur P2002 (`meta.target` absent selon
        // la version), ce qui rendrait `isUniqueViolation(error, hint)`
        // muet — la contrainte reste le filet de sécurité en concurrence.
        const duplicate = await tx.mobile_money_transactions.findFirst({
          where: { provider: input.provider, provider_transaction_id: operatorReference },
          select: { id: true },
        });
        if (duplicate) {
          throw new DomainError('MOMO.REFERENCE_ALREADY_USED', {
            provider: input.provider,
            operatorReference,
          });
        }
        const { number } = await this.numbering.nextNumber(
          tx,
          organizationId,
          'MOMO_DECLARED',
          new Date(),
        );
        await tx.mobile_money_transactions.create({
          data: {
            id,
            organization_id: organizationId,
            tenant_id: input.tenantId,
            lease_id: input.leaseId ?? null,
            invoice_id: input.invoiceId ?? null,
            provider: input.provider,
            channel: 'DECLARED',
            status: 'DECLARED',
            provider_transaction_id: operatorReference,
            merchant_reference: number,
            payer_msisdn: payerMsisdn,
            payee_msisdn: payeeMsisdn,
            amount: input.amount,
            declared_by_user_id: reader.userId,
            proof_document_id: input.proofDocumentId ?? null,
            client_ref: input.clientRef,
          },
        });
        await audit(this.auditService, tx, {
          organizationId,
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.MOMO_DECLARED,
          entityType: 'mobile_money_transactions',
          entityId: id,
          newState: toJsonState({
            merchantReference: number,
            amount: input.amount,
            operatorReference,
          }),
        });
        await notifyManagers(tx, this.enqueuer, organizationId, {
          templateCode: MESSAGE_TEMPLATE_CODES.MOMO_DECLARATION_SUBMITTED,
          variables: {
            tenantName: input.payerMsisdn,
            amount: input.amount.toString(),
            reference: number,
          },
          relatedEntity: { type: 'mobile_money_transactions', id },
          dedupeKey: `MOMO_DECLARATION_SUBMITTED:${id}`,
        });
        return this.queries.getIn(tx, id);
      });
      return { view, replayed: false };
    } catch (error) {
      if (isUniqueViolation(error, 'momo_provider_tx_uk')) {
        throw new DomainError('MOMO.REFERENCE_ALREADY_USED', {
          provider: input.provider,
          operatorReference,
        });
      }
      if (isUniqueViolation(error, 'client_ref')) {
        const replay = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
          this.queries.findByClientRef(tx, input.clientRef),
        );
        if (replay) return { view: toMomoTransactionView(replay), replayed: true };
      }
      throw error;
    }
  }

  async approve(
    organizationId: string,
    reader: MomoReader,
    id: string,
    input: MomoApproveInput,
  ): Promise<{ transaction: MomoTransactionView; payment: PaymentDetailView }> {
    let receiptIds: string[] = [];
    const result = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const row = await this.queries.lock(tx, id);
      if (row.channel !== 'DECLARED')
        throw new DomainError('MOMO.INVALID_TRANSITION', { channel: row.channel });
      assertMomoTransition(row.status as MomoStatus, 'SUCCEEDED');
      const approvedAmount = input.approvedAmount ?? row.amount;
      if (approvedAmount !== row.amount && !input.reason) {
        throw new DomainError('MOMO.APPROVED_AMOUNT_REASON_REQUIRED');
      }

      const created = await this.payments.createInTx(
        tx,
        organizationId,
        { userId: reader.userId, role: reader.role },
        {
          method: 'MOBILE_MONEY',
          amount: approvedAmount,
          tenantId: row.tenant_id as string,
          leaseId: row.lease_id,
          externalReference: row.provider_transaction_id,
          feeAmount: 0n,
          feeBearer: 'TENANT',
          confirmed: true,
          autoAllocate: !row.invoice_id,
          allocations: row.invoice_id
            ? [{ invoiceId: row.invoice_id, amount: approvedAmount }]
            : undefined,
        },
      );

      await tx.mobile_money_transactions.update({
        where: { id },
        data: {
          status: 'SUCCEEDED',
          amount: approvedAmount,
          payment_id: created.payment.id,
          verified_by_user_id: reader.userId,
          verified_at: new Date(),
        },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MOMO_APPROVED,
        entityType: 'mobile_money_transactions',
        entityId: id,
        previousState: toJsonState({ status: row.status, amount: row.amount }),
        newState: toJsonState({
          status: 'SUCCEEDED',
          amount: approvedAmount,
          reason: input.reason ?? null,
        }),
      });
      receiptIds = created.receiptIds;
      return {
        transaction: await this.queries.getIn(tx, id),
        payment: await this.paymentsQueries.detailIn(tx, created.payment.id),
      };
    });
    await this.receiptIssuer?.scheduleGeneration(organizationId, receiptIds);
    return result;
  }

  async reject(
    organizationId: string,
    reader: MomoReader,
    id: string,
    reason: string,
  ): Promise<MomoTransactionView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const row = await this.queries.lock(tx, id);
      assertMomoTransition(row.status as MomoStatus, 'REJECTED');
      await tx.mobile_money_transactions.update({
        where: { id },
        data: { status: 'REJECTED', rejection_reason: reason },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MOMO_REJECTED,
        entityType: 'mobile_money_transactions',
        entityId: id,
        previousState: toJsonState({ status: row.status }),
        newState: toJsonState({ status: 'REJECTED', reason }),
      });
      const tenant = row.tenant_id
        ? await tx.tenants.findFirst({
            where: { id: row.tenant_id },
            select: { primary_phone: true },
          })
        : null;
      if (tenant?.primary_phone && this.enqueuer) {
        await this.enqueuer.enqueue({
          organizationId,
          templateCode: MESSAGE_TEMPLATE_CODES.MOMO_DECLARATION_REJECTED,
          recipient: { phone: tenant.primary_phone, tenantId: row.tenant_id },
          variables: { amount: row.amount.toString(), reason },
          relatedEntity: { type: 'mobile_money_transactions', id },
          dedupeKey: `MOMO_DECLARATION_REJECTED:${id}`,
        });
      }
      return this.queries.getIn(tx, id);
    });
  }

  async cancel(
    organizationId: string,
    reader: MomoReader,
    id: string,
    reason: string,
  ): Promise<MomoTransactionView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const row = await this.queries.lock(tx, id);
      const isDeclarant = row.declared_by_user_id === reader.userId;
      const isManager = reader.role === 'MANAGER' || reader.role === 'OWNER';
      if (!isDeclarant && !isManager) throw new DomainError('IAM.FORBIDDEN');
      assertMomoTransition(row.status as MomoStatus, 'CANCELLED');
      await tx.mobile_money_transactions.update({
        where: { id },
        data: { status: 'CANCELLED', rejection_reason: reason },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MOMO_CANCELLED,
        entityType: 'mobile_money_transactions',
        entityId: id,
        previousState: toJsonState({ status: row.status }),
        newState: toJsonState({ status: 'CANCELLED', reason }),
      });
      return this.queries.getIn(tx, id);
    });
  }
}
