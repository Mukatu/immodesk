import { Module } from '@nestjs/common';
import { SYNC_OPERATION_HANDLERS } from './domain/operation-handler';
import { SyncOperationRegistry } from './domain/operation-registry';
import { CashReceiptOperationHandler } from './application/cash-receipt-operation.handler';
import { DocumentOperationHandler } from './application/document-operation.handler';
import { InspectionOperationHandler } from './application/inspection-operation.handler';
import { InspectionSubmitOperationHandler } from './application/inspection-submit-operation.handler';
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
 * Un QUATRIEME type a ete ajoute depuis, `INSPECTION_SUBMIT` : le depot
 * COMPOSITE d un etat des lieux realise hors ligne (en-tete, postes, photos et
 * signature en une operation). Il deroge au principe enonce ci-dessus pour
 * `INSPECTION`, et c est assume : un constat se fait sur le terrain sans
 * reseau, ses postes et ses signatures forment un tout indivisible, et le
 * mobile le composait deja ainsi alors que le serveur ne le connaissait pas —
 * tout lot en contenant un etait refuse en bloc, encaissements compris. La
 * justification complete est dans `inspection-submit-operation.handler.ts`.
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
    InspectionSubmitOperationHandler,
    MeterReadingOperationHandler,
    MaintenanceUpdateOperationHandler,
    {
      provide: SYNC_OPERATION_HANDLERS,
      useFactory: (
        cash: CashReceiptOperationHandler,
        document: DocumentOperationHandler,
        inspection: InspectionOperationHandler,
        inspectionSubmit: InspectionSubmitOperationHandler,
        meterReading: MeterReadingOperationHandler,
        maintenanceUpdate: MaintenanceUpdateOperationHandler,
      ) => [cash, document, inspection, inspectionSubmit, meterReading, maintenanceUpdate],
      inject: [
        CashReceiptOperationHandler,
        DocumentOperationHandler,
        InspectionOperationHandler,
        InspectionSubmitOperationHandler,
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
