import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { CreateLeaseDto } from '../../leases/presentation/dto/leases.dto';
import { LeaseDto } from '../../leases/presentation/dto/lease-response.dto';
import {
  CreateInvitationDto,
  InvitationDto,
} from '../../organizations/presentation/dto/organizations.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { CreatePropertyDto } from '../../portfolio/presentation/dto/portfolio.dto';
import { PropertyDto } from '../../portfolio/presentation/dto/unit.dto';
import { GuidedOnboardingService } from '../application/guided-onboarding.service';
import { OnboardingStateDto } from './dto/onboarding.dto';

/**
 * Onboarding guidé en trois étapes (`/v1/onboarding/{orgId}/…`, contrat
 * phase 10). L'organisation figure DEUX FOIS dans la requête — l'en-tête
 * `X-Organization-Id` (RLS, vérifié par `OrganizationGuard`) et le segment
 * `{orgId}` du contrat — `assertPathMatchesOrg` refuse tout écart, sur le
 * même principe que `OrganizationGuard` pour `/organizations/:id`.
 */
@ApiTags('Onboarding guidé')
@ApiBearerAuth()
@Controller('onboarding')
export class GuidedOnboardingController {
  constructor(private readonly onboarding: GuidedOnboardingService) {}

  @Post(':orgId/first-property')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Étape 1 : premier bien',
    description: 'Délègue à `POST /v1/properties`. 409 une fois un bien déjà créé.',
  })
  @ApiResponse({ status: 201, type: PropertyDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'ONBOARDING.STEP_ALREADY_DONE' })
  async firstProperty(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreatePropertyDto,
  ): Promise<PropertyDto> {
    assertPathMatchesOrg(orgId, organizationId);
    return this.onboarding.firstProperty(
      organizationId,
      requireUser(user),
      dto,
    ) as Promise<PropertyDto>;
  }

  @Post(':orgId/first-lease')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Étape 2 : premier bail',
    description:
      'Délègue à `POST /v1/leases` (le lot et le locataire doivent déjà exister). ' +
      '409 une fois un bail déjà créé.',
  })
  @ApiResponse({ status: 201, type: LeaseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'ONBOARDING.STEP_ALREADY_DONE' })
  async firstLease(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateLeaseDto,
  ): Promise<LeaseDto> {
    assertPathMatchesOrg(orgId, organizationId);
    return this.onboarding.firstLease(organizationId, requireUser(user), dto) as Promise<LeaseDto>;
  }

  @Post(':orgId/invite')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Étape 3 : première invitation',
    description: 'Délègue à `POST /v1/organizations/{id}/invitations`. 409 une fois déjà invité.',
  })
  @ApiResponse({ status: 201, type: InvitationDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'ONBOARDING.STEP_ALREADY_DONE' })
  async invite(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationDto> {
    assertPathMatchesOrg(orgId, organizationId);
    return this.onboarding.invite(organizationId, requireUser(user), dto);
  }

  @Get(':orgId/state')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: "État d'avancement, dérivé",
    description: "Jamais stocké : recalculé à chaque lecture depuis l'existence des entités.",
  })
  @ApiResponse({ status: 200, type: OnboardingStateDto })
  async state(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<OnboardingStateDto> {
    assertPathMatchesOrg(orgId, organizationId);
    return this.onboarding.state(organizationId, requireUser(user));
  }
}

/**
 * L'organisation du chemin doit correspondre à celle de l'en-tête : sans ce
 * garde, un appelant pourrait lire l'état d'une organisation dans l'URL tout
 * en agissant, via RLS, sur celle de l'en-tête (404, jamais 403, comme
 * `OrganizationGuard` pour `/organizations/:id`).
 */
function assertPathMatchesOrg(pathOrgId: string, headerOrgId: string): void {
  if (pathOrgId !== headerOrgId) {
    throw new DomainError('ORG.NOT_MEMBER', { organizationId: pathOrgId });
  }
}
