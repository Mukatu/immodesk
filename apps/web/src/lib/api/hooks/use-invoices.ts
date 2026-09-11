import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  CreateInvoiceBody,
  InvoiceDetail,
  InvoiceLineInput,
  InvoiceStatus,
  InvoiceSummary,
  Paginated,
} from '@/lib/api/types';

export interface UseInvoicesParams {
  status?: InvoiceStatus;
  period?: string;
  propertyId?: string;
  leaseId?: string;
  tenantId?: string;
  overdueOnly?: boolean;
  q?: string;
  cursor?: string;
  limit?: number;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useInvoices(params: UseInvoicesParams = {}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () =>
      apiFetch<Paginated<InvoiceSummary>>(
        `/invoices${buildQuery({
          status: params.status,
          period: params.period,
          propertyId: params.propertyId,
          leaseId: params.leaseId,
          tenantId: params.tenantId,
          overdueOnly: params.overdueOnly,
          q: params.q,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => apiFetch<InvoiceDetail>(`/invoices/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvoiceBody) =>
      apiFetch<InvoiceDetail>('/invoices', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useAddInvoiceLine(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InvoiceLineInput) =>
      apiFetch<InvoiceDetail>(`/invoices/${invoiceId}/lines`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
    },
  });
}

export function useDeleteInvoiceLine(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lineId: string) =>
      apiFetch<InvoiceDetail>(`/invoices/${invoiceId}/lines/${lineId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
    },
  });
}

export function useIssueInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<InvoiceDetail>(`/invoices/${id}/issue`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
}

export function useCancelInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<InvoiceDetail>(`/invoices/${id}/cancel`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
}

export function useInvoicePdf(id: string) {
  return useMutation({
    mutationFn: () => apiFetch<{ downloadUrl: string; expiresAt: string }>(`/invoices/${id}/pdf`),
  });
}
