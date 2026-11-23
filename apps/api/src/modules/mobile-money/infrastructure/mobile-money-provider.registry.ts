import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import type { MobileMoneyProvider } from '../domain/ports';
import { CinetPayProvider } from './cinetpay.provider';
import { OpenPayProvider } from './openpay.provider';
import { SimulatedMobileMoneyProvider } from './simulated-mobile-money.provider';

/**
 * Sélection du fournisseur Mobile Money agrégateur — LE SEUL endroit hors de
 * `infrastructure/` où le nom du fournisseur est comparé (architecture,
 * §8.2.2). `webhooks` importe ce registre pour router `/v1/webhooks/mobile-money/{provider}`
 * sans jamais connaître CinetPay ou le simulateur directement.
 */
@Injectable()
export class MobileMoneyProviderRegistry {
  constructor(
    private readonly simulator: SimulatedMobileMoneyProvider,
    private readonly cinetpay: CinetPayProvider,
    private readonly openpay: OpenPayProvider,
    private readonly config: AppConfigService,
  ) {}

  forCode(code: string): MobileMoneyProvider {
    const normalized = code.toUpperCase();
    if (normalized === 'CINETPAY') return this.cinetpay;
    if (normalized === 'OPENPAY') return this.openpay;
    // Défense en profondeur : le simulateur confirme n'importe quelle transaction.
    // En production il est introuvable (le webhook `/simulator` répond 404).
    if (normalized === 'SIMULATOR' && !this.config.isProduction) return this.simulator;
    throw new DomainError('PLATFORM.NOT_FOUND', { resource: 'mobile-money-provider', code });
  }

  /** Fournisseur d'un événement déjà journalisé (`webhook_events.source`), pour le rejeu. */
  forWebhookSource(source: string): MobileMoneyProvider {
    if (source === 'CINETPAY') return this.cinetpay;
    // OpenPay : le rejeu passe par une vérification de statut (`parseTrigger`
    // puis `getStatus`), jamais par le corps stocké (il n'est pas conservé).
    if (source === 'OPENPAY') return this.openpay;
    // `OTHER` (simulateur et sources inconnues) n'est rejoué par aucun parseur.
    throw new DomainError('PLATFORM.NOT_FOUND', { resource: 'mobile-money-provider', source });
  }
}
