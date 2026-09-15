import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { businessToday } from '../../../shared/time/business-date';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { notifyManagers } from '../../../shared/notify/notify-managers';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { InvoiceRow } from '../../billing/application/invoice-views';
import { InvoiceWriterService } from '../../billing/application/invoice-writer.service';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { PaymentsService } from '../../payments/application/payments.service';
import { ReversalService } from '../../payments/application/reversal.service';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../../payments/domain/ports';
import { assertCheckTransition, type CheckStatus } from '../domain/check-rules';
import { BankChecksQueryService } from './bank-checks-query.service';
import type { BankCheckDetailView } from './bank-check-views';

export interface CheckReader {
  userId: string;
  role: MemberRole;
}

export interface BankCheckReceiveInput {
  tenantId: string;
  leaseId?: string | null;
  invoiceId?: string | null;
  checkNumber: string;
  drawerName: string;
  drawerBankCode: string;
  drawerBankName: string;
  drawerAccountNumber?: string | null;
  amount: bigint;
  issueDate: Date;
  receivedAt?: Date | null;
  imageDocumentId?: string | null;
  notes?: string | null;
}

/**
 * Cycle de vie d'un chèque (docs/api/phase6-contract.md, § « Chèques »).
 * Propriétaire exclusif de `bank_checks` ; consomme `PaymentsService` et
 * `ReversalService` (phase 3) pour l'imputation, la confirmation et la
 * contre-passation du paiement lié, jamais de SQL direct sur `payments`.
 */
