import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import type { PaymentReader } from '../../payments/application/payments-query.service';
import {
  assertRemittanceTransition,
  varianceOf,
  type RemittanceStatus,
} from '../domain/cash-rules';
import {
  REMITTANCE_SUMMARY_FROM,
  REMITTANCE_SUMMARY_SELECT,
  toRemittanceDetail,
  toRemittanceSummary,
  type RemittanceDetailView,
  type RemittanceItemRow,
  type RemittanceRow,
  type RemittanceSummaryRow,
  type RemittanceSummaryView,
} from './remittance-views';

export interface RemittanceInput {
  cashReceiptIds: string[];
  declaredAmount: bigint;
  denominations?: Record<string, number>;
  submit?: boolean;
  notes?: string | null;
  clientRef?: string | null;
}

export interface VerifyInput {
  countedAmount: bigint;
  items?: Array<{
    cashReceiptId: string;
    isVerified: boolean;
    varianceAmount?: bigint;
    varianceReason?: string | null;
  }>;
  notes?: string | null;
}

interface ReceiptLockRow {
  id: string;
  collector_user_id: string;
  status: string;
  remittance_id: string | null;
  payment_id: string | null;
  amount: bigint;
}

/**
 * Remises d'espèces : du démarcheur à l'agence, contrôle contradictoire,
 * écart enregistré et audité (docs/api/phase3-contract.md, § « Remise »).
 */
