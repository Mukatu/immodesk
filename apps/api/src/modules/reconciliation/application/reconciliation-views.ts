import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { toJsonAmount } from '../../../shared/money/amount';
import type { MatchTargetType } from '../domain/match-target';
import { resolveTarget } from '../domain/match-target';

export interface ReconciliationMatchRow {
  id: string;
  statement_line_id: string;
  payment_id: string | null;
  declaration_id: string | null;
  bank_check_id: string | null;
  remittance_id: string | null;
  match_type: string;
  status: string;
  matched_amount: bigint;
  confidence_score: number;
  match_criteria: unknown;
  matched_by_user_id: string | null;
  confirmed_at: Date | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  reversed_at: Date | null;
  reversal_of_id: string | null;
  created_at: Date;
}

export interface ReconciliationMatchView {
  id: string;
  statementLineId: string;
  targetType: MatchTargetType;
  targetId: string;
  matchType: string;
  status: string;
  matchedAmount: number;
  confidenceScore: number;
  matchCriteria: Record<string, unknown>;
  matchedByUserId: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalOfId: string | null;
  createdAt: string;
}

export const MATCH_SELECT = `m.id, m.statement_line_id, m.payment_id, m.declaration_id, m.bank_check_id, m.remittance_id,
  m.match_type, m.status, m.matched_amount, m.confidence_score, m.match_criteria,
  m.matched_by_user_id, m.confirmed_at, m.rejected_at, m.rejection_reason, m.reversed_at,
  m.reversal_of_id, m.created_at`;

export function toReconciliationMatchView(row: ReconciliationMatchRow): ReconciliationMatchView {
  const target = resolveTarget(row);
  return {
    id: row.id,
    statementLineId: row.statement_line_id,
    targetType: target.targetType,
    targetId: target.targetId,
    matchType: row.match_type,
    status: row.status,
    matchedAmount: toJsonAmount(row.matched_amount),
    confidenceScore: row.confidence_score,
    matchCriteria: (row.match_criteria as Record<string, unknown>) ?? {},
    matchedByUserId: row.matched_by_user_id,
    confirmedAt: row.confirmed_at ? row.confirmed_at.toISOString() : null,
    rejectedAt: row.rejected_at ? row.rejected_at.toISOString() : null,
    rejectionReason: row.rejection_reason,
    reversedAt: row.reversed_at ? row.reversed_at.toISOString() : null,
    reversalOfId: row.reversal_of_id,
    createdAt: row.created_at.toISOString(),
  };
}

export async function loadMatchesFor(
  tx: TenantClient,
  column: 'statement_line_id' | 'bank_check_id',
  ids: readonly string[],
): Promise<Map<string, ReconciliationMatchView[]>> {
  const result = new Map<string, ReconciliationMatchView[]>();
  if (ids.length === 0) return result;
  const rows = await tx.$queryRawUnsafe<ReconciliationMatchRow[]>(
    `SELECT ${MATCH_SELECT} FROM reconciliation_matches m WHERE m.${column} = ANY($1::uuid[])`,
    ids,
  );
  for (const row of rows) {
    const key =
      column === 'statement_line_id' ? row.statement_line_id : (row.bank_check_id as string);
    const view = toReconciliationMatchView(row);
    const list = result.get(key) ?? [];
    list.push(view);
    result.set(key, list);
  }
  return result;
}
