import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/** Paramètres d'un cycle OTP, issus de la configuration validée. */
export interface OtpPolicy {
  /** Longueur du code décimal (6 par défaut). */
  codeLength: number;
  /** Durée de vie en secondes (300 = 5 minutes). */
  ttlSeconds: number;
  /** Nombre maximum de tentatives de vérification (5). */
  maxAttempts: number;
  /** Délai minimum avant renvoi d'un nouveau code (60 s). */
  resendAfterSeconds: number;
}

export const DEFAULT_OTP_POLICY: OtpPolicy = {
  codeLength: 6,
  ttlSeconds: 300,
  maxAttempts: 5,
  resendAfterSeconds: 60,
};

/**
 * Génère un code décimal uniformément distribué.
 * `randomInt` s'appuie sur le CSPRNG du système : pas de `Math.random`.
 */
export function generateOtpCode(length: number = DEFAULT_OTP_POLICY.codeLength): string {
  const max = 10 ** length;
  return randomInt(0, max).toString(10).padStart(length, '0');
}

/**
 * Hachage du code : SHA-256 sur `pepper:phone:code`.
 *
 * Le poivre (`OTP_PEPPER`) vit hors base : une copie de `otp_codes` ne
 * permet pas d'attaquer les codes hors ligne. Le numéro est inclus pour
 * qu'un même code émis pour deux numéros ne produise pas le même condensat.
 * Le code clair n'est jamais stocké ni journalisé.
 */
export function hashOtpCode(code: string, phoneE164: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${phoneE164}:${code}`).digest('hex');
}

/** Comparaison à temps constant de deux condensats hexadécimaux. */
export function otpHashMatches(candidateHash: string, storedHash: string): boolean {
  const a = Buffer.from(candidateHash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function otpExpiresAt(now: Date, policy: OtpPolicy): Date {
  return new Date(now.getTime() + policy.ttlSeconds * 1000);
}

export function isOtpExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isOtpConsumed(consumedAt: Date | null): boolean {
  return consumedAt !== null;
}

/** Vrai si la tentative en cours atteint le plafond (verrouillage). */
export function reachesAttemptLimit(previousAttempts: number, policy: OtpPolicy): boolean {
  return previousAttempts + 1 >= policy.maxAttempts;
}

/**
 * Secondes restantes avant qu'un renvoi soit autorisé.
 * 0 signifie « renvoi possible immédiatement ».
 */
export function resendCooldownRemaining(
  lastRequestedAt: Date,
  now: Date,
  policy: OtpPolicy,
): number {
  const elapsed = Math.floor((now.getTime() - lastRequestedAt.getTime()) / 1000);
  return Math.max(0, policy.resendAfterSeconds - elapsed);
}

/**
 * Décision de vérification d'un code, sans effet de bord : la couche
 * applicative se charge d'écrire le résultat. Rend le cœur de la règle
 * testable sans base de données.
 */
export type OtpVerdict =
  | { outcome: 'VALID' }
  | { outcome: 'EXPIRED' }
  | { outcome: 'CONSUMED' }
  | { outcome: 'INVALID'; attemptsAfter: number }
  | { outcome: 'LOCKED'; attemptsAfter: number };

export interface OtpRecordSnapshot {
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}

export function verifyOtp(
  record: OtpRecordSnapshot,
  submittedCode: string,
  phoneE164: string,
  pepper: string,
  now: Date,
): OtpVerdict {
  if (isOtpConsumed(record.consumedAt)) return { outcome: 'CONSUMED' };
  if (isOtpExpired(record.expiresAt, now)) return { outcome: 'EXPIRED' };

  // Un code déjà verrouillé ne doit plus jamais être accepté, même correct.
  if (record.attempts >= record.maxAttempts) {
    return { outcome: 'LOCKED', attemptsAfter: record.attempts };
  }

  const candidate = hashOtpCode(submittedCode, phoneE164, pepper);
  if (otpHashMatches(candidate, record.codeHash)) {
    return { outcome: 'VALID' };
  }

  const attemptsAfter = record.attempts + 1;
  if (attemptsAfter >= record.maxAttempts) {
    return { outcome: 'LOCKED', attemptsAfter };
  }
  return { outcome: 'INVALID', attemptsAfter };
}
