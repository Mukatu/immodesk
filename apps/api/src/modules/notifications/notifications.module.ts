import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './application/notifications.service';
import { SMS_PROVIDER, WHATSAPP_PROVIDER } from './domain/ports';
import { FakeSmsProvider, FakeWhatsAppProvider } from './infrastructure/fake-sms.provider';

/**
 * Module de messagerie sortante.
 *
 * Phase 0 : seules les implémentations simulées sont branchées. Les
 * passerelles réelles (SMS local, WhatsApp Cloud API) se substitueront
 * derrière les mêmes jetons `SMS_PROVIDER` / `WHATSAPP_PROVIDER` sans
 * modifier le code appelant.
 */
@Global()
@Module({
  providers: [
    FakeSmsProvider,
    FakeWhatsAppProvider,
    { provide: SMS_PROVIDER, useExisting: FakeSmsProvider },
    { provide: WHATSAPP_PROVIDER, useExisting: FakeWhatsAppProvider },
    NotificationsService,
  ],
  exports: [NotificationsService, SMS_PROVIDER, WHATSAPP_PROVIDER, FakeSmsProvider],
})
export class NotificationsModule {}
