import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import type { ReconciliationMatchView } from '../../reconciliation/application/reconciliation-views';
import { computeLineState, type LineState } from '../domain/line-state';

// --- Relevé (bank_statements) ---------------------------------------------

export interface StatementRow {
  id: string;
  bank_account_id: string;
  format: string;
  status: string;
  statement_reference: string | null;
  period_start: Date;
  period_end: Date;
  opening_balance: bigint;
  closing_balance: bigint;
  currency: string;
  lines_count: number;
  matched_lines_count: number;
  total_credit_amount: bigint;
  total_debit_amount: bigint;
  document_id: string | null;
  file_checksum_sha256: string | null;
  imported_by_user_id: string | null;
  imported_at: Date;
  parsed_at: Date | null;
  reconciled_at: Date | null;
  parse_error: string | null;
  created_at: Date;
  is_discarded: boolean;
}

/** Fragment `is_discarded`, docs/api/phase6-contract.md § « Abandon ». */
export const STATEMENT_SELECT = `
  s.id, s.bank_account_id, s.format, s.status, s.statement_reference,
  s.period_start, s.period_end, s.opening_balance, s.closing_balance, s.currency,
  s.lines_count, s.matched_lines_count, s.total_credit_amount, s.total_debit_amount,
  s.document_id, s.file_checksum_sha256, s.imported_by_user_id, s.imported_at,
  s.parsed_at, s.reconciled_at, s.parse_error, s.created_at,
  (s.lines_count > 0 AND s.matched_lines_count = 0
   AND NOT EXISTS (
     SELECT 1 FROM bank_statement_lines l WHERE l.statement_id = s.id AND NOT l.is_ignored
   )) AS is_discarded`;
export const STATEMENT_FROM = `bank_statements s`;

export interface ImportReport {
  statementId: string;
  linesAccepted: number;
  linesIgnored: number;
  linesInError: { lineNumber: number; reason: string }[];
  autoMatched: number;
  suggested: number;
}

export interface StatementSummaryView {
  id: string;
  bankAccountId: string;
  format: string;
  status: string;
  isDiscarded: boolean;
  statementReference: string | null;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  linesCount: number;
  matchedLinesCount: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  importedAt: string;
  importedByUserId: string | null;
}

export interface StatementDetailView extends StatementSummaryView {
  documentId: string | null;
  fileChecksumSha256: string | null;
  parsedAt: string | null;
  reconciledAt: string | null;
  parseError: string | null;
  report: ImportReport | null;
}

export function toStatementSummaryView(row: StatementRow): StatementSummaryView {
  return {
    id: row.id,
    bankAccountId: row.bank_account_id,
    format: row.format,
    status: row.status,
    isDiscarded: row.is_discarded,
    statementReference: row.statement_reference,
    periodStart: toIsoDate(row.period_start) as string,
    periodEnd: toIsoDate(row.period_end) as string,
    openingBalance: toJsonAmount(row.opening_balance),
    closingBalance: toJsonAmount(row.closing_balance),
    linesCount: row.lines_count,
    matchedLinesCount: row.matched_lines_count,
    totalCreditAmount: toJsonAmount(row.total_credit_amount),
    totalDebitAmount: toJsonAmount(row.total_debit_amount),
    importedAt: toIsoInstant(row.imported_at) as string,
    importedByUserId: row.imported_by_user_id,
  };
}

export function toStatementDetailView(
  row: StatementRow,
  report: ImportReport | null,
): StatementDetailView {
  return {
    ...toStatementSummaryView(row),
    documentId: row.document_id,
    fileChecksumSha256: row.file_checksum_sha256,
    parsedAt: toIsoInstant(row.parsed_at),
    reconciledAt: toIsoInstant(row.reconciled_at),
    parseError: row.parse_error,
    report,
  };
}

// --- Ligne de relevé (bank_statement_lines) --------------------------------

export interface StatementLineRow {
  id: string;
  statement_id: string;
  bank_account_id: string;
  line_number: number;
  direction: string;
  operation_date: Date;
  value_date: Date | null;
  amount: bigint;
  matched_amount: bigint;
  label: string;
  normalized_label: string | null;
  counterparty_name: string | null;
  bank_reference: string | null;
  end_to_end_reference: string | null;
  is_matched: boolean;
  is_ignored: boolean;
  ignore_reason: string | null;
  created_at: Date;
  proposed_count: number;
  age_days: number;
}

/**
 * `p.proposed_count` : `LEFT JOIN LATERAL` sur `reconciliation_matches`
 * (docs/api/phase6-contract.md § `computeLineState`, tableau des prédicats).
 * `age_days` est calculé EN SQL, jamais recalculé côté application.
 */
export const STATEMENT_LINE_SELECT = `
  l.id, l.statement_id, l.bank_account_id, l.line_number, l.direction,
  l.operation_date, l.value_date, l.amount, l.matched_amount, l.label,
  l.normalized_label, l.counterparty_name, l.bank_reference, l.end_to_end_reference,
  l.is_matched, l.is_ignored, l.ignore_reason, l.created_at,
  p.proposed_count, (CURRENT_DATE - l.operation_date)::int AS age_days`;
export const STATEMENT_LINE_FROM = `
  bank_statement_lines l
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS proposed_count
    FROM reconciliation_matches m
    WHERE m.statement_line_id = l.id AND m.status = 'PROPOSED'
  ) p ON true`;

export interface StatementLineView {
  id: string;
  statementId: string;
  bankAccountId: string;
  lineNumber: number;
  direction: 'CREDIT' | 'DEBIT';
  operationDate: string;
  valueDate: string | null;
  amount: number;
  matchedAmount: number;
  state: LineState;
  label: string;
  normalizedLabel: string | null;
  counterpartyName: string | null;
  bankReference: string | null;
  endToEndReference: string | null;
  isIgnored: boolean;
  ignoreReason: string | null;
  matches: ReconciliationMatchView[];
  ageDays: number;
}

export function toStatementLineView(
  row: StatementLineRow,
  matches: ReconciliationMatchView[],
): StatementLineView {
  const state = computeLineState({
    isIgnored: row.is_ignored,
    isMatched: row.is_matched,
    amount: row.amount,
    matchedAmount: row.matched_amount,
    proposedCount: row.proposed_count,
  });
  return {
    id: row.id,
    statementId: row.statement_id,
    bankAccountId: row.bank_account_id,
    lineNumber: row.line_number,
    direction: row.direction as 'CREDIT' | 'DEBIT',
    operationDate: toIsoDate(row.operation_date) as string,
    valueDate: toIsoDate(row.value_date),
    amount: toJsonAmount(row.amount),
    matchedAmount: toJsonAmount(row.matched_amount),
    state,
    label: row.label,
    normalizedLabel: row.normalized_label,
    counterpartyName: row.counterparty_name,
    bankReference: row.bank_reference,
    endToEndReference: row.end_to_end_reference,
    isIgnored: row.is_ignored,
    ignoreReason: row.ignore_reason,
    matches,
    ageDays: row.age_days,
  };
}
