import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EXPORT_STATUS_FALLBACKS } from '../../shared/exports/export-status-fallback.port';
import { TenantPortalModule } from '../tenant-portal/tenant-portal.module';
import { EligibilityService } from './application/eligibility.service';
import { ErasureExecutionService } from './application/erasure-execution.service';
import { ErasureJobRunnerService } from './application/erasure-job-runner.service';
import { ErasurePreviewService } from './application/erasure-preview.service';
import { ErasureService } from './application/erasure.service';
import { ErasureSideEffectsService } from './application/erasure-side-effects.service';
import { OrgExportService } from './application/org-export.service';
import { PrivacyExportBuilderService } from './application/privacy-export-builder.service';
import { PrivacyExportsService } from './application/privacy-exports.service';
import { PrivacySettingsService } from './application/privacy-settings.service';
import { ProcessingRegisterService } from './application/processing-register.service';
import { SubjectExportService } from './application/subject-export.service';
import { TenantPrivacyActionsService } from './application/tenant-privacy-actions.service';
import { TenantPrivacyService } from './application/tenant-privacy.service';
import { ERASURE_QUEUE } from './domain/erasure-queue.port';
import { PRIVACY_EXPORT_QUEUE } from './domain/privacy-export-queue.port';
import { TenantConsentGuard } from './presentation/tenant-consent.guard';
import { ErasureWorker } from './infrastructure/erasure-worker';
import { PrivacyExportWorker } from './infrastructure/privacy-export-worker';
import { ErasureRequestsController } from './presentation/erasure-requests.controller';
import { OrganizationDataExportController } from './presentation/organization-data-export.controller';
import { PrivacySettingsController } from './presentation/privacy-settings.controller';
import { ProcessingRegisterController } from './presentation/processing-register.controller';
import { SubjectExportsController } from './presentation/subject-exports.controller';
import { TenantPrivacyController } from './presentation/tenant-privacy.controller';

/**
 * Module `privacy` (phase 11.D, contrat `docs/api/phase11-contract.md`) :
 * conformité des données personnelles. Aucune table nouvelle — appuyé sur
 * `tenants`/`landlords`/`guarantors`, `contact_channels`, `documents`,
 * `notifications`, `message_logs`, `organization_settings.settings_json.privacy`
 * et `audit_logs`. Deux files BullMQ dédiées (effacements, exports),
 * construites comme celles de la phase 9 — voir le rapport de l'agent pour la
 * justification de ne pas réutiliser directement `reporting-exports`.
 *
 * `parties`, `documents`, `audit`, `notifications` et `AppConfigModule` sont
 * `@Global()` : aucun import n'est nécessaire ici pour leurs providers.
 * `TenantPortalModule` NE l'est PAS (comme documenté dans son propre module) :
 * importé explicitement pour `TenantPortalGuard`.
 *
 * À déclarer dans `app.module.ts` par le propriétaire du dépôt (hors
 * périmètre de cet agent, comme pour `ReportingModule`).
 */
// `@Global()` : le jeton de repli ci-dessous doit etre resoluble depuis
// `reporting`, SANS que `reporting` n importe `privacy` (le sens de dependance
// resterait faux). Voir `shared/exports/export-status-fallback.port.ts`.
@Global()
@Module({
  imports: [TenantPortalModule],
  controllers: [
    OrganizationDataExportController,
    SubjectExportsController,
    ErasureRequestsController,
    ProcessingRegisterController,
    PrivacySettingsController,
    TenantPrivacyController,
  ],
  providers: [
    EligibilityService,
    ErasureExecutionService,
    ErasureSideEffectsService,
    ErasurePreviewService,
    ErasureService,
    ErasureJobRunnerService,
    ErasureWorker,
    { provide: ERASURE_QUEUE, useExisting: ErasureWorker },
    OrgExportService,
    SubjectExportService,
    PrivacyExportBuilderService,
    PrivacyExportsService,
    PrivacyExportWorker,
    { provide: PRIVACY_EXPORT_QUEUE, useExisting: PrivacyExportWorker },
    PrivacySettingsService,
    ProcessingRegisterService,
    TenantPrivacyService,
    TenantPrivacyActionsService,
    // Garde TRANSVERSAL : refuse toute ecriture du portail locataire tant que
    // les mentions legales courantes ne sont pas acceptees. Declare ici en
    // `APP_GUARD` (Nest les collecte depuis n importe quel module) plutot que
    // dans `app.module.ts` : la regle appartient au domaine de la conformite.
    { provide: APP_GUARD, useClass: TenantConsentGuard },
    {
      provide: EXPORT_STATUS_FALLBACKS,
      useFactory: (worker: PrivacyExportWorker) => [worker],
      inject: [PrivacyExportWorker],
    },
  ],
  exports: [ErasureService, PrivacyExportsService, PrivacySettingsService, EXPORT_STATUS_FALLBACKS],
})
export class PrivacyModule {}
