import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { momo_purpose } from '../../src/generated/prisma/enums';
import { MomoPurposeRouter } from '../../src/modules/mobile-money/application/momo-purpose-router';
import { MomoReconcileService } from '../../src/modules/mobile-money/application/momo-reconcile.service';
import { MOMO_PURPOSES } from '../../src/modules/mobile-money/domain/momo-purpose';
import { MobileMoneyProviderRegistry } from '../../src/modules/mobile-money/infrastructure/mobile-money-provider.registry';
import { MomoVerifyQueue } from '../../src/modules/mobile-money/infrastructure/momo-verify.queue';
import { UpdateMobileMoneyAggregatorSettingsDto } from '../../src/modules/organizations/presentation/dto/operational-settings.dto';
import { validateConfig } from '../../src/shared/config/config.schema';

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
  MOMO_WEBHOOK_BASE_URL: 'https://api.immodesk.cg',
  CINETPAY_API_KEY: 'k',
  CINETPAY_SITE_ID: 's',
  CINETPAY_SECRET_KEY: 'x',
};

describe('configuration : simulateur interdit en production', () => {
  it('refuse MOMO_PROVIDER_DEFAULT=SIMULATOR', () => {
    expect(() => validateConfig({ ...PROD, MOMO_PROVIDER_DEFAULT: 'SIMULATOR' })).toThrow(
      /MOMO_PROVIDER_DEFAULT=SIMULATOR est interdit/,
    );
  });

  it('refuse une variable absente (pas de repli silencieux sur le simulateur)', () => {
    expect(() => validateConfig({ ...PROD })).toThrow(/MOMO_PROVIDER_DEFAULT est obligatoire/);
  });

  it('accepte CINETPAY', () => {
    const cfg = validateConfig({ ...PROD, MOMO_PROVIDER_DEFAULT: 'CINETPAY' });
    expect(cfg.MOMO_PROVIDER_DEFAULT).toBe('CINETPAY');
  });
});

describe('paramètres d’organisation : SIMULATOR rejeté en production', () => {
  const previous = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = previous;
  });
  const check = (provider: string) =>
    validate(plainToInstance(UpdateMobileMoneyAggregatorSettingsDto, { provider }));

  it('rejette SIMULATOR en production', async () => {
    process.env.NODE_ENV = 'production';
    const errors = await check('SIMULATOR');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('provider');
  });

  it('accepte CINETPAY en production et SIMULATOR hors production', async () => {
    process.env.NODE_ENV = 'production';
    expect(await check('CINETPAY')).toHaveLength(0);
    process.env.NODE_ENV = 'test';
    expect(await check('SIMULATOR')).toHaveLength(0);
  });
});

describe('MobileMoneyProviderRegistry : simulateur et OTHER', () => {
  const build = (production: boolean) =>
    new MobileMoneyProviderRegistry(
      { code: 'SIMULATOR' } as never,
      { code: 'CINETPAY' } as never,
      { code: 'OPENPAY' } as never,
      { isProduction: production } as never,
    );

  it('forCode(SIMULATOR) : disponible hors production, 404 en production', () => {
    expect(build(false).forCode('simulator')).toMatchObject({ code: 'SIMULATOR' });
    expect(() => build(true).forCode('simulator')).toThrow(
      expect.objectContaining({ code: 'PLATFORM.NOT_FOUND' }),
    );
    expect(build(true).forCode('cinetpay')).toMatchObject({ code: 'CINETPAY' });
  });

  it('forWebhookSource(OPENPAY) : rejeu par vérification de statut', () => {
    expect(build(false).forWebhookSource('OPENPAY')).toMatchObject({ code: 'OPENPAY' });
  });

  it.each(['OTHER', 'PAWAPAY'])('forWebhookSource(%s) : aucun parseur', (source) => {
    expect(() => build(false).forWebhookSource(source)).toThrow(
      expect.objectContaining({ code: 'PLATFORM.NOT_FOUND' }),
    );
  });

  it('forWebhookSource(CINETPAY) reste rejouable', () => {
    expect(build(false).forWebhookSource('CINETPAY')).toMatchObject({ code: 'CINETPAY' });
  });
});

describe('MomoVerifyQueue : file absente', () => {
  const build = (production: boolean) => new MomoVerifyQueue({ isProduction: production } as never);
  const job = { organizationId: 'o', transactionId: 't' };

  it('en production : erreur visible', async () => {
    await expect(build(true).enqueue(job)).rejects.toThrow(/non initialisée/);
  });

  it('hors production : sans effet, sans erreur', async () => {
    await expect(build(false).enqueue(job)).resolves.toBeUndefined();
  });
});

describe('MomoPurposeRouter : vérification au démarrage', () => {
  const build = () =>
    new MomoPurposeRouter({ enqueue: jest.fn() } as never, { verifyStatus: jest.fn() } as never);

  it('échoue tant que SUBSCRIPTION n’est pas inscrit', () => {
    expect(() => build().onApplicationBootstrap()).toThrow(/SUBSCRIPTION/);
  });

  it('passe quand tous les purposes ont un traitement', () => {
    const router = build();
    router.register('SUBSCRIPTION', { enqueueVerify: jest.fn(), verifyNow: jest.fn() });
    expect(() => router.onApplicationBootstrap()).not.toThrow();
  });

  it('MOMO_PURPOSES couvre exactement l’enum Prisma', () => {
    expect([...MOMO_PURPOSES].sort()).toEqual(Object.values(momo_purpose).sort());
  });
});

describe('MomoReconcileService : INITIATED et PENDING', () => {
  it('sélectionne les deux statuts avec un âge minimal propre à chacun', async () => {
    const admin = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          id: 'i1',
          organization_id: 'org-1',
          status: 'INITIATED',
          purpose: 'OWNER_PAYOUT',
          initiated_at: new Date('2026-09-10T08:00:00Z'),
          status_checked_at: null,
          status_check_count: 0,
          external_reference: 'x',
        },
      ]),
      organization_settings: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const verifyNow = jest.fn().mockResolvedValue(undefined);
    const service = new MomoReconcileService(
      { adminClient: () => admin } as never,
      { handlerFor: () => ({ verifyNow, enqueueVerify: jest.fn() }) } as never,
      {} as never,
      { get: () => 600 } as never,
      { forCode: jest.fn() } as never,
      { notifyOutcome: jest.fn() } as never,
    );
    // 5 h après l'initiation, délai d'expiration INITIATED de 10 h : re-interrogée, non expirée.
    const result = await service.reconcilePending(new Date('2026-09-10T13:00:00Z'));
    expect(result).toEqual({ rechecked: 1, expired: 0 });
    expect(verifyNow).toHaveBeenCalledWith('org-1', 'i1', { origin: 'RECONCILE' });
    const [sql, pendingAge, initiatedAge] = admin.$queryRawUnsafe.mock.calls[0] as [
      string,
      number,
      number,
    ];
    expect(sql).toContain("status = 'PENDING'");
    expect(sql).toContain("status = 'INITIATED'");
    expect(pendingAge).toBe(3);
    expect(initiatedAge).toBeGreaterThan(pendingAge);
  });
});
