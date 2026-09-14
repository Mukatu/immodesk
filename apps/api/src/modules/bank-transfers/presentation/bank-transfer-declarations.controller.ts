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
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import { parseIsoDate } from '../../leases/domain/calendar';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { BankTransferDeclarationsService } from '../application/bank-transfer-declarations.service';
import { BankTransferQueryService } from '../application/bank-transfer-query.service';
import {
  TransferApproveDto,
  TransferDeclareDto,
  TransferListQueryDto,
  TransferReasonDto,
} from './dto/bank-transfers.dto';

@ApiTags('Virements déclarés')
@ApiBearerAuth()
@Controller('bank-transfer-declarations')
export class BankTransferDeclarationsController {
  constructor(
    private readonly declarations: BankTransferDeclarationsService,
    private readonly queries: BankTransferQueryService,
  ) {}

  @Post()
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Déclarer un virement' })
  async declare(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: TransferDeclareDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { view, replayed } = await this.declarations.declare(tenant.organizationId, tenant, {
      tenantId: dto.tenantId,
      leaseId: dto.leaseId ?? null,
      invoiceId: dto.invoiceId ?? null,
      declaredAmount: BigInt(dto.declaredAmount),
      transferDate: parseIsoDate(dto.transferDate.slice(0, 10)),
      transferReference: dto.transferReference ?? null,
      payerName: dto.payerName,
      payerBankCode: dto.payerBankCode ?? null,
      payerBankName: dto.payerBankName ?? null,
      payerAccountNumber: dto.payerAccountNumber ?? null,
      beneficiaryBankAccountId: dto.beneficiaryBankAccountId,
      proofDocumentId: dto.proofDocumentId,
      clientRef: dto.clientRef,
      notes: dto.notes ?? null,
    });
    if (replayed) res.status(HttpStatus.OK);
    return view;
  }

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'File des déclarations de virement' })
  async list(@CurrentTenant() tenant: TenantContext, @Query() query: TransferListQueryDto) {
    return this.queries.list(tenant.organizationId, tenant, query);
  }

  @Get(':id')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Détail d'une déclaration de virement" })
  async get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.queries.get(tenant.organizationId, tenant, id);
  }

  @Post(':id/review')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Prendre en charge une déclaration' })
  async review(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.declarations.review(tenant.organizationId, tenant, id);
  }

  @Post(':id/approve')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Valider une déclaration de virement' })
  async approve(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferApproveDto,
  ) {
    return this.declarations.approve(tenant.organizationId, tenant, id, {
      approvedAmount: dto.approvedAmount !== undefined ? BigInt(dto.approvedAmount) : undefined,
      reason: dto.reason ?? null,
    });
  }

  @Post(':id/reject')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rejeter une déclaration de virement' })
  async reject(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferReasonDto,
  ) {
    return this.declarations.reject(tenant.organizationId, tenant, id, dto.reason);
  }

  @Post(':id/cancel')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Retirer une déclaration de virement' })
  async cancel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferReasonDto,
  ) {
    return this.declarations.cancel(tenant.organizationId, tenant, id, dto.reason);
  }
}
