import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Paginated,
  ResolveConflictBody,
  ResolveConflictResponse,
  SyncConflict,
} from '@/lib/api/types';

export interface UseSyncConflictsParams {
  resolved?: boolean;
  collectorUserId?: string;
  limit?: number;
  cursor?: string;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Liste des conflits (agrégés depuis `sync_batches.result`, aucune table
 * dédiée côté API — contrat, arbitrage 2). `resolved: false` par défaut côté
 * écran pour faire remonter les conflits non résolus en tête.
 */
export function useSyncConflicts(params: UseSyncConflictsParams = {}) {
  return useQuery({
    queryKey: ['sync-conflicts', params],
    queryFn: () =>
      apiFetch<Paginated<SyncConflict>>(
        `/sync/conflicts${buildQuery({
          resolved: params.resolved,
          collectorUserId: params.collectorUserId,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

/**
 * Résolution réservée MANAGER (contrat) : APPLY rejoue l'opération avec le
 * même `clientRef` (aucun doublon) ; DISCARD exige un motif. Invalide aussi
 * les lots et les factures potentiellement affectées par une correction.
 */
export function useResolveSyncConflict(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ResolveConflictBody) =>
      apiFetch<ResolveConflictResponse>(`/sync/conflicts/${id}/resolve`, {
        method: 'POST',
        body,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['sync-batches'] });
      queryClient.invalidateQueries({ queryKey: ['sync-batches', data.conflict.batchId] });
      queryClient.invalidateQueries({ queryKey: ['sync-devices'] });
      const invoiceId = data.conflict.targetInvoice?.id;
      if (invoiceId) {
        queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    },
  });
}
