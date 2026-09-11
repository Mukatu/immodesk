import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  CashReceiptDetail,
  CashReceiptInput,
  CashReceiptStatus,
  CashReceiptSummary,
  NotificationChannel,
  Paginated,
} from '@/lib/api/types';

export interface UseCashReceiptsParams {
  collectorUserId?: string;
  status?: CashReceiptStatus;
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

export function useCashReceipts(params: UseCashReceiptsParams = {}) {
  return useQuery({
    queryKey: ['cash-receipts', params],
    queryFn: () =>
      apiFetch<Paginated<CashReceiptSummary>>(
        `/cash-receipts${buildQuery({
          collectorUserId: params.collectorUserId,
          status: params.status,
          from: params.from,
          to: params.to,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useCashReceipt(id: string | null) {
  return useQuery({
    queryKey: ['cash-receipts', id],
    queryFn: () => apiFetch<CashReceiptDetail>(`/cash-receipts/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCashReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CashReceiptInput) =>
      apiFetch<CashReceiptDetail>('/cash-receipts', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['cash-collectors'] });
    },
  });
}

export function useCashReceiptPdf(id: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ downloadUrl: string; expiresAt: string }>(`/cash-receipts/${id}/pdf`),
  });
}

export function useSendCashReceipt(id: string) {
  return useMutation({
    mutationFn: (body: { channel?: NotificationChannel } = {}) =>
      apiFetch<{ notificationId: string }>(`/cash-receipts/${id}/send`, {
        method: 'POST',
        body,
      }),
  });
}
