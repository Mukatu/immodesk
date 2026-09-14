import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { recomputeBatchCounts } from '../domain/sync-batch-counts';
import type {
  SyncBatchInput,
  SyncBatchResult,
  SyncOperationResult,
  SyncReader,
} from '../domain/sync-types';

/** Écrit le résultat final (succès ou échec technique) d'un lot déjà appliqué. */
@Injectable()
export class SyncBatchFinalizer {
  private readonly logger = new Logger(SyncBatchFinalizer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async finalize(
    organizationId: string,
    reader: SyncReader,
    batchId: string,
    input: SyncBatchInput,
    receivedAt: Date,
    results: SyncOperationResult[],
  ): Promise<SyncBatchResult> {
    const { appliedCount, rejectedCount, conflictsCount, status } = recomputeBatchCounts(results);
    const appliedAt = new Date();

    await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.sync_batches.update({
        where: { id: batchId },
        data: {
          status,
          applied_count: appliedCount,
          rejected_count: rejectedCount,
          conflicts_count: conflictsCount,
          applied_at: appliedAt,
          result: results as unknown as object,
          updated_at: new Date(),
        },
      }),
    );
    await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      audit(this.auditService, tx, {
        organizationId,
        actorUserId: reader.userId,
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.SYNC_BATCH_APPLIED,
        entityType: 'sync_batches',
        entityId: batchId,
        newState: toJsonState({ status, appliedCount, rejectedCount, conflictsCount }),
      }),
    );

    return {
      batchId,
      batchRef: input.batchRef,
      status,
      operationsCount: results.length,
      appliedCount,
      rejectedCount,
      conflictsCount,
      receivedAt: receivedAt.toISOString(),
      appliedAt: appliedAt.toISOString(),
      results,
    };
  }

  async fail(
    organizationId: string,
    reader: SyncReader,
    batchId: string,
    input: SyncBatchInput,
    receivedAt: Date,
    error: unknown,
  ): Promise<SyncBatchResult> {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    this.logger.error(`Lot ${input.batchRef} en échec technique : ${message}`);
    await this.prisma
      .withTenant(organizationId, reader.userId, (tx) =>
        tx.sync_batches.update({
          where: { id: batchId },
          data: { status: 'FAILED', error_message: message.slice(0, 2000), updated_at: new Date() },
        }),
      )
      .catch(() => undefined);

    return {
      batchId,
      batchRef: input.batchRef,
      status: 'FAILED',
      operationsCount: input.operations.length,
      appliedCount: 0,
      rejectedCount: 0,
      conflictsCount: 0,
      receivedAt: receivedAt.toISOString(),
      appliedAt: null,
      results: [],
    };
  }
}
