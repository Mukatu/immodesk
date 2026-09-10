/**
 * Formatage des montants XAF. Toujours des entiers (BIGINT côté API) : jamais de décimales.
 * Séparateur de milliers : espace fine insécable (U+202F), suffixe " XAF".
 */

const THIN_NBSP = ' ';

export function formatXaf(amount: number | bigint): string {
  const value = typeof amount === 'bigint' ? amount : Math.trunc(amount);
  const negative = value < 0;
  const digits = (negative ? -value : value).toString();
  let grouped = '';
  for (let i = 0; i < digits.length; i += 1) {
    const posFromEnd = digits.length - i;
    grouped += digits[i];
    if (posFromEnd > 1 && posFromEnd % 3 === 1) {
      grouped += THIN_NBSP;
    }
  }
  return `${negative ? '-' : ''}${grouped}${THIN_NBSP}XAF`;
}

/** Retire tout ce qui n'est pas un chiffre (espaces, séparateurs, suffixe) pour ne garder que l'entier. */
export function parseXafInput(raw: string): number | null {
  const digitsOnly = raw.replace(/[^\d]/g, '');
  if (digitsOnly === '') return null;
  return Number.parseInt(digitsOnly, 10);
}

/** Formate une valeur brute (déjà entière) pour l'affichage dans un champ de saisie. */
export function formatXafInputValue(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) return '';
  const digits = Math.trunc(Math.abs(amount)).toString();
  let grouped = '';
  for (let i = 0; i < digits.length; i += 1) {
    const posFromEnd = digits.length - i;
    grouped += digits[i];
    if (posFromEnd > 1 && posFromEnd % 3 === 1) {
      grouped += THIN_NBSP;
    }
  }
  return grouped;
}
