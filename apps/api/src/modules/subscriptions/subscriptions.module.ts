import { Module } from '@nestjs/common';
import { MobileMoneyModule } from '../mobile-money/mobile-money.module';
import { ReferralModule } from '../referral/referral.module';
import { SubscriptionBillingRunService } from './application/subscription-billing-run.service';
import { SubscriptionInvoicesService } from './application/subscription-invoices.service';
import { SubscriptionPaymentsService } from './application/subscription-payments.service';
import { SubscriptionPlansService } from './application/subscription-plans.service';
import { SubscriptionsService } from './application/subscriptions.service';
import { SubscriptionWebhookIngestService } from './application/subscription-webhook-ingest.service';
import { SubscriptionBillingCronScheduler } from './infrastructure/subscription-billing.cron.scheduler';
import { SubscriptionMomoVerifyQueue } from './infrastructure/subscription-momo-verify.queue';
import { SubscriptionMomoVerifyWorker } from './infrastructure/subscription-momo-verify.worker';
import { SubscriptionInvoicesController } from './presentation/subscription-invoices.controller';
import { SubscriptionPlansController } from './presentation/subscription-plans.controller';
import { SubscriptionsController } from './presentation/subscriptions.controller';
import { SubscriptionWebhooksController } from './presentation/subscription-webhooks.controller';

/**
 * Module `subscriptions` (phase 10) : catalogue (`GET /v1/subscription-plans`),
 * abonnement d'une organisation (`GET`/`POST /v1/organizations/{id}/subscription`,
 * `.../cancel`), ses factures (`GET .../subscription-invoices`,
 * `POST /v1/subscription-invoices/{id}/pay`) et le webhook Mobile Money dédié
 * (`POST /v1/webhooks/mobile-money/subscription`) — voir
 * docs/api/phase10-contract.md.
 *
 * Importe `MobileMoneyModule` (registre de fournisseurs, non `@Global()`) et
 * `ReferralModule` (pour `ReferralQualificationService.onSubscriptionInvoicePaid`,
 * appelé par `SubscriptionPaymentsService` juste après qu'une facture passe
 * réellement à PAID — jamais l'inverse, pour éviter tout cycle). N'importe
 * JAMAIS `WebhooksModule` : voir le commentaire d'ordre d'import dans
 * `app.module.ts`.
 *
 * `SubscriptionBillingCronScheduler` et `SubscriptionMomoVerifyWorker` sont
 * déclarés en providers pour que Nest les instancie (leurs hooks
 * `OnModuleInit` démarrent le cron/la file) sans qu'aucun autre module ne les
 * injecte.
 */
@Module({
  imports: [MobileMoneyModule, ReferralModule],
  controllers: [
    SubscriptionPlansController,
    SubscriptionsController,
    SubscriptionInvoicesController,
    SubscriptionWebhooksController,
  ],
  providers: [
    SubscriptionPlansService,
    SubscriptionsService,
    SubscriptionInvoicesService,
    SubscriptionPaymentsService,
    SubscriptionWebhookIngestService,
    SubscriptionBillingRunService,
    SubscriptionMomoVerifyQueue,
    SubscriptionMomoVerifyWorker,
    SubscriptionBillingCronScheduler,
  ],
})
export class SubscriptionsModule {}
