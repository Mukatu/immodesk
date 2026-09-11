import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import type { AllocationRequest } from '../domain/allocation-engine';
import {
  assertPaymentTransition,
  initialPaymentStatus,
  netAmountOf,
  type FeeBearer,
  type PaymentMethod,
  type PaymentStatus,
} from '../domain/payment-rules';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../domain/ports';
import { AllocationService, type AllocationMode } from './allocation.service';
import { PaymentsQueryService, type PaymentReader } from './payments-query.service';
import type { PaymentDetailView, PaymentRow } from './payment-views';

export interface PaymentInput {
  method: PaymentMethod;
  amount: bigint;
  tenantId: string;
  leaseId?: string | null;
  paymentDate?: Date;
  valueDate?: Date | null;
  externalReference?: string | null;
  bankAccountId?: string | null;
  feeAmount?: bigint;
  feeBearer?: FeeBearer;
  autoAllocate?: boolean;
  allocations?: AllocationRequest[];
  confirmed?: boolean;
  clientRef?: string | null;
  notes?: string | null;
  collectionLatitude?: number | null;
  collectionLongitude?: number | null;
}

export interface CreatedPayment {
  payment: PaymentRow;
  receiptIds: string[];
}

/** Intention d'imputation mémorisée à la création, rejouée à la confirmation. */
interface AllocationIntent {
  autoAllocate?: boolean;
  allocations?: Array<{ invoiceId: string; amount: string }>;
}

