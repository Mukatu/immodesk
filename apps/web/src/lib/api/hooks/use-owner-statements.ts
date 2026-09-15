import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  CancelOwnerStatementBody,
  OwnerStatementDetail,
  OwnerStatementRunResponse,
  OwnerStatementRunStatus,
  OwnerStatementStatus,
  OwnerStatementSummary,
  Paginated,
} from '@/lib/api/types';

export interface UseOwnerStatementsParams {
  landlordId?: string;
  mandateId?: string;
  period?: string;
  status?: OwnerStatementStatus;
  limit?: number;
  cursor?: string;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useOwnerStatements(params: UseOwnerStatementsParams = {}) {
  return useQuery({
    queryKey: ['owner-statements', params],
    queryFn: () =>
      apiFetch<Paginated<OwnerStatementSummary>>(
        `/owner-statements${buildQuery({
          landlordId: params.landlordId,
          mandateId: params.mandateId,
          period: params.period,
          status: params.status,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useOwnerStatement(id: string | null) {
  return useQuery({
    queryKey: ['owner-statements', id],
    queryFn: () => apiFetch<OwnerStatementDetail>(`/owner-statements/${id}`),
    enabled: Boolean(id),
  });
}

export function useStartOwnerStatementRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { periodStart?: string } = {}) =>
      apiFetch<OwnerStatementRunResponse>('/owner-statements/runs', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-statements'] });
    },
  });
}

export function useOwnerStatementRun(runId: string | null) {
  return useQuery({
    queryKey: ['owner-statements-runs', runId],
    queryFn: () => apiFetch<OwnerStatementRunStatus>(`/owner-statements/runs/${runId}`),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'DONE' || status === 'FAILED' ? false : 1500;
    },
  });
}

export function useIssueOwnerStatement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<OwnerStatementDetail>(`/owner-statements/${id}/issue`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-statements'] });
      queryClient.invalidateQueries({ queryKey: ['owner-statements', id] });
    },
  });
}

export function useCancelOwnerStatement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CancelOwnerStatementBody) =>
      apiFetch<OwnerStatementDetail>(`/owner-statements/${id}/cancel`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-statements'] });
      queryClient.invalidateQueries({ queryKey: ['owner-statements', id] });
    },
  });
}

export function useOwnerStatementPdf(id: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ downloadUrl: string; expiresAt: string }>(`/owner-statements/${id}/pdf`),
  });
}
