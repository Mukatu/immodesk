import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { recomputeBatchCounts } from '../domain/sync-batch-counts';
import { decodeConflictId, type SyncConflict } from '../domain/sync-conflict-types';
import { SyncOperationRegistry } from '../domain/operation-registry';
import type { SyncOperationResult, SyncOperationType, SyncReader } from '../domain/sync-types';
import {
  buildSyncConflict,
  fullNameOf,
  storedResults,
  type StoredBatchRow,
  type StoredOperationResult,
} from './sync-conflict-mapper';

export type ConflictDecision =
  | { decision: 'APPLY'; overrides?: Record<string, unknown>; reason?: string }
  | { decision: 'DISCARD'; reason: string };

/**
 * `POST /v1/sync/conflicts/{id}/resolve` (docs/api/phase5-contract.md, §
 * Conflits). `APPLY` rejoue l'opération avec le MÊME `clientRef` : le
 * gestionnaire réutilisé garantit qu'un encaissement déjà créé par ailleurs
 * ne sera jamais dupliqué. `DISCARD` exige un motif et abandonne
 * définitivement l'opération. Les deux écrivent dans `audit_logs` et mettent
 * à jour `sync_batches.result`.
 */
@Injectable()
export class SyncConflictResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SyncOperationRegistry,
    private readonly auditService: AuditService,
  ) {}

  async resolve(
    organizationId: string,
    reader: SyncReader,
    id: string,
    decision: ConflictDecision,
  ): Promise<{ conflict: SyncConflict; result: SyncOperationResult }> {
    const { batchId, clientRef } = decodeConflictId(id);
    if (decision.decision === 'DISCARD' && !decision.reason?.trim()) {
      throw new DomainError('SYNC.DISCARD_REASON_REQUIRED');
    }

    const row = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.sync_batches.findFirst({ where: { id: batchId } }),
    );
    if (!row) throw new DomainError('SYNC.CONFLICT_NOT_FOUND', { id });

    const results = storedResults(row as unknown as StoredBatchRow);
    const index = results.findIndex((r) => r.clientRef === clientRef && r.outcome === 'CONFLICT');
    if (index < 0) throw new DomainError('SYNC.CONFLICT_NOT_FOUND', { id });
    if (results[index].resolution) {
      throw new DomainError('SYNC.CONFLICT_ALREADY_RESOLVED', { id });
    }

    const updated =
      decision.decision === 'DISCARD'
        ? this.discard(results[index], decision.reason, reader.userId)
        : await this.apply(
            organizationId,
            reader,
            row as unknown as StoredBatchRow,
            results[index],
            decision,
          );

    results[index] = updated;
    await this.persist(organizationId, reader, row.id, results);
    await this.audit(organizationId, reader, row.id, clientRef, decision);

    const user = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.users.findUnique({
        where: { id: row.user_id },
        select: {
          id: true,
          display_name: true,
          first_name: true,
          last_name: true,
          phone_e164: true,
        },
      }),
    );
    const conflict = buildSyncConflict(
      { ...(row as unknown as StoredBatchRow), result: results },
      updated,
      {
        userId: row.user_id,
        fullName: user ? fullNameOf(user) : row.user_id,
      },
    );
    return { conflict, result: stripInternal(updated) };
  }

  private discard(
    item: StoredOperationResult,
    reason: string,
    userId: string,
  ): StoredOperationResult {
    return {
      ...item,
      resolution: 'DISCARDED',
      resolvedAt: new Date().toISOString(),
      resolvedReason: reason,
      resolvedByUserId: userId,
    };
  }

  private async apply(
    organizationId: string,
    reader: SyncReader,
    row: StoredBatchRow,
    item: StoredOperationResult,
    decision: Extract<ConflictDecision, { decision: 'APPLY' }>,
  ): Promise<StoredOperationResult> {
    const handler = this.registry.get(item.type as SyncOperationType);
    if (!handler) throw new DomainError('SYNC.CONFLICT_NOT_FOUND', { id: item.clientRef });
    const envelope = (
      row.payload as { operations?: Array<Record<string, unknown>> } | null
    )?.operations?.find((o) => o.clientRef === item.clientRef);
    const mergedPayload = {
      ...(envelope?.payload as object | undefined),
      ...(decision.overrides ?? {}),
    };
    const applied = await handler.apply(organizationId, reader, mergedPayload, {
      clientRef: item.clientRef,
      syncBatchId: row.id,
    });
    return {
      ...item,
      resourceType: handler.resourceType,
      resourceId: applied.resourceId,
      resolution: 'APPLIED',
      resolvedAt: new Date().toISOString(),
      resolvedReason: decision.reason ?? null,
      resolvedByUserId: reader.userId,
    };
  }

  private async persist(
    organizationId: string,
    reader: SyncReader,
    batchId: string,
    results: StoredOperationResult[],
  ): Promise<void> {
    const counts = recomputeBatchCounts(results);
    await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.sync_batches.update({
        where: { id: batchId },
        data: {
          result: results as unknown as object,
          applied_count: counts.appliedCount,
          rejected_count: counts.rejectedCount,
          conflicts_count: counts.conflictsCount,
          status: counts.status,
          updated_at: new Date(),
        },
      }),
    );
  }

  private async audit(
    organizationId: string,
    reader: SyncReader,
    batchId: string,
    clientRef: string,
    decision: ConflictDecision,
  ): Promise<void> {
    await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      audit(this.auditService, tx, {
        organizationId,
        actorUserId: reader.userId,
        action: decision.decision === 'APPLY' ? 'STATE_TRANSITION' : 'DELETE',
        operation:
          decision.decision === 'APPLY'
            ? AUDIT_OPERATIONS.SYNC_CONFLICT_RESOLVED
            : AUDIT_OPERATIONS.SYNC_CONFLICT_DISCARDED,
        entityType: 'sync_batches',
        entityId: batchId,
        newState: toJsonState({ clientRef, decision }),
      }),
    );
  }
}

function stripInternal(item: StoredOperationResult): SyncOperationResult {
  const {
    resolvedAt: _r,
    resolution: _s,
    resolvedReason: _m,
    resolvedByUserId: _u,
    ...rest
  } = item;
  return rest;
}
