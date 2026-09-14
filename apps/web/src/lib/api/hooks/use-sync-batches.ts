import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Paginated,
  SyncBatchDetail,
  SyncBatchStatus,
  SyncBatchSummary,
} from '@/lib/api/types';

export interface UseSyncBatchesParams {
  collectorUserId?: string;
  status?: SyncBatchStatus;
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

/** Journal des lots de synchronisation reçus des appareils démarcheurs (MANAGER). */
export function useSyncBatches(params: UseSyncBatchesParams = {}) {
  return useQuery({
    queryKey: ['sync-batches', params],
    queryFn: () =>
      apiFetch<Paginated<SyncBatchSummary>>(
        `/sync/batches${buildQuery({
          collectorUserId: params.collectorUserId,
          status: params.status,
          from: params.from,
          to: params.to,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useSyncBatch(id: string | null) {
  return useQuery({
    queryKey: ['sync-batches', id],
    queryFn: () => apiFetch<SyncBatchDetail>(`/sync/batches/${id}`),
    enabled: Boolean(id),
  });
}
