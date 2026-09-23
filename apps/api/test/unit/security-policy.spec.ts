import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertApiKeyLimitNotReached,
  assertApiKeyRotatable,
  clampDenialWindow,
  isFamilyAlreadyRevoked,
  rotationGraceExpiresAt,
} from '../../src/modules/security/domain/security-policy';

describe('security-policy — sessions', () => {
  it('considère une famille non révoquée comme révocable', () => {
    expect(isFamilyAlreadyRevoked(null)).toBe(false);
  });

  it('considère une famille déjà révoquée comme déjà révoquée (idempotence)', () => {
    expect(isFamilyAlreadyRevoked(new Date('2026-09-01T00:00:00Z'))).toBe(true);
  });
});

describe('security-policy — plafond de clés d’API', () => {
  it('laisse passer sous le plafond', () => {
    expect(() => assertApiKeyLimitNotReached(4, 10)).not.toThrow();
  });

  it('refuse exactement au plafond (409 SECURITY.API_KEY_LIMIT_REACHED)', () => {
    expect(() => assertApiKeyLimitNotReached(10, 10)).toThrow(DomainError);
    try {
      assertApiKeyLimitNotReached(10, 10);
    } catch (error) {
      expect((error as DomainError).code).toBe('SECURITY.API_KEY_LIMIT_REACHED');
      expect((error as DomainError).status).toBe(409);
    }
  });

  it('refuse au-delà du plafond', () => {
    expect(() => assertApiKeyLimitNotReached(11, 10)).toThrow(DomainError);
  });
});

describe('security-policy — rotation de clés d’API', () => {
  it('autorise la rotation d’une clé ACTIVE', () => {
    expect(() => assertApiKeyRotatable('ACTIVE')).not.toThrow();
  });

  it('refuse la rotation d’une clé REVOKED (409 SECURITY.API_KEY_REVOKED)', () => {
    try {
      assertApiKeyRotatable('REVOKED');
      throw new Error('devait lever');
    } catch (error) {
      expect((error as DomainError).code).toBe('SECURITY.API_KEY_REVOKED');
    }
  });

  it('calcule l’échéance de grâce à N heures', () => {
    const now = new Date('2026-09-23T10:00:00Z');
    expect(rotationGraceExpiresAt(now, 24).toISOString()).toBe('2026-09-24T10:00:00.000Z');
  });

  it('grâce à 0 heure vaut coupure immédiate (échéance = maintenant)', () => {
    const now = new Date('2026-09-23T10:00:00Z');
    expect(rotationGraceExpiresAt(now, 0).getTime()).toBe(now.getTime());
  });
});

describe('security-policy — fenêtre des refus d’accès', () => {
  const now = new Date('2026-09-23T12:00:00Z');
  const lookbackDays = 30;

  it('sans bornes demandées, couvre exactement la fenêtre de repli', () => {
    const window = clampDenialWindow({}, now, lookbackDays);
    expect(window.to).toEqual(now);
    expect(window.from).toEqual(new Date('2026-08-24T12:00:00Z'));
  });

  it('une borne « from » plus ancienne que le repli est ramenée au repli', () => {
    const requested = new Date('2026-01-01T00:00:00Z');
    const window = clampDenialWindow({ from: requested }, now, lookbackDays);
    expect(window.from).toEqual(new Date('2026-08-24T12:00:00Z'));
  });

  it('une borne « from » à l’intérieur du repli est conservée', () => {
    const requested = new Date('2026-09-10T00:00:00Z');
    const window = clampDenialWindow({ from: requested }, now, lookbackDays);
    expect(window.from).toEqual(requested);
  });

  it('une borne « to » dans le futur est ramenée à maintenant', () => {
    const requested = new Date('2026-12-31T00:00:00Z');
    const window = clampDenialWindow({ to: requested }, now, lookbackDays);
    expect(window.to).toEqual(now);
  });

  it('une borne « to » passée est conservée', () => {
    const requested = new Date('2026-09-20T00:00:00Z');
    const window = clampDenialWindow({ to: requested }, now, lookbackDays);
    expect(window.to).toEqual(requested);
  });
});
