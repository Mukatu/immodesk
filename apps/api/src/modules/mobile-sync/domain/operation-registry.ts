import { Inject, Injectable, Optional } from '@nestjs/common';
import { SYNC_OPERATION_HANDLERS, type SyncOperationHandler } from './operation-handler';
import type { SyncOperationType } from './sync-types';

/**
 * Registre des gestionnaires par type d'opération.
 *
 * Alimenté par le provider multi-valué `SYNC_OPERATION_HANDLERS` : ajouter un
 * type en phase 8 se limite à ajouter une entrée à ce tableau de providers
 * (`mobile-sync.module.ts` ou le module qui porte la nouvelle entité), sans
 * toucher au moteur (`SyncBatchesService`).
 */
@Injectable()
export class SyncOperationRegistry {
  private readonly byType = new Map<SyncOperationType, SyncOperationHandler>();

  constructor(
    @Optional()
    @Inject(SYNC_OPERATION_HANDLERS)
    handlers: SyncOperationHandler[] = [],
  ) {
    for (const handler of handlers) {
      if (this.byType.has(handler.type)) {
        throw new Error(
          `Gestionnaire de synchronisation en double pour le type « ${handler.type} ».`,
        );
      }
      this.byType.set(handler.type, handler);
    }
  }

  get(type: SyncOperationType): SyncOperationHandler | undefined {
    return this.byType.get(type);
  }

  registeredTypes(): SyncOperationType[] {
    return [...this.byType.keys()];
  }
}
