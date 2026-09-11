import { addDays, addMonths, compareDates, daysBetween } from '../../leases/domain/calendar';
import { roundHalfUp } from './invoice-lines';

/** Énumération SQL `penalty_basis`. */
export const PENALTY_BASES = [
  'RATE_BPS_PER_DAY',
  'RATE_BPS_PER_MONTH',
  'FLAT_AMOUNT',
  'FLAT_AMOUNT_PER_DAY',
] as const;
export type PenaltyBasis = (typeof PENALTY_BASES)[number];

export interface PenaltyRuleTerms {
  basis: PenaltyBasis;
  rateBps: number | null;
  flatAmount: bigint | null;
  graceDays: number;
  capAmount: bigint | null;
  capRateBps: number | null;
  maxPeriods: number | null;
  appliesToCharges: boolean;
}

export interface PenaltyInvoiceState {
  dueDate: Date;
  graceUntilDate: Date | null;
  rentAmount: bigint;
  chargesAmount: bigint;
  /** Pénalités déjà facturées sur cette facture. */
  penaltyAmount: bigint;
  paidAmount: bigint;
  balanceAmount: bigint;
  /** Unités déjà pénalisées (somme des quantités des lignes PENALTY). */
  periodsApplied: number;
  lastPenaltyRunDate: Date | null;
}

export interface PenaltyComputation {
  amount: bigint;
  units: number;
  unitAmount: bigint;
  label: string;
}

/**
 * Principal pénalisable : le reste dû HORS pénalités.
 *
 * L'imputation règle d'abord les pénalités, puis les charges, puis le loyer
 * (règle figée du contrat) : l'argent reçu couvre donc en priorité les
 * pénalités déjà facturées, et le loyer est la dernière rubrique soldée. Une
 * pénalité n'est JAMAIS calculée sur une pénalité antérieure.
 */
export function penaltyPrincipal(state: PenaltyInvoiceState, appliesToCharges: boolean): bigint {
  const unpaidPenalty =
    state.penaltyAmount > state.paidAmount ? state.penaltyAmount - state.paidAmount : 0n;
  const unpaidNonPenalty = state.balanceAmount - unpaidPenalty;
  if (unpaidNonPenalty <= 0n) return 0n;
  if (appliesToCharges) return unpaidNonPenalty;
  return unpaidNonPenalty < state.rentAmount ? unpaidNonPenalty : state.rentAmount;
}

/** Date à partir de laquelle la pénalité court : tolérance du bail ET de la règle. */
export function penaltyStartDate(rule: PenaltyRuleTerms, state: PenaltyInvoiceState): Date {
  const byRule = addDays(state.dueDate, rule.graceDays);
  if (!state.graceUntilDate) return byRule;
  return compareDates(state.graceUntilDate, byRule) > 0 ? state.graceUntilDate : byRule;
}

/**
 * Pénalité à appliquer lors d'UNE exécution du cron (une ligne PENALTY au
 * plus par exécution), ou `null`.
 *
 * - `RATE_BPS_PER_DAY` / `FLAT_AMOUNT_PER_DAY` : une unité par jour écoulé
 *   depuis la dernière exécution (rattrapage d'un jour d'indisponibilité) ;
 * - `RATE_BPS_PER_MONTH` : une unité par mois écoulé depuis la dernière ;
 * - `FLAT_AMOUNT` : une seule fois par facture.
 *
 * Plafonds : `maxPeriods` borne le nombre d'unités, `capAmount` et
 * `capRateBps` (en points de base du principal NOMINAL — loyer, plus charges
 * si la règle s'y applique) bornent le cumul. Le principal nominal est retenu
 * pour que le plafond ne rétrécisse pas à mesure que le locataire paie.
 */
export function computePenalty(
  rule: PenaltyRuleTerms,
  state: PenaltyInvoiceState,
  today: Date,
): PenaltyComputation | null {
  const start = penaltyStartDate(rule, state);
  if (compareDates(start, today) >= 0) return null;

  const principal = penaltyPrincipal(state, rule.appliesToCharges);
  if (principal <= 0n) return null;

  let units = unitsDue(rule, state, start, today);
  if (units <= 0) return null;
  if (rule.maxPeriods !== null) {
    units = Math.min(units, rule.maxPeriods - state.periodsApplied);
    if (units <= 0) return null;
  }

  const unitAmount = unitAmountOf(rule, principal);
  if (unitAmount === null || unitAmount <= 0n) return null;

  let amount = unitAmount * BigInt(units);
  const cap = capOf(rule, state);
  if (cap !== null) {
    const remaining = cap - state.penaltyAmount;
    if (remaining <= 0n) return null;
    if (amount > remaining) amount = remaining;
  }

  return { amount, units, unitAmount, label: labelOf(rule, units) };
}

function unitsDue(
  rule: PenaltyRuleTerms,
  state: PenaltyInvoiceState,
  start: Date,
  today: Date,
): number {
  switch (rule.basis) {
    case 'RATE_BPS_PER_DAY':
    case 'FLAT_AMOUNT_PER_DAY':
      return daysBetween(state.lastPenaltyRunDate ?? start, today);
    case 'RATE_BPS_PER_MONTH': {
      if (!state.lastPenaltyRunDate) return 1;
      let months = 0;
      while (compareDates(addMonths(state.lastPenaltyRunDate, months + 1), today) <= 0) {
        months += 1;
        if (months > 120) break;
      }
      return months;
    }
    case 'FLAT_AMOUNT':
      return state.penaltyAmount > 0n || state.periodsApplied > 0 ? 0 : 1;
  }
}

function unitAmountOf(rule: PenaltyRuleTerms, principal: bigint): bigint | null {
  if (rule.basis === 'RATE_BPS_PER_DAY' || rule.basis === 'RATE_BPS_PER_MONTH') {
    if (rule.rateBps === null) return null;
    return roundHalfUp(principal * BigInt(rule.rateBps), 10_000n);
  }
  return rule.flatAmount;
}

function capOf(rule: PenaltyRuleTerms, state: PenaltyInvoiceState): bigint | null {
  const caps: bigint[] = [];
  if (rule.capAmount !== null) caps.push(rule.capAmount);
  if (rule.capRateBps !== null) {
    const nominal = state.rentAmount + (rule.appliesToCharges ? state.chargesAmount : 0n);
    caps.push(roundHalfUp(nominal * BigInt(rule.capRateBps), 10_000n));
  }
  if (caps.length === 0) return null;
  return caps.reduce((min, c) => (c < min ? c : min));
}

function labelOf(rule: PenaltyRuleTerms, units: number): string {
  switch (rule.basis) {
    case 'RATE_BPS_PER_DAY':
      return `Pénalité de retard : ${units} jour(s) à ${(rule.rateBps ?? 0) / 100} % par jour`;
    case 'RATE_BPS_PER_MONTH':
      return `Pénalité de retard : ${units} mois à ${(rule.rateBps ?? 0) / 100} % par mois`;
    case 'FLAT_AMOUNT_PER_DAY':
      return `Pénalité de retard : ${units} jour(s) au forfait journalier`;
    case 'FLAT_AMOUNT':
      return 'Pénalité de retard forfaitaire';
  }
}
