import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { sqlSearchClause, toLikePattern } from '../../../shared/search/search-text';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { loadMatchesFor } from '../../reconciliation/application/reconciliation-views';
import { LINE_STATE_SQL_PREDICATES, type LineState } from '../domain/line-state';
import {
  STATEMENT_LINE_FROM,
  STATEMENT_LINE_SELECT,
  toStatementLineView,
  type StatementLineRow,
  type StatementLineView,
} from './statement-views';

export interface StatementLinesFilters {
  state?: LineState;
  limit?: number;
  cursor?: string;
}

export interface GlobalLinesFilters extends StatementLinesFilters {
  bankAccountId?: string;
  olderThanDays?: number;
  minAmount?: number;
  maxAmount?: number;
  q?: string;
}

export interface PatchLineInput {
  isIgnored?: boolean;
  ignoreReason?: string | null;
}

@Injectable()
export class StatementLinesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
  ) {}

  async listForStatement(
    organizationId: string,
    userId: string,
    statementId: string,
    filters: StatementLinesFilters,
  ): Promise<Page<StatementLineView>> {
    return this.query(
      organizationId,
      userId,
      ['l.organization_id = $1::uuid', 'l.statement_id = $2::uuid'],
      [organizationId, statementId],
      filters,
    );
  }

  async listGlobal(
    organizationId: string,
    userId: string,
    filters: GlobalLinesFilters,
  ): Promise<Page<StatementLineView>> {
    const conditions = ['l.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    if (filters.bankAccountId)
      conditions.push(`l.bank_account_id = ${bind(filters.bankAccountId)}::uuid`);
    if (filters.olderThanDays !== undefined) {
      conditions.push(`(CURRENT_DATE - l.operation_date)::int >= ${bind(filters.olderThanDays)}`);
    }
    if (filters.minAmount !== undefined) conditions.push(`l.amount >= ${bind(filters.minAmount)}`);
    if (filters.maxAmount !== undefined) conditions.push(`l.amount <= ${bind(filters.maxAmount)}`);
    if (filters.q) {
      conditions.push(
        sqlSearchClause(['l.label', 'l.normalized_label'], bind(toLikePattern(filters.q))),
      );
    }
    return this.query(organizationId, userId, conditions, params, filters);
  }

  private async query(
    organizationId: string,
    userId: string,
    conditions: string[],
    params: unknown[],
    filters: StatementLinesFilters,
  ): Promise<Page<StatementLineView>> {
    const allConditions = [...conditions];
    if (filters.state) allConditions.push(LINE_STATE_SQL_PREDICATES[filters.state]);
    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'l');
    if (keyset.condition) {
      allConditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<StatementLineRow[]>(
        `SELECT ${STATEMENT_LINE_SELECT} FROM ${STATEMENT_LINE_FROM}
          WHERE ${allConditions.join(' AND ')}
          ${keysetOrderBy('l')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    const matchesByLine = await this.prisma.withTenant(organizationId, userId, (tx) =>
      loadMatchesFor(
        tx,
        'statement_line_id',
        page.items.map((r) => r.id),
      ),
    );
    return {
      items: page.items.map((row) => toStatementLineView(row, matchesByLine.get(row.id) ?? [])),
      pageInfo: page.pageInfo,
    };
  }

  async getOneIn(tx: TenantClient, id: string): Promise<StatementLineView> {
    const rows = await tx.$queryRawUnsafe<StatementLineRow[]>(
      `SELECT ${STATEMENT_LINE_SELECT} FROM ${STATEMENT_LINE_FROM} WHERE l.id = $1::uuid`,
      id,
    );
    const row = rows[0];
    if (!row) throw new DomainError('BANK.STATEMENT_LINE_NOT_FOUND', { statementLineId: id });
    const matches = await loadMatchesFor(tx, 'statement_line_id', [id]);
    return toStatementLineView(row, matches.get(id) ?? []);
  }

  /** `PATCH /bank-statement-lines/{id}` : seuls `isIgnored`/`ignoreReason`. */
  async patch(
    organizationId: string,
    actor: { userId: string },
    id: string,
    input: PatchLineInput,
  ): Promise<StatementLineView> {
    return this.prisma.withTenant(organizationId, actor.userId, async (tx) => {
      const before = await tx.bank_statement_lines.findFirst({ where: { id } });
      if (!before) throw new DomainError('BANK.STATEMENT_LINE_NOT_FOUND', { statementLineId: id });

      const nextIgnored = input.isIgnored ?? before.is_ignored;
      await tx.bank_statement_lines.update({
        where: { id },
        data: {
          ...(input.isIgnored !== undefined ? { is_ignored: input.isIgnored } : {}),
          ignore_reason: nextIgnored ? (input.ignoreReason ?? before.ignore_reason) : null,
          updated_at: new Date(),
        },
      });

      if (input.isIgnored !== undefined && input.isIgnored !== before.is_ignored) {
        await audit(this.auditService, tx, {
          organizationId,
          action: 'UPDATE',
          operation: input.isIgnored
            ? AUDIT_OPERATIONS.BANK_STATEMENT_LINE_IGNORED
            : AUDIT_OPERATIONS.BANK_STATEMENT_LINE_RESTORED,
          entityType: 'bank_statement_lines',
          entityId: id,
          previousState: toJsonState({ isIgnored: before.is_ignored }),
          newState: toJsonState({ isIgnored: input.isIgnored, reason: input.ignoreReason ?? null }),
        });
      }
      return this.getOneIn(tx, id);
    });
  }
}
