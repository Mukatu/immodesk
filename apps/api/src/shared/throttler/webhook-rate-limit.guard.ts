import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type Redis from 'ioredis';
import { AppConfigService } from '../config/config.module';
import { DomainError } from '../errors/domain-error';
import { REDIS_CLIENT } from '../redis/redis.module';

export const SKIP_WEBHOOK_RATE_LIMIT = 'skipWebhookRateLimit';

/**
 * Exclut une route de la garde commune : elle porte sa propre limite, qui ne doit jamais
 * produire de 429 (callback OpenPay : réponse toujours `200 {}`, voir `OpenPayApiLimiter`).
 */
export const SkipWebhookRateLimit = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_WEBHOOK_RATE_LIMIT, true);

/**
 * Limitation de débit des routes webhook PUBLIQUES (`/webhooks/*`) :
 * `RATE_LIMIT_WEBHOOK_PER_MINUTE` requêtes par minute et par IP, compteur
 * Redis partagé entre instances et entre toutes les routes webhook.
 *
 * L'IP est `request.ip` : elle ne reflète le client réel derrière un
 * reverse proxy que si `TRUST_PROXY_HOPS` est renseigné (voir bootstrap.ts).
 * En cas de panne Redis la route reste servie : les webhooks sont signés et
 * persistés bruts, en perdre sous panne coûterait plus qu'une rafale.
 */
@Injectable()
export class WebhookRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(WebhookRateLimitGuard.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfigService,
    @Optional() private readonly reflector?: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector?.getAllAndOverride<boolean | undefined>(SKIP_WEBHOOK_RATE_LIMIT, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'inconnue';
    const window = Math.floor(Date.now() / 60_000);
    const key = `${this.config.get('QUEUE_PREFIX')}:rl:webhook:${ip}:${window}`;
    let count = 0;
    try {
      count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 70);
    } catch (error) {
      this.logger.warn(`Compteur de débit indisponible : ${(error as Error).message}`);
      return true;
    }
    if (count > this.config.get('RATE_LIMIT_WEBHOOK_PER_MINUTE')) {
      throw new DomainError('IAM.RATE_LIMITED', {
        retryAfterSeconds: 60 - (Math.floor(Date.now() / 1000) % 60),
      });
    }
    return true;
  }
}
