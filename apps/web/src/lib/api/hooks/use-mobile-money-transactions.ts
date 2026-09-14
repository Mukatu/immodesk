import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  MomoChannel,
  MomoInitiateInput,
  MomoQuote,
  MomoStatus,
  MomoTransaction,
  Paginated,
} from '@/lib/api/types';

export interface UseMomoTransactionsParams {
  channel?: MomoChannel;
  status?: MomoStatus;
  from?: string;
  to?: string;
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

export function useMomoTransactions(params: UseMomoTransactionsParams = {}) {
  return useQuery({
    queryKey: ['momo-transactions', params],
    queryFn: () =>
      apiFetch<Paginated<MomoTransaction>>(
        `/payments/mobile-money/transactions${buildQuery({
          channel: params.channel,
          status: params.status,
          from: params.from,
          to: params.to,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useMomoTransaction(id: string | null) {
  return useQuery({
    queryKey: ['momo-transactions', id],
    queryFn: () => apiFetch<MomoTransaction>(`/payments/mobile-money/transactions/${id}`),
    enabled: Boolean(id),
  });
}

export function useRefreshMomoTransaction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<MomoTransaction>(`/payments/mobile-money/transactions/${id}/refresh`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['momo-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions', id] });
    },
  });
}

export function useMomoQuote() {
  return useMutation({
    mutationFn: (body: { invoiceId?: string; amount: number }) =>
      apiFetch<MomoQuote>('/payments/mobile-money/quote', { method: 'POST', body }),
  });
}

export function useInitiateMomoPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MomoInitiateInput) =>
      apiFetch<{ transaction: MomoTransaction; payment: unknown }>(
        '/payments/mobile-money/initiate',
        { method: 'POST', body },
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['momo-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions', data.transaction.id] });
      const invoiceId = variables.invoiceId ?? data.transaction.invoice?.id ?? null;
      if (invoiceId) {
        queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      }
    },
  });
}
