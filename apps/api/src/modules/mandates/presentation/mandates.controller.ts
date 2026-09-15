import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { MandatesQueryService } from '../application/mandates-query.service';
import {
  MandatesService,
  type MandateInput,
  type MandateUpdateInput,
} from '../application/mandates.service';
import {
  AttachPropertiesDto,
  LandlordInvitationResponseDto,
  ListMandatesQueryDto,
  MandateDetailDto,
  MandateDto,
  MandateInputDto,
  MandatePageDto,
  MandateUpdateDto,
  SuspendMandateDto,
  TerminateMandateDto,
} from './dto/mandates.dto';

@ApiTags('Mandats de gestion')
@ApiBearerAuth()
@Controller('management-mandates')
export class MandatesController {
  constructor(
    private readonly mandates: MandatesService,
    private readonly queries: MandatesQueryService,
  ) {}

  @Post()
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer un mandat de gestion (statut initial DRAFT)' })
  @ApiResponse({ status: 201, type: MandateDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PARTIES.LANDLORD_NOT_FOUND' })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: MandateInputDto,
  ): Promise<MandateDto> {
    return this.mandates.create(
      organizationId,
      requireUser(user),
      dto as unknown as MandateInput,
    ) as Promise<MandateDto>;
  }

  @Get()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les mandats de gestion' })
  @ApiResponse({ status: 200, type: MandatePageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListMandatesQueryDto,
  ): Promise<MandatePageDto> {
    return this.queries.list(organizationId, requireUser(user), query) as Promise<MandatePageDto>;
  }

  @Get(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Fiche détaillée d’un mandat' })
  @ApiResponse({ status: 200, type: MandateDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'AGENCY.MANDATE_NOT_FOUND' })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MandateDetailDto> {
    return this.queries.get(organizationId, requireUser(user), id) as Promise<MandateDetailDto>;
  }

  @Patch(':id')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier le périmètre ou la commission d’un mandat' })
  @ApiResponse({ status: 200, type: MandateDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'AGENCY.MANDATE_INVALID_TRANSITION',
  })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MandateUpdateDto,
  ): Promise<MandateDto> {
    return this.mandates.update(
      organizationId,
      requireUser(user),
      id,
      dto as unknown as MandateUpdateInput,
    ) as Promise<MandateDto>;
  }

  @Post(':id/activate')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Activer un mandat DRAFT (contrôle « un bien, un mandat actif »)' })
  @ApiResponse({ status: 200, type: MandateDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'AGENCY.PROPERTY_ALREADY_MANDATED, AGENCY.MANDATE_INVALID_TRANSITION',
  })
  async activate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MandateDto> {
    return this.mandates.activate(organizationId, requireUser(user), id) as Promise<MandateDto>;
  }

  @Post(':id/suspend')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Suspendre un mandat ACTIVE (motif obligatoire)' })
  @ApiResponse({ status: 200, type: MandateDto })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'AGENCY.MANDATE_REASON_REQUIRED',
  })
  async suspend(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendMandateDto,
  ): Promise<MandateDto> {
    return this.mandates.suspend(
      organizationId,
      requireUser(user),
      id,
      dto.reason,
    ) as Promise<MandateDto>;
  }

  @Post(':id/terminate')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Résilier un mandat ACTIVE ou SUSPENDED (date d’effet et motif obligatoires)',
  })
  @ApiResponse({ status: 200, type: MandateDto })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'AGENCY.MANDATE_TERMINATION_DATE_REQUIRED, AGENCY.MANDATE_REASON_REQUIRED',
  })
  async terminate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TerminateMandateDto,
  ): Promise<MandateDto> {
    return this.mandates.terminate(
      organizationId,
      requireUser(user),
      id,
      dto.effectiveDate,
      dto.reason,
    ) as Promise<MandateDto>;
  }

  @Post(':id/properties')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rattacher un ou plusieurs biens supplémentaires au mandat' })
  @ApiResponse({ status: 200, type: MandateDetailDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'AGENCY.PROPERTY_ALREADY_MANDATED',
  })
  async attachProperties(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachPropertiesDto,
  ): Promise<MandateDetailDto> {
    const userId = requireUser(user);
    await this.mandates.attachProperties(organizationId, userId, id, dto.propertyIds);
    return this.queries.get(organizationId, userId, id) as Promise<MandateDetailDto>;
  }

  @Post(':id/landlord-invitation')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Inviter le bailleur au portail (lien WhatsApp, repli SMS)',
    description:
      'Implémenté directement par `mandates` (voir `domain/ports.ts`, MANDATE_LANDLORD_INVITER) : ' +
      'l’activation par OTP et la création du compte `users` restent portées par `landlord-portal`.',
  })
  @ApiResponse({ status: 202, type: LandlordInvitationResponseDto })
  async sendInvitation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LandlordInvitationResponseDto> {
    return this.mandates.sendInvitation(organizationId, requireUser(user), id);
  }
}
