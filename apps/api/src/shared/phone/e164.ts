import { DomainError } from '../errors/domain-error';

/** Indicatif par défaut : Congo-Brazzaville. */
export const DEFAULT_COUNTRY_CALLING_CODE = '242';

/** Contrainte SQL partagée : `^\+[1-9][0-9]{7,14}$`. */
export const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

/**
 * Normalise un numéro saisi par un utilisateur congolais vers E.164.
 *
 * Acceptés : `+242066000001`, `242066000001`, `00242066000001`,
 * `066000001`, `06 600 00 01`, `06-600-00-01`.
 * Un numéro national congolais compte 9 chiffres (0X XX XX XX X).
 */
export function normalizePhoneE164(
  raw: string,
  defaultCallingCode = DEFAULT_COUNTRY_CALLING_CODE,
): string {
  if (typeof raw !== 'string') {
    throw new DomainError('IAM.PHONE_INVALID', { phone: String(raw) });
  }

  // Suppression de tout séparateur usuel.
  let value = raw.trim().replace(/[\s.\-()\u00a0\u202f]/g, '');
  if (value.length === 0) {
    throw new DomainError('IAM.PHONE_INVALID', { phone: raw });
  }

  if (value.startsWith('00')) {
    value = `+${value.slice(2)}`;
  }

  if (!value.startsWith('+')) {
    if (/^\d+$/.test(value) === false) {
      throw new DomainError('IAM.PHONE_INVALID', { phone: raw });
    }
    if (value.startsWith(defaultCallingCode) && value.length > 9) {
      // Numéro international sans le « + ».
      value = `+${value}`;
    } else {
      // Numéro national : on retire l'éventuel zéro de tête puis on préfixe.
      value = `+${defaultCallingCode}${value.replace(/^0+/, '')}`;
    }
  }

  if (!/^\+\d+$/.test(value)) {
    throw new DomainError('IAM.PHONE_INVALID', { phone: raw });
  }

  // Congo-Brazzaville : le numéro national commence par 0 et fait 9 chiffres.
  // Les saisies « +24206600001 » (0 déjà présent) et « +2426600001 » sont
  // toutes deux ramenées à la forme canonique +242 0X XX XX XX X.
  if (value.startsWith(`+${defaultCallingCode}`)) {
    let national = value.slice(1 + defaultCallingCode.length);
    if (national.length === 8 && !national.startsWith('0')) {
      national = `0${national}`;
    }
    value = `+${defaultCallingCode}${national}`;
  }

  if (!E164_PATTERN.test(value)) {
    throw new DomainError('IAM.PHONE_INVALID', { phone: raw });
  }

  return value;
}

/** Masque un numéro pour les journaux : `+2420660*****1`. */
export function maskPhone(e164: string): string {
  if (e164.length <= 6) return '***';
  return `${e164.slice(0, 7)}${'*'.repeat(Math.max(0, e164.length - 8))}${e164.slice(-1)}`;
}
