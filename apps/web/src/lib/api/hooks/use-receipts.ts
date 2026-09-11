import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  NotificationChannel,
  Paginated,
  ReceiptDetail,
  ReceiptStatus,
  ReceiptSummary,
} from '@/lib/api/types';

export interface UseReceiptsParams {
  tenantId?: string;
  leaseId?: string;
  period?: string;
  status?: ReceiptStatus;
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

export function useReceipts(params: UseReceiptsParams = {}) {
  return useQuery({
    queryKey: ['receipts', params],
    queryFn: () =>
      apiFetch<Paginated<ReceiptSummary>>(
        `/receipts${buildQuery({
          tenantId: params.tenantId,
          leaseId: params.leaseId,
          period: params.period,
          status: params.status,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useReceipt(id: string | null) {
  return useQuery({
    queryKey: ['receipts', id],
    queryFn: () => apiFetch<ReceiptDetail>(`/receipts/${id}`),
    enabled: Boolean(id),
  });
}

export function useReceiptPdf(id: string) {
  return useMutation({
    mutationFn: () => apiFetch<{ downloadUrl: string; expiresAt: string }>(`/receipts/${id}/pdf`),
  });
}

export function useSendReceipt(id: string) {
  return useMutation({
    mutationFn: (body: { channel?: NotificationChannel } = {}) =>
      apiFetch<{ notificationId: string }>(`/receipts/${id}/send`, { method: 'POST', body }),
  });
}
