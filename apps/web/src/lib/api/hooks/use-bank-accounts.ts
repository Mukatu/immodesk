import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { BankAccount, BankAccountHolderType, BankAccountInput } from '@/lib/api/types';

export interface UseBankAccountsParams {
  holderType?: BankAccountHolderType;
  landlordId?: string;
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

export function useBankAccounts(params: UseBankAccountsParams = {}) {
  return useQuery({
    queryKey: ['bank-accounts', params],
    queryFn: () =>
      apiFetch<{ items: BankAccount[] }>(
        `/bank-accounts${buildQuery({ holderType: params.holderType, landlordId: params.landlordId })}`,
      ),
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BankAccountInput) =>
      apiFetch<BankAccount>('/bank-accounts', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useUpdateBankAccount(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<BankAccountInput>) =>
      apiFetch<BankAccount>(`/bank-accounts/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/bank-accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}
