import { Module } from '@nestjs/common';
import { PortfolioImportsService } from './application/portfolio-imports.service';
import { IMPORT_QUEUE } from './domain/import-queue.port';
import { ImportWorker } from './infrastructure/import-worker';
import { PortfolioImportsController } from './presentation/portfolio-imports.controller';

/**
 * Module `portfolio-imports` (phase 10) : import de portefeuille depuis un
 * CSV déjà téléversé. Aucune table dédiée (contrat, arbitrage n°3) : le
 * fichier et le rapport de rejets vivent dans `documents` (genre `OTHER`),
 * exactement comme les exports de la phase 9.
 *
 * Aucun `imports` de module nécessaire : `LandlordsService`/`TenantsService`
 * (`PartiesModule`), `PropertiesService`/`UnitsService` (`PortfolioModule`),
 * `LeasesService` (`LeasesModule`) et `DocumentsService` (`DocumentsModule`)
 * sont tous `@Global()` et donc déjà injectables ici, comme le fait
 * `ReportingModule` pour `DocumentsService`.
 */
@Module({
  controllers: [PortfolioImportsController],
  providers: [
    PortfolioImportsService,
    ImportWorker,
    { provide: IMPORT_QUEUE, useExisting: ImportWorker },
  ],
  exports: [PortfolioImportsService],
})
export class PortfolioImportsModule {}
