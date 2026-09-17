import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import {
  ExportsService,
  type ExportJobStatusView,
  type ExportOutcome,
} from '../application/exports.service';
import { ExportRequestDto } from './dto/reporting.dto';

/**
 * Exports CSV (`POST /v1/exports/{kind}`, `GET /v1/exports/jobs/{jobId}`,
 * contrat phase 9). Réponse `201` synchrone jusqu'à `EXPORT_SYNC_ROW_LIMIT`
 * lignes, `202` avec `jobId` au-delà — même pattern de statut dynamique que
 * `CashReceiptsController.create` (`@Res({ passthrough: true })`).
 */
@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Post(':kind')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Exporter en CSV (invoices, payments, arrears, dashboard)',
    description:
      'Synchrone jusqu’au seuil configuré (201) ; au-delà, un travail de fond est mis en ' +
      'file (202 { jobId }), consultable par GET /v1/exports/jobs/{jobId}.',
  })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Param('kind') kind: string,
    @Body() dto: ExportRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ExportOutcome> {
    const outcome = await this.exports.create(tenant.organizationId, tenant.userId, kind, dto);
    if (!outcome.sync) res.status(HttpStatus.ACCEPTED);
    return outcome;
  }

  @Get('jobs/:jobId')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "État d'un export de fond" })
  async job(
    @CurrentTenant() tenant: TenantContext,
    @Param('jobId') jobId: string,
  ): Promise<ExportJobStatusView> {
    return this.exports.jobStatus(tenant.organizationId, jobId);
  }
}
