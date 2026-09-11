import { Global, Module } from '@nestjs/common';
import { AllocationService } from './application/allocation.service';
import { PaymentsQueryService } from './application/payments-query.service';
import { PaymentsService } from './application/payments.service';
import { ReversalService } from './application/reversal.service';
import { TenantCreditsService } from './application/tenant-credits.service';
import { TenantStatementService } from './application/tenant-statement.service';
import { PaymentsController } from './presentation/payments.controller';
import { TenantCreditsController } from './presentation/tenant-credits.controller';

/**
 * Module `payments` : paiements, imputations append-only, avoirs locataire,
 * contre-passation et relevé de compte. Propriétaire de `payments`,
 * `payment_allocations` et `tenant_credits`.
 *
 * `@Global()` : `cash` crée ses paiements par `PaymentsService.createInTx`,
 * tandis que `payments` consomme `RECEIPT_ISSUER` (receipts) et
 * `CASH_RECEIPT_CANCELLER` (cash) par des ports `Symbol` — aucun cycle de
 * modules, comme en phases 1 et 2.
 */
@Global()
@Module({
  controllers: [PaymentsController, TenantCreditsController],
  providers: [
    AllocationService,
    PaymentsQueryService,
    PaymentsService,
    ReversalService,
    TenantCreditsService,
    TenantStatementService,
  ],
  exports: [AllocationService, PaymentsQueryService, PaymentsService, ReversalService],
})
export class PaymentsModule {}
