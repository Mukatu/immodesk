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
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { StatementImportService } from '../application/statement-import.service';
import { StatementLinesQueryService } from '../application/statement-lines-query.service';
import { StatementsQueryService } from '../application/statements-query.service';
import { DiscardStatementDto, StatementLinesQueryDto } from './dto/bank-statements.dto';

@ApiTags('Relevés bancaires')
@ApiBearerAuth()
@Controller('bank-statements')
export class BankStatementsController {
  constructor(
    private readonly importService: StatementImportService,
    private readonly queries: StatementsQueryService,
    private readonly lines: StatementLinesQueryService,
  ) {}

  @Get(':id')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Détail d'un relevé bancaire" })
  async get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.queries.get(tenant.organizationId, tenant.userId, id);
  }

  @Post(':id/discard')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Abandonner un import erroné' })
  async discard(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DiscardStatementDto,
  ) {
    return this.importService.discard(tenant.organizationId, tenant, id, dto.reason ?? null);
  }

  @Post(':id/reconcile')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rejouer le rapprochement sur les lignes non traitées' })
  async reconcile(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.importService.reconcile(tenant.organizationId, tenant, id);
    return { matched: result.matched, suggested: result.suggested, unmatched: result.unmatched };
  }

  @Get(':id/lines')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Lignes d'un relevé (filtrable par état)" })
  async listLines(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StatementLinesQueryDto,
  ) {
    return this.lines.listForStatement(tenant.organizationId, tenant.userId, id, {
      state: query.state as never,
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}
