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
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { OwnerStatementDocumentsService } from '../application/owner-statement-documents.service';
import { OwnerStatementsQueryService } from '../application/owner-statements-query.service';
import { OwnerStatementsRunsService } from '../application/owner-statements-runs.service';
import { OwnerStatementsService } from '../application/owner-statements.service';
import {
  CancelStatementDto,
  ListOwnerStatementsQueryDto,
  PdfDownloadDto,
  RunStartedDto,
  RunStatusDto,
  StartOwnerStatementRunDto,
  StatementDetailDto,
  StatementPageDto,
} from './dto/owner-statements.dto';

@ApiTags('Relevés de gérance')
@ApiBearerAuth()
@Controller('owner-statements')
export class OwnerStatementsController {
  constructor(
    private readonly statements: OwnerStatementsService,
    private readonly queries: OwnerStatementsQueryService,
    private readonly runs: OwnerStatementsRunsService,
    private readonly documents: OwnerStatementDocumentsService,
  ) {}

  @Post('runs')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Lancer la campagne mensuelle de relevés',
    description: 'Même logique que le cron `agency-monthly`, pour l’organisation courante.',
  })
  @ApiResponse({ status: 202, type: RunStartedDto })
  async startRun(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: StartOwnerStatementRunDto,
  ): Promise<RunStartedDto> {
    return this.runs.start(organizationId, requireUser(user), { period: dto.period });
  }

  @Get('runs/:runId')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rapport d’une campagne de relevés' })
  @ApiResponse({ status: 200, type: RunStatusDto })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description: 'AGENCY.STATEMENT_RUN_NOT_FOUND',
  })
  async getRun(
    @CurrentOrganizationId() organizationId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
  ): Promise<RunStatusDto> {
    const report = await this.runs.get(organizationId, runId);
    return {
      status: report.status,
      created: report.created,
      skipped: report.skipped,
      errors: report.errors,
    };
  }

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les relevés de gérance' })
  @ApiResponse({ status: 200, type: StatementPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListOwnerStatementsQueryDto,
  ): Promise<StatementPageDto> {
    return this.queries.list(
      organizationId,
      requireUser(user),
      query,
    ) as unknown as Promise<StatementPageDto>;
  }

  @Get(':id')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Fiche détaillée d’un relevé (avec ses lignes)' })
  @ApiResponse({ status: 200, type: StatementDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'AGENCY.STATEMENT_NOT_FOUND' })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StatementDetailDto> {
    return this.queries.get(
      organizationId,
      requireUser(user),
      id,
    ) as unknown as Promise<StatementDetailDto>;
  }

  @Post(':id/issue')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Valider un relevé DRAFT (numéro figé, PDF et envoi en file)' })
  @ApiResponse({ status: 200, type: StatementDetailDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'AGENCY.STATEMENT_NOT_ISSUABLE',
  })
  async issue(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StatementDetailDto> {
    const userId = requireUser(user);
    await this.statements.issue(organizationId, userId, id);
    return this.queries.get(organizationId, userId, id) as unknown as Promise<StatementDetailDto>;
  }

  @Post(':id/cancel')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Annuler un relevé DRAFT ou ISSUED (motif obligatoire)' })
  @ApiResponse({ status: 200, type: StatementDetailDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'AGENCY.STATEMENT_NOT_CANCELLABLE',
  })
  async cancel(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelStatementDto,
  ): Promise<StatementDetailDto> {
    const userId = requireUser(user);
    await this.statements.cancel(organizationId, userId, id, dto.reason);
    return this.queries.get(organizationId, userId, id) as unknown as Promise<StatementDetailDto>;
  }

  @Get(':id/pdf')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'URL signée du PDF du relevé (généré à la demande au besoin)' })
  @ApiResponse({ status: 200, type: PdfDownloadDto })
  @ApiResponse({
    status: 503,
    type: ErrorResponseDto,
    description: 'AGENCY.STATEMENT_PDF_UNAVAILABLE',
  })
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PdfDownloadDto> {
    return this.documents.statementPdf(organizationId, requireUser(user), id);
  }
}
