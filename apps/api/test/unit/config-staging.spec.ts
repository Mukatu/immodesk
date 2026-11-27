import {
  FakeSmsProvider,
  FakeWhatsAppProvider,
} from '../../src/modules/notifications/infrastructure/fake-sms.provider';
import type { AppConfigService } from '../../src/shared/config/config.module';
import { hasStagingLabel, validateConfig } from '../../src/shared/config/config.schema';
import { PRODUCTION_MESSAGING } from './production-messaging.fixture';

/**
 * Garde-fous de l'environnement de recette (`DEPLOYMENT_ENV=staging`) : c'est la seule
 * configuration où la messagerie simulée (codes de connexion écrits dans le journal)
 * est admise sur un serveur NODE_ENV=production.
 */
const SECRETS = {
  DATABASE_URL: 'postgresql://immodesk_app:x@postgres:5432/immodesk',
  REDIS_URL: 'redis://redis:6379',
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
  MOMO_PROVIDER_DEFAULT: 'OPENPAY',
  OPENPAY_CALLBACK_SECRET: 'Ab1_-'.repeat(8),
  TRUST_PROXY_HOPS: '1',
};

const STAGING = {
  ...SECRETS,
  DEPLOYMENT_ENV: 'staging',
  CORS_ALLOWED_ORIGINS: 'https://staging.immodesk.watuneed.fr',
  PUBLIC_WEB_BASE_URL: 'https://staging.immodesk.watuneed.fr',
  PUBLIC_API_BASE_URL: 'https://api.staging.immodesk.watuneed.fr',
  MOMO_WEBHOOK_BASE_URL: 'https://api.staging.immodesk.watuneed.fr',
  S3_ENDPOINT: 'http://immodesk-garage:3900',
  S3_PUBLIC_ENDPOINT: 'https://s3.staging.immodesk.watuneed.fr',
};

const PRODUCTION = {
  ...STAGING,
  ...PRODUCTION_MESSAGING,
  DEPLOYMENT_ENV: 'production',
  OPENPAY_API_KEY: 'cle-openpay',
  CORS_ALLOWED_ORIGINS: 'https://immodesk.watuneed.fr',
  PUBLIC_WEB_BASE_URL: 'https://immodesk.watuneed.fr',
  PUBLIC_API_BASE_URL: 'https://api.immodesk.watuneed.fr',
  MOMO_WEBHOOK_BASE_URL: 'https://api.immodesk.watuneed.fr',
  S3_PUBLIC_ENDPOINT: 'https://s3.immodesk.watuneed.fr',
};

describe('configuration : DEPLOYMENT_ENV', () => {
  it('vaut production par défaut : la recette n’est jamais implicite', () => {
    const { DEPLOYMENT_ENV: _omis, ...sansVariable } = PRODUCTION;
    expect(validateConfig(sansVariable).DEPLOYMENT_ENV).toBe('production');
  });

  it('démarre une recette conforme avec la messagerie simulée', () => {
    const cfg = validateConfig(STAGING);
    expect(cfg.DEPLOYMENT_ENV).toBe('staging');
    expect(cfg.WHATSAPP_PROVIDER).toBe('fake');
    expect(cfg.SMS_PROVIDER).toBe('fake');
  });

  it('démarre une production conforme', () => {
    expect(() => validateConfig(PRODUCTION)).not.toThrow();
  });

  it('refuse la recette hors NODE_ENV=production', () => {
    expect(() => validateConfig({ ...STAGING, NODE_ENV: 'development' })).toThrow(
      /DEPLOYMENT_ENV=staging exige NODE_ENV=production/,
    );
  });

  it.each(['PUBLIC_API_BASE_URL', 'PUBLIC_WEB_BASE_URL'])(
    'refuse la recette quand %s désigne un hôte de production',
    (key) => {
      expect(() =>
        validateConfig({ ...STAGING, [key]: 'https://api.immodesk.watuneed.fr' }),
      ).toThrow(new RegExp(`${key} doit désigner un hôte de recette`));
    },
  );

  it('n’accepte « staging » que comme libellé DNS entier', () => {
    expect(hasStagingLabel('https://api.staging.immodesk.watuneed.fr')).toBe(true);
    expect(hasStagingLabel('https://staging.immodesk.watuneed.fr/portail')).toBe(true);
    expect(hasStagingLabel('https://api.immodesk.watuneed.fr/staging')).toBe(false);
    expect(hasStagingLabel('https://nostaging.immodesk.watuneed.fr')).toBe(false);
    expect(hasStagingLabel('pas une url')).toBe(false);
  });
});

