import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { SyncDevicesService } from '../application/sync-devices.service';
import { DeviceStatusPageDto } from './dto/device-status.dto';

@ApiTags('Synchronisation mobile')
@ApiBearerAuth()
@Controller('sync/devices')
export class SyncDevicesController {
  constructor(private readonly devices: SyncDevicesService) {}

  @Get()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Supervision des appareils : dernière synchronisation, conflits en attente',
  })
  @ApiResponse({ status: 200, type: DeviceStatusPageDto })
  async list(@CurrentTenant() tenant: TenantContext): Promise<DeviceStatusPageDto> {
    return this.devices.list(tenant.organizationId, {
      userId: tenant.userId,
      role: tenant.role,
    }) as Promise<DeviceStatusPageDto>;
  }
}
