import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../../shared/config/config.module';
import { ORGANIZATION_SETUP_LISTENERS } from '../organizations/domain/ports';
import { MessageLogsService } from './application/message-logs.service';
import { NotificationDeliveryService } from './application/notification-delivery.service';
import { NotificationPipelineService } from './application/notification-pipeline.service';
import { NotificationsService } from './application/notifications.service';
import { TemplateSeeder, TemplatesService } from './application/templates.service';
import { WebhooksService } from './application/webhooks.service';
import { NOTIFICATION_ENQUEUER, SMS_PROVIDER, WHATSAPP_PROVIDER } from './domain/ports';
import { AndroidGatewaySmsProvider } from './infrastructure/android-gateway-sms.provider';
import { FakeSmsProvider, FakeWhatsAppProvider } from './infrastructure/fake-sms.provider';
import { MetaWhatsAppProvider } from './infrastructure/meta-whatsapp.provider';
import { NotificationsWorker } from './infrastructure/notifications.worker';
import {
  NotificationsController,
  WebhooksController,
} from './presentation/notifications.controller';

/**
 * Module de messagerie : WhatsApp d'abord (Meta Cloud API en direct), SMS
 * en repli (passerelle open source sur téléphone Android).
 *
 * Le fournisseur est choisi par configuration (`WHATSAPP_PROVIDER=meta|fake`,
 * `SMS_PROVIDER=android_gateway|fake`) derrière les jetons `WHATSAPP_PROVIDER`
 * et `SMS_PROVIDER` : aucun code appelant ne connaît l'implémentation.
 */
@Global()
@Module({
  controllers: [NotificationsController, WebhooksController],
  providers: [
    FakeSmsProvider,
    FakeWhatsAppProvider,
    MetaWhatsAppProvider,
    AndroidGatewaySmsProvider,
    {
      provide: SMS_PROVIDER,
      inject: [AppConfigService, FakeSmsProvider, AndroidGatewaySmsProvider],
      useFactory: (
        config: AppConfigService,
        fake: FakeSmsProvider,
        gateway: AndroidGatewaySmsProvider,
      ) => (config.get('SMS_PROVIDER') === 'android_gateway' ? gateway : fake),
    },
    {
      provide: WHATSAPP_PROVIDER,
      inject: [AppConfigService, FakeWhatsAppProvider, MetaWhatsAppProvider],
      useFactory: (
        config: AppConfigService,
        fake: FakeWhatsAppProvider,
        meta: MetaWhatsAppProvider,
      ) => (config.get('WHATSAPP_PROVIDER') === 'meta' ? meta : fake),
    },
    NotificationsService,
    NotificationPipelineService,
    NotificationDeliveryService,
    NotificationsWorker,
    TemplatesService,
    TemplateSeeder,
    MessageLogsService,
    WebhooksService,
    { provide: NOTIFICATION_ENQUEUER, useExisting: NotificationPipelineService },
    {
      provide: ORGANIZATION_SETUP_LISTENERS,
      useFactory: (seeder: TemplateSeeder) => [seeder],
      inject: [TemplateSeeder],
    },
  ],
  exports: [
    NotificationsService,
    SMS_PROVIDER,
    WHATSAPP_PROVIDER,
    FakeSmsProvider,
    FakeWhatsAppProvider,
    NOTIFICATION_ENQUEUER,
    NotificationPipelineService,
    NotificationDeliveryService,
    NotificationsWorker,
    TemplatesService,
    ORGANIZATION_SETUP_LISTENERS,
  ],
})
export class NotificationsModule {}
