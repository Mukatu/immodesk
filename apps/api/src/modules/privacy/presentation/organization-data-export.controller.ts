import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { PrivacyExportsService } from '../application/privacy-exports.service';

/**
 * `POST /v1/organizations/{id}/data-export` (contrat § « Export »,
 * arbitrage 17) : réversibilité complète d'une organisation, réservée à
 * `OWNER`, un seul export concurrent. Suivi par `GET /v1/exports/jobs/{jobId}`
 * (phase 9) — voir la note du rapport final sur la file dédiée.
 */
@ApiTags('Vie privée — export')
@ApiBearerAuth()
@Controller('organizations/:id/data-export')
export class OrganizationDataExportController {
  constructor(private readonly exports: PrivacyExportsService) {}

  @Post()
  @Roles('OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: "Export de réversibilité de l'organisation",
    description:
      'Tout ce que porte `organization_id` (tables métier, journaux, documents), archivé en ZIP ' +
      '(un CSV par table + `manifest.json`). `202 { jobId }` ; `409 PRIVACY.EXPORT_ALREADY_RUNNING` ' +
      'si un export est déjà en cours pour cette organisation.',
  })
  @ApiResponse({ status: 202, description: '{ jobId }' })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) _id: string,
  ): Promise<{ jobId: string }> {
    void _id;
    return this.exports.requestOrganizationExport(tenant.organizationId, tenant.userId);
  }
}
