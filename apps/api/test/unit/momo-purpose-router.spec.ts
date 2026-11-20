import { MomoPurposeRouter } from '../../src/modules/mobile-money/application/momo-purpose-router';
import { MomoReconcileService } from '../../src/modules/mobile-money/application/momo-reconcile.service';
import { CinetPayProvider } from '../../src/modules/mobile-money/infrastructure/cinetpay.provider';
import { validateConfig } from '../../src/shared/config/config.schema';

describe('MomoPurposeRouter', () => {
  const build = () => {
    const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const verification = { verifyStatus: jest.fn().mockResolvedValue(undefined) };
    return {
      queue,
      verification,
      router: new MomoPurposeRouter(queue as never, verification as never),
    };
  };

  it('loyers et reversements sont intégrés, abonnement inscrit au démarrage', async () => {
    const { router, queue, verification } = build();
    expect(router.handlerFor('SUBSCRIPTION')).toBeNull();
    await router.handlerFor('RENT_COLLECTION')?.enqueueVerify('o', 't');
    expect(queue.enqueue).toHaveBeenCalledWith({ organizationId: 'o', transactionId: 't' });
    await router.handlerFor('OWNER_PAYOUT')?.verifyNow('o', 't');
    expect(verification.verifyStatus).toHaveBeenCalledWith('o', 't');
  });

  it('une double inscription lève une erreur', () => {
    const { router } = build();
    const handler = { enqueueVerify: jest.fn(), verifyNow: jest.fn() };
    router.register('SUBSCRIPTION', handler);
    expect(() => router.register('SUBSCRIPTION', handler)).toThrow();
  });
});

describe('MomoReconcileService : routage par purpose', () => {
  it('chaque ligne est confiée au traitement de son purpose', async () => {
    const old = new Date('2026-09-10T08:00:00Z');
    const base = {
      organization_id: 'org-1',
      initiated_at: old,
      status_checked_at: null,
      status_check_count: 0,
      external_reference: 'x',
    };
    const rows = [
      { ...base, id: 'a', purpose: 'RENT_COLLECTION' },
      { ...base, id: 'b', purpose: 'SUBSCRIPTION' },
      { ...base, id: 'c', purpose: 'OWNER_PAYOUT' },
    ];
    const admin = {
      $queryRawUnsafe: jest.fn().mockResolvedValue(rows),
      organization_settings: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const mk = () => ({
      enqueueVerify: jest.fn(),
      verifyNow: jest.fn().mockResolvedValue(undefined),
    });
    const handlers = { RENT_COLLECTION: mk(), SUBSCRIPTION: mk(), OWNER_PAYOUT: mk() };
    const router = {
      handlerFor: (p: keyof typeof handlers) => handlers[p],
    };
    const service = new MomoReconcileService(
      { adminClient: () => admin } as never,
      router as never,
      {} as never,
      { get: () => 60 } as never,
      { forCode: jest.fn() } as never,
      { notifyOutcome: jest.fn() } as never,
    );
    const result = await service.reconcilePending(new Date('2026-09-10T08:10:00Z'));
    expect(result.rechecked).toBe(3);
    expect(handlers.RENT_COLLECTION.verifyNow).toHaveBeenCalledWith('org-1', 'a', {
      origin: 'RECONCILE',
    });
    expect(handlers.SUBSCRIPTION.verifyNow).toHaveBeenCalledWith('org-1', 'b', {
      origin: 'RECONCILE',
    });
    expect(handlers.OWNER_PAYOUT.verifyNow).toHaveBeenCalledWith('org-1', 'c', {
      origin: 'RECONCILE',
    });
    expect(admin.$queryRawUnsafe.mock.calls[0][0]).toContain('purpose');
  });
});

describe('CinetPayProvider : webhooks défensifs', () => {
  const secret = 's3cret-cinetpay';
  const build = (key: string | undefined = secret) =>
    new CinetPayProvider({
      get: (name: string) => (name === 'CINETPAY_SECRET_KEY' ? key : 'x'),
    } as never);
  const raw = (body: unknown, headers: Record<string, string> = { 'x-token': 'abc' }) => ({
    headers,
    body,
    rawBody: Buffer.alloc(0),
  });

  it.each([[null], [[]], ['x'], [{}], [42]])(
    'verifyWebhook(%j) renvoie false sans jeter',
    (body) => {
      expect(build().verifyWebhook(raw(body))).toBe(false);
    },
  );

  it('verifyWebhook sans secret configuré : false, sans exception', () => {
    expect(build(undefined).verifyWebhook(raw({ cpm_trans_id: 'a' }))).toBe(false);
  });

  it.each([[null], [[]], ['x'], [{}], [{ cpm_trans_id: 3 }]])(
    'parseWebhook(%j) lève une DomainError contrôlée',
    (body) => {
      expect(() => build().parseWebhook(raw(body))).toThrow(
        expect.objectContaining({ code: 'VALIDATION.INVALID_PAYLOAD' }),
      );
    },
  );

  it('initiate sans callbackUrl : rejeté avant tout appel réseau', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(
      build().initiate({
        amount: 1000n,
        currency: 'XAF',
        payerMsisdn: '+242066000001',
        operator: 'MTN',
        externalReference: 'e',
        description: 'd',
        callbackUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'PLATFORM.INTERNAL_ERROR' });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('initiate transmet notify_url', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ json: () => Promise.resolve({ code: '201' }) } as never);
    await build().initiate({
      amount: 1000n,
      currency: 'XAF',
      payerMsisdn: '+242066000001',
      operator: 'MTN',
      externalReference: 'e',
      description: 'd',
      callbackUrl: 'https://api.example.cg/v1/webhooks/mobile-money/cinetpay',
    });
    const sent = JSON.parse((fetchSpy.mock.calls[0]?.[1] as { body: string }).body) as {
      notify_url: string;
    };
    expect(sent.notify_url).toBe('https://api.example.cg/v1/webhooks/mobile-money/cinetpay');
    fetchSpy.mockRestore();
  });
});

