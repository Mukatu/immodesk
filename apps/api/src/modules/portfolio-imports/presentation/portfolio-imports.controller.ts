import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { PortfolioImportsService } from '../application/portfolio-imports.service';
import {
  CreatePortfolioImportDto,
  ImportJobCreatedDto,
  ImportReportDto,
} from './dto/portfolio-imports.dto';

/**
 * Import de portefeuille (`POST /v1/portfolio-imports`,
 * `GET /v1/portfolio-imports/{jobId}`, contrat phase 10). Aucun corps
 * multipart : le CSV est téléversé au préalable par le module `documents`,
 * puis cité ici par son `documentId` (même règle qu'en phase 6 pour l'import
 * de relevé bancaire).
 */
@ApiTags('Import de portefeuille')
@ApiBearerAuth()
@Controller('portfolio-imports')
export class PortfolioImportsController {
  constructor(private readonly imports: PortfolioImportsService) {}

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Importer un portefeuille depuis un CSV déjà téléversé',
    description:
      'Traitement de fond (202 { jobId }), consultable par ' +
      'GET /v1/portfolio-imports/{jobId}. Un seul import actif par organisation.',
  })
  @ApiResponse({ status: 202, type: ImportJobCreatedDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'IMPORTS.ALREADY_RUNNING' })
  @ApiResponse({ status: 422, type: ErrorResponseDto, description: 'IMPORTS.TOO_MANY_ROWS' })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreatePortfolioImportDto,
  ): Promise<ImportJobCreatedDto> {
    return this.imports.create(organizationId, requireUser(user), dto.documentId);
  }

  @Get(':jobId')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "État et rapport d'un import" })
  @ApiResponse({ status: 200, type: ImportReportDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'IMPORTS.JOB_NOT_FOUND' })
  async job(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('jobId') jobId: string,
  ): Promise<ImportReportDto> {
    requireUser(user);
    return this.imports.jobStatus(organizationId, jobId) as Promise<ImportReportDto>;
  }
}
