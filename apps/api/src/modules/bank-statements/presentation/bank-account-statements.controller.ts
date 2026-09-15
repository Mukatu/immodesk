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
import { StatementsQueryService } from '../application/statements-query.service';
import { ImportStatementDto, PageQueryDto } from './dto/bank-statements.dto';

@ApiTags('Relevés bancaires')
@ApiBearerAuth()
@Controller('bank-accounts/:bankAccountId/statements')
export class BankAccountStatementsController {
  constructor(
    private readonly importService: StatementImportService,
    private readonly queries: StatementsQueryService,
  ) {}

  @Post('import')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Importer un relevé bancaire (CSV ou MT940)' })
  async import(
    @CurrentTenant() tenant: TenantContext,
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Body() dto: ImportStatementDto,
  ) {
    return this.importService.import(tenant.organizationId, tenant, bankAccountId, {
      documentId: dto.documentId,
      format: dto.format,
    });
  }

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Lister les relevés importés d'un compte bancaire" })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Query() query: PageQueryDto,
  ) {
    return this.queries.list(tenant.organizationId, tenant.userId, bankAccountId, query);
  }
}
