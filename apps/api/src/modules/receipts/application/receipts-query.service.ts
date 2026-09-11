import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { monthBounds } from '../../../shared/time/business-date';
import { periodLabel } from '../../billing/domain/period-label';
import { toIsoDate } from '../../leases/domain/calendar';
import {
  toMessageLogView,
  type MessageLogRow,
} from '../../notifications/application/message-log-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import { isVerificationTokenShape } from '../domain/receipt-rules';
import {
  RECEIPT_SUMMARY_FROM,
  RECEIPT_SUMMARY_SELECT,
  toReceiptDetail,
  toReceiptSummary,
  type ReceiptDetailView,
  type ReceiptSummaryRow,
  type ReceiptSummaryView,
} from './receipt-views';

export interface ReceiptVerificationView {
  receiptNumber: string;
  issueDate: string;
  period: string | null;
  totalAmount: number;
  tenantName: string;
  landlordDisplayName: string;
  organizationName: string;
  status: string;
}

/**
 * Lectures des quittances, dont la vérification PUBLIQUE.
 *
 * La vérification précède toute connaissance de l'organisation : elle lit
 * par la connexion d'administration, comme `TenantDirectoryService`, une
 * seule ligne par jeton exact et un jeu de colonnes fermé — jamais le
 * téléphone ni l'adresse du locataire, seulement son nom.
 */
@Injectable()
export class ReceiptsQueryService implements OnModuleDestroy {
  private admin: PrismaClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.admin?.$disconnect();
    this.admin = null;
  }

  async list(
    organizationId: string,
    userId: string,
    filters: {
      tenantId?: string;
      leaseId?: string;
      period?: string;
      status?: string;
      limit?: number;
      cursor?: string;
    },
  ): Promise<Page<ReceiptSummaryView>> {
    const conditions = ['r.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    if (filters.tenantId) conditions.push(`r.tenant_id = ${bind(filters.tenantId)}::uuid`);
    if (filters.leaseId) conditions.push(`r.lease_id = ${bind(filters.leaseId)}::uuid`);
    if (filters.status) conditions.push(`r.status = ${bind(filters.status)}::receipt_status`);
    if (filters.period) {
      const bounds = monthBounds(filters.period);
      if (!bounds)
        throw new DomainError('VALIDATION.INVALID_PAYLOAD', { period: 'YYYY-MM attendu.' });
      conditions.push(
        `r.period_start BETWEEN ${bind(toIsoDate(bounds.start))}::date AND ${bind(toIsoDate(bounds.end))}::date`,
      );
    }
    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'r');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<ReceiptSummaryRow[]>(
        `SELECT ${RECEIPT_SUMMARY_SELECT} FROM ${RECEIPT_SUMMARY_FROM}
          WHERE ${conditions.join(' AND ')} ${keysetOrderBy('r')} LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toReceiptSummary), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<ReceiptDetailView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<ReceiptSummaryRow[]>(
        `SELECT ${RECEIPT_SUMMARY_SELECT} FROM ${RECEIPT_SUMMARY_FROM} WHERE r.id = $1::uuid`,
        id,
      );
      if (!rows[0]) throw new DomainError('RECEIPTS.NOT_FOUND', { receiptId: id });
      const logs = await tx.$queryRawUnsafe<MessageLogRow[]>(
        `SELECT * FROM message_logs
          WHERE related_entity_type = 'receipt' AND related_entity_id = $1::uuid
          ORDER BY queued_at, created_at`,
        id,
      );
      return toReceiptDetail(rows[0], logs.map(toMessageLogView));
    });
  }

  async verifyPublic(token: string): Promise<ReceiptVerificationView> {
    if (!isVerificationTokenShape(token)) throw new DomainError('RECEIPTS.NOT_FOUND');
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl) throw new DomainError('RECEIPTS.NOT_FOUND');
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    const rows = await this.admin.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT r.receipt_number, r.issue_date, r.period_start, r.period_end, r.total_amount, r.status::text AS status,
              t.party_type AS t_party_type, t.first_name AS t_first_name, t.last_name AS t_last_name,
              t.company_name AS t_company_name,
              ld.party_type AS l_party_type, ld.first_name AS l_first_name, ld.last_name AS l_last_name,
              ld.company_name AS l_company_name,
              coalesce(o.trade_name, o.legal_name) AS organization_name
         FROM receipts r
         JOIN tenants t ON t.id = r.tenant_id
         JOIN organizations o ON o.id = r.organization_id
         LEFT JOIN landlords ld ON ld.id = r.landlord_id
        WHERE r.verification_token = $1`,
      token,
    );
    const row = rows[0];
    if (!row) throw new DomainError('RECEIPTS.NOT_FOUND');
    const name = (prefix: 't' | 'l') =>
      displayNameOf({
        partyType: (row[`${prefix}_party_type`] ?? 'INDIVIDUAL') as PartyType,
        firstName: row[`${prefix}_first_name`],
        lastName: row[`${prefix}_last_name`],
        companyName: row[`${prefix}_company_name`],
      });
    return {
      receiptNumber: row.receipt_number,
      issueDate: toIsoDate(row.issue_date),
      period:
        row.period_start && row.period_end ? periodLabel(row.period_start, row.period_end) : null,
      totalAmount: toJsonAmount(row.total_amount),
      tenantName: name('t'),
      landlordDisplayName: row.l_party_type ? name('l') : row.organization_name,
      organizationName: row.organization_name,
      status: row.status,
    };
  }
}
