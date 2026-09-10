/**
 * Téléphones Congo-Brazzaville : stockage E.164 (+242XXXXXXXXX), affichage groupé
 * "06 XXX XX XX" (préfixe +242 affiché séparément).
 */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Normalise une saisie libre vers l'E.164 tel qu'utilisé par le contrat d'API
 * (ex. "+242066000001") : indicatif +242 suivi des 9 chiffres locaux, en conservant
 * le zéro initial de l'opérateur (06, 05, 04…) — convention du référentiel Immodesk.
 */
export function toE164Congo(raw: string): string | null {
  let digits = digitsOnly(raw);
  if (digits.startsWith('00242')) digits = digits.slice(5);
  else if (digits.startsWith('242')) digits = digits.slice(3);

  if (digits.length !== 9) return null;
  return `+242${digits}`;
}

/** Formate un numéro local (9 chiffres, sans indicatif) en "06 XXX XX XX". */
export function formatLocalCongo(localDigits: string): string {
  const d = digitsOnly(localDigits).slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}

/** Formate un numéro E.164 congolais complet en "+242 06 XXX XX XX". */
export function formatE164Congo(e164: string): string {
  if (!e164.startsWith('+242')) return e164;
  const local = e164.slice(4);
  return `+242 ${formatLocalCongo(local)}`;
}

export function isValidCongoPhone(e164: string | null): e164 is string {
  return Boolean(e164 && /^\+242\d{9}$/.test(e164));
}
