import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { StatementLinesQueryService } from '../application/statement-lines-query.service';
import { GlobalLinesQueryDto, PatchStatementLineDto } from './dto/bank-statements.dto';

/**
 * Contrôleur GLOBAL des lignes de relevé, toutes banques et tous relevés
 * confondus. Ne déclare QUE `GET /` et `PATCH /:id` : le futur
 * `LineSuggestionsController` (lot 3) vivra sous le même préfixe
 * `bank-statement-lines` avec `GET :id/suggestions`, sans jamais entrer en
 * collision avec ce contrôleur.
 */
@ApiTags('Lignes de relevé')
@ApiBearerAuth()
@Controller('bank-statement-lines')
export class BankStatementLinesController {
  constructor(private readonly lines: StatementLinesQueryService) {}

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'File globale des lignes de relevé, tous comptes confondus' })
  async list(@CurrentTenant() tenant: TenantContext, @Query() query: GlobalLinesQueryDto) {
    return this.lines.listGlobal(tenant.organizationId, tenant.userId, {
      bankAccountId: query.bankAccountId,
      state: query.state as never,
      olderThanDays: query.olderThanDays,
      minAmount: query.minAmount,
      maxAmount: query.maxAmount,
      q: query.q,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Patch(':id')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Ignorer ou restaurer une ligne de relevé' })
  async patch(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchStatementLineDto,
  ) {
    return this.lines.patch(tenant.organizationId, tenant, id, {
      isIgnored: dto.isIgnored,
      ignoreReason: dto.ignoreReason,
    });
  }
}
