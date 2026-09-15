import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

interface DashboardTotalsRow {
  unmatched_count: bigint | number;
  unmatched_amount: bigint | null;
  matched_count: bigint | number;
  total_count: bigint | number;
  oldest_unmatched_days: number | null;
}

interface DashboardAccountRow extends DashboardTotalsRow {
  bank_account_id: string;
  label: string;
}

export interface DashboardAccountView {
  bankAccountId: string;
  label: string;
  unmatchedCount: number;
  unmatchedAmount: number;
  matchedRatioBps: number;
}

export interface ReconciliationDashboardView {
  unmatchedCount: number;
  unmatchedAmount: number;
  oldestUnmatchedDays: number;
  matchedRatioBps: number;
  byAccount: DashboardAccountView[];
}

/**
 * Tableau de bord du rapprochement (docs/api/phase6-contract.md,
 * `GET /reconciliation/dashboard?bankAccountId=`, rôle MANAGER). Calculs
 * agrégés en SQL sur `bank_statement_lines` (lignes CRÉDIT non ignorées),
 * jamais recalculés en mémoire.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    organizationId: string,
    userId: string,
    filters: { bankAccountId?: string },
  ): Promise<ReconciliationDashboardView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const params: unknown[] = [organizationId];
      let accountFilter = '';
      if (filters.bankAccountId) {
        params.push(filters.bankAccountId);
        accountFilter = `AND l.bank_account_id = $${params.length}::uuid`;
      }

      const totalsRows = await tx.$queryRawUnsafe<DashboardTotalsRow[]>(
        `SELECT
           count(*) FILTER (WHERE NOT l.is_matched)::int AS unmatched_count,
           coalesce(sum(l.amount - l.matched_amount) FILTER (WHERE NOT l.is_matched), 0)::bigint AS unmatched_amount,
           count(*) FILTER (WHERE l.is_matched)::int AS matched_count,
           count(*)::int AS total_count,
           coalesce(max(CURRENT_DATE - l.operation_date) FILTER (WHERE NOT l.is_matched), 0)::int AS oldest_unmatched_days
         FROM bank_statement_lines l
        WHERE l.organization_id = $1::uuid AND l.direction = 'CREDIT' AND NOT l.is_ignored ${accountFilter}`,
        ...params,
      );

      const accountRows = await tx.$queryRawUnsafe<DashboardAccountRow[]>(
        `SELECT
           l.bank_account_id, ba.label,
           count(*) FILTER (WHERE NOT l.is_matched)::int AS unmatched_count,
           coalesce(sum(l.amount - l.matched_amount) FILTER (WHERE NOT l.is_matched), 0)::bigint AS unmatched_amount,
           count(*) FILTER (WHERE l.is_matched)::int AS matched_count,
           count(*)::int AS total_count,
           coalesce(max(CURRENT_DATE - l.operation_date) FILTER (WHERE NOT l.is_matched), 0)::int AS oldest_unmatched_days
         FROM bank_statement_lines l
         JOIN bank_accounts ba ON ba.id = l.bank_account_id
        WHERE l.organization_id = $1::uuid AND l.direction = 'CREDIT' AND NOT l.is_ignored ${accountFilter}
        GROUP BY l.bank_account_id, ba.label
        ORDER BY ba.label`,
        ...params,
      );

      const totals = totalsRows[0];
      return {
        unmatchedCount: Number(totals?.unmatched_count ?? 0),
        unmatchedAmount: Number(totals?.unmatched_amount ?? 0),
        oldestUnmatchedDays: Number(totals?.oldest_unmatched_days ?? 0),
        matchedRatioBps: this.ratioBps(totals),
        byAccount: accountRows.map((row) => ({
          bankAccountId: row.bank_account_id,
          label: row.label,
          unmatchedCount: Number(row.unmatched_count),
          unmatchedAmount: Number(row.unmatched_amount ?? 0),
          matchedRatioBps: this.ratioBps(row),
        })),
      };
    });
  }

  private ratioBps(row: DashboardTotalsRow | undefined): number {
    const total = Number(row?.total_count ?? 0);
    if (total === 0) return 0;
    const matched = Number(row?.matched_count ?? 0);
    return Math.round((matched / total) * 10_000);
  }
}
