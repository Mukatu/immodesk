import type { ExecutionContext } from '@nestjs/common';
import type Redis from 'ioredis';
import type { AppConfigService } from '../../src/shared/config/config.module';
import { DomainError } from '../../src/shared/errors/domain-error';
import { WebhookRateLimitGuard } from '../../src/shared/throttler/webhook-rate-limit.guard';

/** Tests unitaires purs : compteur Redis simule en memoire. */

function build(limit: number, redisFails = false) {
  const counters = new Map<string, number>();
  const redis = {
    incr: async (k: string) => {
      if (redisFails) throw new Error('redis down');
      const n = (counters.get(k) ?? 0) + 1;
      counters.set(k, n);
      return n;
    },
    expire: async () => 1,
  } as unknown as Redis;
  const config = {
    get: (k: string) => (k === 'RATE_LIMIT_WEBHOOK_PER_MINUTE' ? limit : 'immodesk'),
  } as unknown as AppConfigService;
  const guard = new WebhookRateLimitGuard(redis, config);
  const ctx = (ip: string) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ ip }) }) }) as unknown as ExecutionContext;
  return { guard, ctx };
}

describe('WebhookRateLimitGuard', () => {
  it('laisse passer jusqu a la limite puis refuse en IAM.RATE_LIMITED (429)', async () => {
    const { guard, ctx } = build(3);
    for (let i = 0; i < 3; i += 1)
      await expect(guard.canActivate(ctx('1.1.1.1'))).resolves.toBe(true);
    const error = await guard.canActivate(ctx('1.1.1.1')).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('IAM.RATE_LIMITED');
    expect((error as DomainError).status).toBe(429);
    expect((error as DomainError).details?.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('compte par IP', async () => {
    const { guard, ctx } = build(1);
    await expect(guard.canActivate(ctx('1.1.1.1'))).resolves.toBe(true);
    await expect(guard.canActivate(ctx('2.2.2.2'))).resolves.toBe(true);
    await expect(guard.canActivate(ctx('1.1.1.1'))).rejects.toBeInstanceOf(DomainError);
  });

  it('panne Redis : la route reste servie', async () => {
    const { guard, ctx } = build(1, true);
    await expect(guard.canActivate(ctx('1.1.1.1'))).resolves.toBe(true);
  });
});
