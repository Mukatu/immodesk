import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  BankCheck,
  BankCheckDetail,
  BankCheckInput,
  BounceBankCheckBody,
  CheckStatus,
  ClearBankCheckBody,
  DepositBankCheckBody,
  Paginated,
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

export interface UseBankChecksParams {
  status?: CheckStatus;
  tenantId?: string;
  dueBefore?: string;
  cursor?: string;
  limit?: number;
}

export function useBankChecks(params: UseBankChecksParams = {}) {
  return useQuery({
    queryKey: ['bank-checks', params],
    queryFn: () =>
      apiFetch<Paginated<BankCheck>>(
        `/bank-checks${buildQuery({
          status: params.status,
          tenantId: params.tenantId,
          dueBefore: params.dueBefore,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useBankCheck(id: string | null) {
  return useQuery({
    queryKey: ['bank-checks', id],
    queryFn: () => apiFetch<BankCheckDetail>(`/bank-checks/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateBankCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BankCheckInput) =>
      apiFetch<BankCheck>('/bank-checks', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-checks'] });
    },
  });
}

function invalidateBankCheck(queryClient: ReturnType<typeof useQueryClient>, id: string): void {
  queryClient.invalidateQueries({ queryKey: ['bank-checks'] });
  queryClient.invalidateQueries({ queryKey: ['bank-checks', id] });
}

export function useDepositBankCheck(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DepositBankCheckBody) =>
      apiFetch<BankCheckDetail>(`/bank-checks/${id}/deposit`, { method: 'POST', body }),
    onSuccess: () => {
      invalidateBankCheck(queryClient, id);
    },
  });
}

export function useClearBankCheck(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ClearBankCheckBody = {}) =>
      apiFetch<BankCheckDetail>(`/bank-checks/${id}/clear`, { method: 'POST', body }),
    onSuccess: () => {
      invalidateBankCheck(queryClient, id);
    },
  });
}

export function useBounceBankCheck(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BounceBankCheckBody) =>
      apiFetch<BankCheckDetail>(`/bank-checks/${id}/bounce`, { method: 'POST', body }),
    onSuccess: () => {
      invalidateBankCheck(queryClient, id);
    },
  });
}

export function useCancelBankCheck(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<BankCheckDetail>(`/bank-checks/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      invalidateBankCheck(queryClient, id);
    },
  });
}

export function useReturnBankCheck(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<BankCheckDetail>(`/bank-checks/${id}/return`, { method: 'POST' }),
    onSuccess: () => {
      invalidateBankCheck(queryClient, id);
    },
  });
}
