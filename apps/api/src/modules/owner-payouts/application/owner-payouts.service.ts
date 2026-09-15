import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, notFound } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  MOMO_PAYOUT_INITIATOR,
  type MobileMoneyPayoutInitiator,
} from '../../mobile-money/domain/ports';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { NumberingService } from '../../numbering/application/numbering.service';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import type { FeeBearer, PaymentMethod } from '../../payments/domain/payment-rules';
import { OwnerStatementsService } from '../../owner-statements/application/owner-statements.service';
import {
  assertBankTransferDetails,
  resolveMomoMsisdn,
  type PayoutBankAccountCandidate,
} from '../domain/owner-payout-bank-details';
import {
  assertApprovable,
  assertExecutable,
  assertFailable,
  assertNoExistingPayout,
  assertStatementBalancePositive,
  assertStatementPayoutSource,
  type PayoutStatus,
} from '../domain/owner-payout-rules';
import { toPayoutView, type OwnerPayoutRow, type PayoutView } from './owner-payout-views';

export interface CreatePayoutInput {
  statementId: string;
  method?: PaymentMethod;
  bankAccountId?: string;
  feeAmount?: number;
  feeBearer?: FeeBearer;
  scheduledDate?: string;
  clientRef?: string;
  notes?: string;
}

/**
 * `POST /{id}/execute` (contrat) : selon `owner_payouts.method`.
 * - Virement, chèque, espèces : pas d'intégration disponible — `externalReference`
 *   et `proofDocumentId` sont déclarés par l'appelant (voir tête de fichier).
 * - Mobile Money : ignorés (voir `executeMobileMoney`), sauf `proofDocumentId`
 *   qui reste possible pour archiver une preuve annexe.
 */
export interface ExecutePayoutInput {
  externalReference?: string;
  proofDocumentId?: string;
}

function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function toBankAccountCandidate(
  row: {
    id: string;
    is_active: boolean;
    iban: string | null;
    swift_bic: string | null;
    account_number: string | null;
    momo_msisdn: string | null;
  } | null,
): PayoutBankAccountCandidate | null {
  if (!row) return null;
  return {
    id: row.id,
    isActive: row.is_active,
    iban: row.iban,
    swiftBic: row.swift_bic,
    accountNumber: row.account_number,
    momoMsisdn: row.momo_msisdn,
  };
}

const BANK_ACCOUNT_SELECT = {
  id: true,
  is_active: true,
  iban: true,
  swift_bic: true,
  account_number: true,
  momo_msisdn: true,
} as const;

/**
 * Module `owner-payouts` : reversements aux bailleurs, propriétaire exclusif
 * de `owner_payouts` (contrat, § Reversements). Appelle
 * `OwnerStatementsService.markPaid` (module `@Global()`) DANS SA PROPRE
 * transaction dès que le reversement atteint `PAID` — jamais l'inverse : ce
 * module n'a aucune route déclenchée par `owner-statements`.
 */
@Injectable()
export class OwnerPayoutsService {
  private readonly logger = new Logger(OwnerPayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
    private readonly statements: OwnerStatementsService,
    @Inject(MOMO_PAYOUT_INITIATOR) private readonly momoPayouts: MobileMoneyPayoutInitiator,
    @Inject(NOTIFICATION_ENQUEUER) private readonly notifications: NotificationEnqueuer,
  ) {}

  /**
   * L'alerte MANAGER (contrat, arbitrage n°6) est best-effort : elle ne doit
   * jamais transformer un 409 `AGENCY.PAYOUT_MISSING_BANK_DETAILS` propre en
   * 500. Elle est donc envoyée APRÈS le rollback de la transaction de
   * création (`catch`, hors `withTenant`), dans sa propre transaction.
   */
  async create(
    organizationId: string,
    userId: string,
    input: CreatePayoutInput,
  ): Promise<PayoutView> {
    try {
      return await this.prisma.withTenant(organizationId, userId, (tx) =>
        this.createInTx(tx, organizationId, input),
      );
    } catch (error) {
      if (error instanceof DomainError && error.code === 'AGENCY.PAYOUT_MISSING_BANK_DETAILS') {
        await this.alertManagersBestEffort(organizationId, userId, error.details ?? {});
      }
      throw error;
    }
  }

