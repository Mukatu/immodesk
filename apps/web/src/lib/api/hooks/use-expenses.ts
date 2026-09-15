import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Expense,
  ExpenseInput,
  ExpenseStatus,
  Paginated,
  RejectExpenseBody,
} from '@/lib/api/types';

export interface UseExpensesParams {
  status?: ExpenseStatus;
  propertyId?: string;
  landlordId?: string;
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

export function useExpenses(params: UseExpensesParams = {}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () =>
      apiFetch<Paginated<Expense>>(
        `/expenses${buildQuery({
          status: params.status,
          propertyId: params.propertyId,
          landlordId: params.landlordId,
          from: params.from,
          to: params.to,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useExpense(id: string | null) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => apiFetch<Expense>(`/expenses/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpenseInput) => apiFetch<Expense>('/expenses', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ExpenseInput>) =>
      apiFetch<Expense>(`/expenses/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', id] });
    },
  });
}

export function useSubmitExpense(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Expense>(`/expenses/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', id] });
    },
  });
}

export function useApproveExpense(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Expense>(`/expenses/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', id] });
    },
  });
}

export function useRejectExpense(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RejectExpenseBody) =>
      apiFetch<Expense>(`/expenses/${id}/reject`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', id] });
    },
  });
}
