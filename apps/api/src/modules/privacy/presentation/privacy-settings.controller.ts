import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { PrivacySettingsService } from '../application/privacy-settings.service';
import type { PrivacySettings } from '../domain/privacy-settings';
import { PrivacySettingsPatchDto } from './dto/privacy.dto';

/**
 * `GET`/`PATCH /v1/organizations/{id}/privacy-settings` (contrat) :
 * `organization_settings.settings_json.privacy` (arbitrage 13). Lecture
 * ouverte à `MANAGER`, écriture réservée à `OWNER`.
 */
@ApiTags('Vie privée — paramètres')
@ApiBearerAuth()
@Controller('organizations/:id/privacy-settings')
export class PrivacySettingsController {
  constructor(private readonly settings: PrivacySettingsService) {}

  @Get()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Paramètres de conformité (durées de conservation, référent DPO)' })
  @ApiResponse({ status: 200, description: 'PrivacySettings' })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) _id: string,
  ): Promise<PrivacySettings> {
    void _id;
    return this.settings.get(tenant.organizationId, tenant.userId);
  }

  @Patch()
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Met à jour les paramètres de conformité' })
  @ApiResponse({ status: 200, description: 'PrivacySettings' })
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() dto: PrivacySettingsPatchDto,
  ): Promise<PrivacySettings> {
    void _id;
    return this.settings.update(tenant.organizationId, tenant.userId, dto);
  }
}
