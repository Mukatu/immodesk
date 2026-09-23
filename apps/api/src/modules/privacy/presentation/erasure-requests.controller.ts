import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import {
  ErasureService,
  type ErasurePreviewView,
  type ErasureReportView,
} from '../application/erasure.service';
import { SubjectRefDto } from './dto/privacy.dto';

/**
 * Effacement d'un tiers (contrat § « Effacement »). Trois routes : simulation
 * (`preview`, n'écrit rien), demande (`202 { jobId }`), et rapport
 * (`GET .../{jobId}`, propre à ce module — arbitrage 17, ce n'est pas un
 * fichier). Toutes réservées à `OWNER`.
 */
@ApiTags('Vie privée — effacement')
@ApiBearerAuth()
@Controller('privacy/erasure-requests')
export class ErasureRequestsController {
  constructor(private readonly erasure: ErasureService) {}

  @Post('preview')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Simule un effacement sans rien écrire',
    description:
      'Liste exacte de ce qui serait anonymisé, supprimé et conservé — même discipline que `dryRun` ' +
      '(phase 9). `404 PRIVACY.SUBJECT_NOT_FOUND` ; `422 PRIVACY.SUBJECT_TYPE_INVALID`.',
  })
  @ApiResponse({ status: 200, description: 'ErasurePreview' })
  async preview(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: SubjectRefDto,
  ): Promise<ErasurePreviewView> {
    return this.erasure.simulate(
      tenant.organizationId,
      tenant.userId,
      dto.subjectType,
      dto.subjectId,
    );
  }

  @Post()
  @Roles('OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Demande un effacement (recevabilité vérifiée avant toute écriture)',
    description:
      '`409 PRIVACY.ERASURE_NOT_ELIGIBLE` avec le motif dans `details` ; `409 PRIVACY.ERASURE_ALREADY_RUNNING` ' +
      'si un effacement est déjà en cours sur ce tiers. Exécution idempotente : un tiers déjà anonymisé n’est jamais réécrit.',
  })
  @ApiResponse({ status: 202, description: '{ jobId }' })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: SubjectRefDto,
  ): Promise<{ jobId: string }> {
    return this.erasure.request(
      tenant.organizationId,
      tenant.userId,
      dto.subjectType,
      dto.subjectId,
    );
  }

  @Get(':jobId')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Rapport d'un effacement de fond" })
  @ApiResponse({ status: 200, description: 'ErasureReport' })
  async report(
    @CurrentTenant() tenant: TenantContext,
    @Param('jobId') jobId: string,
  ): Promise<ErasureReportView> {
    return this.erasure.report(tenant.organizationId, jobId);
  }
}
