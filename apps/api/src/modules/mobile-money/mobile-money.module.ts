import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MomoAggregatorService } from './application/momo-aggregator.service';
import { MomoDeclarationsService } from './application/momo-declarations.service';
import { MomoPayoutService } from './application/momo-payout.service';
import { MomoQueryService } from './application/momo-query.service';
import { MomoReconcileService } from './application/momo-reconcile.service';
import { MomoVerificationService } from './application/momo-verification.service';
import { MOMO_PAYOUT_INITIATOR } from './domain/ports';
import { CinetPayProvider } from './infrastructure/cinetpay.provider';
import { MobileMoneyProviderRegistry } from './infrastructure/mobile-money-provider.registry';
import { MomoJobsService } from './infrastructure/momo-jobs.service';
import { MomoVerifyQueue } from './infrastructure/momo-verify.queue';
import { SimulatedMobileMoneyProvider } from './infrastructure/simulated-mobile-money.provider';
import { MobileMoneyController } from './presentation/mobile-money.controller';

/**
 * Module `mobile-money` (phase 4) : mode déclaré et mode agrégateur.
 * Propriétaire exclusif de `mobile_money_transactions`. Exporte le registre
 * de fournisseurs et la file de vérification pour que `webhooks` route les
 * webhooks entrants sans jamais comparer de nom de fournisseur lui-même.
 *
 * Phase 7 : publie aussi `MOMO_PAYOUT_INITIATOR` (`MomoPayoutService`, voir
 * `domain/ports.ts`), consommé par `owner-payouts` — non `@Global()`, ce
 * module reste importé explicitement (comme `PdfModule` par
 * `owner-statements`) plutôt que publié à toute l'application.
 */
@Module({
  imports: [OrganizationsModule],
  controllers: [MobileMoneyController],
  providers: [
    SimulatedMobileMoneyProvider,
    CinetPayProvider,
    MobileMoneyProviderRegistry,
    MomoVerifyQueue,
    MomoJobsService,
    MomoQueryService,
    MomoDeclarationsService,
    MomoAggregatorService,
    MomoVerificationService,
    MomoReconcileService,
    MomoPayoutService,
    { provide: MOMO_PAYOUT_INITIATOR, useExisting: MomoPayoutService },
  ],
  exports: [
    MobileMoneyProviderRegistry,
    MomoVerifyQueue,
    MomoQueryService,
    MomoVerificationService,
    MomoReconcileService,
    MOMO_PAYOUT_INITIATOR,
  ],
})
export class MobileMoneyModule {}
