import type { AppConfigService } from '../../../shared/config/config.module';

/**
 * `notify_url` transmise au fournisseur pour CHAQUE transaction : la même URL
 * pour les loyers, les abonnements et les reversements. Le routage se fait
 * par `mobile_money_transactions.purpose`, jamais par l'URL.
 */
export function buildMomoNotifyUrl(config: AppConfigService, providerCode: string): string {
  const base = config.get('MOMO_WEBHOOK_BASE_URL').replace(/\/+$/, '');
  return `${base}/${config.get('API_GLOBAL_PREFIX')}/webhooks/mobile-money/${providerCode.toLowerCase()}`;
}
