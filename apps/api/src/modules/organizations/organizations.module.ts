import { Module } from '@nestjs/common';
import { FeatureFlagsService } from './application/feature-flags.service';
import { InvitationsService } from './application/invitations.service';
import { MembersService } from './application/members.service';
import { OrganizationsService } from './application/organizations.service';
import { PaymentMethodsService } from './application/payment-methods.service';
import { FeatureFlagsController } from './presentation/feature-flags.controller';
import { InvitationsController } from './presentation/invitations.controller';
import { OrganizationsController } from './presentation/organizations.controller';
import { PaymentMethodsController } from './presentation/payment-methods.controller';

/**
 * Module `organizations` : tenant SaaS, paramétrage, membres, invitations et
 * drapeaux de fonctionnalité. Propriétaire exclusif des tables
 * `organizations`, `organization_settings`, `organization_members`,
 * `invitations` et `feature_flags`.
 */
@Module({
  controllers: [
    OrganizationsController,
    InvitationsController,
    FeatureFlagsController,
    PaymentMethodsController,
  ],
  providers: [
    OrganizationsService,
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
