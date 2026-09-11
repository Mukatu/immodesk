import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { BillingRun, BillingRunInput } from '@/lib/api/types';

export function useStartBillingRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BillingRunInput = {}) =>
      apiFetch<{ runId: string }>('/billing/runs', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
    },
  });
}

export function useBillingRun(runId: string | null) {
  return useQuery({
    queryKey: ['billing-runs', runId],
    queryFn: () => apiFetch<BillingRun>(`/billing/runs/${runId}`),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'DONE' || status === 'FAILED' ? false : 2000;
    },
  });
}
