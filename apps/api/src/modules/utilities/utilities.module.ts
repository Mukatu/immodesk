import { Global, Module } from '@nestjs/common';
import { UtilityRunService } from './application/utility-run.service';
import { UtilityTariffsService } from './application/utility-tariffs.service';
import { UtilityRunsController } from './presentation/utility-runs.controller';
import { UtilityTariffsController } from './presentation/utility-tariffs.controller';

/**
 * Module `utilities` (phase 8) : grilles tarifaires et campagne de
 * refacturation des charges, propriétaire exclusif de `utility_tariffs`.
 *
 * `@Global()` : `inspections` n'en dépend pas, mais la convention des
 * modules de phase 8 reste homogène. Consomme `meters` et `billing` (tous
 * deux `@Global()`) sans import de module.
 */
@Global()
@Module({
  controllers: [UtilityTariffsController, UtilityRunsController],
  providers: [UtilityTariffsService, UtilityRunService],
  exports: [UtilityTariffsService, UtilityRunService],
})
export class UtilitiesModule {}