  private async createInTx(
    tx: TenantClient,
    organizationId: string,
    input: CreatePayoutInput,
  ): Promise<PayoutView> {
    if (input.clientRef) {
      const existing = (await tx.owner_payouts.findFirst({
        where: { organization_id: organizationId, client_ref: input.clientRef },
      })) as unknown as OwnerPayoutRow | null;
      if (existing) return toPayoutView(existing);
    }

    const statement = await tx.owner_statements.findFirst({
      where: { id: input.statementId },
      select: {
        id: true,
        landlord_id: true,
        status: true,
        net_payable_amount: true,
        currency: true,
        statement_number: true,
      },
    });
    if (!statement) {
      throw new DomainError('AGENCY.STATEMENT_NOT_FOUND', { statementId: input.statementId });
    }
    assertStatementPayoutSource(statement.status);
    assertStatementBalancePositive(statement.net_payable_amount);

    const existingPayout = await tx.owner_payouts.findFirst({
      where: { statement_id: statement.id, status: { not: 'CANCELLED' } },
      select: { id: true },
    });
    assertNoExistingPayout(Boolean(existingPayout));

    const landlord = await tx.landlords.findFirst({
      where: { id: statement.landlord_id },
      select: {
        id: true,
        payout_method: true,
        default_bank_account_id: true,
        primary_phone: true,
        country_code: true,
        party_type: true,
        first_name: true,
        last_name: true,
        company_name: true,
      },
    });
    if (!landlord) {
      throw new DomainError('PARTIES.LANDLORD_NOT_FOUND', { landlordId: statement.landlord_id });
    }

    const method = input.method ?? landlord.payout_method;
    const isDiaspora = landlord.country_code !== 'CG';
    const account = await this.resolveBankAccount(
      tx,
      organizationId,
      method,
      input.bankAccountId ?? landlord.default_bank_account_id ?? undefined,
    );
    this.assertBankDetailsOrEnrich(
      method,
      account,
      isDiaspora,
      landlord,
      statement.statement_number,
    );

    const feeAmount = input.feeAmount != null ? toAmount(input.feeAmount) : 0n;
    const feeBearer = input.feeBearer ?? 'LANDLORD';
    const amount = statement.net_payable_amount;
    const netAmount = amount - feeAmount;

    const id = newId();
    const { number } = await this.numbering.nextNumber(tx, organizationId, 'PAYOUT', new Date());
    const created = (await tx.owner_payouts.create({
      data: {
        id,
        organization_id: organizationId,
        landlord_id: landlord.id,
        statement_id: statement.id,
        reference: number,
        status: 'PENDING',
        method,
        amount,
        fee_amount: feeAmount,
        fee_bearer: feeBearer,
        net_amount: netAmount,
        currency: statement.currency,
        bank_account_id: account?.id ?? null,
        scheduled_date: input.scheduledDate ? toDateOnly(input.scheduledDate) : null,
        client_ref: input.clientRef ?? null,
        notes: input.notes?.trim() || null,
      },
    })) as unknown as OwnerPayoutRow;

    await audit(this.auditService, tx, {
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.OWNER_PAYOUT_CREATED,
      entityType: 'owner_payouts',
      entityId: id,
      newState: toJsonState(toPayoutView(created)),
    });
    return toPayoutView(created);
  }

  /** `BANK_TRANSFER`/`MOBILE_MONEY` seulement (contrat, arbitrage n°6) : `CASH`/`BANK_CHECK` n'exigent aucune coordonnée. */
  private async resolveBankAccount(
    tx: TenantClient,
    organizationId: string,
    method: string,
    accountId: string | undefined,
  ): Promise<PayoutBankAccountCandidate | null> {
    if (!accountId || (method !== 'BANK_TRANSFER' && method !== 'MOBILE_MONEY')) return null;
    const row = await tx.bank_accounts.findFirst({
      where: { id: accountId, organization_id: organizationId },
      select: BANK_ACCOUNT_SELECT,
    });
    return toBankAccountCandidate(row);
  }

  /** Enrichit `AGENCY.PAYOUT_MISSING_BANK_DETAILS` (levée par `domain/owner-payout-bank-details.ts`) pour l'alerte MANAGER. */
  private assertBankDetailsOrEnrich(
    method: string,
    account: PayoutBankAccountCandidate | null,
    isDiaspora: boolean,
    landlord: {
      id: string;
      party_type: string;
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
      primary_phone: string;
    },
    statementNumber: string,
  ): void {
    try {
      if (method === 'BANK_TRANSFER') assertBankTransferDetails(account, isDiaspora);
      if (method === 'MOBILE_MONEY') resolveMomoMsisdn(account, landlord.primary_phone);
    } catch (error) {
      if (!(error instanceof DomainError) || error.code !== 'AGENCY.PAYOUT_MISSING_BANK_DETAILS') {
        throw error;
      }
      throw new DomainError('AGENCY.PAYOUT_MISSING_BANK_DETAILS', {
        ...error.details,
        landlordId: landlord.id,
        landlordName: displayNameOf({
          partyType: landlord.party_type as PartyType,
          firstName: landlord.first_name,
          lastName: landlord.last_name,
          companyName: landlord.company_name,
        }),
        statementNumber,
        method,
      });
    }
  }

