import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  DunningRun,
  DunningRunsQuery,
  Paginated,
  TriggerDunningRunsBody,
  TriggerDunningRunsResult,
} from '@/lib/api/types';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Historique des exécutions de relance, filtrable (palier, facture, statut, période). */
export function useDunningRuns(params: DunningRunsQuery = {}) {
  return useQuery({
    queryKey: ['dunning-runs', params],
    queryFn: () =>
      apiFetch<Paginated<DunningRun>>(
        `/dunning-runs${buildQuery({
          ruleId: params.ruleId,
          invoiceId: params.invoiceId,
          status: params.status,
          from: params.from,
          to: params.to,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useDunningRun(id: string | null) {
  return useQuery({
    queryKey: ['dunning-runs', 'detail', id],
    queryFn: () => apiFetch<DunningRun>(`/dunning-runs/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Rejoue le scan à la demande pour l'organisation courante. Réponse directe
 * (`202 { scanned, created, skipped, failed, dryRun }`), sans interrogation
 * périodique : contrairement à la campagne de refacturation, ce n'est pas un
 * job asynchrone côté contrat.
 */
export function useTriggerDunningRuns(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TriggerDunningRunsBody) =>
      apiFetch<TriggerDunningRunsResult>(`/organizations/${organizationId}/dunning-runs/trigger`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dunning-runs'] });
    },
  });
}
