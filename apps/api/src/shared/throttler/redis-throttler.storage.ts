import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

const PREFIX = 'immodesk:throttle';

/**
 * Stockage Redis pour `@nestjs/throttler`.
 *
 * Redis (et non la mémoire du processus) est indispensable : la limitation
 * de débit des OTP doit tenir même avec plusieurs instances d'API, sinon un
 * attaquant multiplie son quota par le nombre de répliques.
 *
 * Les durées reçues de `@nestjs/throttler` sont en millisecondes ; celles
 * renvoyées dans `ThrottlerStorageRecord` sont en secondes.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `${PREFIX}:${throttlerName}:${key}`;
    const blockKey = `${hitKey}:blocked`;

    const blockedFor = await this.redis.pttl(blockKey);
    if (blockedFor > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: toSeconds(blockedFor),
        isBlocked: true,
        timeToBlockExpire: toSeconds(blockedFor),
      };
    }

    const totalHits = await this.redis.incr(hitKey);
    if (totalHits === 1) {
      await this.redis.pexpire(hitKey, ttl);
    }

    let remaining = await this.redis.pttl(hitKey);
    if (remaining < 0) {
      await this.redis.pexpire(hitKey, ttl);
      remaining = ttl;
    }

    if (totalHits > limit) {
      const penalty = blockDuration > 0 ? blockDuration : remaining;
      await this.redis.set(blockKey, '1', 'PX', penalty);
      return {
        totalHits,
        timeToExpire: toSeconds(remaining),
        isBlocked: true,
        timeToBlockExpire: toSeconds(penalty),
      };
    }

    return {
      totalHits,
      timeToExpire: toSeconds(remaining),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  /** Remise à zéro d'un compteur précis (tests d'intégration uniquement). */
  async reset(throttlerName: string, key: string): Promise<void> {
    const hitKey = `${PREFIX}:${throttlerName}:${key}`;
    await this.redis.del(hitKey, `${hitKey}:blocked`);
  }

  /**
   * Purge tous les compteurs de limitation de débit.
   *
   * Réservé aux tests d'intégration : `@nestjs/throttler` condense le
   * traqueur en une empreinte avant d'appeler le stockage, si bien qu'une
   * remise à zéro ciblée par numéro ou par IP ne retrouverait pas la clé.
   */
  async resetAll(): Promise<number> {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${PREFIX}:*`, 'COUNT', 500);
      cursor = next;
      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }
}

function toSeconds(milliseconds: number): number {
  return Math.max(0, Math.ceil(milliseconds / 1000));
}