function modeOf(intent: AllocationIntent): AllocationMode | null {
  if (intent.allocations && intent.allocations.length > 0) {
    return {
      mode: 'EXPLICIT',
      allocations: intent.allocations.map((a) => ({
        invoiceId: a.invoiceId,
        amount: BigInt(a.amount),
      })),
    };
  }
  return intent.autoAllocate ? { mode: 'AUTO' } : null;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly allocation: AllocationService,
    private readonly queries: PaymentsQueryService,
    private readonly auditService: AuditService,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
  ) {}

  /**
   * `POST /v1/payments`. Un `clientRef` déjà connu rend le paiement initial
   * (`replayed: true`, réponse 200) sans rien créer : c'est la garantie
   * contre le double appui sur « valider » en réseau dégradé.
   */
  async create(
    organizationId: string,
    reader: PaymentReader,
    input: PaymentInput,
  ): Promise<{ detail: PaymentDetailView; replayed: boolean }> {
    if (input.clientRef) {
      const replay = await this.replay(organizationId, reader, input.clientRef);
      if (replay) return { detail: replay, replayed: true };
    }
    try {
      const { detail, receiptIds } = await this.prisma.withTenant(
        organizationId,
        reader.userId,
        async (tx) => {
          const created = await this.createInTx(tx, organizationId, reader, input);
          return {
            detail: await this.queries.detailIn(tx, created.payment.id),
            receiptIds: created.receiptIds,
          };
        },
      );
      await this.receipts?.scheduleGeneration(organizationId, receiptIds);
      return { detail, replayed: false };
    } catch (error) {
      if (input.clientRef && isUniqueViolation(error, 'client_ref')) {
        const replay = await this.replay(organizationId, reader, input.clientRef);
        if (replay) return { detail: replay, replayed: true };
      }
      throw error;
    }
  }

  /** Création dans une transaction ouverte : partagée avec le reçu de caisse. */
  async createInTx(
    tx: TenantClient,
    organizationId: string,
    reader: PaymentReader & { receivedByUserId?: string },
    input: PaymentInput,
  ): Promise<CreatedPayment> {
    if (input.amount <= 0n) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        amount: 'Montant strictement positif attendu.',
      });
    }
    const today = businessToday();
    const tenant = await tx.tenants.findFirst({
      where: { id: input.tenantId, deleted_at: null },
      select: { id: true },
    });
    if (!tenant) throw new DomainError('PARTIES.TENANT_NOT_FOUND', { tenantId: input.tenantId });
    const landlordId = input.leaseId
      ? await this.leaseLandlord(tx, input.leaseId, input.tenantId)
      : null;

    const status = initialPaymentStatus(input.method, reader.role, input.confirmed);
    const paymentDate = input.paymentDate ?? today;
    // Premier verrou de la transaction, toujours pris dans le même ordre
    // (PAY, puis factures, QUI, CASH) : aucun interblocage possible.
    const { number } = await this.numbering.nextNumber(tx, organizationId, 'PAYMENT', paymentDate);
    const feeAmount = input.feeAmount ?? 0n;
    const feeBearer = input.feeBearer ?? 'TENANT';
    const id = newId();

    await tx.payments.create({
      data: {
        id,
        organization_id: organizationId,
        tenant_id: input.tenantId,
        lease_id: input.leaseId ?? null,
        landlord_id: landlordId,
        direction: 'INBOUND',
        method: input.method,
        status,
        reference: number,
        external_reference: input.externalReference ?? null,
        amount: input.amount,
        fee_amount: feeAmount,
        fee_bearer: feeBearer,
        net_amount: netAmountOf(input.amount, feeAmount, feeBearer),
        allocated_amount: 0n,
        unallocated_amount: input.amount,
        payment_date: paymentDate,
        value_date: input.valueDate ?? null,
        received_by_user_id: reader.receivedByUserId ?? reader.userId,
        bank_account_id: input.bankAccountId ?? null,
        collection_latitude:
          input.collectionLatitude != null ? input.collectionLatitude.toFixed(6) : null,
        collection_longitude:
          input.collectionLongitude != null ? input.collectionLongitude.toFixed(6) : null,
        confirmed_at: status === 'CONFIRMED' ? new Date() : null,
        confirmed_by_user_id: status === 'CONFIRMED' ? reader.userId : null,
        client_ref: input.clientRef ?? null,
        notes: input.notes ?? null,
      },
    });

    const intent: AllocationIntent = {
      autoAllocate: input.autoAllocate ?? false,
      allocations: (input.allocations ?? []).map((a) => ({
        invoiceId: a.invoiceId,
        amount: a.amount.toString(),
      })),
    };
    await audit(this.auditService, tx, {
      organizationId,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.PAYMENT_CREATED,
      entityType: 'payments',
      entityId: id,
      newState: toJsonState({
        reference: number,
        method: input.method,
        status,
        amount: input.amount,
        intent,
      }),
    });

    const payment = await this.queries.lock(tx, id);
    const mode = modeOf(intent);
    if (status !== 'CONFIRMED' || !mode) return { payment, receiptIds: [] };
    const receiptIds = await this.allocateAndQuit(
      tx,
      organizationId,
      payment,
      mode,
      true,
      reader.userId,
    );
    return { payment: await this.queries.lock(tx, id), receiptIds };
  }

  /** PENDING_VERIFICATION → CONFIRMED, puis imputation demandée à la création. */
  async confirm(
    organizationId: string,
    reader: PaymentReader,
    id: string,
    input: { valueDate?: Date; note?: string },
  ): Promise<PaymentDetailView> {
    return this.transition(organizationId, reader, async (tx) => {
      const payment = await this.queries.lock(tx, id);
      assertPaymentTransition(payment.status as PaymentStatus, 'CONFIRMED');
      await tx.$executeRawUnsafe(
        `UPDATE payments
            SET status = 'CONFIRMED', confirmed_at = now(), confirmed_by_user_id = $2::uuid,
                value_date = coalesce($3::date, value_date),
                notes = CASE WHEN $4::text IS NULL THEN notes ELSE concat_ws(E'\\n', notes, $4::text) END,
                updated_at = now()
          WHERE id = $1::uuid`,
        id,
        reader.userId,
        input.valueDate ? input.valueDate.toISOString().slice(0, 10) : null,
        input.note ?? null,
      );
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.PAYMENT_CONFIRMED,
        entityType: 'payments',
        entityId: id,
        previousState: toJsonState({ status: payment.status }),
        newState: toJsonState({ status: 'CONFIRMED' }),
      });
      const mode = modeOf(await this.intentOf(tx, id));
      if (!mode) return { id, receiptIds: [] };
      const confirmed = await this.queries.lock(tx, id);
      return {
        id,
        receiptIds: await this.allocateAndQuit(
          tx,
          organizationId,
          confirmed,
          mode,
          true,
          reader.userId,
        ),
      };
    });
  }

  async reject(
    organizationId: string,
    reader: PaymentReader,
    id: string,
    reason: string,
  ): Promise<PaymentDetailView> {
    return this.transition(organizationId, reader, async (tx) => {
      const payment = await this.queries.lock(tx, id);
      assertPaymentTransition(payment.status as PaymentStatus, 'REJECTED');
      await tx.$executeRawUnsafe(
        `UPDATE payments SET status = 'REJECTED', rejected_at = now(), rejection_reason = $2, updated_at = now()
          WHERE id = $1::uuid`,
        id,
        reason,
      );
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.PAYMENT_REJECTED,
        entityType: 'payments',
        entityId: id,
        previousState: toJsonState({ status: payment.status }),
        newState: toJsonState({ status: 'REJECTED', reason }),
      });
      return { id, receiptIds: [] };
    });
  }

  /** Imputation manuelle d'un paiement confirmé : le reste demeure disponible. */
  async addAllocations(
    organizationId: string,
    reader: PaymentReader,
    id: string,
    allocations: AllocationRequest[],
  ): Promise<PaymentDetailView> {
    return this.transition(organizationId, reader, async (tx) => {
      const payment = await this.queries.lock(tx, id);
      if (payment.status !== 'CONFIRMED' || payment.direction !== 'INBOUND') {
        throw new DomainError('PAYMENTS.INVALID_TRANSITION', { status: payment.status });
      }
      const receiptIds = await this.allocateAndQuit(
        tx,
        organizationId,
        payment,
        { mode: 'EXPLICIT', allocations },
        false,
        reader.userId,
      );
      return { id, receiptIds };
    });
  }

  private async transition(
    organizationId: string,
    reader: PaymentReader,
    work: (tx: TenantClient) => Promise<{ id: string; receiptIds: string[] }>,
  ): Promise<PaymentDetailView> {
    const { detail, receiptIds } = await this.prisma.withTenant(
      organizationId,
      reader.userId,
      async (tx) => {
        const result = await work(tx);
        return {
          detail: await this.queries.detailIn(tx, result.id),
          receiptIds: result.receiptIds,
        };
      },
    );
    await this.receipts?.scheduleGeneration(organizationId, receiptIds);
    return detail;
  }

  private async allocateAndQuit(
    tx: TenantClient,
    organizationId: string,
    payment: PaymentRow,
    mode: AllocationMode,
    settle: boolean,
    actorUserId: string,
  ): Promise<string[]> {
    const today = businessToday();
    const outcome = await this.allocation.allocate(tx, payment, mode, {
      settle,
      today,
      actorUserId,
    });
    if (!this.receipts || outcome.paidInvoiceIds.length === 0) return [];
    return this.receipts.issueForPaidInvoices(tx, {
      organizationId,
      paymentId: payment.id,
      invoiceIds: outcome.paidInvoiceIds,
      today,
    });
  }

  private async intentOf(tx: TenantClient, paymentId: string): Promise<AllocationIntent> {
    const row = await tx.audit_logs.findFirst({
      where: {
        entity_type: 'payments',
        entity_id: paymentId,
        reason: AUDIT_OPERATIONS.PAYMENT_CREATED,
      },
      select: { new_state: true },
    });
    const state = (row?.new_state ?? {}) as { intent?: AllocationIntent };
    return state.intent ?? {};
  }

  private async replay(
    organizationId: string,
    reader: PaymentReader,
    clientRef: string,
  ): Promise<PaymentDetailView | null> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const existing = await this.queries.findByClientRef(tx, clientRef);
      return existing ? this.queries.detailIn(tx, existing.id) : null;
    });
  }

  /** Bailleur du bail, après contrôle que le locataire y est bien partie. */
  private async leaseLandlord(
    tx: TenantClient,
    leaseId: string,
    tenantId: string,
  ): Promise<string> {
    const lease = await tx.leases.findFirst({
      where: { id: leaseId, deleted_at: null },
      select: { id: true, landlord_id: true, primary_tenant_id: true },
    });
    if (!lease) throw new DomainError('LEASES.NOT_FOUND', { leaseId });
    if (lease.primary_tenant_id !== tenantId) {
      const party = await tx.lease_parties.findFirst({
        where: { lease_id: leaseId, tenant_id: tenantId },
        select: { id: true },
      });
      if (!party) throw new DomainError('PAYMENTS.LEASE_TENANT_MISMATCH', { leaseId, tenantId });
    }
    return lease.landlord_id;
  }
}
