import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { sqlSearchClause, toLikePattern } from '../../../shared/search/search-text';
import { businessToday, monthBounds } from '../../../shared/time/business-date';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import { toIsoDate } from '../../leases/domain/calendar';
import {
  RECEIPT_SUMMARY_FROM,
  RECEIPT_SUMMARY_SELECT,
  toReceiptSummary,
  type ReceiptSummaryRow,
} from '../../receipts/application/receipt-views';
import {
  INVOICE_SUMMARY_FROM,
  INVOICE_SUMMARY_SELECT,
  toInvoiceDetail,
  toInvoiceSummary,
  type AllocationRow,
  type InvoiceDetailView,
  type InvoiceLineRow,
  type InvoiceSummaryRow,
  type InvoiceSummaryView,
} from './invoice-views';

export interface InvoiceListFilters {
  status?: string;
  period?: string;
  propertyId?: string;
  leaseId?: string;
  tenantId?: string;
  overdueOnly?: boolean;
  q?: string;
  limit?: number;
  cursor?: string;
}

/** Lecteur : un démarcheur ne voit que les factures des baux qui lui sont affectés. */
export interface InvoiceReader {
  userId: string;
  role: MemberRole;
}

@Injectable()
export class InvoicesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    reader: InvoiceReader,
    filters: InvoiceListFilters,
  ): Promise<Page<InvoiceSummaryView>> {
    const conditions = ['ri.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (reader.role === 'COLLECTOR')
      conditions.push(`l.collector_user_id = ${bind(reader.userId)}::uuid`);
    if (filters.status) conditions.push(`ri.status = ${bind(filters.status)}::invoice_status`);
    if (filters.period) {
      const bounds = monthBounds(filters.period);
      if (!bounds)
        throw new DomainError('VALIDATION.INVALID_PAYLOAD', { period: 'YYYY-MM attendu.' });
      conditions.push(
        `ri.period_start BETWEEN ${bind(toIsoDate(bounds.start))}::date AND ${bind(toIsoDate(bounds.end))}::date`,
      );
    }
    if (filters.propertyId) conditions.push(`ri.property_id = ${bind(filters.propertyId)}::uuid`);
    if (filters.leaseId) conditions.push(`ri.lease_id = ${bind(filters.leaseId)}::uuid`);
    if (filters.tenantId) conditions.push(`ri.tenant_id = ${bind(filters.tenantId)}::uuid`);
    if (filters.overdueOnly) {
      const today = bind(toIsoDate(businessToday()));
      conditions.push(
        `(ri.status = 'OVERDUE' OR (ri.status IN ('ISSUED', 'PARTIALLY_PAID') AND ri.grace_until_date < ${today}::date))`,
      );
    }
    if (filters.q) {
      const placeholder = bind(toLikePattern(filters.q));
      conditions.push(
        sqlSearchClause(
          ['ri.invoice_number', 't.last_name', 't.first_name', 't.company_name', 'u.code'],
          placeholder,
        ),
      );
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'ri');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.$queryRawUnsafe<InvoiceSummaryRow[]>(
        `SELECT ${INVOICE_SUMMARY_SELECT}
           FROM ${INVOICE_SUMMARY_FROM}
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('ri')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toInvoiceSummary), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, reader: InvoiceReader, id: string): Promise<InvoiceDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.detailIn(tx, id, reader),
    );
  }

  /** Détail dans une transaction ouverte ; 404 pour un démarcheur non affecté. */
  async detailIn(tx: TenantClient, id: string, reader?: InvoiceReader): Promise<InvoiceDetailView> {
    const rows = await tx.$queryRawUnsafe<
      Array<InvoiceSummaryRow & { collector_user_id: string | null }>
    >(
      `SELECT ${INVOICE_SUMMARY_SELECT}, l.collector_user_id
         FROM ${INVOICE_SUMMARY_FROM}
        WHERE ri.id = $1::uuid`,
      id,
    );
    const row = rows[0];
    if (!row || (reader?.role === 'COLLECTOR' && row.collector_user_id !== reader.userId)) {
      throw new DomainError('BILLING.INVOICE_NOT_FOUND', { invoiceId: id });
    }

    const lines = await tx.$queryRawUnsafe<InvoiceLineRow[]>(
      `SELECT * FROM invoice_lines WHERE invoice_id = $1::uuid ORDER BY position, created_at`,
      id,
    );
    const allocations = await tx.$queryRawUnsafe<AllocationRow[]>(
      `SELECT pa.id, pa.payment_id, p.reference AS payment_reference, p.method::text AS method,
              pa.amount, pa.allocation_date, pa.is_reversal
         FROM payment_allocations pa
         JOIN payments p ON p.id = pa.payment_id
        WHERE pa.invoice_id = $1::uuid
        ORDER BY pa.created_at, pa.id`,
      id,
    );
    const receipts = await tx.$queryRawUnsafe<ReceiptSummaryRow[]>(
      `SELECT ${RECEIPT_SUMMARY_SELECT} FROM ${RECEIPT_SUMMARY_FROM}
        WHERE r.invoice_id = $1::uuid
        ORDER BY (r.status = 'CANCELLED'), r.created_at DESC
        LIMIT 1`,
      id,
    );
    return toInvoiceDetail(
      row,
      lines,
      allocations,
      receipts[0] ? toReceiptSummary(receipts[0]) : null,
    );
  }
}
