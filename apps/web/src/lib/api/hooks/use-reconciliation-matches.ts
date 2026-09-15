import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  CreateReconciliationMatchBody,
  ReconciliationMatch,
  RejectReconciliationMatchBody,
  ReverseMatchResult,
  ReverseReconciliationMatchBody,
} from '@/lib/api/types';

function invalidateReconciliationQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: ['bank-statement-lines'] });
  queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
}

export function useCreateReconciliationMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReconciliationMatchBody) =>
      apiFetch<ReconciliationMatch>('/reconciliation-matches', { method: 'POST', body }),
    onSuccess: () => {
      invalidateReconciliationQueries(queryClient);
    },
  });
}

export function useConfirmReconciliationMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ReconciliationMatch>(`/reconciliation-matches/${id}/confirm`, { method: 'POST' }),
    onSuccess: () => {
      invalidateReconciliationQueries(queryClient);
    },
  });
}

export function useRejectReconciliationMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RejectReconciliationMatchBody }) =>
      apiFetch<ReconciliationMatch>(`/reconciliation-matches/${id}/reject`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      invalidateReconciliationQueries(queryClient);
    },
  });
}

export function useReverseReconciliationMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReverseReconciliationMatchBody }) =>
      apiFetch<ReverseMatchResult>(`/reconciliation-matches/${id}/reverse`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      invalidateReconciliationQueries(queryClient);
    },
  });
}
