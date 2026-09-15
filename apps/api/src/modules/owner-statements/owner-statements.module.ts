import { Global, Module } from '@nestjs/common';
import { PdfModule } from '../pdf/pdf.module';
import { OwnerStatementDocumentsService } from './application/owner-statement-documents.service';
import { OwnerStatementsCampaignService } from './application/owner-statements-campaign.service';
import { OwnerStatementsQueryService } from './application/owner-statements-query.service';
import { OwnerStatementsRunsService } from './application/owner-statements-runs.service';
import { OwnerStatementsService } from './application/owner-statements.service';
import { OwnerStatementDocumentsPipeline } from './infrastructure/owner-statement-documents.pipeline';
import { OwnerStatementsCronScheduler } from './infrastructure/owner-statements-cron.scheduler';
import { OwnerStatementsController } from './presentation/owner-statements.controller';

/**
 * Module `owner-statements` : relevés de gérance et leurs lignes,
 * propriétaire exclusif de `owner_statements` et `owner_statement_lines`
 * (phase 7).
 *
 * `@Global()` pour exposer `OwnerStatementsService.markPaid` au futur module
 * `owner-payouts` (pas construit) par appel direct, comme `mandates`
 * l'expose déjà pour `landlord-portal`. Importe `PdfModule` (feuille du
 * graphe, non `@Global()`) pour `FinancialPdfService` ; consomme
 * `CommissionsService` et `EXPENSE_READER` (tous deux `@Global()`), et
 * `NOTIFICATION_ENQUEUER`/`DocumentsService` (idem) sans les importer.
 */
@Global()
@Module({
  imports: [PdfModule],
  controllers: [OwnerStatementsController],
  providers: [
    OwnerStatementsService,
    OwnerStatementsQueryService,
    OwnerStatementsCampaignService,
    OwnerStatementsRunsService,
    OwnerStatementDocumentsService,
    OwnerStatementDocumentsPipeline,
    OwnerStatementsCronScheduler,
  ],
  exports: [
    OwnerStatementsService,
    OwnerStatementsQueryService,
    OwnerStatementsCampaignService,
    OwnerStatementsRunsService,
  ],
})
export class OwnerStatementsModule {}
