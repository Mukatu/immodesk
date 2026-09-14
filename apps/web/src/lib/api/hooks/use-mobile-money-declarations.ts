import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  MomoApproveInput,
  MomoDeclarationInput,
  MomoStatus,
  MomoTransaction,
  Paginated,
} from '@/lib/api/types';

export interface UseMomoDeclarationsParams {
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

export function useMomoDeclarations(params: UseMomoDeclarationsParams = {}) {
  return useQuery({
    queryKey: ['momo-declarations', params],
    queryFn: () =>
      apiFetch<Paginated<MomoTransaction>>(
        `/payments/mobile-money/declarations${buildQuery({
          status: params.status,
          from: params.from,
          to: params.to,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useCreateMomoDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MomoDeclarationInput) =>
      apiFetch<MomoTransaction>('/payments/mobile-money/declarations', {
        method: 'POST',
        body,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['momo-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions'] });
      if (variables.invoiceId) {
        queryClient.invalidateQueries({ queryKey: ['invoices', variables.invoiceId] });
      }
    },
  });
}

export function useApproveMomoDeclaration(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MomoApproveInput) =>
      apiFetch<{ transaction: MomoTransaction; payment: unknown }>(
        `/payments/mobile-money/declarations/${id}/approve`,
        { method: 'POST', body },
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['momo-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions', id] });
      const invoiceId = data.transaction.invoice?.id;
      if (invoiceId) {
        queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      }
    },
  });
}

export function useRejectMomoDeclaration(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<MomoTransaction>(`/payments/mobile-money/declarations/${id}/reject`, {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['momo-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions', id] });
      const invoiceId = data.invoice?.id;
      if (invoiceId) {
        queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      }
    },
  });
}

export function useCancelMomoDeclaration(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<MomoTransaction>(`/payments/mobile-money/declarations/${id}/cancel`, {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['momo-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['momo-transactions', id] });
      const invoiceId = data.invoice?.id;
      if (invoiceId) {
        queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      }
    },
  });
}
