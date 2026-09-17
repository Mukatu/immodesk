import { Module } from '@nestjs/common';
import { ArrearsDashboardService } from './application/arrears-dashboard.service';
import { CollectionRateDashboardService } from './application/collection-rate-dashboard.service';
import { ExportsService } from './application/exports.service';
import { PaymentMethodsDashboardService } from './application/payment-methods-dashboard.service';
import { VacancyDashboardService } from './application/vacancy-dashboard.service';
import { EXPORT_QUEUE } from './domain/export-queue.port';
import { ExportWorker } from './infrastructure/export-worker';
import { DashboardsController } from './presentation/dashboards.controller';
import { ExportsController } from './presentation/exports.controller';

/**
 * Module `reporting` (phase 9) : quatre tableaux de bord en lecture seule et
 * les exports CSV. Aucune table nouvelle — appuyé sur les vues existantes
 * (`v_unpaid_invoices`) et sur `documents` (genre `OTHER`) pour les fichiers
 * produits. Ne dépend PAS de `dunning` ni de `billing` par import de module
 * (seule la constante `PAYMENT_METHODS`, exportée en TypeScript simple par
 * `billing/application/billing-dashboard.service.ts`, est réutilisée — voir
 * le commentaire de `PaymentMethodsDashboardService`).
 *
 * À déclarer dans `app.module.ts` par le propriétaire du dépôt (hors
 * périmètre de cet agent). `EXPORT_SYNC_ROW_LIMIT` et
 * `EXPORT_LINK_TTL_SECONDS` sont déjà dans `config.schema.ts`.
 */
@Module({
  controllers: [DashboardsController, ExportsController],
  providers: [
    CollectionRateDashboardService,
    ArrearsDashboardService,
    VacancyDashboardService,
    PaymentMethodsDashboardService,
    ExportsService,
    ExportWorker,
    { provide: EXPORT_QUEUE, useExisting: ExportWorker },
  ],
  exports: [
    CollectionRateDashboardService,
    ArrearsDashboardService,
    VacancyDashboardService,
    PaymentMethodsDashboardService,
    ExportsService,
  ],
})
export class ReportingModule {}
