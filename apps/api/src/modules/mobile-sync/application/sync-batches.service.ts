import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { SyncBatchInput, SyncBatchResult, SyncReader } from '../domain/sync-types';
import { SyncBatchApplier } from './sync-batch-applier';
import { SyncBatchFinalizer } from './sync-batch-finalizer';
import { rowToBatchResult, type SyncBatchRow } from './sync-batch-mapper';

const IN_PROGRESS_STATUSES = new Set(['RECEIVED', 'VALIDATING']);

/**
 * Point d'entrée de `POST /v1/sync/batches` : réserve la ligne
 * `sync_batches`, ou renvoie le rejeu / le conflit d'un envoi en cours.
 *
 * Le rejeu du même `batchRef` depuis le même appareil renvoie le résultat
 * mémorisé sans retraiter (`sync_batches_ref_uk`) ; un lot déjà en cours de
 * traitement répond `409 SYNC.BATCH_IN_PROGRESS`. C'est l'INSERT — jamais un
 * contrôle préalable — qui tranche la course entre deux envois concurrents
 * du même lot, comme `client_ref` ailleurs dans le code.
 */
@Injectable()
export class SyncBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applier: SyncBatchApplier,
    private readonly finalizer: SyncBatchFinalizer,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async submit(
    organizationId: string,
    reader: SyncReader,
    input: SyncBatchInput,
  ): Promise<SyncBatchResult> {
    this.assertSize(input);
    const claimed = await this.claim(organizationId, reader, input);
    if (claimed.kind === 'replay') return claimed.result;

    // Horodatage de la ligne elle-même (colonne `received_at`, valeur par
    // défaut posée par PostgreSQL à l'INSERT) : un rejeu ultérieur restitue
    // exactement la même valeur, jamais un nouvel horodatage applicatif.
    const receivedAt = claimed.receivedAt;
    try {
      const results = await this.applier.applyAll(
        organizationId,
        reader,
        claimed.rowId,
        input.operations,
      );
      return this.finalizer.finalize(
        organizationId,
        reader,
        claimed.rowId,
        input,
        receivedAt,
        results,
      );
    } catch (error) {
      return this.finalizer.fail(organizationId, reader, claimed.rowId, input, receivedAt, error);
    }
  }

  private assertSize(input: SyncBatchInput): void {
    const maxOperations = this.config.get('SYNC_MAX_OPERATIONS_PER_BATCH');
    const maxBytes = this.config.get('SYNC_MAX_BODY_BYTES');
    const bytes = Buffer.byteLength(JSON.stringify(input ?? {}), 'utf8');
    if (
      !Array.isArray(input.operations) ||
      input.operations.length === 0 ||
      input.operations.length > maxOperations ||
      bytes > maxBytes
    ) {
      throw new DomainError('SYNC.BATCH_TOO_LARGE', {
        operationsCount: input.operations?.length ?? 0,
        maxOperations,
        bodyBytes: bytes,
        maxBodyBytes: maxBytes,
      });
    }
  }

  private async claim(
    organizationId: string,
    reader: SyncReader,
    input: SyncBatchInput,
  ): Promise<
    | { kind: 'processing'; rowId: string; receivedAt: Date }
    | { kind: 'replay'; result: SyncBatchResult }
  > {
    try {
      const row = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
        tx.sync_batches.create({
          data: {
            id: newId(),
            organization_id: organizationId,
            user_id: reader.userId,
            device_id: input.deviceId,
            device_platform: input.devicePlatform ?? null,
            app_version: input.appVersion ?? null,
            batch_ref: input.batchRef,
            status: 'VALIDATING',
            operations_count: input.operations.length,
            client_generated_at: input.clientGeneratedAt ? new Date(input.clientGeneratedAt) : null,
            offline_duration_minutes: input.offlineDurationMinutes ?? null,
            payload: input as unknown as object,
          },
          select: { id: true, received_at: true },
        }),
      );
      await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
        audit(this.auditService, tx, {
          organizationId,
          actorUserId: reader.userId,
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.SYNC_BATCH_RECEIVED,
          entityType: 'sync_batches',
          entityId: row.id,
          newState: toJsonState({
            deviceId: input.deviceId,
            batchRef: input.batchRef,
            operationsCount: input.operations.length,
          }),
        }),
      );
      return { kind: 'processing', rowId: row.id, receivedAt: row.received_at };
    } catch (error) {
      // Pour une contrainte @@unique COMPOSITE sans nom de colonne disponible
      // (`meta.target` vide selon le pilote), Prisma ne renvoie que le code
      // P2002 — sans indice textuel à vérifier. C'est sans risque ICI : cet
      // `INSERT` ne peut heurter qu'une seule contrainte, `sync_batches_ref_uk`.
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
        tx.sync_batches.findFirst({
          where: {
            organization_id: organizationId,
            device_id: input.deviceId,
            batch_ref: input.batchRef,
          },
        }),
      );
      if (!existing) throw error;
      if (IN_PROGRESS_STATUSES.has(existing.status)) {
        throw new DomainError('SYNC.BATCH_IN_PROGRESS', { batchRef: input.batchRef });
      }
      return { kind: 'replay', result: rowToBatchResult(existing as unknown as SyncBatchRow) };
    }
  }
}
