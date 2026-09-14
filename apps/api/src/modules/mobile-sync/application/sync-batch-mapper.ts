import type { SyncBatchResult, SyncBatchStatus, SyncOperationResult } from '../domain/sync-types';

/** Ligne `sync_batches` minimale nécessaire à la restitution du contrat. */
export interface SyncBatchRow {
  id: string;
  batch_ref: string;
  status: string;
  operations_count: number;
  applied_count: number;
  rejected_count: number;
  conflicts_count: number;
  received_at: Date;
  applied_at: Date | null;
  result: unknown;
}

/**
 * Restitue une ligne `sync_batches` sous la forme du contrat.
 *
 * `status` peut, en théorie, valoir `RECEIVED` ou `VALIDATING` si la ligne
 * est lue pendant son traitement par une autre requête concurrente : le
 * traitement étant synchrone dans la requête qui l'a ouvert, cette fenêtre
 * est brève ; la valeur brute est restituée telle quelle plutôt que masquée.
 */
export function rowToBatchResult(row: SyncBatchRow): SyncBatchResult {
  return {
    batchId: row.id,
    batchRef: row.batch_ref,
    status: row.status as SyncBatchStatus,
    operationsCount: row.operations_count,
    appliedCount: row.applied_count,
    rejectedCount: row.rejected_count,
    conflictsCount: row.conflicts_count,
    receivedAt: row.received_at.toISOString(),
    appliedAt: row.applied_at ? row.applied_at.toISOString() : null,
    // Ne restitue que les champs du contrat : `sync_batches.result` porte
    // aussi, pour les conflits, des métadonnées de résolution internes
    // (`resolvedAt`, `resolution`, ...) qui ne font pas partie de l'enveloppe
    // `SyncOperationResult` du contrat de `POST /v1/sync/batches`.
    results: (Array.isArray(row.result) ? (row.result as SyncOperationResult[]) : []).map((r) => ({
      clientRef: r.clientRef,
      type: r.type,
      outcome: r.outcome,
      ...(r.resourceType !== undefined ? { resourceType: r.resourceType } : {}),
      ...(r.resourceId !== undefined ? { resourceId: r.resourceId } : {}),
      ...(r.code !== undefined ? { code: r.code } : {}),
      ...(r.message !== undefined ? { message: r.message } : {}),
      ...(r.retryable !== undefined ? { retryable: r.retryable } : {}),
    })),
  };
}
