import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { MaintenanceQueryService } from '../application/maintenance-query.service';
import {
  MaintenanceRequestsService,
  type MaintenanceCreateInput,
  type UpdateInput,
} from '../application/maintenance-requests.service';
import {
  toMaintenanceRequestView,
  toMaintenanceUpdateView,
} from '../application/maintenance-views';
import {
  ListMaintenanceQueryDto,
  MaintenanceAssignDto,
  MaintenanceCreateDto,
  MaintenanceRejectDto,
  MaintenanceUpdateInputDto,
} from './dto/maintenance.dto';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance-requests')
export class MaintenanceController {
  constructor(
    private readonly requests: MaintenanceRequestsService,
    private readonly queries: MaintenanceQueryService,
  ) {}

  @Post()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer une demande de maintenance' })
  @ApiResponse({ status: 201 })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: MaintenanceCreateDto) {
    const { request } = await this.requests.create(
      tenant.organizationId,
      tenant.userId,
      dto as unknown as MaintenanceCreateInput,
    );
    return toMaintenanceRequestView(request);
  }

  @Get()
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les demandes (COLLECTOR : celles qui lui sont affectées)' })
  @ApiResponse({ status: 200 })
  async list(@CurrentTenant() tenant: TenantContext, @Query() query: ListMaintenanceQueryDto) {
    const filters =
      tenant.role === 'COLLECTOR' ? { ...query, assignedToUserId: tenant.userId } : query;
    return this.queries.list(tenant.organizationId, tenant.userId, filters);
  }

  @Get(':id')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Détail d'une demande et de ses mises à jour" })
  @ApiResponse({ status: 200 })
  async detail(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(tenant.organizationId, tenant.userId, id);
  }

  @Post(':id/acknowledge')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Prise en compte (OPEN → ACKNOWLEDGED)' })
  @ApiResponse({ status: 200 })
  async acknowledge(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.requests.acknowledge(tenant.organizationId, tenant.userId, id);
    return toMaintenanceRequestView(row);
  }

  @Post(':id/assign')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Affectation à un démarcheur' })
  @ApiResponse({ status: 200 })
  async assign(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MaintenanceAssignDto,
  ) {
    const row = await this.requests.assign(
      tenant.organizationId,
      tenant.userId,
      id,
      dto.assignedToUserId,
    );
    return toMaintenanceRequestView(row);
  }

  @Post(':id/updates')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Ajouter une mise à jour (statut, commentaire, photo)' })
  @ApiResponse({ status: 201 })
  async addUpdate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MaintenanceUpdateInputDto,
  ) {
    const { update } = await this.requests.addUpdate(
      tenant.organizationId,
      tenant.userId,
      id,
      dto as unknown as UpdateInput,
    );
    return toMaintenanceUpdateView(update);
  }

  @Post(':id/resolve')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Résolution de l'intervention" })
  @ApiResponse({ status: 200 })
  async resolve(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    const row = await this.requests.resolve(tenant.organizationId, tenant.userId, id);
    return toMaintenanceRequestView(row);
  }

  @Post(':id/close')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Clôture de la demande' })
  @ApiResponse({ status: 200 })
  async close(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    const row = await this.requests.close(tenant.organizationId, tenant.userId, id);
    return toMaintenanceRequestView(row);
  }

  @Post(':id/reject')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Refus motivé' })
  @ApiResponse({ status: 200 })
  async reject(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MaintenanceRejectDto,
  ) {
    const row = await this.requests.reject(tenant.organizationId, tenant.userId, id, dto.reason);
    return toMaintenanceRequestView(row);
  }
}
