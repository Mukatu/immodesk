import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import {
  CASH_RECEIPT_SUMMARY_FROM,
  CASH_RECEIPT_SUMMARY_SELECT,
  toCashReceiptSummary,
  type CashReceiptSummaryRow,
} from '../../cash/application/cash-receipt-views';
import {
  RECEIPT_SUMMARY_FROM,
  RECEIPT_SUMMARY_SELECT,
  toReceiptSummary,
  type ReceiptSummaryRow,
} from '../../receipts/application/receipt-views';
import {
  PAYMENT_SUMMARY_FROM,
  PAYMENT_SUMMARY_SELECT,
  toPaymentDetail,
  toPaymentSummary,
  type PaymentAllocationRow,
  type PaymentDetailView,
  type PaymentRow,
  type PaymentSummaryRow,
  type PaymentSummaryView,
} from './payment-views';

export interface PaymentReader {
  userId: string;
  role: MemberRole;
}

export interface PaymentListFilters {
  method?: string;
  status?: string;
  tenantId?: string;
  leaseId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

@Injectable()
export class PaymentsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    reader: PaymentReader,
    filters: PaymentListFilters,
  ): Promise<Page<PaymentSummaryView>> {
    const conditions = ['pm.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    if (filters.method) conditions.push(`pm.method = ${bind(filters.method)}::payment_method`);
    if (filters.status) conditions.push(`pm.status = ${bind(filters.status)}::payment_status`);
    if (filters.tenantId) conditions.push(`pm.tenant_id = ${bind(filters.tenantId)}::uuid`);
    if (filters.leaseId) conditions.push(`pm.lease_id = ${bind(filters.leaseId)}::uuid`);
    if (filters.from)
      conditions.push(`pm.payment_date >= ${bind(filters.from.slice(0, 10))}::date`);
    if (filters.to) conditions.push(`pm.payment_date <= ${bind(filters.to.slice(0, 10))}::date`);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'pm');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.$queryRawUnsafe<PaymentSummaryRow[]>(
        `SELECT ${PAYMENT_SUMMARY_SELECT} FROM ${PAYMENT_SUMMARY_FROM}
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('pm')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toPaymentSummary), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, reader: PaymentReader, id: string): Promise<PaymentDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.detailIn(tx, id, reader),
    );
  }

  /** Paiement verrouillé pour une transition. */
  async lock(tx: TenantClient, id: string): Promise<PaymentRow> {
    const rows = await tx.$queryRawUnsafe<PaymentRow[]>(
      `SELECT * FROM payments WHERE id = $1::uuid FOR UPDATE`,
      id,
    );
    if (!rows[0]) throw new DomainError('PAYMENTS.NOT_FOUND', { paymentId: id });
    return rows[0];
  }

  async findByClientRef(tx: TenantClient, clientRef: string): Promise<PaymentRow | null> {
    const rows = await tx.$queryRawUnsafe<PaymentRow[]>(
      `SELECT * FROM payments WHERE client_ref = $1`,
      clientRef,
    );
    return rows[0] ?? null;
  }

  /** Détail ; un démarcheur ne voit que les paiements qu'il a encaissés (404 sinon). */
  async detailIn(tx: TenantClient, id: string, reader?: PaymentReader): Promise<PaymentDetailView> {
    const rows = await tx.$queryRawUnsafe<PaymentSummaryRow[]>(
      `SELECT ${PAYMENT_SUMMARY_SELECT} FROM ${PAYMENT_SUMMARY_FROM} WHERE pm.id = $1::uuid`,
      id,
    );
    const row = rows[0];
    if (!row || (reader?.role === 'COLLECTOR' && row.received_by_user_id !== reader.userId)) {
      throw new DomainError('PAYMENTS.NOT_FOUND', { paymentId: id });
    }
    const allocations = await tx.$queryRawUnsafe<PaymentAllocationRow[]>(
      `SELECT pa.id, pa.invoice_id, ri.invoice_number, pa.tenant_credit_id, pa.amount, pa.is_reversal
         FROM payment_allocations pa
         LEFT JOIN rent_invoices ri ON ri.id = pa.invoice_id
        WHERE pa.payment_id = $1::uuid
        ORDER BY pa.created_at, pa.allocation_order, pa.id`,
      id,
    );
    const cash = await tx.$queryRawUnsafe<CashReceiptSummaryRow[]>(
      `SELECT ${CASH_RECEIPT_SUMMARY_SELECT} FROM ${CASH_RECEIPT_SUMMARY_FROM}
        WHERE cr.payment_id = $1::uuid ORDER BY cr.created_at LIMIT 1`,
      id,
    );
    const receipts = await tx.$queryRawUnsafe<ReceiptSummaryRow[]>(
      `SELECT ${RECEIPT_SUMMARY_SELECT} FROM ${RECEIPT_SUMMARY_FROM}
        WHERE r.payment_id = $1::uuid ORDER BY r.created_at`,
      id,
    );
    const mirror = await tx.$queryRawUnsafe<
      Array<{ created_at: Date; reversal_reason: string | null }>
    >(
      `SELECT created_at, reversal_reason FROM payments WHERE reversal_of_id = $1::uuid LIMIT 1`,
      id,
    );
    return toPaymentDetail(
      row,
      allocations,
      cash[0] ? toCashReceiptSummary(cash[0]) : null,
      receipts.map(toReceiptSummary),
      mirror[0] ?? null,
    );
  }
}
