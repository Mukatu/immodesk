import { Module } from '@nestjs/common';
import { SYNC_OPERATION_HANDLERS } from './domain/operation-handler';
import { SyncOperationRegistry } from './domain/operation-registry';
import { CashReceiptOperationHandler } from './application/cash-receipt-operation.handler';
import { DocumentOperationHandler } from './application/document-operation.handler';
import { MobileConfigService } from './application/mobile-config.service';
import { SyncBatchApplier } from './application/sync-batch-applier';
import { SyncBatchFinalizer } from './application/sync-batch-finalizer';
import { SyncBatchesQueryService } from './application/sync-batches-query.service';
import { SyncBatchesService } from './application/sync-batches.service';
import { SyncConflictResolutionService } from './application/sync-conflict-resolution.service';
import { SyncConflictsService } from './application/sync-conflicts.service';
import { SyncDevicesService } from './application/sync-devices.service';
import { SyncPullService } from './application/sync-pull.service';
import { MobileConfigController } from './presentation/mobile-config.controller';
import { SyncBatchesController } from './presentation/sync-batches.controller';
import { SyncConflictsController } from './presentation/sync-conflicts.controller';
import { SyncDevicesController } from './presentation/sync-devices.controller';
import { SyncPullController } from './presentation/sync-pull.controller';

/**
 * Module `mobile-sync` (phase 5) : protocole générique de synchronisation
 * par lots (`sync_batches`), périmètre du démarcheur (`GET /v1/sync/pull`),
 * conflits agrégés depuis `sync_batches.result` et configuration mobile.
 *
 * Le registre `SyncOperationRegistry` est alimenté par le provider
 * multi-valué `SYNC_OPERATION_HANDLERS` : la phase 8 ajoute un type
 * d'opération en enregistrant un nouveau gestionnaire dans ce tableau, sans
 * toucher ni à la route, ni au tri par dépendances, ni au moteur de rejeu
 * (docs/api/phase5-contract.md, arbitrage 1).
 *
 * `cash`, `documents` et `audit` sont `@Global()` : leurs services sont
 * injectables ici sans import de module, comme `payments` dans `cash`.
 */
@Module({
  controllers: [
    SyncBatchesController,
    SyncPullController,
    SyncConflictsController,
    SyncDevicesController,
    MobileConfigController,
  ],
  providers: [
    CashReceiptOperationHandler,
    DocumentOperationHandler,
    {
      provide: SYNC_OPERATION_HANDLERS,
      useFactory: (cash: CashReceiptOperationHandler, document: DocumentOperationHandler) => [
        cash,
        document,
      ],
      inject: [CashReceiptOperationHandler, DocumentOperationHandler],
    },
    SyncOperationRegistry,
    SyncBatchApplier,
    SyncBatchFinalizer,
    SyncBatchesService,
    SyncBatchesQueryService,
    SyncPullService,
    SyncConflictsService,
    SyncConflictResolutionService,
    SyncDevicesService,
    MobileConfigService,
  ],
  exports: [SyncOperationRegistry],
})
export class MobileSyncModule {}
