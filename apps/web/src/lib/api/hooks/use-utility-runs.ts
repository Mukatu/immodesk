import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { UtilityRunInput, UtilityRunLaunchResponse, UtilityRunReport } from '@/lib/api/types';

/**
 * Lance une campagne de refacturation de charges (`202 { runId }`). Idempotente
 * côté serveur : un relevé déjà `isInvoiced` est ignoré même si la campagne
 * est relancée sur la même période.
 */
export function useLaunchUtilityRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UtilityRunInput) =>
      apiFetch<UtilityRunLaunchResponse>('/billing/utility-runs', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-runs'] });
      queryClient.invalidateQueries({ queryKey: ['meters'] });
    },
  });
}

/**
 * Suivi d'une campagne. `refetchInterval` laissé au consommateur (écran de
 * suivi) plutôt que codé ici, pour ne pas imposer de polling en arrière-plan
 * partout où le hook est utilisé.
 */
export function useUtilityRun(runId: string | null, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: ['utility-runs', runId],
    queryFn: () => apiFetch<UtilityRunReport>(`/billing/utility-runs/${runId}`),
    enabled: Boolean(runId),
    refetchInterval: options.refetchInterval,
  });
}
