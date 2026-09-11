import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { LeaseDetailsService } from '../application/lease-details.service';
import { LeaseLifecycleService } from '../application/lease-lifecycle.service';
import { LeasesService } from '../application/leases.service';
import { RentRevisionsService } from '../application/rent-revisions.service';
import { toLeaseView } from '../application/lease-views';
import {
  ActivateLeaseDto,
  CancelLeaseDto,
  CreateRentRevisionDto,
  LeaseEffectDto,
  RentAtQueryDto,
} from './dto/lease-actions.dto';
import { CreateLeaseDto, ListLeasesQueryDto, UpdateLeaseDto } from './dto/leases.dto';
import {
  LeaseDetailDto,
  LeaseDto,
  LeasePageDto,
  RentAtDto,
  RentRevisionDto,
  RentRevisionListDto,
} from './dto/lease-response.dto';

@ApiTags('Baux')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
  constructor(
    private readonly leases: LeasesService,
    private readonly lifecycle: LeaseLifecycleService,
    private readonly details: LeaseDetailsService,
    private readonly revisions: RentRevisionsService,
  ) {}

  @Post()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Créer un bail (brouillon)',
    description:
      'La référence `BAIL-{AAAA}-{seq}` n’est attribuée qu’à l’activation : un brouillon ne ' +
      'consomme pas de numéro de la série.',
  })
  @ApiResponse({ status: 201, type: LeaseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'LEASES.UNIT_NOT_AVAILABLE' })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateLeaseDto,
  ): Promise<LeaseDto> {
    return this.leases.create(organizationId, requireUser(user), dto) as Promise<LeaseDto>;
  }

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les baux' })
  @ApiResponse({ status: 200, type: LeasePageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListLeasesQueryDto,
  ): Promise<LeasePageDto> {
    return this.leases.list(organizationId, requireUser(user), query) as Promise<LeasePageDto>;
  }

  @Get(':id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Fiche complète : parties, révisions, dépôt, documents' })
  @ApiResponse({ status: 200, type: LeaseDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'LEASES.NOT_FOUND' })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LeaseDetailDto> {
    return this.details.detail(organizationId, requireUser(user), id) as Promise<LeaseDetailDto>;
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Modifier un bail',
    description:
      'Tout est ouvert en DRAFT et PENDING_SIGNATURE. Après activation, seuls `notes`, ' +
      '`collectorUserId`, `preferredPaymentMethod`, `noticeDays`, `autoRenew` et `endDate` ' +
      'restent modifiables : 409 `LEASES.NOT_EDITABLE` sinon.',
  })
  @ApiResponse({ status: 200, type: LeaseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'LEASES.NOT_EDITABLE' })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaseDto,
  ): Promise<LeaseDto> {
    return this.leases.update(organizationId, requireUser(user), id, dto) as Promise<LeaseDto>;
  }

  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Supprimer un bail (logique, DRAFT ou CANCELLED seulement)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'LEASES.NOT_DELETABLE' })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.leases.softDelete(organizationId, requireUser(user), id);
  }

  @Post(':id/activate')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Activer le bail',
    description:
      'Transaction unique : bail ACTIVE, lot OCCUPIED, référence attribuée, locataire principal ' +
      'ajouté aux parties, dépôt de garantie créé. Tout échoue ou rien n’est écrit.',
  })
  @ApiResponse({ status: 200, type: LeaseDetailDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'LEASES.INVALID_TRANSITION, LEASES.UNIT_NOT_AVAILABLE, LEASES.OVERLAP',
  })
  async activate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateLeaseDto,
  ): Promise<LeaseDetailDto> {
    const userId = requireUser(user);
    await this.lifecycle.activate(organizationId, userId, id, dto);
    return this.details.detail(organizationId, userId, id) as Promise<LeaseDetailDto>;
  }

  @Post(':id/cancel')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Annuler un bail non encore actif' })
  @ApiResponse({ status: 200, type: LeaseDto })
  async cancel(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelLeaseDto,
  ): Promise<LeaseDto> {
    const row = await this.lifecycle.cancel(organizationId, requireUser(user), id, dto.reason);
    return toLeaseView(row) as LeaseDto;
  }

  @Post(':id/notice')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Déposer un préavis à effet futur' })
  @ApiResponse({ status: 200, type: LeaseDto })
  async notice(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LeaseEffectDto,
  ): Promise<LeaseDto> {
    const row = await this.lifecycle.giveNotice(organizationId, requireUser(user), id, dto);
    return toLeaseView(row) as LeaseDto;
  }

  @Post(':id/terminate')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Résilier le bail et ouvrir la restitution du dépôt' })
  @ApiResponse({ status: 200, type: LeaseDetailDto })
  async terminate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LeaseEffectDto,
  ): Promise<LeaseDetailDto> {
    const userId = requireUser(user);
    await this.lifecycle.terminate(organizationId, userId, id, dto);
    return this.details.detail(organizationId, userId, id) as Promise<LeaseDetailDto>;
  }

  @Get(':id/rent-revisions')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Historique des révisions de loyer' })
  @ApiResponse({ status: 200, type: RentRevisionListDto })
  async listRevisions(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RentRevisionListDto> {
    return { items: (await this.revisions.list(organizationId, requireUser(user), id)) as never };
  }

  @Post(':id/rent-revisions')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Enregistrer une révision de loyer datée' })
  @ApiResponse({ status: 201, type: RentRevisionDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'LEASES.REVISION_DATE_INVALID',
  })
  async createRevision(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRentRevisionDto,
  ): Promise<RentRevisionDto> {
    return this.revisions.create(
      organizationId,
      requireUser(user),
      id,
      dto,
    ) as Promise<RentRevisionDto>;
  }

  @Get(':id/rent-at')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Loyer applicable à une date donnée' })
  @ApiResponse({ status: 200, type: RentAtDto })
  async rentAt(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RentAtQueryDto,
  ): Promise<RentAtDto> {
    return this.revisions.rentAtDate(
      organizationId,
      requireUser(user),
      id,
      query.date,
    ) as Promise<RentAtDto>;
  }
}
