import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Paginated,
  RemittanceDetail,
  RemittanceInput,
  RemittanceStatus,
  RemittanceSummary,
  RemittanceVerifyInput,
} from '@/lib/api/types';

export interface UseCashRemittancesParams {
  status?: RemittanceStatus;
  collectorUserId?: string;
  cursor?: string;
  limit?: number;
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

export function useCashRemittances(params: UseCashRemittancesParams = {}) {
  return useQuery({
    queryKey: ['cash-remittances', params],
    queryFn: () =>
      apiFetch<Paginated<RemittanceSummary>>(
        `/cash-remittances${buildQuery({
          status: params.status,
          collectorUserId: params.collectorUserId,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useCashRemittance(id: string | null) {
  return useQuery({
    queryKey: ['cash-remittances', id],
    queryFn: () => apiFetch<RemittanceDetail>(`/cash-remittances/${id}`),
    enabled: Boolean(id),
  });
}

function invalidateRemittance(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ['cash-remittances'] });
  queryClient.invalidateQueries({ queryKey: ['cash-remittances', id] });
  queryClient.invalidateQueries({ queryKey: ['cash-receipts'] });
  queryClient.invalidateQueries({ queryKey: ['cash-collectors'] });
}

export function useCreateCashRemittance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RemittanceInput) =>
      apiFetch<RemittanceDetail>('/cash-remittances', { method: 'POST', body }),
    onSuccess: (data) => invalidateRemittance(queryClient, data.id),
  });
}

export function useSubmitCashRemittance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<RemittanceDetail>(`/cash-remittances/${id}/submit`, { method: 'POST' }),
    onSuccess: () => invalidateRemittance(queryClient, id),
  });
}

export function useVerifyCashRemittance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RemittanceVerifyInput) =>
      apiFetch<RemittanceDetail>(`/cash-remittances/${id}/verify`, { method: 'POST', body }),
    onSuccess: () => invalidateRemittance(queryClient, id),
  });
}

export function useRejectCashRemittance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<RemittanceDetail>(`/cash-remittances/${id}/reject`, { method: 'POST', body }),
    onSuccess: () => invalidateRemittance(queryClient, id),
  });
}

export function useDepositCashRemittance(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      bankAccountId: string;
      depositedAt: string;
      depositSlipDocumentId?: string;
    }) => apiFetch<RemittanceDetail>(`/cash-remittances/${id}/deposit`, { method: 'POST', body }),
    onSuccess: () => invalidateRemittance(queryClient, id),
  });
}
