import { Global, Module } from '@nestjs/common';
import { CASH_RECEIPT_CANCELLER } from '../payments/domain/ports';
import { CashBalancesService } from './application/cash-balances.service';
import { CashReceiptsQueryService } from './application/cash-receipts-query.service';
import { CashReceiptsService } from './application/cash-receipts.service';
import { RemittancesService } from './application/remittances.service';
import { CashReceiptsController } from './presentation/cash-receipts.controller';
import { CashRemittancesController } from './presentation/cash-remittances.controller';

/**
 * Module `cash` : reçus de caisse signés, encours des démarcheurs, remises et
 * contrôle des écarts. Propriétaire de `cash_receipts`, `cash_remittances` et
 * `cash_remittance_items`.
 *
 * Il publie `CASH_RECEIPT_CANCELLER` (consommé par la contre-passation de
 * `payments`) et consomme `CASH_RECEIPT_PUBLISHER` (PDF et envoi, module
 * `receipts`) — d'où `@Global()`, comme les autres modules à ports.
 */
@Global()
@Module({
  controllers: [CashReceiptsController, CashRemittancesController],
  providers: [
    CashReceiptsService,
    CashReceiptsQueryService,
    CashBalancesService,
    RemittancesService,
    { provide: CASH_RECEIPT_CANCELLER, useExisting: CashReceiptsService },
  ],
  exports: [CashReceiptsService, CashReceiptsQueryService, CASH_RECEIPT_CANCELLER],
})
export class CashModule {}