describe('configuration : MOMO_WEBHOOK_BASE_URL en production', () => {
  const PROD = {
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
    MOMO_PROVIDER_DEFAULT: 'CINETPAY',
    CINETPAY_API_KEY: 'k',
    CINETPAY_SITE_ID: 's',
    CINETPAY_SECRET_KEY: 'x',
  };

  it.each([
    'http://localhost:3000',
    'http://api.immodesk.cg',
    'https://127.0.0.1',
    'https://10.0.0.4',
  ])('refuse %s avec un agrégateur réel', (url) => {
    expect(() => validateConfig({ ...PROD, MOMO_WEBHOOK_BASE_URL: url })).toThrow(
      /MOMO_WEBHOOK_BASE_URL/,
    );
  });

  it('accepte une URL https publique', () => {
    expect(() =>
      validateConfig({ ...PROD, MOMO_WEBHOOK_BASE_URL: 'https://api.immodesk.cg' }),
    ).not.toThrow();
  });

  it('hors production, le simulateur reste le défaut sans contrainte', () => {
    const {
      CINETPAY_API_KEY,
      CINETPAY_SITE_ID,
      CINETPAY_SECRET_KEY,
      MOMO_PROVIDER_DEFAULT,
      ...rest
    } = PROD;
    void [CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_SECRET_KEY, MOMO_PROVIDER_DEFAULT];
    const dev = { ...rest, NODE_ENV: 'development' };
    expect(validateConfig(dev).MOMO_PROVIDER_DEFAULT).toBe('SIMULATOR');
    expect(
      validateConfig({ ...dev, MOMO_PROVIDER_DEFAULT: 'SIMULATOR' }).MOMO_PROVIDER_DEFAULT,
    ).toBe('SIMULATOR');
  });
});
