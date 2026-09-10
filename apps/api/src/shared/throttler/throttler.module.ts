import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/config.schema';
import { normalizePhoneE164 } from '../phone/e164';
import { RedisThrottlerStorage } from './redis-throttler.storage';

/** Noms des limiteurs, référencés par les décorateurs de contrôleur. */
export const THROTTLER_OTP_PHONE = 'otp-phone';
export const THROTTLER_OTP_IP = 'otp-ip';

/**
 * Limitation de débit de `/v1/auth/otp/request` :
 * 3 demandes / 10 min par numéro et 20 / heure par adresse IP
 * (docs/api/phase0-contract.md). Dépassement → 429 `IAM.RATE_LIMITED`.
 *
 * Le stockage vit dans son propre module (`ThrottlerStorageModule`) pour
 * pouvoir être injecté dans la fabrique asynchrone de `ThrottlerModule`,
 * qui ne voit que ses propres `imports`.
 */
@Module({
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class ThrottlerStorageModule {}

@Module({
  imports: [
    ThrottlerStorageModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [APP_CONFIG, RedisThrottlerStorage],
      useFactory: (config: AppConfig, storage: RedisThrottlerStorage) => ({
        storage,
        throttlers: [
          {
            name: THROTTLER_OTP_PHONE,
            limit: config.RATE_LIMIT_OTP_PER_PHONE,
            ttl: config.RATE_LIMIT_OTP_PHONE_WINDOW_SECONDS * 1000,
            // Le compteur porte sur le numéro NORMALISÉ : « 066000001 » et
            // « +242066000001 » désignent la même cible et partagent le quota.
            getTracker: (req: Record<string, any>) => trackByPhone(req as Request),
          },
          {
            name: THROTTLER_OTP_IP,
            limit: config.RATE_LIMIT_OTP_PER_IP,
            ttl: config.RATE_LIMIT_OTP_IP_WINDOW_SECONDS * 1000,
            getTracker: (req: Record<string, any>) => trackByIp(req as Request),
          },
        ],
      }),
    }),
  ],
  exports: [ThrottlerModule, ThrottlerStorageModule],
})
export class AppThrottlerModule {}

function trackByPhone(req: Request): string {
  const raw = (req.body as { phone?: unknown } | undefined)?.phone;
  if (typeof raw !== 'string') return `unknown:${trackByIp(req)}`;
  try {
    return `phone:${normalizePhoneE164(raw)}`;
  } catch {
    // Numéro illisible : on retombe sur l'IP pour ne pas offrir un quota
    // illimité à qui envoie des numéros malformés.
    return `invalid:${trackByIp(req)}`;
  }
}

function trackByIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return `ip:${(first ?? req.ip ?? 'inconnue').trim()}`;
}
