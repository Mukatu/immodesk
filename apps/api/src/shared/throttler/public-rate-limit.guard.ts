import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import type Redis from 'ioredis';
import { AppConfigService } from '../config/config.module';
import { DomainError } from '../errors/domain-error';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * Limitation de débit des routes PUBLIQUES (vérification de quittance, liens
 * courts) : `RATE_LIMIT_PUBLIC_PER_MINUTE` requêtes par minute et par IP,
 * compteur Redis partagé entre instances.
 *
 * Distincte des limiteurs de l'OTP : ajouter un limiteur nommé à
 * `ThrottlerModule` l'appliquerait aussi à `/auth/otp/request`. En cas de
 * panne Redis, la route reste servie : une page de vérification
 * indisponible nuirait plus qu'une rafale de lectures.
 */
@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(PublicRateLimitGuard.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'inconnue';
    const window = Math.floor(Date.now() / 60_000);
    const key = `${this.config.get('QUEUE_PREFIX')}:rl:public:${ip}:${window}`;
    let count = 0;
    try {
      count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 70);
    } catch (error) {
      this.logger.warn(`Compteur de débit indisponible : ${(error as Error).message}`);
      return true;
    }
    if (count > this.config.get('RATE_LIMIT_PUBLIC_PER_MINUTE')) {
      throw new DomainError('IAM.RATE_LIMITED', {
        retryAfterSeconds: 60 - (Math.floor(Date.now() / 1000) % 60),
      });
    }
    return true;
  }
}
