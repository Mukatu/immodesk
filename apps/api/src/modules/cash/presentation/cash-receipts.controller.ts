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
import { ReceiptDocumentsService } from '../../receipts/application/receipt-documents.service';
import {
  NotificationAcceptedDto,
  PdfLinkDto,
  SendDocumentDto,
} from '../../receipts/presentation/dto/receipts.dto';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import { toAmount } from '../../../shared/money/amount';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import type { PaymentReader } from '../../payments/application/payments-query.service';
import { CashReceiptsQueryService } from '../application/cash-receipts-query.service';
import { CashReceiptsService } from '../application/cash-receipts.service';
import { CashReceiptInputDto, ListCashReceiptsQueryDto } from './dto/cash.dto';
import { CashReceiptDetailDto, CashReceiptPageDto } from './dto/cash-response.dto';

export function cashReaderOf(tenant: TenantContext): PaymentReader {
  return { userId: tenant.userId, role: tenant.role };
}

@ApiTags('Reçus de caisse')
@ApiBearerAuth()
@Controller('cash-receipts')
export class CashReceiptsController {
  constructor(
    private readonly receipts: CashReceiptsService,
    private readonly queries: CashReceiptsQueryService,
    private readonly documents: ReceiptDocumentsService,
  ) {}

  @Post()
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Encaisser des espèces',
    description:
      'Une transaction : paiement CASH CONFIRMED, imputations, reçu CASH-{org}-{collector}-{seq} et ' +
      'signature (sha256). Au comptoir, le MANAGER est le collecteur. Idempotence par `clientRef`.',
  })
  @ApiResponse({ status: 201, type: CashReceiptDetailDto })
  @ApiResponse({ status: 200, type: CashReceiptDetailDto, description: 'Rejeu idempotent.' })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'CASH.SIGNATURE_REQUIRED' })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CashReceiptInputDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CashReceiptDetailDto> {
    const { detail, replayed } = await this.receipts.create(
      tenant.organizationId,
      cashReaderOf(tenant),
      {
        tenantId: dto.tenantId,
        leaseId: dto.leaseId ?? null,
        amount: toAmount(dto.amount),
        payerName: dto.payerName ?? null,
        payerPhone: dto.payerPhone ?? null,
        purpose: dto.purpose ?? null,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
        autoAllocate: dto.autoAllocate,
        allocations: dto.allocations?.map((a) => ({
          invoiceId: a.invoiceId,
          amount: toAmount(a.amount),
        })),
        signatureDataUrl: dto.signatureDataUrl ?? null,
        paperReceiptDocumentId: dto.paperReceiptDocumentId ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        clientRef: dto.clientRef,
      },
    );
    if (replayed) res.status(HttpStatus.OK);
    return detail as CashReceiptDetailDto;
  }

  @Get()
  @Roles('ACCOUNTANT', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les reçus de caisse (COLLECTOR : les siens)' })
  @ApiResponse({ status: 200, type: CashReceiptPageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListCashReceiptsQueryDto,
  ): Promise<CashReceiptPageDto> {
    return this.queries.list(
      tenant.organizationId,
      cashReaderOf(tenant),
      query,
    ) as Promise<CashReceiptPageDto>;
  }

  @Get(':id/pdf')
  @Roles('ACCOUNTANT', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'URL signée (10 min) du PDF du reçu de caisse' })
  @ApiResponse({ status: 200, type: PdfLinkDto })
  async pdf(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PdfLinkDto> {
    await this.queries.get(tenant.organizationId, cashReaderOf(tenant), id);
    return this.documents.cashReceiptPdf(tenant.organizationId, tenant.userId, id);
  }

  @Post(':id/send')
  @Roles('COLLECTOR')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Envoyer le reçu au locataire (COLLECTOR auteur, MANAGER)' })
  @ApiResponse({ status: 202, type: NotificationAcceptedDto })
  async send(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDocumentDto,
  ): Promise<NotificationAcceptedDto> {
    await this.queries.get(tenant.organizationId, cashReaderOf(tenant), id);
    return this.documents.sendCashReceipt(tenant.organizationId, id, {
      channel: dto.channel,
      manual: true,
      actorUserId: tenant.userId,
    });
  }

  @Get(':id')
  @Roles('ACCOUNTANT', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Détail d’un reçu de caisse' })
  @ApiResponse({ status: 200, type: CashReceiptDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'CASH.RECEIPT_NOT_FOUND' })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CashReceiptDetailDto> {
    return this.queries.get(
      tenant.organizationId,
      cashReaderOf(tenant),
      id,
    ) as Promise<CashReceiptDetailDto>;
  }
}
