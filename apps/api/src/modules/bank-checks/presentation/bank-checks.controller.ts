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
import { toAmount } from '../../../shared/money/amount';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { parseIsoDate } from '../../leases/domain/calendar';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { BankChecksQueryService } from '../application/bank-checks-query.service';
import { BankChecksService } from '../application/bank-checks.service';
import {
  BankCheckBounceDto,
  BankCheckClearDto,
  BankCheckDepositDto,
  BankCheckListQueryDto,
  BankCheckReasonOptionalDto,
  BankCheckReceiveDto,
} from './dto/bank-checks.dto';

@ApiTags('Chèques')
@ApiBearerAuth()
@Controller('bank-checks')
export class BankChecksController {
  constructor(
    private readonly checks: BankChecksService,
    private readonly queries: BankChecksQueryService,
  ) {}

  @Post()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Enregistrer un chèque reçu' })
  async receive(@CurrentTenant() tenant: TenantContext, @Body() dto: BankCheckReceiveDto) {
    return this.checks.receive(tenant.organizationId, tenant, {
      tenantId: dto.tenantId,
      leaseId: dto.leaseId ?? null,
      invoiceId: dto.invoiceId ?? null,
      checkNumber: dto.checkNumber,
      drawerName: dto.drawerName,
      drawerBankCode: dto.drawerBankCode,
      drawerBankName: dto.drawerBankName,
      drawerAccountNumber: dto.drawerAccountNumber ?? null,
      amount: toAmount(dto.amount),
      issueDate: parseIsoDate(dto.issueDate.slice(0, 10)),
      receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : null,
      imageDocumentId: dto.imageDocumentId ?? null,
      notes: dto.notes ?? null,
    });
  }

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'File des chèques' })
  async list(@CurrentTenant() tenant: TenantContext, @Query() query: BankCheckListQueryDto) {
    return this.queries.list(tenant.organizationId, tenant.userId, query);
  }

  @Get(':id')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Détail d'un chèque" })
  async get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.queries.get(tenant.organizationId, tenant.userId, id);
  }

  @Post(':id/deposit')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Remettre le chèque en banque' })
  async deposit(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BankCheckDepositDto,
  ) {
    return this.checks.deposit(tenant.organizationId, tenant, id, {
      depositBankAccountId: dto.depositBankAccountId,
      depositDate: dto.depositDate ? parseIsoDate(dto.depositDate.slice(0, 10)) : null,
    });
  }

  @Post(':id/clear')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Constater la compensation du chèque' })
  async clear(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BankCheckClearDto,
  ) {
    return this.checks.clear(tenant.organizationId, tenant, id, {
      clearingDate: dto.clearingDate ? parseIsoDate(dto.clearingDate.slice(0, 10)) : null,
    });
  }

  @Post(':id/bounce')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Déclarer le chèque impayé' })
  async bounce(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BankCheckBounceDto,
  ) {
    return this.checks.bounce(tenant.organizationId, tenant, id, {
      reason: dto.reason ?? null,
      feeAmount: dto.feeAmount !== undefined ? toAmount(dto.feeAmount) : null,
    });
  }

  @Post(':id/cancel')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Annuler le chèque avant dépôt' })
  async cancel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BankCheckReasonOptionalDto,
  ) {
    return this.checks.cancel(tenant.organizationId, tenant, id, dto.reason);
  }

  @Post(':id/return')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rendre le chèque au tireur' })
  async returnToDrawer(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BankCheckReasonOptionalDto,
  ) {
    return this.checks.returnToDrawer(tenant.organizationId, tenant, id, dto.reason);
  }
}