  /** Best-effort : ne jette jamais (voir le commentaire de `create`). */
  private async alertManagersBestEffort(
    organizationId: string,
    actorUserId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      const managers = await this.prisma.withTenant(organizationId, actorUserId, (tx) =>
        tx.$queryRawUnsafe<Array<{ phone_e164: string }>>(
          `SELECT u.phone_e164
             FROM organization_members om
             JOIN users u ON u.id = om.user_id
            WHERE om.organization_id = $1::uuid
              AND om.role = 'MANAGER'::member_role
              AND om.status = 'ACTIVE'::member_status`,
          organizationId,
        ),
      );
      for (const manager of managers) {
        await this.notifications.enqueue({
          organizationId,
          templateCode: MESSAGE_TEMPLATE_CODES.PAYOUT_BANK_DETAILS_MISSING,
          recipient: { phone: manager.phone_e164 },
          variables: {
            reference: String(details.statementNumber ?? ''),
            landlordName: String(details.landlordName ?? ''),
            method: String(details.method ?? ''),
          },
          actorUserId,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Alerte MANAGER (coordonnées de reversement manquantes) non envoyée : ${String(error)}`,
      );
    }
  }

  /** `POST /{id}/approve` (contrat, `OWNER`) : `PENDING` → `APPROVED`. */
  async approve(organizationId: string, userId: string, id: string): Promise<PayoutView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertApprovable(before.status as PayoutStatus);
      const after = (await tx.owner_payouts.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approved_by_user_id: userId,
          approved_at: new Date(),
          updated_at: new Date(),
        },
      })) as unknown as OwnerPayoutRow;
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.OWNER_PAYOUT_APPROVED,
        entityType: 'owner_payouts',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: 'APPROVED', approvedByUserId: userId }),
      });
      return toPayoutView(after);
    });
  }

  /**
   * `POST /{id}/fail` (contrat, `ACCOUNTANT`, motif obligatoire) :
   * `PROCESSING` ou `APPROVED` → `FAILED`.
   */
  async fail(
    organizationId: string,
    userId: string,
    id: string,
    reason: string,
  ): Promise<PayoutView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertFailable(before.status as PayoutStatus, reason);
      const after = (await tx.owner_payouts.update({
        where: { id },
        data: { status: 'FAILED', failure_reason: reason.trim(), updated_at: new Date() },
      })) as unknown as OwnerPayoutRow;
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.OWNER_PAYOUT_FAILED,
        entityType: 'owner_payouts',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: 'FAILED', reason: reason.trim() }),
      });
      return toPayoutView(after);
    });
  }

  async require(tx: TenantClient, id: string): Promise<OwnerPayoutRow> {
    const row = (await tx.owner_payouts.findFirst({
      where: { id },
    })) as unknown as OwnerPayoutRow | null;
    if (!row) throw new DomainError('AGENCY.PAYOUT_NOT_FOUND', { payoutId: id });
    return row;
  }

  /**
   * `POST /{id}/execute` (contrat, `ACCOUNTANT`) : `APPROVED` → `PROCESSING`
   * puis, si l'exécution réussit dans le même appel, → `PAID`. Accepte aussi
   * `FAILED` en entrée (voir `domain/owner-payout-rules.ts`, `assertExecutable`) :
   * nouvelle tentative sans recréer le reversement.
   */
  async execute(
    organizationId: string,
    userId: string,
    id: string,
    input: ExecutePayoutInput,
  ): Promise<PayoutView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertExecutable(before.status as PayoutStatus);
      if (input.proofDocumentId)
        await this.requireDocument(tx, organizationId, input.proofDocumentId);

      return before.method === 'MOBILE_MONEY'
        ? this.executeMobileMoney(tx, organizationId, before, input)
        : this.executeManual(tx, before, input);
    });
  }

  private async requireDocument(
    tx: TenantClient,
    organizationId: string,
    documentId: string,
  ): Promise<void> {
    const document = await tx.documents.findFirst({
      where: { id: documentId, organization_id: organizationId },
      select: { id: true },
    });
    if (!document) throw notFound('documents', documentId);
  }

  /**
   * Espèces, virement, chèque : aucune intégration disponible (contrat).
   * L'appelant déclare une référence externe et une preuve éventuelle ;
   * `owner_payouts` n'a pas de colonne dédiée à cette référence externe
   * (schéma figé) — DÉCISION : conservée dans `notes` (append, jamais
   * écrasée) et intégralement dans `audit_logs.new_state`.
   */
  private async executeManual(
    tx: TenantClient,
    before: OwnerPayoutRow,
    input: ExecutePayoutInput,
  ): Promise<PayoutView> {
    const paidAt = new Date();
    const externalRefNote = input.externalReference?.trim()
      ? `Référence externe : ${input.externalReference.trim()}`
      : null;
    const notes = [before.notes, externalRefNote].filter(Boolean).join(' | ') || null;

    const after = (await tx.owner_payouts.update({
      where: { id: before.id },
      data: {
        status: 'PAID',
        paid_at: paidAt,
        proof_document_id: input.proofDocumentId ?? before.proof_document_id,
        notes,
        updated_at: new Date(),
      },
    })) as unknown as OwnerPayoutRow;

    await audit(this.auditService, tx, {
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.OWNER_PAYOUT_EXECUTED,
      entityType: 'owner_payouts',
      entityId: before.id,
      previousState: toJsonState({ status: before.status }),
      newState: toJsonState({
        status: 'PAID',
        externalReference: input.externalReference ?? null,
        proofDocumentId: after.proof_document_id,
      }),
    });
    if (before.statement_id) await this.statements.markPaid(tx, before.statement_id, paidAt);
    return toPayoutView(after);
  }

  /**
   * Mobile Money (contrat) : `MOMO_PAYOUT_INITIATOR` (voir
   * `mobile-money/domain/ports.ts`). Un reversement `FAILED` OU `PROCESSING`
   * porteur déjà d'un `momo_transaction_id` RÉ-INTERROGE ce décaissement
   * (nouvelle tentative sans en recréer un second — contrat : « une route
   * `POST /{id}/execute` rejouée peut réinterroger `getStatus` si déjà
   * `PROCESSING` ») ; sinon un décaissement neuf est initié pour `net_amount`
   * (montant réellement dû au bailleur, frais déjà déduits).
   */
  private async executeMobileMoney(
    tx: TenantClient,
    organizationId: string,
    before: OwnerPayoutRow,
    input: ExecutePayoutInput,
  ): Promise<PayoutView> {
    const isRetry =
      (before.status === 'FAILED' || before.status === 'PROCESSING') &&
      Boolean(before.momo_transaction_id);
    const result = isRetry
      ? await this.momoPayouts.refreshPayoutStatus(tx, before.momo_transaction_id as string)
      : await this.momoPayouts.initiatePayout(tx, {
          organizationId,
          amount: before.net_amount,
          currency: before.currency as 'XAF',
          payerMsisdn: await this.resolveMomoMsisdnForPayout(tx, before),
          externalReference: before.reference,
          description: `Reversement ${before.reference}`,
        });

    const status =
      result.state === 'SUCCEEDED' ? 'PAID' : result.state === 'FAILED' ? 'FAILED' : 'PROCESSING';
    const paidAt = status === 'PAID' ? new Date() : null;
    const after = (await tx.owner_payouts.update({
      where: { id: before.id },
      data: {
        status,
        momo_transaction_id: result.momoTransactionId,
        paid_at: paidAt,
        proof_document_id: input.proofDocumentId ?? before.proof_document_id,
        failure_reason:
          status === 'FAILED' ? 'Échec du décaissement Mobile Money (agrégateur).' : null,
        updated_at: new Date(),
      },
    })) as unknown as OwnerPayoutRow;

    await audit(this.auditService, tx, {
      action: 'STATE_TRANSITION',
      operation:
        status === 'FAILED'
          ? AUDIT_OPERATIONS.OWNER_PAYOUT_FAILED
          : AUDIT_OPERATIONS.OWNER_PAYOUT_EXECUTED,
      entityType: 'owner_payouts',
      entityId: before.id,
      previousState: toJsonState({ status: before.status }),
      newState: toJsonState({
        status,
        momoTransactionId: result.momoTransactionId,
        providerReference: result.providerReference,
      }),
    });
    if (status === 'PAID' && before.statement_id && paidAt) {
      await this.statements.markPaid(tx, before.statement_id, paidAt);
    }
    return toPayoutView(after);
  }

  /**
   * Numéro Mobile Money du bénéficiaire : compte dédié (`bank_accounts.momo_msisdn`)
   * déjà résolu et persisté sur `owner_payouts.bank_account_id` à la
   * création, sinon `landlords.primary_phone` (voir `domain/owner-payout-bank-details.ts`).
   */
  private async resolveMomoMsisdnForPayout(
    tx: TenantClient,
    payout: OwnerPayoutRow,
  ): Promise<string> {
    const landlord = await tx.landlords.findFirst({
      where: { id: payout.landlord_id },
      select: { primary_phone: true },
    });
    const account = payout.bank_account_id
      ? toBankAccountCandidate(
          await tx.bank_accounts.findFirst({
            where: { id: payout.bank_account_id },
            select: BANK_ACCOUNT_SELECT,
          }),
        )
      : null;
    const msisdn = resolveMomoMsisdn(account, landlord?.primary_phone ?? null);
    return normalizePhoneE164(msisdn);
  }
}