@Injectable()
export class BankChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queries: BankChecksQueryService,
    private readonly payments: PaymentsService,
    private readonly reversal: ReversalService,
    private readonly invoiceWriter: InvoiceWriterService,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null = null,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
  ) {}

  /** `POST /bank-checks` : chèque `RECEIVED`, paiement `PENDING_VERIFICATION` créé. */
  async receive(
    organizationId: string,
    reader: CheckReader,
    input: BankCheckReceiveInput,
  ): Promise<BankCheckDetailView> {
    if (input.amount <= 0n) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        amount: 'Montant strictement positif attendu.',
      });
    }
    const id = newId();
    try {
      return await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
        const created = await this.payments.createInTx(tx, organizationId, reader, {
          method: 'BANK_CHECK',
          amount: input.amount,
          tenantId: input.tenantId,
          leaseId: input.leaseId ?? null,
          externalReference: input.checkNumber,
          confirmed: false,
          autoAllocate: false,
          allocations: input.invoiceId
            ? [{ invoiceId: input.invoiceId, amount: input.amount }]
            : undefined,
        });
        await tx.bank_checks.create({
          data: {
            id,
            organization_id: organizationId,
            tenant_id: input.tenantId,
            lease_id: input.leaseId ?? null,
            payment_id: created.payment.id,
            status: 'RECEIVED',
            check_number: input.checkNumber,
            drawer_name: input.drawerName,
            drawer_bank_code: input.drawerBankCode,
            drawer_bank_name: input.drawerBankName,
            drawer_account_number: input.drawerAccountNumber ?? null,
            amount: input.amount,
            currency: 'XAF',
            issue_date: input.issueDate,
            received_at: input.receivedAt ?? new Date(),
            image_document_id: input.imageDocumentId ?? null,
            received_by_user_id: reader.userId,
            notes: input.notes ?? null,
          },
        });
        await audit(this.auditService, tx, {
          organizationId,
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.BANK_CHECK_RECEIVED,
          entityType: 'bank_checks',
          entityId: id,
          newState: toJsonState({
            checkNumber: input.checkNumber,
            drawerBankCode: input.drawerBankCode,
            amount: input.amount,
            paymentId: created.payment.id,
          }),
        });
        return this.queries.getDetailIn(tx, id);
      });
    } catch (error) {
      // Comme `SyncBatchesService` : `meta.target` n'est pas toujours peuplé
      // par le pilote Prisma en place ; sans indice textuel fiable à
      // vérifier. C'est sans risque ICI : cet `INSERT` ne peut heurter que
      // `bank_checks_number_uk`, seule contrainte d'unicité de la table.
      if (isUniqueViolation(error)) {
        throw new DomainError('BANK.CHECK_ALREADY_REGISTERED', {
          drawerBankCode: input.drawerBankCode,
          checkNumber: input.checkNumber,
        });
      }
      throw error;
    }
  }

  /** `POST /bank-checks/{id}/deposit` : `RECEIVED` → `DEPOSITED`. */
  async deposit(
    organizationId: string,
    reader: CheckReader,
    id: string,
    input: { depositBankAccountId: string; depositDate?: Date | null },
  ): Promise<BankCheckDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const check = await this.queries.lock(tx, id);
      assertCheckTransition(check.status as CheckStatus, 'DEPOSITED');
      const account = await tx.bank_accounts.findFirst({
        where: { id: input.depositBankAccountId, organization_id: organizationId, is_active: true },
        select: { id: true },
      });
      if (!account) {
        throw new DomainError('BANK.CHECK_DEPOSIT_ACCOUNT_INVALID', {
          bankAccountId: input.depositBankAccountId,
        });
      }
      const depositDate = input.depositDate ?? businessToday();
      if (depositDate < check.issue_date) throw new DomainError('BANK.CHECK_DATES_INVALID');
      await tx.bank_checks.update({
        where: { id },
        data: {
          status: 'DEPOSITED',
          deposit_date: depositDate,
          deposit_bank_account_id: input.depositBankAccountId,
        },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.BANK_CHECK_DEPOSITED,
        entityType: 'bank_checks',
        entityId: id,
        previousState: toJsonState({ status: check.status }),
        newState: toJsonState({
          status: 'DEPOSITED',
          depositDate,
          depositBankAccountId: input.depositBankAccountId,
        }),
      });
      return this.queries.getDetailIn(tx, id);
    });
  }

  /** `POST /bank-checks/{id}/clear` : ouvre sa propre transaction puis délègue à `settleFromReconciliation`. */
  async clear(
    organizationId: string,
    reader: CheckReader,
    id: string,
    input: { clearingDate?: Date | null },
  ): Promise<BankCheckDetailView> {
    let receiptIds: readonly string[] = [];
    const detail = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const today = businessToday();
      const settled = await this.settleFromReconciliation(tx, {
        organizationId,
        bankCheckId: id,
        actorUserId: reader.userId,
        clearingDate: input.clearingDate ?? today,
        today,
      });
      receiptIds = settled.receiptIds;
      return this.queries.getDetailIn(tx, id);
    });
    await this.receipts?.scheduleGeneration(organizationId, receiptIds);
    return detail;
  }

  /**
   * `DEPOSITED` → `CLEARED`, déclenché par `/clear` ou par la confirmation
   * d'un rapprochement (module `reconciliation`, lot 3). Les deux chemins
   * partagent EXACTEMENT ce corps, dans la transaction déjà ouverte par
   * l'appelant.
   */
  async settleFromReconciliation(
    tx: TenantClient,
    input: {
      organizationId: string;
      bankCheckId: string;
      actorUserId: string | null;
      clearingDate: Date;
      today: Date;
    },
  ): Promise<{ paymentId: string | null; receiptIds: readonly string[] }> {
    const check = await this.queries.lock(tx, input.bankCheckId);
    assertCheckTransition(check.status as CheckStatus, 'CLEARED');
    await tx.bank_checks.update({
      where: { id: input.bankCheckId },
      data: { status: 'CLEARED', cleared_at: new Date(), clearing_date: input.clearingDate },
    });
    let receiptIds: string[] = [];
    if (check.payment_id) {
      // `confirmInTx` exige un `PaymentReader` mais ne lit jamais `role` ; un
      // déclenchement système (rapprochement) sans acteur humain doit se
      // traduire par une vraie colonne SQL NULL sur `confirmed_by_user_id`
      // (FK vers `users`), jamais par un identifiant fictif qui la violerait.
      const confirmed = await this.payments.confirmInTx(
        tx,
        input.organizationId,
        { userId: input.actorUserId as unknown as string, role: 'ACCOUNTANT' },
        check.payment_id,
        { valueDate: input.clearingDate },
      );
      receiptIds = confirmed.receiptIds;
    }
    await audit(this.auditService, tx, {
      organizationId: input.organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.BANK_CHECK_CLEARED,
      entityType: 'bank_checks',
      entityId: input.bankCheckId,
      previousState: toJsonState({ status: check.status }),
      newState: toJsonState({
        status: 'CLEARED',
        clearingDate: input.clearingDate,
        paymentId: check.payment_id,
      }),
    });
    return { paymentId: check.payment_id, receiptIds };
  }

  /**
   * `POST /bank-checks/{id}/bounce` : `DEPOSITED` ou `CLEARED` → `BOUNCED`.
   * Motif obligatoire. Frais de rejet éventuels en ligne `OTHER` sur la
   * PREMIÈRE facture `DRAFT` du bail dont `period_start` suit la date du
   * jour ; la facture d'origine n'est jamais modifiée, et l'absence de
   * brouillon n'empêche pas le rejet (`feeInvoiceId: null`).
   */
  async bounce(
    organizationId: string,
    reader: CheckReader,
    id: string,
    input: { reason: string | null; feeAmount?: bigint | null },
  ): Promise<BankCheckDetailView> {
    const reason = input.reason?.trim();
    if (!reason) throw new DomainError('BANK.CHECK_REASON_REQUIRED');
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const check = await this.queries.lock(tx, id);
      assertCheckTransition(check.status as CheckStatus, 'BOUNCED');
      const today = businessToday();
      if (check.payment_id) {
        if (check.status === 'CLEARED') {
          await this.reversal.reverseInTx(tx, organizationId, reader, check.payment_id, reason);
        } else {
          await this.payments.rejectInTx(tx, check.payment_id, reason);
        }
      }

      const orgSettings = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
        select: { settings_json: true },
      });
      const reconciliation = readOperationalSettings(orgSettings?.settings_json).reconciliation;
      const feeAmount = input.feeAmount ?? BigInt(reconciliation.bounceFeeAmount);
      const feeInvoiceId = await this.invoiceFeeLine(
        tx,
        organizationId,
        check,
        feeAmount,
        today,
        id,
      );

      await tx.bank_checks.update({
        where: { id },
        data: {
          status: 'BOUNCED',
          bounced_at: new Date(),
          bounce_reason: reason,
          bounce_fee_amount: feeAmount,
        },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.BANK_CHECK_BOUNCED,
        entityType: 'bank_checks',
        entityId: id,
        previousState: toJsonState({ status: check.status }),
        newState: toJsonState({ status: 'BOUNCED', reason, feeAmount, feeInvoiceId }),
      });
      await notifyManagers(tx, this.enqueuer, organizationId, {
        templateCode: MESSAGE_TEMPLATE_CODES.BANK_CHECK_BOUNCED,
        variables: {
          checkNumber: check.check_number,
          amount: check.amount.toString(),
          reason,
        },
        relatedEntity: { type: 'bank_checks', id },
        dedupeKey: `BANK_CHECK_BOUNCED:${id}`,
      });
      return this.queries.getDetailIn(tx, id);
    });
  }

  /** `POST /bank-checks/{id}/cancel` : `RECEIVED` → `CANCELLED`, paiement `CANCELLED`. */
  async cancel(
    organizationId: string,
    reader: CheckReader,
    id: string,
    reason?: string,
  ): Promise<BankCheckDetailView> {
    return this.terminal(
      organizationId,
      reader,
      id,
      'CANCELLED',
      reason?.trim() || 'Chèque annulé avant dépôt.',
      AUDIT_OPERATIONS.BANK_CHECK_CANCELLED,
    );
  }

  /** `POST /bank-checks/{id}/return` : `RECEIVED` → `RETURNED`, paiement `CANCELLED`. */
  async returnToDrawer(
    organizationId: string,
    reader: CheckReader,
    id: string,
    reason?: string,
  ): Promise<BankCheckDetailView> {
    return this.terminal(
      organizationId,
      reader,
      id,
      'RETURNED',
      reason?.trim() || 'Chèque rendu au tireur.',
      AUDIT_OPERATIONS.BANK_CHECK_RETURNED,
    );
  }

  private async terminal(
    organizationId: string,
    reader: CheckReader,
    id: string,
    to: CheckStatus,
    reason: string,
    operation: string,
  ): Promise<BankCheckDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const check = await this.queries.lock(tx, id);
      assertCheckTransition(check.status as CheckStatus, to);
      if (check.payment_id) await this.payments.cancelInTx(tx, check.payment_id, reason);
      await tx.bank_checks.update({ where: { id }, data: { status: to } });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation,
        entityType: 'bank_checks',
        entityId: id,
        previousState: toJsonState({ status: check.status }),
        newState: toJsonState({ status: to, reason }),
      });
      return this.queries.getDetailIn(tx, id);
    });
  }

  /**
   * Ligne `OTHER` de frais de rejet sur la première facture `DRAFT` du bail
   * dont `period_start` suit `today`. Aucune facture candidate : le rejet
   * réussit quand même, `feeInvoiceId` reste `null`.
   */
  private async invoiceFeeLine(
    tx: TenantClient,
    organizationId: string,
    check: { lease_id: string | null },
    feeAmount: bigint,
    today: Date,
    bankCheckId: string,
  ): Promise<string | null> {
    if (feeAmount <= 0n || !check.lease_id) return null;
    const candidates = await tx.$queryRawUnsafe<InvoiceRow[]>(
      `SELECT * FROM rent_invoices
        WHERE organization_id = $1::uuid AND lease_id = $2::uuid AND status = 'DRAFT'
          AND period_start > $3::date
        ORDER BY period_start ASC LIMIT 1 FOR UPDATE`,
      organizationId,
      check.lease_id,
      today.toISOString().slice(0, 10),
    );
    const candidate = candidates[0];
    if (!candidate) return null;
    await this.invoiceWriter.appendLine(tx, candidate, {
      lineType: 'OTHER',
      label: 'Frais de rejet de chèque',
      unitPriceAmount: feeAmount,
    });
    await this.invoiceWriter.recomputeTotals(tx, candidate.id);
    await audit(this.auditService, tx, {
      organizationId,
      action: 'UPDATE',
      operation: AUDIT_OPERATIONS.BANK_CHECK_BOUNCE_FEE_INVOICED,
      entityType: 'rent_invoices',
      entityId: candidate.id,
      newState: toJsonState({ bankCheckId, feeAmount }),
    });
    return candidate.id;
  }
}
