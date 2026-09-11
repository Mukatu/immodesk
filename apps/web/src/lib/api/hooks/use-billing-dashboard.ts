import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { BillingDashboard } from '@/lib/api/types';

export function useBillingDashboard(period: string | null) {
  return useQuery({
    queryKey: ['billing-dashboard', period],
    queryFn: () => apiFetch<BillingDashboard>(`/billing/dashboard?period=${period}`),
    enabled: Boolean(period),
  });
}
