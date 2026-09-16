import { Global, Module } from '@nestjs/common';
import { MaintenanceQueryService } from './application/maintenance-query.service';
import { MaintenanceRequestsService } from './application/maintenance-requests.service';
import { MaintenanceController } from './presentation/maintenance.controller';

/**
 * Module `maintenance` (phase 8) : demandes de maintenance et mises à jour,
 * propriétaire exclusif de `maintenance_requests` et `maintenance_updates`.
 *
 * `@Global()` : `inspections` crée une demande depuis un poste dégradé
 * (`POST .../maintenance-request`) sans import de module.
 */
@Global()
@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceRequestsService, MaintenanceQueryService],
  exports: [MaintenanceRequestsService, MaintenanceQueryService],
})
export class MaintenanceModule {}
