import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { GuidedOnboardingService } from './application/guided-onboarding.service';
import { GuidedOnboardingController } from './presentation/guided-onboarding.controller';

/**
 * Module `onboarding` (phase 10) : assistant guidé en trois étapes idempotentes
 * et reprenables (premier bien, premier bail, première invitation), plus
 * l'état d'avancement DÉRIVÉ (`GET /v1/onboarding/{orgId}/state`, jamais
 * stocké). Voir docs/api/phase10-contract.md, section « Onboarding guidé ».
 *
 * Ne porte AUCUNE table ni logique de création propre : chaque étape délègue
 * au module compétent — `PropertiesService` (`PortfolioModule`, `@Global()`)
 * et `LeasesService` (`LeasesModule`, `@Global()`) sont donc injectés sans
 * import explicite, tandis que `InvitationsService` exige `imports:
 * [OrganizationsModule]`, ce module n'étant PAS global.
 *
 * À ne pas confondre avec `OnboardingService`/`OnboardingController` du
 * module `organizations` (`/organizations/independent-manager/onboarding`,
 * phase 7) : un assistant disjoint, pour un périmètre disjoint.
 */
@Module({
  imports: [OrganizationsModule],
  controllers: [GuidedOnboardingController],
  providers: [GuidedOnboardingService],
})
export class OnboardingModule {}
