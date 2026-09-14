import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import {
  PaymentMethodsService,
  type PaymentMethodsView,
} from '../application/payment-methods.service';
import {
  PaymentMethodsSettingsDto,
  UpdatePaymentMethodsSettingsDto,
} from './dto/operational-settings.dto';

const ORG_HEADER = {
  name: 'X-Organization-Id',
  required: true,
  description: 'Organisation courante. Positionne `app.current_organization_id` (RLS).',
};

/**
 * `settings_json.paymentMethods` (phase 4) : activation par mode de
 * paiement, indépendante du drapeau plateforme `payments.mobile_money_aggregator`
 * (§ « Arbitrages » du contrat de la phase 4).
 */
@ApiTags('Organisations')
@ApiBearerAuth()
@Controller('organizations')
export class PaymentMethodsController {
  constructor(private readonly paymentMethods: PaymentMethodsService) {}

  @Get(':id/payment-methods')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Moyens de paiement actifs pour cette organisation' })
  @ApiResponse({ status: 200, type: PaymentMethodsSettingsDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<PaymentMethodsView> {
    return this.paymentMethods.get(id, requireUser(user));
  }

  @Patch(':id/payment-methods')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Activer ou paramétrer les moyens de paiement',
    description:
      "`aggregatorAvailable` n'est jamais accepté en entrée : il est recalculé depuis le drapeau plateforme.",
  })
  @ApiResponse({ status: 200, type: PaymentMethodsSettingsDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdatePaymentMethodsSettingsDto,
  ): Promise<PaymentMethodsView> {
    return this.paymentMethods.update(id, requireUser(user), dto);
  }
}

function requireUser(user: AuthenticatedUser | undefined): string {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user.userId;
}
