import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { publicInvoiceNumber } from '../../billing/application/invoice-views';
import type { PaymentReader } from '../../payments/application/payments-query.service';
import {
  CASH_RECEIPT_SUMMARY_FROM,
  CASH_RECEIPT_SUMMARY_SELECT,
  toCashReceiptDetail,
  toCashReceiptSummary,
  type CashReceiptDetailView,
  type CashReceiptSummaryRow,
  type CashReceiptSummaryView,
} from './cash-receipt-views';

export interface CashReceiptListFilters {
  collectorUserId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/** Lectures des reçus de caisse ; un démarcheur ne voit que les siens. */
@Injectable()
export class CashReceiptsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    reader: PaymentReader,
    filters: CashReceiptListFilters,
  ): Promise<Page<CashReceiptSummaryView>> {
    const conditions = ['cr.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    const collector = reader.role === 'COLLECTOR' ? reader.userId : filters.collectorUserId;
    if (collector) conditions.push(`cr.collector_user_id = ${bind(collector)}::uuid`);
    if (filters.status) conditions.push(`cr.status = ${bind(filters.status)}::cash_receipt_status`);
    if (filters.from) conditions.push(`cr.received_at >= ${bind(filters.from.slice(0, 10))}::date`);
    if (filters.to)
      conditions.push(`cr.received_at < (${bind(filters.to.slice(0, 10))}::date + 1)`);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'cr');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.$queryRawUnsafe<CashReceiptSummaryRow[]>(
        `SELECT ${CASH_RECEIPT_SUMMARY_SELECT} FROM ${CASH_RECEIPT_SUMMARY_FROM}
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('cr')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toCashReceiptSummary), pageInfo: page.pageInfo };
  }

  async get(
    organizationId: string,
    reader: PaymentReader,
    id: string,
  ): Promise<CashReceiptDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.detailIn(tx, id, reader),
    );
  }

  async detailIn(
    tx: TenantClient,
    id: string,
    reader?: PaymentReader,
  ): Promise<CashReceiptDetailView> {
    const row = await this.rowIn(tx, id, reader);
    const allocations = row.payment_id
      ? await tx.$queryRawUnsafe<
          Array<{ invoice_id: string; invoice_number: string; amount: bigint }>
        >(
          `SELECT pa.invoice_id, ri.invoice_number, pa.amount
             FROM payment_allocations pa
             JOIN rent_invoices ri ON ri.id = pa.invoice_id
            WHERE pa.payment_id = $1::uuid AND NOT pa.is_reversal
            ORDER BY pa.allocation_order, pa.id`,
          row.payment_id,
        )
      : [];
    return toCashReceiptDetail(
      row,
      allocations.map((a) => ({
        invoiceId: a.invoice_id,
        invoiceNumber: publicInvoiceNumber(a.invoice_number),
        amount: toJsonAmount(a.amount),
      })),
    );
  }

  /** Ligne du reçu ; 404 pour un démarcheur qui n'en est pas l'auteur. */
  async rowIn(
    tx: TenantClient,
    id: string,
    reader?: PaymentReader,
  ): Promise<CashReceiptSummaryRow> {
    const rows = await tx.$queryRawUnsafe<CashReceiptSummaryRow[]>(
      `SELECT ${CASH_RECEIPT_SUMMARY_SELECT} FROM ${CASH_RECEIPT_SUMMARY_FROM} WHERE cr.id = $1::uuid`,
      id,
    );
    const row = rows[0];
    if (!row || (reader?.role === 'COLLECTOR' && row.collector_user_id !== reader.userId)) {
      throw new DomainError('CASH.RECEIPT_NOT_FOUND', { cashReceiptId: id });
    }
    return row;
  }
}
