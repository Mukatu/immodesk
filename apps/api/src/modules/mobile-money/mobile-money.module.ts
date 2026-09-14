import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MomoAggregatorService } from './application/momo-aggregator.service';
import { MomoDeclarationsService } from './application/momo-declarations.service';
import { MomoQueryService } from './application/momo-query.service';
import { MomoReconcileService } from './application/momo-reconcile.service';
import { MomoVerificationService } from './application/momo-verification.service';
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
  ],
  exports: [
    MobileMoneyProviderRegistry,
    MomoVerifyQueue,
    MomoQueryService,
    MomoVerificationService,
    MomoReconcileService,
  ],
})
export class MobileMoneyModule {}
