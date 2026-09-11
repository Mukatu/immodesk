/**
 * Natures de séquences et format des numéros qui en découlent.
 *
 * Les étiquettes correspondent à l'énumération SQL `sequence_kind`
 * (docs/schema/schema.sql, partie 01). `sequences.kind` est volontairement
 * une colonne TEXT : `next_sequence(uuid, text, text)` reste ainsi appelable
 * sans transtypage, tandis que l'énumération documente les valeurs admises.
 * `PAYMENT` et `REVERSAL` (phase 3) et les compteurs de reçus de caisse PAR
 * DÉMARCHEUR (`CASH_RECEIPT:{userId}`) profitent de cette souplesse.
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
  'PAYMENT',
  'REVERSAL',
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
 * séquentielle »), l'architecture (§ 7.4) et les contrats des phases 2 et 3.
 *
 * Le reçu de caisse n'est JAMAIS remis à zéro et son compteur est propre à
 * chaque démarcheur : l'agence contrôle ainsi l'intégralité des reçus d'un
 * encaisseur, un trou dans sa série signalant une pièce disparue.
 */
export const SEQUENCE_FORMATS: Readonly<Record<SequenceKind, SequenceFormat>> = {
  LEASE: { prefix: 'BAIL', scope: 'YEARLY', padding: 5 },
  CASH_RECEIPT: { prefix: 'CASH', scope: 'CONTINUOUS', padding: 6 },
  RENT_INVOICE: { prefix: 'LOY', scope: 'MONTHLY', padding: 5 },
  RECEIPT: { prefix: 'QUI', scope: 'MONTHLY', padding: 5 },
  OWNER_STATEMENT: { prefix: 'REL', scope: 'MONTHLY', padding: 5 },
  REMITTANCE: { prefix: 'REM', scope: 'MONTHLY', padding: 5 },
  EXPENSE: { prefix: 'DEP', scope: 'MONTHLY', padding: 5 },
  PAYOUT: { prefix: 'VER', scope: 'MONTHLY', padding: 5 },
  SUBSCRIPTION_INVOICE: { prefix: 'ABO', scope: 'MONTHLY', padding: 5 },
  PAYMENT: { prefix: 'PAY', scope: 'MONTHLY', padding: 5 },
  REVERSAL: { prefix: 'REV', scope: 'MONTHLY', padding: 5 },
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

/** Clé du compteur de reçus d'un démarcheur : `CASH_RECEIPT:{userId}`. */
export function cashReceiptSequenceKey(collectorUserId: string): string {
  return `CASH_RECEIPT:${collectorUserId}`;
}

/**
 * Code court d'organisation pour `CASH-{org}-{collector}-{seq}` : initiales
 * des segments du slug, 2 à 4 lettres (`agence-mpila-immo` → `AMI`).
 * L'unicité n'est pas requise d'une organisation à l'autre : le numéro est
 * unique PAR organisation (`cash_receipts_number_uk`).
 */
export function organizationShortCode(slug: string): string {
  const segments = slug
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((s) => s.length > 0);
  const initials = segments.map((s) => s[0]).join('');
  if (initials.length >= 2) return initials.slice(0, 4);
  const compact = segments.join('');
  return (compact.length >= 2 ? compact : `${compact}ORG`).slice(0, 4);
}

/**
 * Code court de démarcheur : les six derniers caractères hexadécimaux de son
 * identifiant. Pour un UUID v7, ce sont des bits ALÉATOIRES — deux
 * démarcheurs d'une même organisation ne peuvent pratiquement pas le
 * partager, là où quatre chiffres de téléphone se croiseraient vite.
 */
export function collectorShortCode(userId: string): string {
  return userId.replace(/-/g, '').slice(-6).toUpperCase();
}

/** Préfixe complet d'un reçu de caisse : `CASH-AMI-3F9A1C`. */
export function cashReceiptPrefix(organizationSlug: string, collectorUserId: string): string {
  return `CASH-${organizationShortCode(organizationSlug)}-${collectorShortCode(collectorUserId)}`;
}
