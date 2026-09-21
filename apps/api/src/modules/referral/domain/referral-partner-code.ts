import { randomInt } from 'node:crypto';

/**
 * Format imposé par `referral_partners_code_chk` : `IMD-` suivi de six
 * caractères alphanumériques majuscules (docs/api/phase10-contract.md,
 * § Apport d'affaires).
 */
export const PARTNER_CODE_PATTERN = /^IMD-[A-Z0-9]{6}$/;

/**
 * Alphabet réduit (sans ambiguïté visuelle) : exclut `0/O`, `1/I/L` — le code
 * est lu à voix haute ou recopié à la main par un partenaire sur le terrain.
 * Reste un sous-ensemble valide de `[A-Z0-9]{6}` exigé par la contrainte SQL.
 */
const UNAMBIGUOUS_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Génère un candidat de code ; l'appelant vérifie l'unicité en base. */
export function generatePartnerCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += UNAMBIGUOUS_ALPHABET[randomInt(0, UNAMBIGUOUS_ALPHABET.length)];
  }
  return `IMD-${suffix}`;
}
