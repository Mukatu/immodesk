import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainExceptionFilter } from '../../src/shared/errors/domain-exception.filter';
import { DomainError } from '../../src/shared/errors/domain-error';
import { validateConfig } from '../../src/shared/config/config.schema';
import { scrubSecretUrl, serializeRequest } from '../../src/shared/logger/scrub-secret-url';
import {
  SkipWebhookRateLimit,
  WebhookRateLimitGuard,
} from '../../src/shared/throttler/webhook-rate-limit.guard';
import { SubscriptionMomoPurposeRegistrar } from '../../src/modules/subscriptions/infrastructure/subscription-momo-purpose.registrar';
import { PRODUCTION_MESSAGING } from './production-messaging.fixture';

/** Correctifs de la revue PR #62 : configuration (F7), journaux (F6, F8), garde de débit (F6), indice PTXN abonnement (M2). */

const PROD = {
  ...PRODUCTION_MESSAGING,
  DATABASE_URL: 'postgresql://immodesk_app:x@localhost:5440/immodesk',
  REDIS_URL: 'redis://localhost:6390',
  JWT_ALGORITHM: 'HS256',
  JWT_ACCESS_SECRET: 'un-secret-de-test-suffisamment-long',
  NODE_ENV: 'production',
  CURSOR_SECRET: 'cursor-secret-de-production-xx',
  OTP_PEPPER: 'pepper-de-production',
  WHATSAPP_APP_SECRET: 'whatsapp-app-secret-prod',
  WHATSAPP_VERIFY_TOKEN: 'whatsapp-verify-token-prod',
  SMS_GATEWAY_WEBHOOK_SECRET: 'sms-webhook-secret-prod',
  LINK_SIGNING_SECRET: 'link-signing-secret-de-production',
  MOMO_SIMULATOR_SECRET: 'momo-simulator-secret-prod',
  CORS_ALLOWED_ORIGINS: 'https://app.immodesk.cg',
  MOMO_WEBHOOK_BASE_URL: 'https://api.immodesk.cg',
  MOMO_PROVIDER_DEFAULT: 'OPENPAY',
  OPENPAY_API_KEY: 'cle',
  OPENPAY_CALLBACK_SECRET: 'Ab1_-'.repeat(8),
  TRUST_PROXY_HOPS: '1',
};

describe('configuration OpenPay (F7)', () => {
  it('N3 : exige TRUST_PROXY_HOPS >= 1 en production avec OpenPay (sinon req.ip = IP du proxy)', () => {
    expect(() => validateConfig({ ...PROD, TRUST_PROXY_HOPS: '0' })).toThrow(/TRUST_PROXY_HOPS/);
    expect(() => validateConfig({ ...PROD, TRUST_PROXY_HOPS: undefined })).toThrow(
      /TRUST_PROXY_HOPS/,
    );
  });

  it('N3 : sans OpenPay, TRUST_PROXY_HOPS reste libre', () => {
    expect(() =>
      validateConfig({
        ...PROD,
        MOMO_PROVIDER_DEFAULT: 'CINETPAY',
        CINETPAY_API_KEY: 'k',
        CINETPAY_SITE_ID: 's',
        CINETPAY_SECRET_KEY: 'x',
        OPENPAY_API_KEY: undefined,
        OPENPAY_CALLBACK_SECRET: undefined,
        TRUST_PROXY_HOPS: '0',
      }),
    ).not.toThrow();
  });

  it('accepte une configuration de production conforme', () => {
    expect(() => validateConfig(PROD)).not.toThrow();
  });

  it('exige https pour OPENPAY_BASE_URL en production', () => {
    expect(() =>
      validateConfig({ ...PROD, OPENPAY_BASE_URL: 'http://api.openpay-cg.com/v1' }),
    ).toThrow(/OPENPAY_BASE_URL/);
    expect(() =>
      validateConfig({ ...PROD, OPENPAY_BASE_URL: 'https://api.openpay-cg.com/v1' }),
    ).not.toThrow();
  });

  it.each([
    'a/b'.repeat(12),
    'secret avec espace '.repeat(3),
    'sécrèt-'.repeat(6),
    'a?b=c'.repeat(8),
  ])('refuse un secret de callback hors du jeu A-Za-z0-9_- : %s', (secret) => {
    expect(() => validateConfig({ ...PROD, OPENPAY_CALLBACK_SECRET: secret })).toThrow(
      /OPENPAY_CALLBACK_SECRET/,
    );
  });

  it('refuse un secret de moins de 32 caractères en production', () => {
    expect(() => validateConfig({ ...PROD, OPENPAY_CALLBACK_SECRET: 'court' })).toThrow(/32/);
  });

  it('valide chaque IP de l’allowlist au démarrage', () => {
    expect(() =>
      validateConfig({ ...PROD, OPENPAY_CALLBACK_IP_ALLOWLIST: '203.0.113.9, 2001:db8::1' }),
    ).not.toThrow();
    expect(() =>
      validateConfig({ ...PROD, OPENPAY_CALLBACK_IP_ALLOWLIST: '203.0.113.9, pas-une-ip' }),
    ).toThrow(/OPENPAY_CALLBACK_IP_ALLOWLIST/);
    expect(() =>
      validateConfig({ ...PROD, OPENPAY_CALLBACK_IP_ALLOWLIST: '203.0.113.0/24' }),
    ).toThrow(/OPENPAY_CALLBACK_IP_ALLOWLIST/);
  });
});

