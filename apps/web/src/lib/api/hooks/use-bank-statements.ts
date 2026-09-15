import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  ImportReport,
  LineState,
  Paginated,
  ReconcileRunResult,
  StatementDetail,
  StatementFormat,
  StatementLine,
  StatementSummary,
} from '@/lib/api/types';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export interface UseBankStatementsParams {
  cursor?: string;
  limit?: number;
}

export function useBankStatements(
  bankAccountId: string | null,
  params: UseBankStatementsParams = {},
) {
  return useQuery({
    queryKey: ['bank-statements', bankAccountId, params],
    queryFn: () =>
      apiFetch<Paginated<StatementSummary>>(
        `/bank-accounts/${bankAccountId}/statements${buildQuery({
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
    enabled: Boolean(bankAccountId),
  });
}

export function useBankStatement(id: string | null) {
  return useQuery({
    queryKey: ['bank-statements', id],
    queryFn: () => apiFetch<StatementDetail>(`/bank-statements/${id}`),
    enabled: Boolean(id),
  });
}

export interface ImportBankStatementBody {
  documentId: string;
  format?: StatementFormat;
}

export function useImportBankStatement(bankAccountId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ImportBankStatementBody) =>
      apiFetch<ImportReport>(`/bank-accounts/${bankAccountId}/statements/import`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements', bankAccountId] });
    },
  });
}

export function useDiscardBankStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<StatementDetail>(`/bank-statements/${id}/discard`, { method: 'POST' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statements', id] });
    },
  });
}

export function useReconcileBankStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ReconcileRunResult>(`/bank-statements/${id}/reconcile`, { method: 'POST' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statements', id] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-lines'] });
    },
  });
}

export interface UseBankStatementLinesParams {
  state?: LineState;
  cursor?: string;
  limit?: number;
}

export function useBankStatementLines(
  statementId: string | null,
  params: UseBankStatementLinesParams = {},
) {
  return useQuery({
    queryKey: ['bank-statements', statementId, 'lines', params],
    queryFn: () =>
      apiFetch<Paginated<StatementLine>>(
        `/bank-statements/${statementId}/lines${buildQuery({
          state: params.state,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
    enabled: Boolean(statementId),
  });
}
