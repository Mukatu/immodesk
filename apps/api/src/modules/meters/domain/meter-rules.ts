import { DomainError } from '../../../shared/errors/domain-error';

/** Énumération SQL `meter_type`. */
export const METER_TYPES = [
  'ELECTRICITY_E2C',
  'WATER_LCDE',
  'GAS',
  'PRIVATE_SUBMETER',
  'SOLAR',
  'OTHER',
] as const;
export type MeterType = (typeof METER_TYPES)[number];

const MILLI = 1000n;

/** `12.5` → `12500n` millièmes, comme `invoice_lines.quantity` (NUMERIC(12,3)). */
export function toMilli(value: number): bigint {
  const milli = Math.round(value * 1000);
  if (!Number.isFinite(value) || Math.abs(value * 1000 - milli) > 1e-6) {
    throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
      index: 'Index à trois décimales au plus.',
    });
  }
  return BigInt(milli);
}

/** `12500n` millièmes → `"12.500"`, forme attendue par `NUMERIC(14,3)`. */
export function milliToDecimal(milli: bigint): string {
  const whole = milli / MILLI;
  const fraction = (milli < 0n ? -milli : milli) % MILLI;
  return `${whole}.${fraction.toString().padStart(3, '0')}`;
}

export function decimalToMilli(value: unknown): bigint {
  if (typeof value === 'bigint') return value * MILLI;
  const text = String(value);
  const [whole, fraction = ''] = text.split('.');
  const paddedFraction = (fraction + '000').slice(0, 3);
  return BigInt(whole) * MILLI + BigInt(paddedFraction || '0');
}

/** Capacité d'affichage d'un compteur à N chiffres : `10^N` unités, en millièmes. */
export function meterCapacityMilli(digitsCount: number): bigint {
  return 10n ** BigInt(digitsCount) * MILLI;
}

export interface ReadingComputationInput {
  previousIndexMilli: bigint;
  currentIndexMilli: bigint;
  digitsCount: number;
  rolloverApplied?: boolean;
}

export interface ReadingComputationResult {
  consumptionMilli: bigint;
  rolloverApplied: boolean;
}

/**
 * Calcule la consommation entre deux relevés (contrat, arbitrage 1).
 *
 * Un index inférieur au précédent n'est jamais enregistré tel quel : soit
 * l'appelant confirme `rolloverApplied: true` et la consommation est
 * calculée sur la capacité du compteur (`10^digitsCount`), soit l'appel est
 * refusé par `METERS.INDEX_REGRESSION` — aucun statut d'anomalie n'existe.
 */
export function computeReading(input: ReadingComputationInput): ReadingComputationResult {
  if (input.currentIndexMilli >= input.previousIndexMilli) {
    return {
      consumptionMilli: input.currentIndexMilli - input.previousIndexMilli,
      rolloverApplied: false,
    };
  }
  if (!input.rolloverApplied) {
    throw new DomainError('METERS.INDEX_REGRESSION', {
      previousIndex: milliToDecimal(input.previousIndexMilli),
      currentIndex: milliToDecimal(input.currentIndexMilli),
    });
  }
  const capacityMilli = meterCapacityMilli(input.digitsCount);
  const consumptionMilli = capacityMilli - input.previousIndexMilli + input.currentIndexMilli;
  if (consumptionMilli < 0n) {
    throw new DomainError('METERS.INDEX_REGRESSION', {
      previousIndex: milliToDecimal(input.previousIndexMilli),
      currentIndex: milliToDecimal(input.currentIndexMilli),
      reason: 'rollover_capacity_exceeded',
    });
  }
  return { consumptionMilli, rolloverApplied: true };
}
