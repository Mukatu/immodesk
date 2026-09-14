import { Injectable, Logger } from '@nestjs/common';
import { sortByDependencies } from '../domain/dependency-sort';
import { SyncOperationRegistry } from '../domain/operation-registry';
import {
  SYNC_INTERNAL_CODES,
  type SyncOperationInput,
  type SyncOperationResult,
  type SyncReader,
} from '../domain/sync-types';

/**
 * Applique les opérations d'un lot, dans l'ordre de dépendances, en
 * rappelant le gestionnaire enregistré pour chaque type. Séparé de
 * `SyncBatchesService` (réservation, rejeu) et de `SyncBatchFinalizer`
 * (écriture du résultat) : chaque fichier a une seule responsabilité.
 */
@Injectable()
export class SyncBatchApplier {
  private readonly logger = new Logger(SyncBatchApplier.name);

  constructor(private readonly registry: SyncOperationRegistry) {}

  async applyAll(
    organizationId: string,
    reader: SyncReader,
    batchId: string,
    operations: SyncOperationInput[],
  ): Promise<SyncOperationResult[]> {
    const byRef = new Map(operations.map((op) => [op.clientRef, op]));
    const sorted = sortByDependencies(
      operations.map((op) => ({
        clientRef: op.clientRef,
        dependsOn: op.dependsOn,
        clientCreatedAt: op.clientCreatedAt,
      })),
    );
    const outcomes = new Map<string, SyncOperationResult>();

    for (const [clientRef, reason] of sorted.skipped) {
      outcomes.set(clientRef, {
        clientRef,
        type: byRef.get(clientRef)!.type,
        outcome: 'SKIPPED',
        code: reason,
        message: skipMessage(reason),
        retryable: false,
      });
    }

    for (const clientRef of sorted.order) {
      const op = byRef.get(clientRef)!;
      const depsSatisfied = (op.dependsOn ?? []).every((dep) => {
        const depOutcome = outcomes.get(dep);
        return depOutcome?.outcome === 'APPLIED' || depOutcome?.outcome === 'DUPLICATE';
      });
      outcomes.set(
        clientRef,
        depsSatisfied
          ? await this.applyOne(organizationId, reader, batchId, op)
          : {
              clientRef,
              type: op.type,
              outcome: 'SKIPPED',
              code: SYNC_INTERNAL_CODES.DEPENDENCY_REJECTED,
              message: skipMessage(SYNC_INTERNAL_CODES.DEPENDENCY_REJECTED),
              retryable: false,
            },
      );
    }

    return operations.map((op) => outcomes.get(op.clientRef)!);
  }

  private async applyOne(
    organizationId: string,
    reader: SyncReader,
    syncBatchId: string,
    op: SyncOperationInput,
  ): Promise<SyncOperationResult> {
    const handler = this.registry.get(op.type);
    if (!handler) {
      return {
        clientRef: op.clientRef,
        type: op.type,
        outcome: 'REJECTED',
        code: SYNC_INTERNAL_CODES.UNSUPPORTED_TYPE,
        message: "Type d'opération non pris en charge par ce serveur.",
        retryable: false,
      };
    }
    try {
      const applied = await handler.apply(organizationId, reader, op.payload, {
        clientRef: op.clientRef,
        syncBatchId,
      });
      return {
        clientRef: op.clientRef,
        type: op.type,
        outcome: applied.replayed ? 'DUPLICATE' : 'APPLIED',
        resourceType: handler.resourceType,
        resourceId: applied.resourceId,
      };
    } catch (error) {
      const verdict = handler.classify(error);
      if (verdict) {
        return { clientRef: op.clientRef, type: op.type, ...verdict };
      }
      this.logger.error(
        `Échec technique non classifié pour l'opération ${op.type} (${op.clientRef}) : ${String(
          (error as Error)?.message ?? error,
        )}`,
      );
      return {
        clientRef: op.clientRef,
        type: op.type,
        outcome: 'REJECTED',
        code: SYNC_INTERNAL_CODES.OPERATION_FAILED,
        message: 'Échec technique inattendu : réessayez la synchronisation.',
        retryable: true,
      };
    }
  }
}

function skipMessage(code: string): string {
  if (code === SYNC_INTERNAL_CODES.DEPENDENCY_CYCLE) {
    return 'Dépendance circulaire entre opérations du même lot : aucune ne peut être appliquée.';
  }
  return 'Dépendance non appliquée dans ce lot : opération ignorée.';
}
