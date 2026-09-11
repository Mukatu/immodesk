import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Paginated,
  PaymentDetail,
  PaymentInput,
  PaymentMethod,
  PaymentStatus,
  PaymentSummary,
} from '@/lib/api/types';

export interface UsePaymentsParams {
  method?: PaymentMethod;
  status?: PaymentStatus;
  tenantId?: string;
  leaseId?: string;
  from?: string;
  to?: string;
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

export function usePayments(params: UsePaymentsParams = {}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () =>
      apiFetch<Paginated<PaymentSummary>>(
        `/payments${buildQuery({
          method: params.method,
          status: params.status,
          tenantId: params.tenantId,
          leaseId: params.leaseId,
          from: params.from,
          to: params.to,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function usePayment(id: string | null) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => apiFetch<PaymentDetail>(`/payments/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PaymentInput) =>
      apiFetch<PaymentDetail>('/payments', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useAllocatePayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { allocations: { invoiceId: string; amount: number }[] }) =>
      apiFetch<PaymentDetail>(`/payments/${id}/allocations`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useConfirmPayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { valueDate?: string; note?: string } = {}) =>
      apiFetch<PaymentDetail>(`/payments/${id}/confirm`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRejectPayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<PaymentDetail>(`/payments/${id}/reject`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
    },
  });
}

export function useReversePayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<{ original: PaymentDetail; reversal: PaymentDetail }>(`/payments/${id}/reverse`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
