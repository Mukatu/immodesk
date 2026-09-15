import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  CreatePayoutBody,
  ExecutePayoutBody,
  FailPayoutBody,
  Paginated,
  Payout,
  PayoutStatus,
} from '@/lib/api/types';

export interface UseOwnerPayoutsParams {
  status?: PayoutStatus;
  landlordId?: string;
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

export function useOwnerPayouts(params: UseOwnerPayoutsParams = {}) {
  return useQuery({
    queryKey: ['owner-payouts', params],
    queryFn: () =>
      apiFetch<Paginated<Payout>>(
        `/owner-payouts${buildQuery({
          status: params.status,
          landlordId: params.landlordId,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useCreateOwnerPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePayoutBody) =>
      apiFetch<Payout>('/owner-payouts', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['owner-statements'] });
    },
  });
}

export function useApproveOwnerPayout(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Payout>(`/owner-payouts/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-payouts'] });
    },
  });
}

export function useExecuteOwnerPayout(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ExecutePayoutBody) =>
      apiFetch<Payout>(`/owner-payouts/${id}/execute`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['owner-statements'] });
    },
  });
}

export function useFailOwnerPayout(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FailPayoutBody) =>
      apiFetch<Payout>(`/owner-payouts/${id}/fail`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-payouts'] });
    },
  });
}
