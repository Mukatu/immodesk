/**
 * Natures de séquences et format des numéros qui en découlent.
 *
 * Les étiquettes correspondent à l'énumération SQL `sequence_kind`
 * (docs/schema/schema.sql, partie 01). `sequences.kind` est volontairement
 * une colonne TEXT : `next_sequence(uuid, text, text)` reste ainsi appelable
 * sans transtypage, tandis que l'énumération documente les valeurs admises.
 *
 * Ce fichier est du DOMAINE PUR : ni Nest, ni Prisma, ni SQL. Il décrit
 * comment un compteur devient un numéro lisible, rien de plus.
 */
export const SEQUENCE_KINDS = [
  'LEASE',
  'CASH_RECEIPT',
  'RENT_INVOICE',
  'RECEIPT',
  'OWNER_STATEMENT',
  'REMITTANCE',
  'EXPENSE',
  'PAYOUT',
  'SUBSCRIPTION_INVOICE',
] as const;

export type SequenceKind = (typeof SEQUENCE_KINDS)[number];

/** Découpage temporel du compteur : la période remet la numérotation à zéro. */
export type SequenceScope = 'CONTINUOUS' | 'YEARLY' | 'MONTHLY';

export interface SequenceFormat {
  /** Préfixe visible du numéro : `BAIL-2026-00042`. */
  prefix: string;
  /** Période de remise à zéro. */
  scope: SequenceScope;
  /** Longueur du compteur, complété par des zéros. */
  padding: number;
}

/**
 * Formats arrêtés par les décisions communes (§ « Numérotation
 * séquentielle ») et par le contrat de la phase 2 pour les baux.
 *
 * Seul `LEASE` est exercé en phase 2 ; les autres sont déclarés ici pour que
 * les phases suivantes n'aient pas à réinventer la règle — et pour qu'un
 * changement de format se voie dans un seul fichier.
 */
export const SEQUENCE_FORMATS: Readonly<Record<SequenceKind, SequenceFormat>> = {
  LEASE: { prefix: 'BAIL', scope: 'YEARLY', padding: 5 },
  CASH_RECEIPT: { prefix: 'CASH', scope: 'MONTHLY', padding: 5 },
  RENT_INVOICE: { prefix: 'LOY', scope: 'MONTHLY', padding: 5 },
  RECEIPT: { prefix: 'QUI', scope: 'MONTHLY', padding: 5 },
  OWNER_STATEMENT: { prefix: 'REL', scope: 'MONTHLY', padding: 5 },
  REMITTANCE: { prefix: 'REM', scope: 'MONTHLY', padding: 5 },
  EXPENSE: { prefix: 'DEP', scope: 'MONTHLY', padding: 5 },
  PAYOUT: { prefix: 'VER', scope: 'MONTHLY', padding: 5 },
  SUBSCRIPTION_INVOICE: { prefix: 'ABO', scope: 'MONTHLY', padding: 5 },
};

/**
 * Période d'un compteur pour une date donnée.
 *
 * Chaîne vide pour un compteur continu : c'est la valeur par défaut de
 * `sequences.period`, et `format_sequence_number` élide alors le segment
 * (`concat_ws` ignore les NULL, la fonction transformant `''` en NULL).
 */
export function sequencePeriod(scope: SequenceScope, date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, '0');
  if (scope === 'CONTINUOUS') return '';
  if (scope === 'YEARLY') return year;
  return `${year}${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
}

/**
 * Rendu du numéro, identique à `format_sequence_number()` côté SQL.
 *
 * La fonction SQL fait foi en production — elle s'exécute dans la même
 * transaction que la réservation du compteur. Ce jumeau applicatif sert aux
 * tests unitaires et à la lisibilité : un écart entre les deux se verrait
 * immédiatement, le test d'intégration comparant les deux résultats.
 */
export function formatSequenceNumber(
  prefix: string,
  period: string,
  value: bigint | number,
  padding: number,
): string {
  const counter = value.toString(10).padStart(Math.max(padding, 1), '0');
  return [prefix, period === '' ? null : period, counter].filter((p) => p !== null).join('-');
}
