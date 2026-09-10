import {
  DEFAULT_OTP_POLICY,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  otpExpiresAt,
  otpHashMatches,
  reachesAttemptLimit,
  resendCooldownRemaining,
  verifyOtp,
  type OtpRecordSnapshot,
} from '../../src/modules/identity/domain/otp';

const PEPPER = 'poivre-de-test';
const PHONE = '+242066000001';
const NOW = new Date('2026-03-05T09:00:00.000Z');

function snapshot(overrides: Partial<OtpRecordSnapshot> = {}): OtpRecordSnapshot {
  return {
    codeHash: hashOtpCode('123456', PHONE, PEPPER),
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(NOW.getTime() + 300_000),
    consumedAt: null,
    ...overrides,
  };
}

describe('Génération du code OTP', () => {
  it('produit un code décimal de la longueur demandée', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateOtpCode(6)).toMatch(/^\d{6}$/);
    }
  });

  it('conserve les zéros de tête', () => {
    const codes = Array.from({ length: 500 }, () => generateOtpCode(4));
    expect(codes.every((c) => c.length === 4)).toBe(true);
  });
});

describe('Hachage du code OTP', () => {
  it('est déterministe pour un même triplet poivre/numéro/code', () => {
    expect(hashOtpCode('123456', PHONE, PEPPER)).toBe(hashOtpCode('123456', PHONE, PEPPER));
  });

  it('ne stocke jamais le code en clair', () => {
    const hash = hashOtpCode('123456', PHONE, PEPPER);
    expect(hash).not.toContain('123456');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('diffère si le poivre change (une fuite de base reste inexploitable)', () => {
    expect(hashOtpCode('123456', PHONE, PEPPER)).not.toBe(
      hashOtpCode('123456', PHONE, 'autre-poivre'),
    );
  });

  it('diffère si le numéro change, à code identique', () => {
    expect(hashOtpCode('123456', PHONE, PEPPER)).not.toBe(
      hashOtpCode('123456', '+242066000002', PEPPER),
    );
  });

  it('compare à temps constant sans se tromper de verdict', () => {
    const hash = hashOtpCode('123456', PHONE, PEPPER);
    expect(otpHashMatches(hash, hash)).toBe(true);
    expect(otpHashMatches(hashOtpCode('654321', PHONE, PEPPER), hash)).toBe(false);
    expect(otpHashMatches('court', hash)).toBe(false);
  });
});

describe('Expiration du code OTP', () => {
  it('expire cinq minutes après émission', () => {
    const expiresAt = otpExpiresAt(NOW, DEFAULT_OTP_POLICY);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(300_000);
  });

  it("n'est pas expiré une seconde avant l'échéance", () => {
    const expiresAt = otpExpiresAt(NOW, DEFAULT_OTP_POLICY);
    expect(isOtpExpired(expiresAt, new Date(expiresAt.getTime() - 1000))).toBe(false);
  });

  it('est expiré à la seconde exacte de l’échéance', () => {
    const expiresAt = otpExpiresAt(NOW, DEFAULT_OTP_POLICY);
    expect(isOtpExpired(expiresAt, expiresAt)).toBe(true);
  });

  it('refuse un code expiré même si la valeur est correcte', () => {
    const verdict = verifyOtp(
      snapshot({ expiresAt: new Date(NOW.getTime() - 1) }),
      '123456',
      PHONE,
      PEPPER,
      NOW,
    );
    expect(verdict.outcome).toBe('EXPIRED');
  });

  it('refuse un code déjà consommé (pas de rejeu)', () => {
    const verdict = verifyOtp(snapshot({ consumedAt: NOW }), '123456', PHONE, PEPPER, NOW);
    expect(verdict.outcome).toBe('CONSUMED');
  });
});

describe('Comptage des tentatives', () => {
  it('accepte le bon code au premier essai', () => {
    expect(verifyOtp(snapshot(), '123456', PHONE, PEPPER, NOW)).toEqual({ outcome: 'VALID' });
  });

  it('incrémente les tentatives sur un code erroné', () => {
    const verdict = verifyOtp(snapshot({ attempts: 1 }), '000000', PHONE, PEPPER, NOW);
    expect(verdict).toEqual({ outcome: 'INVALID', attemptsAfter: 2 });
  });

  it('verrouille à la cinquième tentative erronée', () => {
    const verdict = verifyOtp(snapshot({ attempts: 4 }), '000000', PHONE, PEPPER, NOW);
    expect(verdict).toEqual({ outcome: 'LOCKED', attemptsAfter: 5 });
  });

  it('reste verrouillé même si le bon code est présenté ensuite', () => {
    const verdict = verifyOtp(snapshot({ attempts: 5 }), '123456', PHONE, PEPPER, NOW);
    expect(verdict.outcome).toBe('LOCKED');
  });

  it('signale le plafond via reachesAttemptLimit', () => {
    expect(reachesAttemptLimit(3, DEFAULT_OTP_POLICY)).toBe(false);
    expect(reachesAttemptLimit(4, DEFAULT_OTP_POLICY)).toBe(true);
  });
});

describe('Délai de renvoi', () => {
  it('interdit un renvoi avant 60 secondes', () => {
    const remaining = resendCooldownRemaining(
      NOW,
      new Date(NOW.getTime() + 10_000),
      DEFAULT_OTP_POLICY,
    );
    expect(remaining).toBe(50);
  });

  it('autorise le renvoi après 60 secondes', () => {
    const remaining = resendCooldownRemaining(
      NOW,
      new Date(NOW.getTime() + 60_000),
      DEFAULT_OTP_POLICY,
    );
    expect(remaining).toBe(0);
  });
});
