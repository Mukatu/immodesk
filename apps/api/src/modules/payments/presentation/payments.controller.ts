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
import { toAmount } from '../../../shared/money/amount';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { parseIsoDate } from '../../leases/domain/calendar';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { PaymentsQueryService, type PaymentReader } from '../application/payments-query.service';
import { PaymentsService, type PaymentInput } from '../application/payments.service';
import { ReversalService } from '../application/reversal.service';
import type { FeeBearer, PaymentMethod } from '../domain/payment-rules';
import {
  AddAllocationsDto,
  ConfirmPaymentDto,
  ListPaymentsQueryDto,
  PaymentInputDto,
  ReasonDto,
} from './dto/payments.dto';
import { PaymentDetailDto, PaymentPageDto, ReversalResultDto } from './dto/payments-response.dto';

export function toPaymentInput(dto: PaymentInputDto): PaymentInput {
  return {
    method: dto.method as PaymentMethod,
    amount: toAmount(dto.amount),
    tenantId: dto.tenantId,
    leaseId: dto.leaseId ?? null,
    paymentDate: dto.paymentDate ? parseIsoDate(dto.paymentDate.slice(0, 10)) : undefined,
    valueDate: dto.valueDate ? parseIsoDate(dto.valueDate.slice(0, 10)) : null,
    externalReference: dto.externalReference ?? null,
    bankAccountId: dto.bankAccountId ?? null,
    feeAmount: dto.feeAmount !== undefined ? toAmount(dto.feeAmount) : undefined,
    feeBearer: dto.feeBearer as FeeBearer | undefined,
    autoAllocate: dto.autoAllocate,
    allocations: dto.allocations?.map((a) => ({
      invoiceId: a.invoiceId,
      amount: toAmount(a.amount),
    })),
    confirmed: dto.confirmed,
    clientRef: dto.clientRef ?? null,
    notes: dto.notes ?? null,
    collectionLatitude: dto.collectionLatitude ?? null,
    collectionLongitude: dto.collectionLongitude ?? null,
  };
}

function readerOf(tenant: TenantContext): PaymentReader {
  return { userId: tenant.userId, role: tenant.role };
}

@ApiTags('Paiements')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly queries: PaymentsQueryService,
    private readonly reversals: ReversalService,
  ) {}

  @Post()
  @Roles('COLLECTOR', 'ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Rejoue la réponse initiale.',
  })
  @ApiOperation({
    summary: 'Enregistrer un paiement',
    description:
      'CASH et saisie confirmée par un MANAGER / ACCOUNTANT : CONFIRMED ; sinon PENDING_VERIFICATION. ' +
      'Un `clientRef` ou un `Idempotency-Key` déjà vus rendent le paiement initial en 200.',
  })
  @ApiResponse({ status: 201, type: PaymentDetailDto })
  @ApiResponse({ status: 200, type: PaymentDetailDto, description: 'Rejeu idempotent.' })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'PAYMENTS.OVER_ALLOCATED, PAYMENTS.INVOICE_NOT_OPEN',
  })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: PaymentInputDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PaymentDetailDto> {
    const { detail, replayed } = await this.payments.create(
      tenant.organizationId,
      readerOf(tenant),
      toPaymentInput(dto),
    );
    if (replayed) res.status(HttpStatus.OK);
    return detail as PaymentDetailDto;
  }

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les paiements' })
  @ApiResponse({ status: 200, type: PaymentPageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaymentPageDto> {
    return this.queries.list(
      tenant.organizationId,
      readerOf(tenant),
      query,
    ) as Promise<PaymentPageDto>;
  }

  @Get(':id')
  @Roles('ACCOUNTANT', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Détail d’un paiement (COLLECTOR : ses propres encaissements)' })
  @ApiResponse({ status: 200, type: PaymentDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PAYMENTS.NOT_FOUND' })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentDetailDto> {
    return this.queries.get(
      tenant.organizationId,
      readerOf(tenant),
      id,
    ) as Promise<PaymentDetailDto>;
  }

  @Post(':id/allocations')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Imputer un paiement confirmé sur des factures' })
  @ApiResponse({ status: 200, type: PaymentDetailDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'PAYMENTS.OVER_ALLOCATED, PAYMENTS.INVOICE_NOT_OPEN',
  })
  async allocate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAllocationsDto,
  ): Promise<PaymentDetailDto> {
    return this.payments.addAllocations(
      tenant.organizationId,
      readerOf(tenant),
      id,
      dto.allocations.map((a) => ({ invoiceId: a.invoiceId, amount: toAmount(a.amount) })),
    ) as Promise<PaymentDetailDto>;
  }

  @Post(':id/confirm')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Confirmer un paiement en attente de vérification' })
  @ApiResponse({ status: 200, type: PaymentDetailDto })
  async confirm(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmPaymentDto,
  ): Promise<PaymentDetailDto> {
    return this.payments.confirm(tenant.organizationId, readerOf(tenant), id, {
      valueDate: dto.valueDate ? parseIsoDate(dto.valueDate.slice(0, 10)) : undefined,
      note: dto.note,
    }) as Promise<PaymentDetailDto>;
  }

  @Post(':id/reject')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rejeter un paiement en attente (motif obligatoire)' })
  @ApiResponse({ status: 200, type: PaymentDetailDto })
  async reject(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ): Promise<PaymentDetailDto> {
    return this.payments.reject(
      tenant.organizationId,
      readerOf(tenant),
      id,
      dto.reason,
    ) as Promise<PaymentDetailDto>;
  }

  @Post(':id/reverse')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Contre-passer un paiement',
    description:
      'Le paiement d’origine reste intact ; une écriture miroir REVERSED (REV-{YYYYMM}-{seq}) ' +
      'neutralise ses imputations, rembourse l’avoir inutilisé et annule quittances et reçus liés.',
  })
  @ApiResponse({ status: 200, type: ReversalResultDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'PAYMENTS.ALREADY_REVERSED, PAYMENTS.CREDIT_ALREADY_USED',
  })
  async reverse(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ): Promise<ReversalResultDto> {
    return this.reversals.reverse(
      tenant.organizationId,
      readerOf(tenant),
      id,
      dto.reason,
    ) as Promise<ReversalResultDto>;
  }
}
