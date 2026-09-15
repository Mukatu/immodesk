import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { loadMatchesFor } from '../../reconciliation/application/reconciliation-views';
import {
  BANK_CHECK_FROM,
  BANK_CHECK_SELECT,
  toBankCheckDetailView,
  toBankCheckView,
  type BankCheckDetailRow,
  type BankCheckDetailView,
  type BankCheckRow,
  type BankCheckView,
} from './bank-check-views';

export interface CheckListFilters {
  status?: string;
  tenantId?: string;
  dueBefore?: string;
  limit?: number;
  cursor?: string;
}

const DETAIL_SELECT = `${BANK_CHECK_SELECT},
  t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
  inv.id AS invoice_id, inv.invoice_number AS invoice_number`;

const DETAIL_FROM = `${BANK_CHECK_FROM}
  LEFT JOIN tenants t ON t.id = bc.tenant_id
  LEFT JOIN LATERAL (
    SELECT ri.id, ri.invoice_number FROM payment_allocations pa
      JOIN rent_invoices ri ON ri.id = pa.invoice_id
     WHERE pa.payment_id = bc.payment_id AND NOT pa.is_reversal
     ORDER BY pa.created_at ASC LIMIT 1
  ) inv ON true`;

@Injectable()
export class BankChecksQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: CheckListFilters,
  ): Promise<Page<BankCheckView>> {
    const conditions = ['bc.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    if (filters.status) conditions.push(`bc.status = ${bind(filters.status)}::check_status`);
    if (filters.tenantId) conditions.push(`bc.tenant_id = ${bind(filters.tenantId)}::uuid`);
    if (filters.dueBefore)
      conditions.push(`bc.issue_date <= ${bind(filters.dueBefore.slice(0, 10))}::date`);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'bc');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<BankCheckRow[]>(
        `SELECT ${BANK_CHECK_SELECT} FROM ${BANK_CHECK_FROM}
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('bc')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map((r) => toBankCheckView(r)), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<BankCheckDetailView> {
    return this.prisma.withTenant(organizationId, userId, (tx) => this.getDetailIn(tx, id));
  }

  async getDetailIn(tx: TenantClient, id: string): Promise<BankCheckDetailView> {
    const rows = await tx.$queryRawUnsafe<BankCheckDetailRow[]>(
      `SELECT ${DETAIL_SELECT} FROM ${DETAIL_FROM} WHERE bc.id = $1::uuid`,
      id,
    );
    const row = rows[0];
    if (!row) throw new DomainError('BANK.CHECK_NOT_FOUND', { bankCheckId: id });
    const matches = await loadMatchesFor(tx, 'bank_check_id', [id]);
    return toBankCheckDetailView(row, matches.get(id) ?? []);
  }

  /** Chèque verrouillé pour une transition. */
  async lock(tx: TenantClient, id: string): Promise<BankCheckRow> {
    const rows = await tx.$queryRawUnsafe<BankCheckRow[]>(
      `SELECT ${BANK_CHECK_SELECT} FROM ${BANK_CHECK_FROM} WHERE bc.id = $1::uuid FOR UPDATE OF bc`,
      id,
    );
    if (!rows[0]) throw new DomainError('BANK.CHECK_NOT_FOUND', { bankCheckId: id });
    return rows[0];
  }
}
