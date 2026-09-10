import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { FeatureFlagsResponse } from '@/lib/api/types';

export function useFeatureFlags(organizationId: string | null) {
  return useQuery({
    queryKey: ['feature-flags', organizationId],
    queryFn: () => apiFetch<FeatureFlagsResponse>('/feature-flags'),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}
