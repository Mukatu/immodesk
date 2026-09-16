import { Global, Module } from '@nestjs/common';
import { PdfModule } from '../pdf/pdf.module';
import { InspectionActionsService } from './application/inspection-actions.service';
import { InspectionReportService } from './application/inspection-report.service';
import { InspectionsQueryService } from './application/inspections-query.service';
import { InspectionsService } from './application/inspections.service';
import { InspectionReportPipeline } from './infrastructure/inspection-report.pipeline';
import { InspectionsController } from './presentation/inspections.controller';

/**
 * Module `inspections` (phase 8) : états des lieux, postes, photos,
 * comparaison entrée/sortie, retenue sur dépôt et conversion en demande de
 * maintenance. Propriétaire exclusif de `inspections`, `inspection_items`
 * et `inspection_photos`.
 *
 * Consomme `deposits` et `maintenance` (tous deux `@Global()`) sans import de
 * module, et `PdfModule` (feuille du graphe, non `@Global()`) pour le rendu
 * du rapport — même convention que `owner-statements`.
 *
 * `@Global()` : `mobile-sync` enregistre un gestionnaire `INSPECTION` qui
 * réutilise `InspectionsService.create`, sans import de module.
 */
@Global()
@Module({
  imports: [PdfModule],
  controllers: [InspectionsController],
  providers: [
    InspectionsService,
    InspectionsQueryService,
    InspectionActionsService,
    InspectionReportService,
    InspectionReportPipeline,
  ],
  exports: [
    InspectionsService,
    InspectionsQueryService,
    InspectionActionsService,
    InspectionReportService,
  ],
})
export class InspectionsModule {}
