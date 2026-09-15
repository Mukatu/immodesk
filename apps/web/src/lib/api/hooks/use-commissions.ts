import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { CommissionListResponse, CommissionStatus } from '@/lib/api/types';

export interface UseCommissionsParams {
  mandateId?: string;
  landlordId?: string;
  period?: string;
  status?: CommissionStatus;
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

export function useCommissions(params: UseCommissionsParams = {}) {
  return useQuery({
    queryKey: ['commissions', params],
    queryFn: () =>
      apiFetch<CommissionListResponse>(
        `/commissions${buildQuery({
          mandateId: params.mandateId,
          landlordId: params.landlordId,
          period: params.period,
          status: params.status,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}
