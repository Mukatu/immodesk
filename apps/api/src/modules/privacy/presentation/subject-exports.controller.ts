import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { PrivacyExportsService } from '../application/privacy-exports.service';
import { SubjectRefDto } from './dto/privacy.dto';

/**
 * `POST /v1/privacy/subject-exports` (contrat § « Export ») : réponse à une
 * demande d'accès d'un tiers, restreinte aux lignes le concernant ou le
 * citant. `404 PRIVACY.SUBJECT_NOT_FOUND` ; `422 PRIVACY.SUBJECT_TYPE_INVALID`.
 */
@ApiTags('Vie privée — export')
@ApiBearerAuth()
@Controller('privacy/subject-exports')
export class SubjectExportsController {
  constructor(private readonly exports: PrivacyExportsService) {}

  @Post()
  @Roles('OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: "Export des données d'une personne (tenant, landlord, guarantor ou user)",
  })
  @ApiResponse({ status: 202, description: '{ jobId }' })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: SubjectRefDto,
  ): Promise<{ jobId: string }> {
    return this.exports.requestSubjectExport(
      tenant.organizationId,
      tenant.userId,
      dto.subjectType,
      dto.subjectId,
    );
  }
}
