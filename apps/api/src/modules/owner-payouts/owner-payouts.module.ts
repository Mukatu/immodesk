import { Module } from '@nestjs/common';
import { MobileMoneyModule } from '../mobile-money/mobile-money.module';
import { OwnerPayoutsQueryService } from './application/owner-payouts-query.service';
import { OwnerPayoutsService } from './application/owner-payouts.service';
import { OwnerPayoutsController } from './presentation/owner-payouts.controller';

/**
 * Module `owner-payouts` : reversements aux bailleurs, propriétaire exclusif
 * de `owner_payouts` (phase 7, contrat § Reversements).
 *
 * Importe explicitement `MobileMoneyModule` (non `@Global()`, comme
 * `owner-statements` importe `PdfModule`) pour injecter `MOMO_PAYOUT_INITIATOR`.
 * Consomme `OwnerStatementsService.markPaid` et `NUMBERING`/`NOTIFICATION_ENQUEUER`
 * sans les importer : `owner-statements`, `numbering` et `notifications` sont
 * tous `@Global()`. N'exporte rien : aucun autre module ne consomme
 * `owner-payouts` aujourd'hui.
 */
@Module({
  imports: [MobileMoneyModule],
  controllers: [OwnerPayoutsController],
  providers: [OwnerPayoutsService, OwnerPayoutsQueryService],
})
export class OwnerPayoutsModule {}
