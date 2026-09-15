import { Module } from '@nestjs/common';
import { FeatureFlagsService } from './application/feature-flags.service';
import { InvitationsService } from './application/invitations.service';
import { MembersService } from './application/members.service';
import { OnboardingService } from './application/onboarding.service';
import { OrganizationsService } from './application/organizations.service';
import { PaymentMethodsService } from './application/payment-methods.service';
import { FeatureFlagsController } from './presentation/feature-flags.controller';
import { InvitationsController } from './presentation/invitations.controller';
import { OnboardingController } from './presentation/onboarding.controller';
import { OrganizationsController } from './presentation/organizations.controller';
import { PaymentMethodsController } from './presentation/payment-methods.controller';

/**
 * Module `organizations` : tenant SaaS, paramétrage, membres, invitations et
 * drapeaux de fonctionnalité. Propriétaire exclusif des tables
 * `organizations`, `organization_settings`, `organization_members`,
 * `invitations` et `feature_flags`.
 *
 * `OnboardingController`/`OnboardingService` (onboarding du gestionnaire
 * indépendant, docs/api/phase7-contract.md) vivent ici plutôt que dans un
 * module dédié : `parties`, `portfolio` et `mandates` sont tous `@Global()`
 * et exportent déjà `LandlordsService`/`PropertiesService`/`MandatesService`,
 * donc aucun import de module supplémentaire n'est nécessaire.
 */
@Module({
  controllers: [
    OrganizationsController,
    OnboardingController,
    InvitationsController,
    FeatureFlagsController,
    PaymentMethodsController,
  ],
  providers: [
    OrganizationsService,
    OnboardingService,
    MembersService,
    InvitationsService,
    FeatureFlagsService,
    PaymentMethodsService,
  ],
  exports: [
    OrganizationsService,
    MembersService,
    InvitationsService,
    FeatureFlagsService,
    PaymentMethodsService,
  ],
})
export class OrganizationsModule {}
