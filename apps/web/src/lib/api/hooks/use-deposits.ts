import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  DepositDetail,
  DepositMovementInput,
  DepositStatus,
  DepositSummary,
  Paginated,
} from '@/lib/api/types';

export interface UseDepositsListParams {
  status?: DepositStatus;
  refundDueBefore?: string;
  cursor?: string;
  limit?: number;
}

export interface DepositsSummaryResponse {
  heldTotal: number;
  pendingTotal: number;
  refundDueCount: number;
  byStatus: Record<DepositStatus, number>;
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

export function useDeposit(leaseId: string | null) {
  return useQuery({
    queryKey: ['leases', leaseId, 'deposit'],
    queryFn: () => apiFetch<DepositDetail>(`/leases/${leaseId}/deposit`),
    enabled: Boolean(leaseId),
  });
}

export function useCreateDepositMovement(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DepositMovementInput) =>
      apiFetch<DepositDetail>(`/leases/${leaseId}/deposit/movements`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId, 'deposit'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['deposits', 'summary'] });
    },
  });
}

export function useDepositsSummary() {
  return useQuery({
    queryKey: ['deposits', 'summary'],
    queryFn: () => apiFetch<DepositsSummaryResponse>('/deposits/summary'),
  });
}

export function useDepositsList(params: UseDepositsListParams = {}) {
  return useQuery({
    queryKey: ['deposits', params],
    queryFn: () =>
      apiFetch<Paginated<DepositSummary>>(
        `/deposits${buildQuery({
          status: params.status,
          refundDueBefore: params.refundDueBefore,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}
