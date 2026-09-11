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
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { toAmount } from '../../../shared/money/amount';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { ReasonDto } from '../../payments/presentation/dto/payments.dto';
import { CashBalancesService } from '../application/cash-balances.service';
import { RemittancesService } from '../application/remittances.service';
import { cashReaderOf } from './cash-receipts.controller';
import {
  ListRemittancesQueryDto,
  RemittanceDepositDto,
  RemittanceInputDto,
  RemittanceVerifyDto,
} from './dto/cash.dto';
import {
  CollectorBalanceDto,
  CollectorBalanceListDto,
  RemittanceDetailDto,
  RemittancePageDto,
} from './dto/cash-response.dto';

function sanitizeDenominations(raw: Record<string, number> | undefined): Record<string, number> {
  return Object.fromEntries(
    Object.entries(raw ?? {}).filter(
      ([key, value]) => /^\d+$/.test(key) && Number.isInteger(value) && value >= 0,
    ),
  );
}

@ApiTags('Caisse des démarcheurs')
@ApiBearerAuth()
@Controller()
export class CashRemittancesController {
  constructor(
    private readonly remittances: RemittancesService,
    private readonly balances: CashBalancesService,
  ) {}

  @Get('cash/collectors')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Encours d’espèces de chaque démarcheur' })
  @ApiResponse({ status: 200, type: CollectorBalanceListDto })
  async collectors(@CurrentTenant() tenant: TenantContext): Promise<CollectorBalanceListDto> {
    return this.balances.list(tenant.organizationId, tenant.userId);
  }

  @Get('cash/collectors/:userId/balance')
  @Roles('MANAGER', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Encours d’un démarcheur (COLLECTOR : le sien)' })
  @ApiResponse({ status: 200, type: CollectorBalanceDto })
  async balance(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<CollectorBalanceDto> {
    if (tenant.role === 'COLLECTOR' && userId !== tenant.userId) {
      throw new DomainError('ORG.MEMBER_NOT_FOUND', { userId });
    }
    return this.balances.one(tenant.organizationId, tenant.userId, userId);
  }

  @Post('cash-remittances')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Déclarer une remise d’espèces (SUBMITTED, ou OPEN si `submit: false`)',
  })
  @ApiResponse({ status: 201, type: RemittanceDetailDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'CASH.REMITTANCE_ALREADY_OPEN, CASH.RECEIPT_ALREADY_REMITTED',
  })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: RemittanceInputDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RemittanceDetailDto> {
    const { detail, replayed } = await this.remittances.create(
      tenant.organizationId,
      cashReaderOf(tenant),
      {
        cashReceiptIds: dto.cashReceiptIds,
        declaredAmount: toAmount(dto.declaredAmount),
        denominations: sanitizeDenominations(dto.denominations),
        submit: dto.submit,
        notes: dto.notes ?? null,
        clientRef: dto.clientRef ?? null,
      },
    );
    if (replayed) res.status(HttpStatus.OK);
    return detail;
  }

  @Get('cash-remittances')
  @Roles('MANAGER', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les remises (COLLECTOR : les siennes)' })
  @ApiResponse({ status: 200, type: RemittancePageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListRemittancesQueryDto,
  ): Promise<RemittancePageDto> {
    return this.remittances.list(tenant.organizationId, cashReaderOf(tenant), query);
  }

  @Get('cash-remittances/:id')
  @Roles('MANAGER', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Détail d’une remise, reçu par reçu' })
  @ApiResponse({ status: 200, type: RemittanceDetailDto })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RemittanceDetailDto> {
    return this.remittances.get(tenant.organizationId, cashReaderOf(tenant), id);
  }

  @Post('cash-remittances/:id/submit')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Soumettre une remise en brouillon' })
  @ApiResponse({ status: 200, type: RemittanceDetailDto })
  async submit(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RemittanceDetailDto> {
    return this.remittances.submit(tenant.organizationId, cashReaderOf(tenant), id);
  }

  @Post('cash-remittances/:id/verify')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Contrôler une remise',
    description:
      'VERIFIED même avec écart : `varianceAmount = counted − expected`, audité avec contrôleur et démarcheur.',
  })
  @ApiResponse({ status: 200, type: RemittanceDetailDto })
  async verify(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RemittanceVerifyDto,
  ): Promise<RemittanceDetailDto> {
    return this.remittances.verify(tenant.organizationId, cashReaderOf(tenant), id, {
      countedAmount: toAmount(dto.countedAmount),
      items: dto.items?.map((item) => ({
        cashReceiptId: item.cashReceiptId,
        isVerified: item.isVerified,
        varianceAmount:
          item.varianceAmount !== undefined ? toAmount(item.varianceAmount) : undefined,
        varianceReason: item.varianceReason ?? null,
      })),
      notes: dto.notes ?? null,
    });
  }

  @Post('cash-remittances/:id/reject')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rejeter une remise : ses reçus redeviennent disponibles' })
  @ApiResponse({ status: 200, type: RemittanceDetailDto })
  async reject(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ): Promise<RemittanceDetailDto> {
    return this.remittances.reject(tenant.organizationId, cashReaderOf(tenant), id, dto.reason);
  }

  @Post('cash-remittances/:id/deposit')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Déposer en banque une remise contrôlée' })
  @ApiResponse({ status: 200, type: RemittanceDetailDto })
  async deposit(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RemittanceDepositDto,
  ): Promise<RemittanceDetailDto> {
    return this.remittances.deposit(tenant.organizationId, cashReaderOf(tenant), id, {
      bankAccountId: dto.bankAccountId,
      depositedAt: new Date(dto.depositedAt),
      depositSlipDocumentId: dto.depositSlipDocumentId ?? null,
    });
  }
}
