/**
 * Normalisation et validation des numéros de téléphone mobiles
 * du Congo-Brazzaville (indicatif international +242).
 *
 * Format E.164 cible : +242XXXXXXXXX (242 suivi d'exactement 9 chiffres).
 * Opérateurs ciblés :
 *   - MTN Congo   : les 9 chiffres commencent par "06"
 *   - Airtel Congo: les 9 chiffres commencent par "05"
 */

/** Pattern strict d'un numéro mobile congolais déjà en E.164. */
const CONGO_MOBILE_E164_PATTERN = /^\+242(06|05)\d{7}$/;

/**
 * Normalise une entrée de numéro de téléphone congolais vers le format
 * E.164 cible `+242XXXXXXXXX`.
 *
 * Formes d'entrée tolérées (après suppression des espaces, tirets et points) :
 *   - "+242066000001"   (déjà normalisé, idempotent)
 *   - "00242066000001"  (préfixe international "00")
 *   - "242066000001"    (indicatif sans le "+")
 *   - "0242066000001"   (0 d'accès national + indicatif, à retirer)
 *   - "066000001"       (9 chiffres locaux significatifs, "0" fait partie
 *                         du préfixe opérateur "06"/"05", donc PAS retiré)
 *
 * @throws {Error} si l'entrée ne peut pas être normalisée en un numéro
 * mobile congolais valide (mauvaise longueur, mauvais pays, préfixe
 * opérateur inconnu).
 */
export function normalizePhoneCongo(input: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new Error(`Numéro de téléphone invalide : entrée vide ou non-chaîne ("${input}").`);
  }

  // Retire espaces (classiques et insécables), tirets et points.
  const cleaned = input.replace(/[\s.-]/g, '').trim();

  let candidate: string;

  if (cleaned.startsWith('+242')) {
    candidate = cleaned;
  } else if (cleaned.startsWith('00242')) {
    candidate = `+242${cleaned.slice(5)}`;
  } else if (cleaned.startsWith('0242')) {
    // "0" d'accès national suivi de l'indicatif "242" : on retire le 0 de tête
    // puis on préfixe "+".
    candidate = `+${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('242')) {
    candidate = `+${cleaned}`;
  } else if (/^0\d{7,8}$/.test(cleaned)) {
    // Numéro local complet (ex: "066000001", 9 chiffres dont le "0" fait
    // partie du préfixe opérateur "06"/"05") : on préfixe +242 tel quel,
    // sans retirer le "0" de tête.
    candidate = `+242${cleaned}`;
  } else if (/^\d+$/.test(cleaned)) {
    // Toute autre suite de chiffres sans préfixe reconnu : tentative brute
    // en préfixant +242, sera validée (ou rejetée) ci-dessous.
    candidate = `+242${cleaned}`;
  } else {
    throw new Error(
      `Numéro de téléphone invalide : "${input}" ne correspond à aucune forme congolaise reconnue.`,
    );
  }

  if (!isValidCongoMobile(candidate)) {
    throw new Error(
      `Numéro de téléphone invalide : "${input}" ne normalise pas vers un mobile congolais valide ` +
        `(obtenu "${candidate}"). Attendu : +242 suivi de 06 ou 05 puis 7 chiffres.`,
    );
  }

  return candidate;
}

/**
 * Vérifie qu'un numéro déjà en E.164 (`+242XXXXXXXXX`) est un mobile
 * congolais valide (préfixe 06 ou 05). Ne lève jamais d'erreur.
 */
export function isValidCongoMobile(phone: string): boolean {
  if (typeof phone !== 'string') {
    return false;
  }
  return CONGO_MOBILE_E164_PATTERN.test(phone);
}

/**
 * Détermine l'opérateur d'un numéro mobile congolais déjà en E.164.
 * Retourne `null` (sans lever d'erreur) si le numéro n'est pas un mobile
 * congolais valide.
 */
export function getCongoOperator(phone: string): 'MTN' | 'AIRTEL' | null {
  if (!isValidCongoMobile(phone)) {
    return null;
  }
  const prefix = phone.slice(4, 6);
  if (prefix === '06') {
    return 'MTN';
  }
  if (prefix === '05') {
    return 'AIRTEL';
  }
  return null;
}
