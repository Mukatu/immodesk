import { Global, Module } from '@nestjs/common';
import { DunningEngineService } from './application/dunning-engine.service';
import { DunningRulesService } from './application/dunning-rules.service';
import { DunningRunsQueryService } from './application/dunning-runs-query.service';
import { DunningCronScheduler } from './infrastructure/dunning-cron.scheduler';
import { DunningRulesController } from './presentation/dunning-rules.controller';
import {
  DunningRunsController,
  DunningTriggerController,
} from './presentation/dunning-runs.controller';

/**
 * Module `dunning` (phase 9) : règles et exécutions de relance, propriétaire
 * exclusif de `dunning_rules` et `dunning_runs`.
 *
 * Consomme `NOTIFICATION_ENQUEUER` et `NotificationDeliveryService`
 * (module `notifications`, `@Global()`) et `InvoiceWriterService`
 * (module `billing`, `@Global()`) sans import explicite. À déclarer dans
 * `app.module.ts` (hors périmètre de cet agent : propriétaire réservé).
 *
 * Variables d'environnement attendues (`config.schema.ts`, hors périmètre) :
 * `DUNNING_CRON_ENABLED`, `DUNNING_MAX_RUNS_PER_HOUR`.
 */
@Global()
@Module({
  controllers: [DunningRulesController, DunningRunsController, DunningTriggerController],
  providers: [
    DunningRulesService,
    DunningRunsQueryService,
    DunningEngineService,
    DunningCronScheduler,
  ],
  exports: [DunningRulesService, DunningRunsQueryService, DunningEngineService],
})
export class DunningModule {}
