/**
 * Montants Immodesk : toujours des entiers XAF en BigInt.
 * Le franc CFA n'a pas de sous-unité : aucune décimale, aucun flottant.
 *
 * Aucun montant n'est manipulé en phase 0, mais l'outillage est posé ici pour
 * que les phases suivantes n'aient jamais à introduire de `number`.
 */
export const CURRENCY = 'XAF' as const;
export type Currency = typeof CURRENCY;

export class AmountError extends Error {}

/** Convertit une entrée utilisateur (string | number | bigint) en BigInt XAF. */
export function toAmount(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new AmountError('Un montant XAF ne peut pas comporter de décimale.');
    }
    if (!Number.isSafeInteger(value)) {
      throw new AmountError('Montant hors de la plage entière sûre.');
    }
    return BigInt(value);
  }
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new AmountError('Un montant XAF doit être un entier sans séparateur ni décimale.');
  }
  return BigInt(trimmed);
}

export function assertPositiveAmount(value: bigint): bigint {
  if (value <= 0n) throw new AmountError('Le montant doit être strictement positif.');
  return value;
}

export function assertNonNegativeAmount(value: bigint): bigint {
  if (value < 0n) throw new AmountError('Le montant ne peut pas être négatif.');
  return value;
}

/** Représentation textuelle exacte, pour les journaux et l'audit JSONB. */
export function serializeAmount(value: bigint): string {
  return value.toString(10);
}

/**
 * Conversion à la FRONTIÈRE DE PRÉSENTATION : BigInt → nombre JSON.
 *
 * Les contrats d'API typent les montants en `number` (`baseRentAmount:
 * number`), et un montant en XAF reste très loin de `Number.MAX_SAFE_INTEGER`
 * (9,007 × 10^15, soit plus de neuf millions de milliards de francs CFA).
 * Le domaine et Prisma continuent de manipuler des BigInt : seule la couche
 * de présentation convertit, et jamais sans garde.
 *
 * Si la valeur dépassait la plage entière sûre, la sérialiser silencieusement
 * produirait un montant FAUX chez le client. On lève donc une erreur interne :
 * mieux vaut une 500 tracée qu'un loyer arrondi à l'insu de tous.
 */
export function toJsonAmount(value: bigint): number {
  if (value > MAX_SAFE_BIGINT || value < -MAX_SAFE_BIGINT) {
    throw new AmountError(
      `Montant hors de la plage entière sûre du JSON : ${value.toString(10)}. ` +
        'Sérialisation refusée pour ne pas transmettre une valeur arrondie.',
    );
  }
  return Number(value);
}

/** Variante tolérant l'absence de valeur (colonne SQL nullable). */
export function toJsonAmountOrNull(value: bigint | null | undefined): number | null {
  return value === null || value === undefined ? null : toJsonAmount(value);
}

export const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/** Séparateur de milliers : espace fine insécable (typographie française fr-CG). */
export const THOUSANDS_SEPARATOR = '\u202f';

/**
 * Formatage d'affichage fr-CG, sans aucune décimale : 120000n devient
 * « 120 000 FCFA », les séparateurs étant des espaces fines insécables.
 */
export function formatXaf(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const digits = (value < 0n ? -value : value).toString(10);
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  return `${sign}${grouped}${THOUSANDS_SEPARATOR}FCFA`;
}
