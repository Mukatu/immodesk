import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { SyncConflictResolutionService } from '../application/sync-conflict-resolution.service';
import { SyncConflictsService } from '../application/sync-conflicts.service';
import {
  ResolveConflictDto,
  ResolveConflictResponseDto,
  SyncConflictPageDto,
} from './dto/sync-conflict.dto';
import { ListSyncConflictsQueryDto } from './dto/sync-query.dto';

@ApiTags('Synchronisation mobile')
@ApiBearerAuth()
@Controller('sync/conflicts')
export class SyncConflictsController {
  constructor(
    private readonly conflicts: SyncConflictsService,
    private readonly resolution: SyncConflictResolutionService,
  ) {}

  @Get()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les conflits de synchronisation' })
  @ApiResponse({ status: 200, type: SyncConflictPageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListSyncConflictsQueryDto,
  ): Promise<SyncConflictPageDto> {
    return this.conflicts.list(
      tenant.organizationId,
      { userId: tenant.userId, role: tenant.role },
      query,
    ) as Promise<SyncConflictPageDto>;
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Résoudre un conflit',
    description:
      'APPLY rejoue l’opération avec le clientRef d’origine (corrections facultatives) ; DISCARD ' +
      'exige un motif. Écrit dans audit_logs et met à jour sync_batches.result.',
  })
  @ApiResponse({ status: 200, type: ResolveConflictResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'SYNC.CONFLICT_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'SYNC.CONFLICT_ALREADY_RESOLVED',
  })
  @ApiResponse({ status: 422, type: ErrorResponseDto, description: 'SYNC.DISCARD_REASON_REQUIRED' })
  async resolve(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: ResolveConflictDto,
  ): Promise<ResolveConflictResponseDto> {
    const decision =
      dto.decision === 'DISCARD'
        ? ({ decision: 'DISCARD', reason: dto.reason ?? '' } as const)
        : ({ decision: 'APPLY', overrides: dto.overrides, reason: dto.reason } as const);
    return this.resolution.resolve(
      tenant.organizationId,
      { userId: tenant.userId, role: tenant.role },
      id,
      decision,
    ) as Promise<ResolveConflictResponseDto>;
  }
}
