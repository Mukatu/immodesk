import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { TenantStatement } from '@/lib/api/types';

export interface UseTenantStatementParams {
  from?: string;
  to?: string;
}

export function useTenantStatement(tenantId: string | null, params: UseTenantStatementParams = {}) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'statement', params],
    queryFn: () => {
      const search = new URLSearchParams();
      if (params.from) search.set('from', params.from);
      if (params.to) search.set('to', params.to);
      const qs = search.toString();
      return apiFetch<TenantStatement>(`/tenants/${tenantId}/statement${qs ? `?${qs}` : ''}`);
    },
    enabled: Boolean(tenantId),
  });
}
