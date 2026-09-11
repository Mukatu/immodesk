import { DomainError } from '../../../shared/errors/domain-error';

/** Énumération SQL `invoice_line_type`. */
export const INVOICE_LINE_TYPES = [
  'RENT',
  'WATER_CHARGE',
  'ELECTRICITY_CHARGE',
  'SERVICE_CHARGE',
  'PENALTY',
  'DEPOSIT',
  'AGENCY_FEE',
  'REPAIR_REBILL',
  'DISCOUNT',
  'OTHER',
] as const;
export type InvoiceLineType = (typeof INVOICE_LINE_TYPES)[number];

/** Rubrique de la facture où la ligne est cumulée. */
export type AmountBucket = 'rent' | 'charges' | 'penalty' | 'other' | 'discount';

const CHARGE_TYPES: readonly InvoiceLineType[] = [
  'WATER_CHARGE',
  'ELECTRICITY_CHARGE',
  'SERVICE_CHARGE',
];

/** Une ligne `isCredit` ou `DISCOUNT` vient TOUJOURS en diminution. */
export function bucketOf(lineType: InvoiceLineType, isCredit: boolean): AmountBucket {
  if (isCredit || lineType === 'DISCOUNT') return 'discount';
  if (lineType === 'RENT') return 'rent';
  if (CHARGE_TYPES.includes(lineType)) return 'charges';
  if (lineType === 'PENALTY') return 'penalty';
  return 'other';
}

/** Division entière arrondie au plus proche, moitié vers le haut (valeurs positives). */
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('Dénominateur nul ou négatif.');
  if (numerator < 0n) return -roundHalfUp(-numerator, denominator);
  return (2n * numerator + denominator) / (2n * denominator);
}

export interface LineAmountInput {
  /** Quantité décimale (3 décimales au plus, `NUMERIC(12,3)`). */
  quantity?: number;
  unitPriceAmount: bigint;
  /** Montant imposé ; à défaut, `quantité × prix unitaire` arrondi. */
  amount?: bigint | null;
  vatRateBps?: number;
}

export interface LineAmounts {
  /** Quantité en millièmes : `NUMERIC(12,3)` sans flottant. */
  quantityMilli: bigint;
  amount: bigint;
  vatAmount: bigint;
}

/**
 * Montant d'une ligne en BigInt XAF. La quantité (seule valeur décimale du
 * modèle) est convertie en millièmes avant tout calcul : aucun montant ne
 * transite par un flottant.
 */
export function computeLineAmount(input: LineAmountInput): LineAmounts {
  const quantity = input.quantity ?? 1;
  const milli = Math.round(quantity * 1000);
  if (!Number.isFinite(quantity) || quantity < 0 || Math.abs(quantity * 1000 - milli) > 1e-6) {
    throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
      quantity: 'Quantité positive à trois décimales au plus.',
    });
  }
  if (input.unitPriceAmount < 0n || (input.amount ?? 0n) < 0n) {
    throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
      amount: 'Un montant de ligne est toujours positif ; le sens est porté par isCredit.',
    });
  }
  const quantityMilli = BigInt(milli);
  const amount = input.amount ?? roundHalfUp(input.unitPriceAmount * quantityMilli, 1000n);
  const vatRate = BigInt(input.vatRateBps ?? 0);
  const vatAmount = vatRate > 0n ? roundHalfUp(amount * vatRate, 10_000n) : 0n;
  return { quantityMilli, amount, vatAmount };
}

/** `1500n` millièmes → `"1.500"`, forme attendue par `NUMERIC(12,3)`. */
export function milliToDecimalString(milli: bigint): string {
  const whole = milli / 1000n;
  const fraction = (milli % 1000n).toString().padStart(3, '0');
  return `${whole}.${fraction}`;
}

export interface TotalsLine {
  lineType: InvoiceLineType;
  isCredit: boolean;
  amount: bigint;
  vatAmount: bigint;
}

export interface InvoiceTotals {
  rentAmount: bigint;
  chargesAmount: bigint;
  penaltyAmount: bigint;
  otherAmount: bigint;
  discountAmount: bigint;
  totalAmount: bigint;
}

/**
 * Totaux d'une facture : `total = loyer + charges + pénalités + autres −
 * remises`. La TVA d'une ligne rejoint sa rubrique. Un total négatif est
 * refusé : `rent_invoices.total_amount` est contraint `>= 0`, et une remise
 * supérieure à la facture relève d'un avoir (`tenant_credits`).
 */
export function computeTotals(lines: readonly TotalsLine[]): InvoiceTotals {
  const sums: Record<AmountBucket, bigint> = {
    rent: 0n,
    charges: 0n,
    penalty: 0n,
    other: 0n,
    discount: 0n,
  };
  for (const line of lines) {
    sums[bucketOf(line.lineType, line.isCredit)] += line.amount + line.vatAmount;
  }
  const totalAmount = sums.rent + sums.charges + sums.penalty + sums.other - sums.discount;
  if (totalAmount < 0n) {
    throw new DomainError('BILLING.NEGATIVE_TOTAL', { totalAmount: totalAmount.toString() });
  }
  return {
    rentAmount: sums.rent,
    chargesAmount: sums.charges,
    penaltyAmount: sums.penalty,
    otherAmount: sums.other,
    discountAmount: sums.discount,
    totalAmount,
  };
}
