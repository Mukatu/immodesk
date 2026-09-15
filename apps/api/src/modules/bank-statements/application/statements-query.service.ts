import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import {
  STATEMENT_FROM,
  STATEMENT_SELECT,
  toStatementDetailView,
  toStatementSummaryView,
  type ImportReport,
  type StatementDetailView,
  type StatementRow,
  type StatementSummaryView,
} from './statement-views';

export interface StatementListFilters {
  limit?: number;
  cursor?: string;
}

interface StatementCounts {
  ignored_count: bigint | number;
  matched_count: bigint | number;
  suggested_count: bigint | number;
}

@Injectable()
export class StatementsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    bankAccountId: string,
    filters: StatementListFilters,
  ): Promise<Page<StatementSummaryView>> {
    const params: unknown[] = [organizationId, bankAccountId];
    const conditions = ['s.organization_id = $1::uuid', 's.bank_account_id = $2::uuid'];
    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 's');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<StatementRow[]>(
        `SELECT ${STATEMENT_SELECT} FROM ${STATEMENT_FROM}
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('s')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toStatementSummaryView), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<StatementDetailView> {
    return this.prisma.withTenant(organizationId, userId, (tx) => this.getIn(tx, id));
  }

  async getIn(tx: TenantClient, id: string): Promise<StatementDetailView> {
    const row = await this.findRow(tx, id);
    const report = await this.recomputeReport(tx, row);
    return toStatementDetailView(row, report);
  }

  async findRow(tx: TenantClient, id: string): Promise<StatementRow> {
    const rows = await tx.$queryRawUnsafe<StatementRow[]>(
      `SELECT ${STATEMENT_SELECT} FROM ${STATEMENT_FROM} WHERE s.id = $1::uuid`,
      id,
    );
    if (!rows[0]) throw new DomainError('BANK.STATEMENT_NOT_FOUND', { statementId: id });
    return rows[0];
  }

  async lockRow(tx: TenantClient, id: string): Promise<StatementRow> {
    const rows = await tx.$queryRawUnsafe<StatementRow[]>(
      `SELECT ${STATEMENT_SELECT} FROM ${STATEMENT_FROM} WHERE s.id = $1::uuid FOR UPDATE OF s`,
      id,
    );
    if (!rows[0]) throw new DomainError('BANK.STATEMENT_NOT_FOUND', { statementId: id });
    return rows[0];
  }

  /**
   * `report` en LECTURE est TOUJOURS recalculé (docs/api/phase6-contract.md
   * § « report de StatementDetail ») : `linesInError` reste vide par
   * construction (toute erreur de ligne fait échouer l'import entier).
   */
  private async recomputeReport(tx: TenantClient, row: StatementRow): Promise<ImportReport> {
    const rows = await tx.$queryRawUnsafe<StatementCounts[]>(
      `SELECT
         count(*) FILTER (WHERE l.is_ignored) AS ignored_count,
         count(*) FILTER (WHERE l.is_matched) AS matched_count,
         count(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM reconciliation_matches m
              WHERE m.statement_line_id = l.id AND m.status = 'PROPOSED'
           )
         ) AS suggested_count
       FROM bank_statement_lines l
       WHERE l.statement_id = $1::uuid`,
      row.id,
    );
    const counts = rows[0];
    return {
      statementId: row.id,
      linesAccepted: row.lines_count,
      linesIgnored: Number(counts?.ignored_count ?? 0),
      linesInError: [],
      autoMatched: Number(counts?.matched_count ?? 0),
      suggested: Number(counts?.suggested_count ?? 0),
    };
  }
}
