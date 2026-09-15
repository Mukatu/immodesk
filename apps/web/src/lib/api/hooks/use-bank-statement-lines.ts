import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  LineState,
  MatchSuggestion,
  Paginated,
  PatchStatementLineBody,
  StatementLine,
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

export interface UseStatementLinesQueueParams {
  bankAccountId?: string;
  state?: LineState;
  olderThanDays?: number;
  minAmount?: number;
  maxAmount?: number;
  q?: string;
  cursor?: string;
  limit?: number;
}

export function useStatementLinesQueue(params: UseStatementLinesQueueParams = {}) {
  return useQuery({
    queryKey: ['bank-statement-lines', params],
    queryFn: () =>
      apiFetch<Paginated<StatementLine>>(
        `/bank-statement-lines${buildQuery({
          bankAccountId: params.bankAccountId,
          state: params.state,
          olderThanDays: params.olderThanDays,
          minAmount: params.minAmount,
          maxAmount: params.maxAmount,
          q: params.q,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useStatementLineSuggestions(lineId: string | null) {
  return useQuery({
    queryKey: ['bank-statement-lines', lineId, 'suggestions'],
    queryFn: () =>
      apiFetch<{ items: MatchSuggestion[] }>(`/bank-statement-lines/${lineId}/suggestions`),
    enabled: Boolean(lineId),
  });
}

export function usePatchStatementLine(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchStatementLineBody) =>
      apiFetch<StatementLine>(`/bank-statement-lines/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-lines'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
    },
  });
}
