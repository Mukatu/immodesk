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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Public, Roles } from '../../../shared/auth/auth.contracts';
import { PublicRateLimitGuard } from '../../../shared/throttler/public-rate-limit.guard';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { ReceiptDocumentsService } from '../application/receipt-documents.service';
import { ReceiptsQueryService } from '../application/receipts-query.service';
import {
  ListReceiptsQueryDto,
  NotificationAcceptedDto,
  PdfLinkDto,
  ReceiptDetailDto,
  ReceiptPageDto,
  ReceiptVerificationDto,
  SendDocumentDto,
} from './dto/receipts.dto';

@ApiTags('Quittances')
@ApiBearerAuth()
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly queries: ReceiptsQueryService,
    private readonly documents: ReceiptDocumentsService,
  ) {}

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les quittances' })
  @ApiResponse({ status: 200, type: ReceiptPageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListReceiptsQueryDto,
  ): Promise<ReceiptPageDto> {
    return this.queries.list(
      tenant.organizationId,
      tenant.userId,
      query,
    ) as Promise<ReceiptPageDto>;
  }

  @Get(':id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Détail d’une quittance et journal de ses envois' })
  @ApiResponse({ status: 200, type: ReceiptDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'RECEIPTS.NOT_FOUND' })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReceiptDetailDto> {
    return this.queries.get(tenant.organizationId, tenant.userId, id) as Promise<ReceiptDetailDto>;
  }

  @Get(':id/pdf')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'URL signée (10 min) du PDF de la quittance' })
  @ApiResponse({ status: 200, type: PdfLinkDto })
  @ApiResponse({ status: 503, type: ErrorResponseDto, description: 'RECEIPTS.PDF_UNAVAILABLE' })
  async pdf(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PdfLinkDto> {
    return this.documents.receiptPdf(tenant.organizationId, tenant.userId, id);
  }

  @Post(':id/send')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: '(Ré)envoyer la quittance par WhatsApp ou SMS' })
  @ApiResponse({ status: 202, type: NotificationAcceptedDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'RECEIPTS.NOT_SENDABLE' })
  async send(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDocumentDto,
  ): Promise<NotificationAcceptedDto> {
    const result = await this.documents.sendReceipt(tenant.organizationId, id, {
      channel: dto.channel,
      manual: true,
      actorUserId: tenant.userId,
    });
    return result as NotificationAcceptedDto;
  }
}

@ApiTags('Vérification publique')
@Controller('public/receipts')
export class PublicReceiptsController {
  constructor(private readonly queries: ReceiptsQueryService) {}

  @Get('verify/:token')
  @Public()
  @UseGuards(PublicRateLimitGuard)
  @ApiOperation({
    summary: 'Vérifier l’authenticité d’une quittance (QR code)',
    description:
      'Sans authentification, limité en débit. Aucun téléphone ni adresse : le nom du locataire seulement.',
  })
  @ApiResponse({ status: 200, type: ReceiptVerificationDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Jeton inconnu ou altéré.' })
  @ApiResponse({ status: 429, type: ErrorResponseDto, description: 'IAM.RATE_LIMITED' })
  async verify(@Param('token') token: string): Promise<ReceiptVerificationDto> {
    return this.queries.verifyPublic(token);
  }
}
