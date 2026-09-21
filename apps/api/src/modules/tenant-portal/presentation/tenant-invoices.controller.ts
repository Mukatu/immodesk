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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import {
  InvoiceDetailDto,
  InvoicePageDto,
} from '../../billing/presentation/dto/billing-response.dto';
import { requireUser } from '../../parties/presentation/landlords.controller';
import { TenantInvoicesQueryService } from '../application/tenant-invoices-query.service';
import { TenantPaymentsService } from '../application/tenant-payments.service';
import { CurrentTenantLeases, TenantPortal } from './tenant-portal.decorator';
import { TenantPortalGuard } from './tenant-portal.guard';
import {
  TenantInvoiceListQueryDto,
  TenantInvoicePayDto,
  TenantInvoicePayResponseDto,
} from './dto/tenant-invoices.dto';

/**
 * Factures du locataire (contrat, § « Portail locataire ») : périmètre posé
 * par `TenantPortalGuard` sur `request.tenantLeases`, injecté ici par
 * `@CurrentTenantLeases()` — jamais un identifiant de bail ou de locataire
 * accepté en paramètre de requête.
 */
@ApiTags('Portail locataire — factures')
@ApiBearerAuth()
@TenantPortal()
@UseGuards(TenantPortalGuard)
@Controller('tenant/invoices')
export class TenantInvoicesController {
  constructor(
    private readonly queries: TenantInvoicesQueryService,
    private readonly payments: TenantPaymentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister les factures des baux actifs du locataire' })
  @ApiResponse({ status: 200, type: InvoicePageDto })
  async list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Query() query: TenantInvoiceListQueryDto,
  ): Promise<InvoicePageDto> {
    return this.queries.list(leases, requireUser(user), query) as Promise<InvoicePageDto>;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une facture du locataire' })
  @ApiResponse({ status: 200, type: InvoiceDetailDto })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description: 'PARTIES.PORTAL_OUT_OF_SCOPE',
  })
  async get(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceDetailDto> {
    return this.queries.get(leases, requireUser(user), id) as Promise<InvoiceDetailDto>;
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Régler une facture par Mobile Money',
    description:
      'Même fournisseur agrégateur que les loyers, avec la même règle de confirmation par ' +
      're-interrogation (contrat, § « Paiement »).',
  })
  @ApiResponse({ status: 202, type: TenantInvoicePayResponseDto })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description: 'PARTIES.PORTAL_OUT_OF_SCOPE',
  })
  async pay(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TenantInvoicePayDto,
  ): Promise<TenantInvoicePayResponseDto> {
    return this.payments.pay(leases, requireUser(user), id, dto);
  }
}
