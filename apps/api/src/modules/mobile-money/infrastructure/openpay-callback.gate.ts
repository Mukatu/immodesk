import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { safeEqual } from '../domain/webhook-signature';

export type OpenPayCallbackAccess = 'OK' | 'NOT_CONFIGURED' | 'BAD_SECRET' | 'IP_DENIED';

/**
 * Contrôle d'accès du callback OpenPay (non signé) : segment secret d'URL
 * comparé en temps constant, puis allowlist d'IP optionnelle. L'IP est
 * `req.ip` : derrière un reverse proxy elle n'est celle d'OpenPay que si
 * `TRUST_PROXY_HOPS` est correctement renseigné.
 */
@Injectable()
export class OpenPayCallbackGate {
  private readonly logger = new Logger(OpenPayCallbackGate.name);

  constructor(private readonly config: AppConfigService) {}

  check(secretSegment: string | undefined, ip: string | null): OpenPayCallbackAccess {
    const secret = this.config.get('OPENPAY_CALLBACK_SECRET');
    if (!secret) return 'NOT_CONFIGURED';
    // Le rapport de longueur est indépendant du secret : `safeEqual` rejette les
    // longueurs différentes sans fuite utile (le secret fait au moins 32 caractères).
    if (typeof secretSegment !== 'string' || !safeEqual(secretSegment, secret)) return 'BAD_SECRET';
    const allowlist = this.config.get('OPENPAY_CALLBACK_IP_ALLOWLIST');
    if (allowlist && allowlist.length > 0) {
      const normalized = (ip ?? '').replace(/^::ffff:/, '');
      if (!allowlist.includes(normalized)) {
        this.logger.warn(`MOMO.OPENPAY_CALLBACK_IP_DENIED ip=${normalized || '-'}`);
        return 'IP_DENIED';
      }
    }
    return 'OK';
  }
}
