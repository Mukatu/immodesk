import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import type { MobileMoneyProvider } from '../domain/ports';
import { CinetPayProvider } from './cinetpay.provider';
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
  ) {}

  forCode(code: string): MobileMoneyProvider {
    const normalized = code.toUpperCase();
    if (normalized === 'CINETPAY') return this.cinetpay;
    if (normalized === 'SIMULATOR') return this.simulator;
    throw new DomainError('PLATFORM.NOT_FOUND', { resource: 'mobile-money-provider', code });
  }
}
