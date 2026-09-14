import type { SyncBatchStatus, SyncOperationOutcome } from './sync-types';

export interface CountableResult {
  outcome: SyncOperationOutcome;
  /** Résolution d'un conflit (`null`/absent : conflit encore à arbitrer). */
  resolution?: 'APPLIED' | 'DISCARDED' | null;
}

export interface BatchCounts {
  appliedCount: number;
  rejectedCount: number;
  conflictsCount: number;
  status: SyncBatchStatus;
}

/**
 * Recalcule les compteurs et le statut d'un lot à partir de ses résultats.
 *
 * Un conflit RÉSOLU en `APPLY` compte comme appliqué, un conflit RÉSOLU en
 * `DISCARD` comme rejeté ; seul un conflit encore SANS résolution compte dans
 * `conflictsCount` — c'est ce nombre que `GET /v1/sync/conflicts` doit
 * pouvoir amener à zéro. Partagé entre `SyncBatchFinalizer` (résultat
 * initial) et la résolution de conflit, pour que les deux calculs ne
 * divergent jamais.
 */
export function recomputeBatchCounts(results: CountableResult[]): BatchCounts {
  let appliedCount = 0;
  let rejectedCount = 0;
  let conflictsCount = 0;

  for (const result of results) {
    if (result.outcome === 'APPLIED' || result.outcome === 'DUPLICATE') {
      appliedCount += 1;
    } else if (result.outcome === 'CONFLICT') {
      if (result.resolution === 'APPLIED') appliedCount += 1;
      else if (result.resolution === 'DISCARDED') rejectedCount += 1;
      else conflictsCount += 1;
    } else {
      // REJECTED ou SKIPPED
      rejectedCount += 1;
    }
  }

  const total = results.length;
  const status: SyncBatchStatus =
    total === 0 || appliedCount === 0
      ? 'REJECTED'
      : appliedCount === total
        ? 'APPLIED'
        : 'PARTIALLY_APPLIED';

  return { appliedCount, rejectedCount, conflictsCount, status };
}
