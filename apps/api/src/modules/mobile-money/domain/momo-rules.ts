import { DomainError } from '../../../shared/errors/domain-error';

/** Statuts `momo_status` (docs/schema/schema.sql). */
export const MOMO_STATUSES = [
  'INITIATED',
  'PENDING',
  'DECLARED',
  'SUCCEEDED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'REJECTED',
  'REFUNDED',
] as const;
export type MomoStatus = (typeof MOMO_STATUSES)[number];

/**
 * Machine à états d'une transaction Mobile Money (docs/api/phase4-contract.md,
 * § « Statuts d'une transaction déclarée » et § « Rattrapage »).
 * `DECLARED` amorce le canal déclaré ; `INITIATED` amorce l'agrégateur.
 */
export const MOMO_TRANSITIONS: Readonly<Record<MomoStatus, readonly MomoStatus[]>> = {
  INITIATED: ['PENDING', 'FAILED'],
  PENDING: ['SUCCEEDED', 'FAILED', 'EXPIRED'],
  DECLARED: ['SUCCEEDED', 'REJECTED', 'CANCELLED'],
  SUCCEEDED: ['REFUNDED'],
  FAILED: [],
  EXPIRED: [],
  CANCELLED: [],
  REJECTED: [],
  REFUNDED: [],
};

export function assertMomoTransition(from: MomoStatus, to: MomoStatus): void {
  if (!MOMO_TRANSITIONS[from].includes(to)) {
    throw new DomainError('MOMO.INVALID_TRANSITION', { from, to });
  }
}

export type MomoOperator = 'MTN' | 'AIRTEL';

/**
 * Opérateur déduit du préfixe national congolais : `06` MTN Mobile Money,
 * `05` Airtel Money (contrat phase 4, § « Mobile Money agrégateur »).
 * `msisdn` est attendu déjà normalisé E.164 (`+242066000001`).
 */
export function detectOperator(msisdn: string): MomoOperator | null {
  const match = /^\+242(0[0-9])\d{7}$/.exec(msisdn);
  if (!match) return null;
  const prefix = match[1];
  if (prefix === '06') return 'MTN';
  if (prefix === '05') return 'AIRTEL';
  return null;
}

export function assertAmountInRange(amount: bigint, min: number, max: number): void {
  if (amount < BigInt(min) || amount > BigInt(max)) {
    throw new DomainError('MOMO.AMOUNT_OUT_OF_RANGE', { amount: amount.toString(), min, max });
  }
}

/**
 * Frais en points de base, arrondis à l'entier XAF le plus proche
 * (« round half up » : un centime n'existe pas en XAF, l'arrondi doit être
 * déterministe et ne jamais produire de flottant).
 */
export function computeFee(amount: bigint, feeRateBps: number): bigint {
  const rate = BigInt(Math.max(0, Math.round(feeRateBps)));
  return (amount * rate + 5_000n) / 10_000n;
}

export type FeeBearerChoice = 'TENANT' | 'ORGANIZATION';

export interface MomoQuoteResult {
  amount: bigint;
  feeAmount: bigint;
  totalDebited: bigint;
  netReceived: bigint;
  feeBearer: FeeBearerChoice;
}

/**
 * Devis Mobile Money : l'imputation porte toujours sur `amount`, jamais sur
 * le net (§8.2.4 de l'architecture) — seuls `totalDebited`/`netReceived`
 * varient selon qui supporte les frais.
 */
export function quoteMomo(
  amount: bigint,
  feeRateBps: number,
  feeBearer: FeeBearerChoice,
): MomoQuoteResult {
  const feeAmount = computeFee(amount, feeRateBps);
  return feeBearer === 'TENANT'
    ? { amount, feeAmount, totalDebited: amount + feeAmount, netReceived: amount, feeBearer }
    : {
        amount,
        feeAmount,
        totalDebited: amount,
        netReceived: amount - feeAmount > 0n ? amount - feeAmount : 0n,
        feeBearer,
      };
}

/** Normalise une référence opérateur : majuscules, espaces retirés. */
export function normalizeOperatorReference(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}
