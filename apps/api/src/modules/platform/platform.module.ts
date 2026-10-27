import { Global, Module } from '@nestjs/common';
import { PlatformAdminGuard } from '../../shared/platform-admin/platform-admin.guard';
import { FeatureFlagsAdminService } from './application/feature-flags-admin.service';
import { GoLiveService } from './application/go-live.service';
import { HealthService } from './application/health.service';
import { IdempotencyService } from './application/idempotency.service';
import { IncidentsService } from './application/incidents.service';
import { LegalService } from './application/legal.service';
import { ReadinessService } from './application/readiness.service';
import { ReadOnlyModeService } from './application/read-only-mode.service';
import { StatusService } from './application/status.service';
import { LegalContentProvider } from './infrastructure/legal-content';
import { PlatformFlagsRepository } from './infrastructure/platform-flags.repository';
import { HealthController } from './presentation/health.controller';
import { IdempotencyInterceptor } from './presentation/idempotency.interceptor';
import { PlatformAdminController } from './presentation/platform-admin.controller';
import { PlatformPublicController } from './presentation/platform-public.controller';

/**
 * Module `platform` : santé, configuration, idempotence, génération du
 * contrat OpenAPI, et — phase 11 — bascule en lecture seule, drapeaux de
 * plateforme, go-live par vagues, incidents et page de statut publique.
 * Propriétaire de la table `idempotency_keys`.
 */
@Global()
@Module({
  controllers: [HealthController, PlatformPublicController, PlatformAdminController],
  providers: [
    HealthService,
    IdempotencyService,
    IdempotencyInterceptor,
    ReadinessService,
    LegalContentProvider,
    LegalService,
    PlatformFlagsRepository,
    ReadOnlyModeService,
    FeatureFlagsAdminService,
    GoLiveService,
    IncidentsService,
    StatusService,
    PlatformAdminGuard,
  ],
  exports: [HealthService, IdempotencyService, IdempotencyInterceptor],
})
export class PlatformModule {}
