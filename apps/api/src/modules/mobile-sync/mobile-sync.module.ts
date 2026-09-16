import { Module } from '@nestjs/common';
import { SYNC_OPERATION_HANDLERS } from './domain/operation-handler';
import { SyncOperationRegistry } from './domain/operation-registry';
import { CashReceiptOperationHandler } from './application/cash-receipt-operation.handler';
import { DocumentOperationHandler } from './application/document-operation.handler';
import { InspectionOperationHandler } from './application/inspection-operation.handler';
import { MaintenanceUpdateOperationHandler } from './application/maintenance-update-operation.handler';
import { MeterReadingOperationHandler } from './application/meter-reading-operation.handler';
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
 * multi-valué `SYNC_OPERATION_HANDLERS` : la phase 8 ajoute TROIS types
 * d'opération (`INSPECTION`, `METER_READING`, `MAINTENANCE_UPDATE`) en
 * enregistrant trois nouveaux gestionnaires dans ce tableau, sans toucher ni
 * à la route (`POST /v1/sync/batches`), ni au format d'enveloppe
 * (`sync-types.ts` ne fait qu'allonger l'union `SyncOperationType`), ni au
 * tri par dépendances, ni au moteur de rejeu (`SyncBatchApplier`,
 * `SyncBatchFinalizer`) — le contrat de la phase 5 tient sa promesse
 * (arbitrage 1). Seule nuance, documentée dans
 * `maintenance-update-operation.handler.ts` : l'idempotence de
 * `MAINTENANCE_UPDATE` n'est qu'applicative, `maintenance_updates` ne portant
 * aucune contrainte d'unicité sur `client_ref` dans le DDL fermé de la
 * phase 8.
 *
 * `cash`, `documents`, `audit`, `inspections`, `meters` et `maintenance` sont
 * `@Global()` : leurs services sont injectables ici sans import de module,
 * comme `payments` dans `cash`.
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
    InspectionOperationHandler,
    MeterReadingOperationHandler,
    MaintenanceUpdateOperationHandler,
    {
      provide: SYNC_OPERATION_HANDLERS,
      useFactory: (
        cash: CashReceiptOperationHandler,
        document: DocumentOperationHandler,
        inspection: InspectionOperationHandler,
        meterReading: MeterReadingOperationHandler,
        maintenanceUpdate: MaintenanceUpdateOperationHandler,
      ) => [cash, document, inspection, meterReading, maintenanceUpdate],
      inject: [
        CashReceiptOperationHandler,
        DocumentOperationHandler,
        InspectionOperationHandler,
        MeterReadingOperationHandler,
        MaintenanceUpdateOperationHandler,
      ],
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
