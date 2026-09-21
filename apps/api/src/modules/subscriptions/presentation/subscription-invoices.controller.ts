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
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import type { Page } from '../../../shared/pagination/cursor';
import { SubscriptionInvoicesService } from '../application/subscription-invoices.service';
import {
  SubscriptionPaymentsService,
  type PayInvoiceResult,
} from '../application/subscription-payments.service';
import type { SubscriptionInvoiceView } from '../application/subscription-invoice-views';
import {
  ListSubscriptionInvoicesQueryDto,
  PaySubscriptionInvoiceDto,
} from './dto/subscriptions.dto';

/**
 * Factures d'abonnement (contrat phase 10, routes
 * `GET /v1/organizations/{id}/subscription-invoices` et
 * `POST /v1/subscription-invoices/{id}/pay`). Deux bases de chemin
 * distinctes dans un seul contrôleur, comme `DepositsController` et
 * `BillingController` le font déjà ailleurs dans le dépôt.
 */
@ApiTags('Abonnement')
@ApiBearerAuth()
@Controller()
export class SubscriptionInvoicesController {
  constructor(
    private readonly invoices: SubscriptionInvoicesService,
    private readonly payments: SubscriptionPaymentsService,
  ) {}

  @Get('organizations/:id/subscription-invoices')
  @Roles('OWNER', 'ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Factures d'abonnement de l'organisation" })
  async list(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListSubscriptionInvoicesQueryDto,
  ): Promise<Page<SubscriptionInvoiceView>> {
    return this.invoices.list(organizationId, requireUser(user), {
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Post('subscription-invoices/:id/pay')
  @Roles('OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Payer une facture d'abonnement par Mobile Money" })
  async pay(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @Body() dto: PaySubscriptionInvoiceDto,
  ): Promise<PayInvoiceResult> {
    return this.payments.pay(organizationId, requireUser(user), invoiceId, dto.payerMsisdn);
  }
}
