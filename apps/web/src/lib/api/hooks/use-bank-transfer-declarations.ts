import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  DeclarationStatus,
  Paginated,
  TransferDeclaration,
  TransferDeclarationInput,
} from '@/lib/api/types';

export interface UseBankTransferDeclarationsParams {
  status?: DeclarationStatus;
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

export function useBankTransferDeclarations(params: UseBankTransferDeclarationsParams = {}) {
  return useQuery({
    queryKey: ['bank-transfer-declarations', params],
    queryFn: () =>
      apiFetch<Paginated<TransferDeclaration>>(
        `/bank-transfer-declarations${buildQuery({
          status: params.status,
          from: params.from,
          to: params.to,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useBankTransferDeclaration(id: string | null) {
  return useQuery({
    queryKey: ['bank-transfer-declarations', id],
    queryFn: () => apiFetch<TransferDeclaration>(`/bank-transfer-declarations/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateBankTransferDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TransferDeclarationInput) =>
      apiFetch<TransferDeclaration>('/bank-transfer-declarations', { method: 'POST', body }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations'] });
      if (variables.invoiceId) {
        queryClient.invalidateQueries({ queryKey: ['invoices', variables.invoiceId] });
      }
    },
  });
}

export function useReviewBankTransferDeclaration(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<TransferDeclaration>(`/bank-transfer-declarations/${id}/review`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations', id] });
    },
  });
}

export function useApproveBankTransferDeclaration(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { approvedAmount?: number; reason?: string }) =>
      apiFetch<{ declaration: TransferDeclaration; payment: unknown }>(
        `/bank-transfer-declarations/${id}/approve`,
        { method: 'POST', body },
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations', id] });
      if (data.declaration.invoice?.id) {
        queryClient.invalidateQueries({ queryKey: ['invoices', data.declaration.invoice.id] });
      }
    },
  });
}

export function useRejectBankTransferDeclaration(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<TransferDeclaration>(`/bank-transfer-declarations/${id}/reject`, {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations', id] });
      if (data.invoice?.id) {
        queryClient.invalidateQueries({ queryKey: ['invoices', data.invoice.id] });
      }
    },
  });
}

export function useCancelBankTransferDeclaration(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<TransferDeclaration>(`/bank-transfer-declarations/${id}/cancel`, {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transfer-declarations', id] });
      if (data.invoice?.id) {
        queryClient.invalidateQueries({ queryKey: ['invoices', data.invoice.id] });
      }
    },
  });
}
