import { DEV_SECRET_DEFAULTS, validateConfig } from '../../src/shared/config/config.schema';

/**
 * Les secrets ont une valeur de développement par défaut, publique par
 * construction. La configuration doit refuser de démarrer en production
 * tant qu'une seule de ces valeurs subsiste.
 */
const BASE = {
  DATABASE_URL: 'postgresql://immodesk_app:x@localhost:5440/immodesk',
  REDIS_URL: 'redis://localhost:6390',
  JWT_ALGORITHM: 'HS256',
  JWT_ACCESS_SECRET: 'un-secret-de-test-suffisamment-long',
};

const PRODUCTION_SECRETS = {
  CURSOR_SECRET: 'cursor-secret-de-production-xx',
  OTP_PEPPER: 'pepper-de-production',
  WHATSAPP_APP_SECRET: 'whatsapp-app-secret-prod',
  WHATSAPP_VERIFY_TOKEN: 'whatsapp-verify-token-prod',
  SMS_GATEWAY_WEBHOOK_SECRET: 'sms-webhook-secret-prod',
  LINK_SIGNING_SECRET: 'link-signing-secret-de-production',
  MOMO_SIMULATOR_SECRET: 'momo-simulator-secret-prod',
};

describe('configuration : secrets de développement en production', () => {
  it('accepte les valeurs par défaut hors production', () => {
    expect(() => validateConfig({ ...BASE, NODE_ENV: 'development' })).not.toThrow();
    expect(() => validateConfig({ ...BASE, NODE_ENV: 'test' })).not.toThrow();
  });

  it('refuse le démarrage en production tant qu’un secret garde sa valeur de développement', () => {
    expect(() => validateConfig({ ...BASE, NODE_ENV: 'production' })).toThrow(
      /CURSOR_SECRET garde sa valeur de développement/,
    );
  });

  it.each(Object.keys(DEV_SECRET_DEFAULTS))(
    'nomme précisément %s lorsqu’il est en cause',
    (key) => {
      const raw = { ...BASE, ...PRODUCTION_SECRETS, NODE_ENV: 'production', [key]: undefined };
      expect(() => validateConfig(raw)).toThrow(
        new RegExp(`${key} garde sa valeur de développement`),
      );
    },
  );

  it('démarre en production quand tous les secrets ont été remplacés', () => {
    expect(() =>
      validateConfig({
        ...BASE,
        ...PRODUCTION_SECRETS,
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.immodesk.cg',
      }),
    ).not.toThrow();
  });

  it('CORS_ALLOWED_ORIGINS : liste séparée par des virgules, vide = non défini', () => {
    const empty = validateConfig({ ...BASE, CORS_ALLOWED_ORIGINS: ' ' });
    expect(empty.CORS_ALLOWED_ORIGINS).toBeUndefined();
    const listed = validateConfig({
      ...BASE,
      CORS_ALLOWED_ORIGINS: 'https://app.immodesk.cg, https://portail.immodesk.cg',
    });
    expect(listed.CORS_ALLOWED_ORIGINS).toEqual([
      'https://app.immodesk.cg',
      'https://portail.immodesk.cg',
    ]);
  });
});

describe('configuration : CORS_ALLOWED_ORIGINS obligatoire en production', () => {
  it('refuse le démarrage en production quand CORS_ALLOWED_ORIGINS est absent', () => {
    expect(() =>
      validateConfig({ ...BASE, ...PRODUCTION_SECRETS, NODE_ENV: 'production' }),
    ).toThrow(/CORS_ALLOWED_ORIGINS est obligatoire en production/);
  });

  it('démarre en production quand CORS_ALLOWED_ORIGINS est renseigné', () => {
    expect(() =>
      validateConfig({
        ...BASE,
        ...PRODUCTION_SECRETS,
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.immodesk.cg',
      }),
    ).not.toThrow();
  });

  it('démarre en développement sans CORS_ALLOWED_ORIGINS (repli permissif toléré)', () => {
    expect(() => validateConfig({ ...BASE, NODE_ENV: 'development' })).not.toThrow();
  });
});
