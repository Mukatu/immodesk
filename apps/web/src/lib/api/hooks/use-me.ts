import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { MeResponse } from '@/lib/api/types';
import { getAccessToken } from '@/lib/api/token-store';

export const meQueryKey = ['me'] as const;

export function useMe(enabled = true) {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiFetch<MeResponse>('/me'),
    enabled: enabled && Boolean(getAccessToken()),
    staleTime: 5 * 60 * 1000,
  });
}
