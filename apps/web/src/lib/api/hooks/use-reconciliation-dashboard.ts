import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { ReconciliationDashboard } from '@/lib/api/types';

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useReconciliationDashboard(bankAccountId?: string) {
  return useQuery({
    queryKey: ['reconciliation-dashboard', bankAccountId],
    queryFn: () =>
      apiFetch<ReconciliationDashboard>(
        `/reconciliation/dashboard${buildQuery({ bankAccountId })}`,
      ),
  });
}
