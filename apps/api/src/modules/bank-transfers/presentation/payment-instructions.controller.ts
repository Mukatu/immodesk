import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { PaymentInstructionsService } from '../application/payment-instructions.service';

/**
 * `GET /v1/invoices/{id}/payment-instructions` et
 * `GET /v1/leases/{id}/payment-instructions` (contrat phase 4). Un seul
 * contrôleur, sans préfixe, pour porter les deux routes sous leurs
 * ressources respectives sans dupliquer `bank-transfers` en deux modules.
 */
@ApiTags('Instructions de paiement')
@ApiBearerAuth()
@Controller()
export class PaymentInstructionsController {
  constructor(private readonly instructions: PaymentInstructionsService) {}

  @Get('invoices/:id/payment-instructions')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Instructions de paiement d'une facture" })
  async forInvoice(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.instructions.forInvoice(tenant.organizationId, tenant.userId, id);
  }

  @Get('leases/:id/payment-instructions')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Instructions de paiement de la plus ancienne facture ouverte du bail' })
  async forLease(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.instructions.forLease(tenant.organizationId, tenant.userId, id);
  }
}
