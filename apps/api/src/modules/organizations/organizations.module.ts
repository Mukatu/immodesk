import { Module } from '@nestjs/common';
import { FeatureFlagsService } from './application/feature-flags.service';
import { InvitationsService } from './application/invitations.service';
import { MembersService } from './application/members.service';
import { OrganizationsService } from './application/organizations.service';
import { FeatureFlagsController } from './presentation/feature-flags.controller';
import { InvitationsController } from './presentation/invitations.controller';
import { OrganizationsController } from './presentation/organizations.controller';

/**
 * Module `organizations` : tenant SaaS, paramétrage, membres, invitations et
 * drapeaux de fonctionnalité. Propriétaire exclusif des tables
 * `organizations`, `organization_settings`, `organization_members`,
 * `invitations` et `feature_flags`.
 */
@Module({
  controllers: [OrganizationsController, InvitationsController, FeatureFlagsController],
  providers: [OrganizationsService, MembersService, InvitationsService, FeatureFlagsService],
  exports: [OrganizationsService, MembersService, InvitationsService, FeatureFlagsService],
})
export class OrganizationsModule {}