@Injectable()
export class RemittancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async create(
    organizationId: string,
    reader: PaymentReader,
    input: RemittanceInput,
  ): Promise<{ detail: RemittanceDetailView; replayed: boolean }> {
    if (input.cashReceiptIds.length === 0) throw new DomainError('CASH.REMITTANCE_EMPTY');
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      if (input.clientRef) {
        const existing = await tx.cash_remittances.findFirst({
          where: { client_ref: input.clientRef },
          select: { id: true },
        });
        if (existing) return { detail: await this.detailIn(tx, existing.id), replayed: true };
      }
      // Sérialise les remises d'un même démarcheur : l'index partiel du DDL ne
      // couvre que l'état OPEN, le contrat étend la règle à SUBMITTED.
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        `cash-remittance:${reader.userId}`,
      );
      const open = await tx.cash_remittances.findFirst({
        where: { collector_user_id: reader.userId, status: { in: ['OPEN', 'SUBMITTED'] } },
        select: { id: true, reference: true },
      });
      if (open) throw new DomainError('CASH.REMITTANCE_ALREADY_OPEN', { remittanceId: open.id });

      const ids = [...new Set(input.cashReceiptIds)];
      const receipts = await tx.$queryRawUnsafe<ReceiptLockRow[]>(
        `SELECT id, collector_user_id, status::text AS status, remittance_id, payment_id, amount
           FROM cash_receipts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
        ids,
      );
      const own = receipts.filter((r) => r.collector_user_id === reader.userId);
      if (own.length !== ids.length) {
        throw new DomainError('CASH.RECEIPT_NOT_FOUND', {
          missing: ids.filter((id) => !own.some((r) => r.id === id)),
        });
      }
      const unavailable = own.filter((r) => r.status !== 'ISSUED' || r.remittance_id !== null);
      if (unavailable.length > 0) {
        throw new DomainError('CASH.RECEIPT_ALREADY_REMITTED', {
          cashReceiptIds: unavailable.map((r) => r.id),
        });
      }

      const status: RemittanceStatus = input.submit === false ? 'OPEN' : 'SUBMITTED';
      const expected = own.reduce((total, r) => total + r.amount, 0n);
      const { number } = await this.numbering.nextNumber(
        tx,
        organizationId,
        'REMITTANCE',
        businessToday(),
      );
      const id = newId();
      try {
        await tx.cash_remittances.create({
          data: {
            id,
            organization_id: organizationId,
            collector_user_id: reader.userId,
            reference: number,
            status,
            submitted_at: status === 'SUBMITTED' ? new Date() : null,
            declared_amount: input.declaredAmount,
            expected_amount: expected,
            receipts_count: own.length,
            denominations: (input.denominations ?? {}) as object,
            client_ref: input.clientRef ?? null,
            notes: input.notes ?? null,
          },
        });
      } catch (error) {
        if (isUniqueViolation(error, 'collector'))
          throw new DomainError('CASH.REMITTANCE_ALREADY_OPEN');
        throw error;
      }
      await tx.cash_remittance_items.createMany({
        data: own.map((r) => ({
          id: newId(),
          organization_id: organizationId,
          remittance_id: id,
          cash_receipt_id: r.id,
          payment_id: r.payment_id,
          amount: r.amount,
        })),
      });
      await tx.$executeRawUnsafe(
        `UPDATE cash_receipts SET remittance_id = $1::uuid, updated_at = now() WHERE id = ANY($2::uuid[])`,
        id,
        ids,
      );
      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.REMITTANCE_CREATED,
        entityType: 'cash_remittances',
        entityId: id,
        newState: toJsonState({
          reference: number,
          status,
          expectedAmount: expected,
          declaredAmount: input.declaredAmount,
        }),
      });
      return { detail: await this.detailIn(tx, id), replayed: false };
    });
  }

  async submit(
    organizationId: string,
    reader: PaymentReader,
    id: string,
  ): Promise<RemittanceDetailView> {
    return this.transition(organizationId, reader, id, 'SUBMITTED', true, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE cash_remittances SET status = 'SUBMITTED', submitted_at = now(), updated_at = now() WHERE id = $1::uuid`,
        id,
      );
      return { operation: AUDIT_OPERATIONS.REMITTANCE_SUBMITTED, state: {} };
    });
  }

  async verify(
    organizationId: string,
    reader: PaymentReader,
    id: string,
    input: VerifyInput,
  ): Promise<RemittanceDetailView> {
    return this.transition(
      organizationId,
      reader,
      id,
      'VERIFIED',
      false,
      async (tx, remittance) => {
        const variance = varianceOf(input.countedAmount, remittance.expected_amount);
        await tx.$executeRawUnsafe(
          `UPDATE cash_remittances
            SET status = 'VERIFIED', verified_at = now(), verified_by_user_id = $2::uuid,
                counted_amount = $3::bigint, variance_amount = $4::bigint,
                notes = CASE WHEN $5::text IS NULL THEN notes ELSE concat_ws(E'\\n', notes, $5::text) END,
                updated_at = now()
          WHERE id = $1::uuid`,
          id,
          reader.userId,
          input.countedAmount.toString(),
          variance.toString(),
          input.notes ?? null,
        );
        const detailed = new Map((input.items ?? []).map((item) => [item.cashReceiptId, item]));
        const items = await tx.cash_remittance_items.findMany({ where: { remittance_id: id } });
        for (const item of items) {
          const check = detailed.get(item.cash_receipt_id);
          await tx.cash_remittance_items.update({
            where: { id: item.id },
            data: {
              is_verified: check ? check.isVerified : true,
              variance_amount: check?.varianceAmount ?? 0n,
              variance_reason: check?.varianceReason ?? null,
              updated_at: new Date(),
            },
          });
        }
        await tx.$executeRawUnsafe(
          `UPDATE cash_receipts SET status = 'REMITTED', updated_at = now()
          WHERE remittance_id = $1::uuid AND status = 'ISSUED'`,
          id,
        );
        return {
          operation: AUDIT_OPERATIONS.REMITTANCE_VERIFIED,
          state: {
            collectorUserId: remittance.collector_user_id,
            verifiedByUserId: reader.userId,
            expectedAmount: remittance.expected_amount,
            declaredAmount: remittance.declared_amount,
            countedAmount: input.countedAmount,
            varianceAmount: variance,
          },
        };
      },
    );
  }

  async reject(
    organizationId: string,
    reader: PaymentReader,
    id: string,
    reason: string,
  ): Promise<RemittanceDetailView> {
    return this.transition(
      organizationId,
      reader,
      id,
      'REJECTED',
      false,
      async (tx, remittance) => {
        await tx.$executeRawUnsafe(
          `UPDATE cash_remittances SET status = 'REJECTED', rejection_reason = $2, updated_at = now() WHERE id = $1::uuid`,
          id,
          reason,
        );
        // Les reçus redeviennent disponibles pour une nouvelle remise.
        await tx.$executeRawUnsafe(
          `UPDATE cash_receipts SET remittance_id = NULL, updated_at = now() WHERE remittance_id = $1::uuid`,
          id,
        );
        return {
          operation: AUDIT_OPERATIONS.REMITTANCE_REJECTED,
          state: {
            reason,
            collectorUserId: remittance.collector_user_id,
            verifiedByUserId: reader.userId,
          },
        };
      },
    );
  }

  async deposit(
    organizationId: string,
    reader: PaymentReader,
    id: string,
    input: { bankAccountId: string; depositedAt: Date; depositSlipDocumentId?: string | null },
  ): Promise<RemittanceDetailView> {
    return this.transition(organizationId, reader, id, 'DEPOSITED', false, async (tx) => {
      const account = await tx.bank_accounts.findFirst({
        where: { id: input.bankAccountId },
        select: { id: true },
      });
      if (!account)
        throw new DomainError('BANKING.ACCOUNT_NOT_FOUND', { bankAccountId: input.bankAccountId });
      await tx.$executeRawUnsafe(
        `UPDATE cash_remittances
            SET status = 'DEPOSITED', deposited_at = $2::timestamptz, deposit_bank_account_id = $3::uuid,
                deposit_slip_document_id = $4::uuid, updated_at = now()
          WHERE id = $1::uuid`,
        id,
        input.depositedAt.toISOString(),
        input.bankAccountId,
        input.depositSlipDocumentId ?? null,
      );
      return {
        operation: AUDIT_OPERATIONS.REMITTANCE_DEPOSITED,
        state: { bankAccountId: input.bankAccountId },
      };
    });
  }

  async list(
    organizationId: string,
    reader: PaymentReader,
    filters: { status?: string; collectorUserId?: string; limit?: number; cursor?: string },
  ): Promise<Page<RemittanceSummaryView>> {
    const conditions = ['r.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const collector = reader.role === 'COLLECTOR' ? reader.userId : filters.collectorUserId;
    if (collector) {
      params.push(collector);
      conditions.push(`r.collector_user_id = $${params.length}::uuid`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`r.status = $${params.length}::remittance_status`);
    }
    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'r');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.$queryRawUnsafe<RemittanceSummaryRow[]>(
        `SELECT ${REMITTANCE_SUMMARY_SELECT} FROM ${REMITTANCE_SUMMARY_FROM}
          WHERE ${conditions.join(' AND ')} ${keysetOrderBy('r')} LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toRemittanceSummary), pageInfo: page.pageInfo };
  }

  async get(
    organizationId: string,
    reader: PaymentReader,
    id: string,
  ): Promise<RemittanceDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const detail = await this.detailIn(tx, id);
      if (reader.role === 'COLLECTOR' && detail.collectorUserId !== reader.userId) {
        throw new DomainError('CASH.REMITTANCE_NOT_FOUND', { remittanceId: id });
      }
      return detail;
    });
  }

  private async transition(
    organizationId: string,
    reader: PaymentReader,
    id: string,
    to: RemittanceStatus,
    authorOnly: boolean,
    work: (
      tx: TenantClient,
      remittance: RemittanceRow,
    ) => Promise<{ operation: string; state: Record<string, unknown> }>,
  ): Promise<RemittanceDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<RemittanceRow[]>(
        `SELECT * FROM cash_remittances WHERE id = $1::uuid FOR UPDATE`,
        id,
      );
      const remittance = rows[0];
      if (!remittance || (authorOnly && remittance.collector_user_id !== reader.userId)) {
        throw new DomainError('CASH.REMITTANCE_NOT_FOUND', { remittanceId: id });
      }
      assertRemittanceTransition(remittance.status as RemittanceStatus, to);
      const { operation, state } = await work(tx, remittance);
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation,
        entityType: 'cash_remittances',
        entityId: id,
        previousState: toJsonState({ status: remittance.status }),
        newState: toJsonState({ status: to, ...state }),
      });
      return this.detailIn(tx, id);
    });
  }

  private async detailIn(tx: TenantClient, id: string): Promise<RemittanceDetailView> {
    const rows = await tx.$queryRawUnsafe<RemittanceSummaryRow[]>(
      `SELECT ${REMITTANCE_SUMMARY_SELECT} FROM ${REMITTANCE_SUMMARY_FROM} WHERE r.id = $1::uuid`,
      id,
    );
    if (!rows[0]) throw new DomainError('CASH.REMITTANCE_NOT_FOUND', { remittanceId: id });
    const items = await tx.$queryRawUnsafe<RemittanceItemRow[]>(
      `SELECT i.id, i.cash_receipt_id, cr.receipt_number, i.amount, i.is_verified, i.variance_amount, i.variance_reason
         FROM cash_remittance_items i JOIN cash_receipts cr ON cr.id = i.cash_receipt_id
        WHERE i.remittance_id = $1::uuid ORDER BY cr.receipt_number`,
      id,
    );
    return toRemittanceDetail(rows[0], items);
  }
}
