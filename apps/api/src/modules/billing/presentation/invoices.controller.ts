import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import { toAmount } from '../../../shared/money/amount';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { parseIsoDate } from '../../leases/domain/calendar';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { InvoicesQueryService, type InvoiceReader } from '../application/invoices-query.service';
import { InvoicesService } from '../application/invoices.service';
import type { NewInvoiceLine } from '../application/invoice-writer.service';
import type { InvoiceLineType } from '../domain/invoice-lines';
import {
  CancelInvoiceDto,
  CreateInvoiceDto,
  InvoiceLineInputDto,
  ListInvoicesQueryDto,
} from './dto/billing.dto';
import { InvoiceDetailDto, InvoicePageDto } from './dto/billing-response.dto';
import { InvoiceDocumentsService } from '../../receipts/application/invoice-documents.service';
import { PdfLinkDto } from '../../receipts/presentation/dto/receipts.dto';

export function toNewInvoiceLine(dto: InvoiceLineInputDto): NewInvoiceLine {
  return {
    lineType: dto.lineType as InvoiceLineType,
    label: dto.label,
    description: dto.description ?? null,
    quantity: dto.quantity,
    unitPriceAmount: toAmount(dto.unitPriceAmount),
    amount: dto.amount !== undefined ? toAmount(dto.amount) : null,
    vatRateBps: dto.vatRateBps,
    isCredit: dto.isCredit ?? false,
    periodStart: dto.periodStart ? parseIsoDate(dto.periodStart.slice(0, 10)) : null,
    periodEnd: dto.periodEnd ? parseIsoDate(dto.periodEnd.slice(0, 10)) : null,
  };
}

export function readerOf(tenant: TenantContext): InvoiceReader {
  return { userId: tenant.userId, role: tenant.role };
}

@ApiTags('Factures de loyer')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly queries: InvoicesQueryService,
    private readonly invoicePdfs: InvoiceDocumentsService,
  ) {}

  @Get()
  @Roles('ACCOUNTANT', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Lister les factures',
    description: 'Un COLLECTOR ne voit que les factures des baux qui lui sont affectés.',
  })
  @ApiResponse({ status: 200, type: InvoicePageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<InvoicePageDto> {
    return this.queries.list(
      tenant.organizationId,
      readerOf(tenant),
      query,
    ) as Promise<InvoicePageDto>;
  }

  @Get(':id')
  @Roles('ACCOUNTANT', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Détail d’une facture : lignes, imputations, quittance' })
  @ApiResponse({ status: 200, type: InvoiceDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'BILLING.INVOICE_NOT_FOUND' })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceDetailDto> {
    return this.queries.get(
      tenant.organizationId,
      readerOf(tenant),
      id,
    ) as Promise<InvoiceDetailDto>;
  }

  @Get(':id/pdf')
  @Roles('ACCOUNTANT', 'COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'URL signée (10 min) du PDF de la facture',
    description:
      'Génération à la demande, mise en cache dans `documents` tant que la facture ne change pas.',
  })
  @ApiResponse({ status: 200, type: PdfLinkDto })
  @ApiResponse({ status: 503, type: ErrorResponseDto, description: 'BILLING.PDF_UNAVAILABLE' })
  async pdf(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PdfLinkDto> {
    await this.queries.get(tenant.organizationId, readerOf(tenant), id);
    return this.invoicePdfs.invoicePdf(tenant.organizationId, tenant.userId, id);
  }

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer une facture manuelle (brouillon, ou émise si `issue`)' })
  @ApiResponse({ status: 201, type: InvoiceDetailDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'BILLING.PERIOD_ALREADY_INVOICED',
  })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateInvoiceDto,
  ): Promise<InvoiceDetailDto> {
    return this.invoices.create(tenant.organizationId, readerOf(tenant), {
      leaseId: dto.leaseId,
      periodStart: dto.periodStart.slice(0, 10),
      periodEnd: dto.periodEnd.slice(0, 10),
      dueDate: dto.dueDate?.slice(0, 10),
      lines: dto.lines.map(toNewInvoiceLine),
      notes: dto.notes,
      issue: dto.issue,
    }) as Promise<InvoiceDetailDto>;
  }

  @Post(':id/lines')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Ajouter une ligne (brouillon uniquement)' })
  @ApiResponse({ status: 201, type: InvoiceDetailDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'BILLING.INVOICE_NOT_EDITABLE' })
  async addLine(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InvoiceLineInputDto,
  ): Promise<InvoiceDetailDto> {
    return this.invoices.addLine(
      tenant.organizationId,
      readerOf(tenant),
      id,
      toNewInvoiceLine(dto),
    ) as Promise<InvoiceDetailDto>;
  }

  @Delete(':id/lines/:lineId')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Retirer une ligne (brouillon uniquement)' })
  @ApiResponse({ status: 200, type: InvoiceDetailDto })
  async removeLine(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ): Promise<InvoiceDetailDto> {
    return this.invoices.removeLine(
      tenant.organizationId,
      readerOf(tenant),
      id,
      lineId,
    ) as Promise<InvoiceDetailDto>;
  }

  @Post(':id/issue')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Émettre une facture brouillon',
    description: 'Attribue le numéro LOY-{YYYYMM}-{seq} et envoie l’avis d’échéance si activé.',
  })
  @ApiResponse({ status: 200, type: InvoiceDetailDto })
  async issue(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceDetailDto> {
    return this.invoices.issue(
      tenant.organizationId,
      readerOf(tenant),
      id,
    ) as Promise<InvoiceDetailDto>;
  }

  @Post(':id/cancel')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Annuler une facture (motif obligatoire)' })
  @ApiResponse({ status: 200, type: InvoiceDetailDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'BILLING.INVOICE_HAS_PAYMENTS' })
  async cancel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
  ): Promise<InvoiceDetailDto> {
    return this.invoices.cancel(
      tenant.organizationId,
      readerOf(tenant),
      id,
      dto.reason,
    ) as Promise<InvoiceDetailDto>;
  }
}
