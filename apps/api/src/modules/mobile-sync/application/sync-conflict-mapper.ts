import { encodeConflictId, type SyncConflict } from '../domain/sync-conflict-types';
import type { SyncOperationResult, SyncOperationType } from '../domain/sync-types';

/**
 * Forme interne d'un élément de `sync_batches.result` : les champs du
 * contrat (`SyncOperationResult`) plus les métadonnées de résolution d'un
 * conflit, jamais exposées telles quelles dans `SyncBatchResult` (le contrat
 * de `POST /v1/sync/batches` reste inchangé — voir `rowToBatchResult`).
 */
export interface StoredOperationResult extends SyncOperationResult {
  resolvedAt?: string | null;
  resolution?: 'APPLIED' | 'DISCARDED' | null;
  resolvedReason?: string | null;
  resolvedByUserId?: string | null;
}

export interface StoredBatchRow {
  id: string;
  batch_ref: string;
  device_id: string;
  user_id: string;
  received_at: Date;
  payload: unknown;
  result: unknown;
}

export function storedResults(row: StoredBatchRow): StoredOperationResult[] {
  return Array.isArray(row.result) ? (row.result as StoredOperationResult[]) : [];
}

function operationEnvelope(
  row: StoredBatchRow,
  clientRef: string,
): { payload: unknown; clientCreatedAt: string } | null {
  const payload = row.payload as { operations?: Array<Record<string, unknown>> } | null;
  const op = payload?.operations?.find((o) => o.clientRef === clientRef);
  if (!op) return null;
  return { payload: op.payload, clientCreatedAt: String(op.clientCreatedAt ?? '') };
}

export function buildSyncConflict(
  row: StoredBatchRow,
  item: StoredOperationResult,
  collector: { userId: string; fullName: string },
): SyncConflict {
  const envelope = operationEnvelope(row, item.clientRef);
  return {
    id: encodeConflictId(row.id, item.clientRef),
    batchId: row.id,
    clientRef: item.clientRef,
    type: item.type as SyncOperationType,
    code: item.code ?? '',
    message: item.message ?? '',
    payload: envelope?.payload ?? null,
    collector,
    deviceId: row.device_id,
    clientCreatedAt: envelope?.clientCreatedAt ?? row.received_at.toISOString(),
    receivedAt: row.received_at.toISOString(),
    resolvedAt: item.resolvedAt ?? null,
    resolution: item.resolution ?? null,
    resolutionReason: item.resolvedReason ?? null,
  };
}

export function fullNameOf(user: {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_e164: string;
}): string {
  return (
    user.display_name?.trim() ||
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
    user.phone_e164
  );
}
