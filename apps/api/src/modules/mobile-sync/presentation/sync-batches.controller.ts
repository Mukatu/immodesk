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
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { SyncBatchesQueryService } from '../application/sync-batches-query.service';
import { SyncBatchesService } from '../application/sync-batches.service';
import { SyncBatchInputDto } from './dto/sync-batch-input.dto';
import { SyncBatchPageDto, SyncBatchResultDto } from './dto/sync-batch-response.dto';
import { ListSyncBatchesQueryDto } from './dto/sync-query.dto';

function readerOf(tenant: TenantContext): { userId: string; role: TenantContext['role'] } {
  return { userId: tenant.userId, role: tenant.role };
}

@ApiTags('Synchronisation mobile')
@ApiBearerAuth()
@Controller('sync/batches')
export class SyncBatchesController {
  constructor(
    private readonly batches: SyncBatchesService,
    private readonly queries: SyncBatchesQueryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Envoyer un lot de synchronisation',
    description:
      'Tri par dépendances puis horodatage client, une transaction par opération (réutilise le cas ' +
      'd’usage en ligne). Rejeu du même batchRef : résultat mémorisé, sans retraitement.',
  })
  @ApiResponse({ status: 200, type: SyncBatchResultDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'SYNC.BATCH_IN_PROGRESS' })
  @ApiResponse({ status: 413, type: ErrorResponseDto, description: 'SYNC.BATCH_TOO_LARGE' })
  async submit(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: SyncBatchInputDto,
  ): Promise<SyncBatchResultDto> {
    return this.batches.submit(tenant.organizationId, readerOf(tenant), {
      batchRef: dto.batchRef,
      deviceId: dto.deviceId,
      devicePlatform: dto.devicePlatform ?? null,
      appVersion: dto.appVersion ?? null,
      clientGeneratedAt: dto.clientGeneratedAt ?? null,
      offlineDurationMinutes: dto.offlineDurationMinutes ?? null,
      operations: dto.operations,
    }) as Promise<SyncBatchResultDto>;
  }

  @Get()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les lots de synchronisation' })
  @ApiResponse({ status: 200, type: SyncBatchPageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListSyncBatchesQueryDto,
  ): Promise<SyncBatchPageDto> {
    return this.queries.list(
      tenant.organizationId,
      readerOf(tenant),
      query,
    ) as Promise<SyncBatchPageDto>;
  }

  @Get(':id')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Statut d’un lot (COLLECTOR auteur, ou MANAGER)' })
  @ApiResponse({ status: 200, type: SyncBatchResultDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'SYNC.BATCH_NOT_FOUND' })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SyncBatchResultDto> {
    return this.queries.get(
      tenant.organizationId,
      readerOf(tenant),
      id,
    ) as Promise<SyncBatchResultDto>;
  }
}
