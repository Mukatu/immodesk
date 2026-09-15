import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { notifyManagers } from '../../../shared/notify/notify-managers';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { PaymentMethodsService } from '../../organizations/application/payment-methods.service';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../../payments/domain/ports';
import { PaymentsQueryService } from '../../payments/application/payments-query.service';
import { PaymentsService } from '../../payments/application/payments.service';
import type { PaymentDetailView } from '../../payments/application/payment-views';
import { assertDeclarationTransition, type DeclarationStatus } from '../domain/bank-transfer-rules';
import { BankTransferQueryService, type TransferReader } from './bank-transfer-query.service';
import { toTransferDeclarationView, type TransferDeclarationView } from './bank-transfer-views';

export interface TransferDeclarationInput {
  tenantId: string;
  leaseId?: string | null;
  invoiceId?: string | null;
  declaredAmount: bigint;
  transferDate: Date;
  transferReference?: string | null;
  payerName: string;
  payerBankCode?: string | null;
  payerBankName?: string | null;
  payerAccountNumber?: string | null;
  beneficiaryBankAccountId: string;
  proofDocumentId: string;
  clientRef: string;
  notes?: string | null;
}

@Injectable()
export class BankTransferDeclarationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queries: BankTransferQueryService,
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
    reader: TransferReader,
    input: TransferDeclarationInput,
  ): Promise<{ view: TransferDeclarationView; replayed: boolean }> {
    const settings = await this.paymentMethods.get(organizationId, reader.userId);
    if (!settings.bankTransfer.enabled) throw new DomainError('BANK.TRANSFER_DISABLED');
    if (input.declaredAmount <= 0n) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        declaredAmount: 'Montant strictement positif attendu.',
      });
    }
    const existing = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.queries.findByClientRef(tx, input.clientRef),
    );
    if (existing) return { view: toTransferDeclarationView(existing), replayed: true };

    const id = newId();
    try {
      const view = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
        await this.assertProofNotReused(tx, organizationId, input.proofDocumentId);
        const beneficiary = await tx.bank_accounts.findFirst({
          where: {
            id: input.beneficiaryBankAccountId,
            organization_id: organizationId,
            is_active: true,
          },
          select: { id: true },
        });
        if (!beneficiary)
          throw new DomainError('BANK.BENEFICIARY_ACCOUNT_INVALID', {
            bankAccountId: input.beneficiaryBankAccountId,
          });

        await tx.bank_transfer_declarations.create({
          data: {
            id,
            organization_id: organizationId,
            tenant_id: input.tenantId,
            lease_id: input.leaseId ?? null,
            invoice_id: input.invoiceId ?? null,
            status: 'SUBMITTED',
            declared_amount: input.declaredAmount,
            transfer_date: input.transferDate,
            transfer_reference: input.transferReference ?? null,
            payer_name: input.payerName,
            payer_bank_code: input.payerBankCode ?? null,
            payer_bank_name: input.payerBankName ?? null,
            payer_account_number: input.payerAccountNumber ?? null,
            beneficiary_bank_account_id: input.beneficiaryBankAccountId,
            proof_document_id: input.proofDocumentId,
            submitted_by_user_id: reader.userId,
            client_ref: input.clientRef,
            notes: input.notes ?? null,
          },
        });
        await audit(this.auditService, tx, {
          organizationId,
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.BANK_TRANSFER_DECLARED,
          entityType: 'bank_transfer_declarations',
          entityId: id,
          newState: toJsonState({
            amount: input.declaredAmount,
            transferReference: input.transferReference,
          }),
        });
        await notifyManagers(tx, this.enqueuer, organizationId, {
          templateCode: MESSAGE_TEMPLATE_CODES.BANK_TRANSFER_SUBMITTED,
          variables: {
            tenantName: input.payerName,
            amount: input.declaredAmount.toString(),
            reference: input.transferReference ?? '',
          },
          relatedEntity: { type: 'bank_transfer_declarations', id },
          dedupeKey: `BANK_TRANSFER_SUBMITTED:${id}`,
        });
        return this.queries.getIn(tx, id);
      });
      return { view, replayed: false };
    } catch (error) {
      if (isUniqueViolation(error, 'client_ref')) {
        const replay = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
          this.queries.findByClientRef(tx, input.clientRef),
        );
        if (replay) return { view: toTransferDeclarationView(replay), replayed: true };
      }
      throw error;
    }
  }

  private async assertProofNotReused(
    tx: TenantClient,
    organizationId: string,
    proofDocumentId: string,
  ): Promise<void> {
    const document = await tx.documents.findFirst({
      where: { id: proofDocumentId, organization_id: organizationId, deleted_at: null },
      select: { checksum_sha256: true },
    });
    if (!document) throw new DomainError('BANK.PROOF_NOT_FOUND', { proofDocumentId });
    if (!document.checksum_sha256) return;
    const reused = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT btd.id FROM bank_transfer_declarations btd
         JOIN documents d ON d.id = btd.proof_document_id
        WHERE btd.organization_id = $1::uuid AND d.checksum_sha256 = $2
        LIMIT 1`,
      organizationId,
      document.checksum_sha256,
    );
    if (reused[0]) throw new DomainError('BANK.PROOF_ALREADY_USED', { proofDocumentId });
  }

  async review(
    organizationId: string,
    reader: TransferReader,
    id: string,
  ): Promise<TransferDeclarationView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const row = await this.queries.lock(tx, id);
      assertDeclarationTransition(row.status as DeclarationStatus, 'UNDER_REVIEW');
      await tx.bank_transfer_declarations.update({
        where: { id },
        data: {
          status: 'UNDER_REVIEW',
          reviewed_by_user_id: reader.userId,
          reviewed_at: new Date(),
        },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.BANK_TRANSFER_REVIEWED,
        entityType: 'bank_transfer_declarations',
        entityId: id,
        previousState: toJsonState({ status: row.status }),
        newState: toJsonState({ status: 'UNDER_REVIEW' }),
      });
      return this.queries.getIn(tx, id);
    });
  }

  /**
   * Corps métier de l'approbation, exécutable dans une transaction déjà
   * ouverte par un appelant (ex. rapprochement phase 6). Les réglages sont
   * relus DANS `tx` pour rester cohérents avec le reste de l'opération.
   */
  async approveInTx(
    tx: TenantClient,
    organizationId: string,
    reader: TransferReader,
    id: string,
    input: { approvedAmount?: bigint; reason?: string | null; statementLineId?: string | null },
  ): Promise<{ declarationId: string; paymentId: string; receiptIds: string[] }> {
    const orgSettings = await tx.organization_settings.findUnique({
      where: { organization_id: organizationId },
      select: { settings_json: true },
    });
    const confirmOnApproval = readOperationalSettings(orgSettings?.settings_json).paymentMethods
      .bankTransfer.confirmOnApproval;

    const row = await this.queries.lock(tx, id);
    assertDeclarationTransition(row.status as DeclarationStatus, 'APPROVED');
    const approvedAmount = input.approvedAmount ?? row.declared_amount;
    if (approvedAmount !== row.declared_amount && !input.reason) {
      throw new DomainError('BANK.APPROVED_AMOUNT_REASON_REQUIRED');
    }

    const created = await this.payments.createInTx(
      tx,
      organizationId,
      { userId: reader.userId, role: reader.role },
      {
        method: 'BANK_TRANSFER',
        amount: approvedAmount,
        tenantId: row.tenant_id as string,
        leaseId: row.lease_id,
        bankAccountId: row.beneficiary_bank_account_id,
        externalReference: row.transfer_reference,
        confirmed: confirmOnApproval,
        autoAllocate: !row.invoice_id,
        allocations: row.invoice_id
          ? [{ invoiceId: row.invoice_id, amount: approvedAmount }]
          : undefined,
      },
    );
    await tx.bank_transfer_declarations.update({
      where: { id },
      data: {
        status: 'APPROVED',
        payment_id: created.payment.id,
        reviewed_by_user_id: row.reviewed_by_user_id ?? reader.userId,
        reviewed_at: row.reviewed_at ?? new Date(),
        ...(input.statementLineId !== undefined
          ? { matched_statement_line_id: input.statementLineId }
          : {}),
      },
    });
    await audit(this.auditService, tx, {
      organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.BANK_TRANSFER_APPROVED,
      entityType: 'bank_transfer_declarations',
      entityId: id,
      previousState: toJsonState({ status: row.status, amount: row.declared_amount }),
      newState: toJsonState({
        status: 'APPROVED',
        amount: approvedAmount,
        reason: input.reason ?? null,
      }),
    });
    return { declarationId: id, paymentId: created.payment.id, receiptIds: created.receiptIds };
  }

  async approve(
    organizationId: string,
    reader: TransferReader,
    id: string,
    input: { approvedAmount?: bigint; reason?: string | null },
  ): Promise<{ declaration: TransferDeclarationView; payment: PaymentDetailView }> {
    let receiptIds: string[] = [];
    const result = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const approved = await this.approveInTx(tx, organizationId, reader, id, input);
      receiptIds = approved.receiptIds;
      return {
        declaration: await this.queries.getIn(tx, id),
        payment: await this.paymentsQueries.detailIn(tx, approved.paymentId),
      };
    });
    await this.receiptIssuer?.scheduleGeneration(organizationId, receiptIds);
    return result;
  }

  async reject(
    organizationId: string,
    reader: TransferReader,
    id: string,
    reason: string,
  ): Promise<TransferDeclarationView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const row = await this.queries.lock(tx, id);
      assertDeclarationTransition(row.status as DeclarationStatus, 'REJECTED');
      await tx.bank_transfer_declarations.update({
        where: { id },
        data: { status: 'REJECTED', rejection_reason: reason },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.BANK_TRANSFER_REJECTED,
        entityType: 'bank_transfer_declarations',
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
          templateCode: MESSAGE_TEMPLATE_CODES.BANK_TRANSFER_REJECTED,
          recipient: { phone: tenant.primary_phone, tenantId: row.tenant_id },
          variables: { amount: row.declared_amount.toString(), reason },
          relatedEntity: { type: 'bank_transfer_declarations', id },
          dedupeKey: `BANK_TRANSFER_REJECTED:${id}`,
        });
      }
      return this.queries.getIn(tx, id);
    });
  }

  async cancel(
    organizationId: string,
    reader: TransferReader,
    id: string,
    reason: string,
  ): Promise<TransferDeclarationView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const row = await this.queries.lock(tx, id);
      const isDeclarant = row.submitted_by_user_id === reader.userId;
      const isManager = reader.role === 'MANAGER' || reader.role === 'OWNER';
      if (!isDeclarant && !isManager) throw new DomainError('IAM.FORBIDDEN');
      assertDeclarationTransition(row.status as DeclarationStatus, 'CANCELLED');
      await tx.bank_transfer_declarations.update({
        where: { id },
        data: { status: 'CANCELLED', rejection_reason: reason },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.BANK_TRANSFER_CANCELLED,
        entityType: 'bank_transfer_declarations',
        entityId: id,
        previousState: toJsonState({ status: row.status }),
        newState: toJsonState({ status: 'CANCELLED', reason }),
      });
      return this.queries.getIn(tx, id);
    });
  }
}
