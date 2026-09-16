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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { InspectionActionsService } from '../application/inspection-actions.service';
import { InspectionReportService } from '../application/inspection-report.service';
import { InspectionsQueryService } from '../application/inspections-query.service';
import { InspectionsService } from '../application/inspections.service';
import {
  toInspectionItemView,
  toInspectionPhotoView,
  toInspectionView,
} from '../application/inspection-views';
import { toMaintenanceRequestView } from '../../maintenance/application/maintenance-views';
import {
  DepositDeductionDto,
  DisputeDto,
  InspectionCreateDto,
  InspectionItemInputDto,
  InspectionItemUpdateDto,
  InspectionPhotoInputDto,
  InspectionUpdateDto,
  ListInspectionsQueryDto,
  MaintenanceConversionDto,
  SignInputDto,
} from './dto/inspections.dto';

@ApiTags('États des lieux')
@ApiBearerAuth()
@Controller()
export class InspectionsController {
  constructor(
    private readonly inspections: InspectionsService,
    private readonly queries: InspectionsQueryService,
    private readonly actions: InspectionActionsService,
    private readonly reports: InspectionReportService,
  ) {}

  @Post('inspections')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer un état des lieux (DRAFT)' })
  @ApiResponse({ status: 201 })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: InspectionCreateDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { inspection, replayed } = await this.inspections.create(
      tenant.organizationId,
      tenant.userId,
      dto,
    );
    if (replayed) res.status(HttpStatus.OK);
    return toInspectionView(inspection);
  }

  @Get('inspections')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les états des lieux' })
  @ApiResponse({ status: 200 })
  async list(@CurrentTenant() tenant: TenantContext, @Query() query: ListInspectionsQueryDto) {
    return this.queries.list(tenant.organizationId, tenant.userId, query);
  }

  @Get('inspections/:id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Détail d'un état des lieux et de ses postes" })
  @ApiResponse({ status: 200 })
  async detail(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(tenant.organizationId, tenant.userId, id);
  }

  @Patch('inspections/:id')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier un état des lieux non verrouillé' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 409, description: 'INSPECTIONS.LOCKED' })
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InspectionUpdateDto,
  ) {
    const row = await this.inspections.update(tenant.organizationId, tenant.userId, id, dto);
    return toInspectionView(row);
  }

  @Post('inspections/:id/items')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Ajouter un poste constaté' })
  @ApiResponse({ status: 201 })
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InspectionItemInputDto,
  ) {
    const item = await this.inspections.addItem(
      tenant.organizationId,
      tenant.userId,
      id,
      dto as never,
    );
    return toInspectionItemView(item);
  }

  @Patch('inspections/:id/items/:itemId')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier un poste' })
  @ApiResponse({ status: 200 })
  async updateItem(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: InspectionItemUpdateDto,
  ) {
    const item = await this.inspections.updateItem(
      tenant.organizationId,
      tenant.userId,
      id,
      itemId,
      dto as never,
    );
    return toInspectionItemView(item);
  }

  @Delete('inspections/:id/items/:itemId')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Supprimer un poste' })
  @ApiResponse({ status: 204 })
  async deleteItem(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.inspections.deleteItem(tenant.organizationId, tenant.userId, id, itemId);
  }

  @Post('inspections/:id/items/:itemId/photos')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Attacher une photo à un poste' })
  @ApiResponse({ status: 201 })
  async addPhoto(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: InspectionPhotoInputDto,
  ) {
    const photo = await this.inspections.addPhoto(tenant.organizationId, tenant.userId, id, {
      ...dto,
      inspectionItemId: itemId,
    });
    return toInspectionPhotoView(photo);
  }

  @Post('inspections/:id/sign')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Enregistrer les signatures et verrouiller' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 422, description: 'INSPECTIONS.PHOTO_REQUIRED' })
  async sign(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignInputDto,
  ) {
    const row = await this.inspections.sign(
      tenant.organizationId,
      { userId: tenant.userId, role: tenant.role },
      id,
      dto,
    );
    return toInspectionView(row);
  }

  @Post('inspections/:id/dispute')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Contester (motif obligatoire)' })
  @ApiResponse({ status: 200 })
  async dispute(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisputeDto,
  ) {
    const row = await this.inspections.dispute(
      tenant.organizationId,
      tenant.userId,
      id,
      dto.reason,
    );
    return toInspectionView(row);
  }

  @Post('inspections/:id/cancel')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Annuler' })
  @ApiResponse({ status: 200 })
  async cancel(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    const row = await this.inspections.cancel(tenant.organizationId, tenant.userId, id);
    return toInspectionView(row);
  }

  @Get('inspections/:id/pdf')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'URL signée du rapport PDF' })
  @ApiResponse({ status: 200 })
  async pdf(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.reports.downloadUrl(tenant.organizationId, tenant.userId, id);
  }

  @Get('units/:id/inspections/compare')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Comparaison entrée/sortie poste par poste' })
  @ApiResponse({ status: 200 })
  async compare(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.queries.compare(tenant.organizationId, tenant.userId, id);
  }

  @Post('inspections/:id/items/:itemId/deposit-deduction')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Retenue sur dépôt de garantie' })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 409,
    description: 'INSPECTIONS.DEDUCTION_ALREADY_APPLIED, DEPOSITS.INSUFFICIENT_BALANCE',
  })
  async depositDeduction(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: DepositDeductionDto,
  ) {
    return this.actions.applyDepositDeduction(
      tenant.organizationId,
      tenant.userId,
      id,
      itemId,
      dto,
    );
  }

  @Post('inspections/:id/items/:itemId/maintenance-request')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Convertir un poste en demande de maintenance' })
  @ApiResponse({ status: 201 })
  async convertToMaintenance(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: MaintenanceConversionDto,
  ) {
    const request = await this.actions.convertToMaintenance(
      tenant.organizationId,
      tenant.userId,
      id,
      itemId,
      dto,
    );
    return toMaintenanceRequestView(request);
  }
}
