import { Global, Module } from '@nestjs/common';
import { PROPERTY_READER } from '../parties/domain/read-ports';
import { PortfolioDetailsService } from './application/portfolio-details.service';
import { PropertiesService } from './application/properties.service';
import { UnitsService } from './application/units.service';
import { PropertiesController } from './presentation/properties.controller';
import { UnitsController } from './presentation/units.controller';

/**
 * Module `portfolio` : biens et lots. Propriétaire exclusif des tables
 * `properties` et `units`, et seul à calculer les indicateurs d'occupation.
 *
 * `@Global()` pour publier le port `PROPERTY_READER` que `parties` consomme
 * dans la fiche d'un bailleur, sans créer de cycle d'imports de modules.
 */
@Global()
@Module({
  controllers: [PropertiesController, UnitsController],
  providers: [
    PropertiesService,
    UnitsService,
    PortfolioDetailsService,
    { provide: PROPERTY_READER, useExisting: PropertiesService },
  ],
  exports: [PropertiesService, UnitsService, PortfolioDetailsService, PROPERTY_READER],
})
export class PortfolioModule {}
