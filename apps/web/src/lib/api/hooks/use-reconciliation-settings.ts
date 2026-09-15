import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { ReconciliationSettings } from '@/lib/api/types';

export function useReconciliationSettings(organizationId: string | null) {
  return useQuery({
    queryKey: ['reconciliation-settings', organizationId],
    queryFn: () =>
      apiFetch<ReconciliationSettings>(`/organizations/${organizationId}/reconciliation-settings`),
    enabled: Boolean(organizationId),
  });
}

export function useUpdateReconciliationSettings(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ReconciliationSettings>) =>
      apiFetch<ReconciliationSettings>(`/organizations/${organizationId}/reconciliation-settings`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-settings', organizationId] });
    },
  });
}