describe('segment secret jamais journalisé (F6, F8)', () => {
  it('scrubSecretUrl expurge le segment, garde le reste de l’URL', () => {
    expect(scrubSecretUrl('/v1/webhooks/mobile-money/openpay/SECRET123?x=1')).toBe(
      '/v1/webhooks/mobile-money/openpay/[expurgé]?x=1',
    );
    expect(scrubSecretUrl('/v1/health')).toBe('/v1/health');
    expect(scrubSecretUrl(undefined)).toBeUndefined();
  });

  it('le sérialiseur de requête conserve remoteAddress (requête déjà sérialisée) et expurge l’URL', () => {
    const out = serializeRequest({
      id: 'r1',
      method: 'POST',
      url: '/v1/webhooks/mobile-money/openpay/SECRET123',
      remoteAddress: '203.0.113.9',
    });
    expect(out.remoteAddress).toBe('203.0.113.9');
    expect(out.url).not.toContain('SECRET123');
  });

  it('DomainExceptionFilter ne journalise jamais le segment secret d’une erreur serveur', () => {
    const lines: string[] = [];
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation((m: unknown) => {
      lines.push(String(m));
    });
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ json }), setHeader: jest.fn() }),
        getRequest: () => ({
          method: 'POST',
          url: '/v1/webhooks/mobile-money/openpay/SECRET123',
          headers: {},
        }),
      }),
    };
    new DomainExceptionFilter().catch(new Error('boom'), host as never);
    spy.mockRestore();
    expect(lines.join('\n')).toContain('/openpay/[expurgé]');
    expect(lines.join('\n')).not.toContain('SECRET123');
  });
});

describe('WebhookRateLimitGuard : route exclue (F6)', () => {
  class Routes {
    @SkipWebhookRateLimit()
    openpay(): void {}
    other(): void {}
  }
  const ctx = (handler: () => void) =>
    ({
      getHandler: () => handler,
      getClass: () => Routes,
      switchToHttp: () => ({ getRequest: () => ({ ip: '1.1.1.1' }) }),
    }) as never;
  const build = () => {
    const redis = { incr: jest.fn().mockResolvedValue(999), expire: jest.fn() };
    const config = { get: (k: string) => (k === 'RATE_LIMIT_WEBHOOK_PER_MINUTE' ? 1 : 'p') };
    return {
      redis,
      guard: new WebhookRateLimitGuard(redis as never, config as never, new Reflector()),
    };
  };

  it('une route marquée n’est jamais comptée ni refusée (pas de 429)', async () => {
    const { guard, redis } = build();
    const routes = new Routes();
    await expect(guard.canActivate(ctx(routes.openpay))).resolves.toBe(true);
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it('une route non marquée reste limitée', async () => {
    const { guard } = build();
    await expect(guard.canActivate(ctx(new Routes().other))).rejects.toBeInstanceOf(DomainError);
  });
});

describe('abonnement : l’indice PTXN du callback est transmis (M2)', () => {
  it('enqueueVerify et verifyNow propagent l’indice et l’origine', async () => {
    let handler: {
      enqueueVerify: (o: string, t: string, h?: unknown) => Promise<void>;
      verifyNow: (o: string, t: string, h?: unknown) => Promise<void>;
    } | null = null;
    const router = { register: (_p: string, h: typeof handler) => (handler = h) };
    const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const payments = { verifyStatus: jest.fn().mockResolvedValue(undefined) };
    new SubscriptionMomoPurposeRegistrar(
      router as never,
      queue as never,
      payments as never,
    ).onModuleInit();
    await handler!.enqueueVerify('o', 't', { providerReference: 'PTXN1234ABCD' });
    expect(queue.enqueue).toHaveBeenCalledWith({
      organizationId: 'o',
      transactionId: 't',
      providerReferenceHint: 'PTXN1234ABCD',
    });
    await handler!.enqueueVerify('o', 't');
    expect(queue.enqueue).toHaveBeenLastCalledWith({ organizationId: 'o', transactionId: 't' });
    const hint = { providerReference: 'PTXN1234ABCD', origin: 'RECONCILE' };
    await handler!.verifyNow('o', 't', hint);
    expect(payments.verifyStatus).toHaveBeenCalledWith('o', 't', hint);
  });
});
