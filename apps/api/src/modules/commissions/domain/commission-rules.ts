import { DomainError } from '../../../shared/errors/domain-error';
import { roundHalfUp } from '../../billing/domain/invoice-lines';
import type { CommissionBasis } from '../../mandates/domain/mandate-rules';

/** Énumération SQL `commission_status`. */
export const COMMISSION_STATUSES = [
  'PENDING',
  'ACCRUED',
  'INVOICED',
  'SETTLED',
  'CANCELLED',
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

/**
 * Seule base couverte par la campagne (contrat, arbitrage n°3 : « la
 * commission ne se calcule que sur l'encaissé »). `RATE_BPS_ON_RENT_DUE`,
 * `FLAT_AMOUNT_PER_MONTH` et `FLAT_AMOUNT_PER_LEASE` ne sont PAS implémentées
 * : un mandat qui les porte lève `AGENCY.COMMISSION_BASIS_UNSUPPORTED`,
 * capturé par la campagne comme une erreur PAR MANDAT (elle n'interrompt pas
 * les autres bailleurs), plutôt que d'être silencieusement ignoré ou de
 * produire un montant faux.
 */
export function assertSupportedBasis(basis: CommissionBasis): void {
  if (basis !== 'RATE_BPS_ON_RENT_COLLECTED') {
    throw new DomainError('AGENCY.COMMISSION_BASIS_UNSUPPORTED', { basis });
  }
}

export interface CommissionAmounts {
  amount: bigint;
  vatAmount: bigint;
  totalAmount: bigint;
}

/**
 * `amount = round(baseAmount × rateBps / 10 000)`, arrondi au plus proche
 * (moitié vers le haut, jamais de flottant) — même règle que `computeVat`
 * de `expenses/domain/expense-rules.ts` et les lignes de facture
 * (`billing/domain/invoice-lines.ts`), réutilisée ici via `roundHalfUp`.
 * `vatAmount` suit la même formule sur `amount`, au taux du mandat.
 */
export function computeCommissionAmounts(
  baseAmount: bigint,
  rateBps: number,
  vatRateBps: number,
): CommissionAmounts {
  const amount = roundHalfUp(baseAmount * BigInt(rateBps), 10_000n);
  const vatAmount = vatRateBps > 0 ? roundHalfUp(amount * BigInt(vatRateBps), 10_000n) : 0n;
  return { amount, vatAmount, totalAmount: amount + vatAmount };
}