describe('configuration : messagerie simulée', () => {
  it.each(['WHATSAPP_PROVIDER', 'SMS_PROVIDER'])('refuse %s=fake en production', (key) => {
    expect(() => validateConfig({ ...PRODUCTION, [key]: 'fake' })).toThrow(
      new RegExp(`${key}=fake est interdit en production`),
    );
  });

  it('refuse les valeurs par défaut (fake) en production', () => {
    const { WHATSAPP_PROVIDER: _w, SMS_PROVIDER: _s, ...defauts } = PRODUCTION;
    expect(() => validateConfig(defauts)).toThrow(/WHATSAPP_PROVIDER=fake est interdit/);
  });

  it('reste permise en développement', () => {
    expect(() =>
      validateConfig({
        DATABASE_URL: SECRETS.DATABASE_URL,
        REDIS_URL: SECRETS.REDIS_URL,
        JWT_ACCESS_SECRET: SECRETS.JWT_ACCESS_SECRET,
      }),
    ).not.toThrow();
  });
});

describe('configuration : la recette garde les autres durcissements', () => {
  it('refuse OTP_DEV_CODE (aucun code fixe sur un serveur public)', () => {
    expect(() => validateConfig({ ...STAGING, OTP_DEV_CODE: '123456' })).toThrow(
      /OTP_DEV_CODE ne doit jamais être défini en production/,
    );
  });

  it('refuse le simulateur Mobile Money', () => {
    expect(() => validateConfig({ ...STAGING, MOMO_PROVIDER_DEFAULT: 'SIMULATOR' })).toThrow(
      /SIMULATOR est interdit en production/,
    );
  });

  it('refuse les secrets de développement', () => {
    expect(() => validateConfig({ ...STAGING, OTP_PEPPER: undefined })).toThrow(
      /OTP_PEPPER garde sa valeur de développement/,
    );
  });

  it('accepte OpenPay sans clé en recette, pas en production', () => {
    expect(() => validateConfig(STAGING)).not.toThrow();
    expect(() => validateConfig({ ...PRODUCTION, OPENPAY_API_KEY: undefined })).toThrow(
      /OPENPAY_API_KEY est obligatoire/,
    );
  });

  it('exige toujours TRUST_PROXY_HOPS >= 1 avec OpenPay', () => {
    expect(() => validateConfig({ ...STAGING, TRUST_PROXY_HOPS: '0' })).toThrow(/TRUST_PROXY_HOPS/);
  });
});

describe('configuration : adresse de signature du stockage', () => {
  it('refuse en production des URL signées vers une adresse interne', () => {
    expect(() => validateConfig({ ...STAGING, S3_PUBLIC_ENDPOINT: undefined })).toThrow(
      /S3_ENDPOINT/,
    );
    expect(() =>
      validateConfig({ ...STAGING, S3_PUBLIC_ENDPOINT: 'http://s3.staging.immodesk.watuneed.fr' }),
    ).toThrow(/S3_PUBLIC_ENDPOINT/);
  });

  it('accepte une adresse interne hors production', () => {
    expect(() =>
      validateConfig({
        DATABASE_URL: SECRETS.DATABASE_URL,
        REDIS_URL: SECRETS.REDIS_URL,
        JWT_ACCESS_SECRET: SECRETS.JWT_ACCESS_SECRET,
        S3_ENDPOINT: 'http://localhost:9010',
      }),
    ).not.toThrow();
  });
});

describe('fournisseurs simulés sur un serveur NODE_ENV=production (recette)', () => {
  const config = (isProduction: boolean) => ({ isProduction }) as unknown as AppConfigService;
  const numero = '+242066000099';

  it('SMS : pas d’échec simulé ni de rétention en mémoire', async () => {
    const recette = new FakeSmsProvider(config(true));
    const result = await recette.send({ to: numero, body: 'code', templateCode: 'OTP_CODE' });
    expect(result.status).toBe('SENT');
    expect(recette.sent).toHaveLength(0);
    expect(recette.peekLastMessage()).toBeNull();
  });

  it('WhatsApp : pas d’échec simulé ni de rétention en mémoire', async () => {
    const recette = new FakeWhatsAppProvider(config(true));
    const result = await recette.send({ to: numero, body: 'code', templateCode: 'OTP_CODE' });
    expect(result.status).toBe('SENT');
    expect(recette.sent).toHaveLength(0);
  });

  it('hors production, le comportement de développement est conservé', async () => {
    const dev = new FakeSmsProvider(config(false));
    const result = await dev.send({ to: numero, body: 'code', templateCode: 'OTP_CODE' });
    expect(result.status).toBe('FAILED');
    expect(dev.sent).toHaveLength(1);
  });
});
