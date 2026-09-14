import { Module } from '@nestjs/common';
import { MobileMoneyModule } from '../mobile-money/mobile-money.module';
import { MomoWebhookIngestService } from './application/momo-webhook-ingest.service';
import { WebhookEventsService } from './application/webhook-events.service';
import { MobileMoneyWebhooksController } from './presentation/mobile-money-webhooks.controller';
import { WebhookEventsController } from './presentation/webhook-events.controller';

/**
 * Module `webhooks` (phase 4) : réception signée, persistance brute dans
 * `webhook_events` avant tout traitement, journal et rejeu réservés OWNER.
 * Importe `mobile-money` pour le registre de fournisseurs et la file de
 * vérification — dépendance À SENS UNIQUE, `mobile-money` ignore `webhooks`.
 */
@Module({
  imports: [MobileMoneyModule],
  controllers: [WebhookEventsController, MobileMoneyWebhooksController],
  providers: [WebhookEventsService, MomoWebhookIngestService],
  exports: [WebhookEventsService],
})
export class WebhooksModule {}
