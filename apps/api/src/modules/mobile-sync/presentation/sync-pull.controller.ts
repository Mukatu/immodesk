import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { SyncPullService } from '../application/sync-pull.service';
import { SyncPullResultDto } from './dto/sync-pull-response.dto';
import { SyncPullQueryDto } from './dto/sync-query.dto';

@ApiTags('Synchronisation mobile')
@ApiBearerAuth()
@Controller('sync')
export class SyncPullController {
  constructor(private readonly pull: SyncPullService) {}

  @Get('pull')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Télécharger le périmètre du démarcheur',
    description:
      'Strictement limité au périmètre du COLLECTOR authentifié ; un MANAGER ou un OWNER reçoit le ' +
      'périmètre complet de l’organisation. `since` reprend le `nextCursor` du dernier appel.',
  })
  @ApiResponse({ status: 200, type: SyncPullResultDto })
  async pullSince(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: SyncPullQueryDto,
  ): Promise<SyncPullResultDto> {
    return this.pull.pull(
      tenant.organizationId,
      { userId: tenant.userId, role: tenant.role },
      query,
    ) as Promise<SyncPullResultDto>;
  }
}
