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
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { MomoAggregatorService } from '../application/momo-aggregator.service';
import { MomoDeclarationsService } from '../application/momo-declarations.service';
import { MomoQueryService } from '../application/momo-query.service';
import { MomoVerificationService } from '../application/momo-verification.service';
import {
  MomoApproveDto,
  MomoDeclareDto,
  MomoInitiateDto,
  MomoListQueryDto,
  MomoQuoteDto,
  MomoReasonDto,
} from './dto/mobile-money.dto';

@ApiTags('Mobile Money')
@ApiBearerAuth()
@Controller('payments/mobile-money')
export class MobileMoneyController {
  constructor(
    private readonly declarations: MomoDeclarationsService,
    private readonly aggregator: MomoAggregatorService,
    private readonly queries: MomoQueryService,
    private readonly verification: MomoVerificationService,
  ) {}

  @Post('declarations')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Déclarer un paiement Mobile Money' })
  async declare(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: MomoDeclareDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { view, replayed } = await this.declarations.declare(tenant.organizationId, tenant, {
      tenantId: dto.tenantId,
      leaseId: dto.leaseId ?? null,
      invoiceId: dto.invoiceId ?? null,
      provider: dto.provider,
      operatorReference: dto.operatorReference,
      payerMsisdn: dto.payerMsisdn,
      payeeMsisdn: dto.payeeMsisdn,
      amount: BigInt(dto.amount),
      proofDocumentId: dto.proofDocumentId ?? null,
      clientRef: dto.clientRef,
      notes: dto.notes ?? null,
    });
    if (replayed) res.status(HttpStatus.OK);
    return view;
  }

  @Get('declarations')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'File des déclarations Mobile Money' })
  async listDeclarations(@CurrentTenant() tenant: TenantContext, @Query() query: MomoListQueryDto) {
    return this.queries.list(tenant.organizationId, tenant, query, 'DECLARED');
  }

  @Post('declarations/:id/approve')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Valider une déclaration Mobile Money' })
  async approve(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MomoApproveDto,
  ) {
    return this.declarations.approve(tenant.organizationId, tenant, id, {
      approvedAmount: dto.approvedAmount !== undefined ? BigInt(dto.approvedAmount) : undefined,
      reason: dto.reason ?? null,
    });
  }

  @Post('declarations/:id/reject')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rejeter une déclaration Mobile Money' })
  async reject(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MomoReasonDto,
  ) {
    return this.declarations.reject(tenant.organizationId, tenant, id, dto.reason);
  }

  @Post('declarations/:id/cancel')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Retirer une déclaration Mobile Money' })
  async cancel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MomoReasonDto,
  ) {
    return this.declarations.cancel(tenant.organizationId, tenant, id, dto.reason);
  }

  @Post('quote')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Devis Mobile Money agrégateur' })
  async quote(@CurrentTenant() tenant: TenantContext, @Body() dto: MomoQuoteDto) {
    const result = await this.aggregator.quote(
      tenant.organizationId,
      tenant.userId,
      BigInt(dto.amount),
    );
    return {
      amount: Number(result.amount),
      feeAmount: Number(result.feeAmount),
      totalDebited: Number(result.totalDebited),
      netReceived: Number(result.netReceived),
      feeBearer: result.feeBearer,
    };
  }

  @Post('initiate')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Initier un paiement Mobile Money agrégateur' })
  async initiate(@CurrentTenant() tenant: TenantContext, @Body() dto: MomoInitiateDto) {
    return this.aggregator.initiate(tenant.organizationId, tenant, {
      invoiceId: dto.invoiceId ?? null,
      tenantId: dto.tenantId,
      leaseId: dto.leaseId ?? null,
      amount: BigInt(dto.amount),
      payerMsisdn: dto.payerMsisdn,
      clientRef: dto.clientRef,
    });
  }

  @Get('transactions')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Journal des transactions Mobile Money' })
  async listTransactions(@CurrentTenant() tenant: TenantContext, @Query() query: MomoListQueryDto) {
    return this.queries.list(tenant.organizationId, tenant, query);
  }

  @Get('transactions/:id')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Détail d'une transaction Mobile Money" })
  async getTransaction(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queries.get(tenant.organizationId, tenant, id);
  }

  @Post('transactions/:id/refresh')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Forcer la re-interrogation du fournisseur' })
  async refresh(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.verification.refresh(tenant.organizationId, tenant, id);
  }
}
