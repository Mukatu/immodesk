import { addDays, compareDates, endOfMonth, toIsoDate } from '../../leases/domain/calendar';
import {
  rentAt,
  type InitialRent,
  type RentRevisionPoint,
} from '../../leases/domain/rent-schedule';
import {
  billingPeriods,
  periodAmount,
  type BillingPeriod,
  type LeaseBillingTerms,
} from './billing-periods';

export interface InvoicePlanInput {
  terms: LeaseBillingTerms;
  initial: InitialRent;
  revisions: readonly RentRevisionPoint[];
  /** Débuts de période déjà facturés (toutes factures, annulées comprises). */
  invoicedStarts: readonly Date[];
  /**
   * Plancher : aucune période achevée avant cette date n'est proposée. Un
   * bail repris d'un registre papier ne doit pas faire émettre des années
   * d'arriérés le jour de sa saisie.
   */
  floor: Date;
  today: Date;
  generateDaysBefore: number;
  /** Campagne manuelle ciblée : période qui contient cette date, ou qui débute dans son mois. */
  target?: Date | null;
}

export interface PlannedInvoice {
  period: BillingPeriod;
  rentAmount: bigint;
  chargesAmount: bigint;
}

function sameMonth(a: Date, b: Date): boolean {
  return toIsoDate(a).slice(0, 7) === toIsoDate(b).slice(0, 7);
}

/**
 * Prochaine facture à créer pour un bail, ou `null`.
 *
 * Règle du contrat : la PROCHAINE période non couverte, si
 * `today ≥ dueDate − generateDaysBefore`. Une seule période par exécution :
 * le cron quotidien rattrape une période par jour, sans jamais produire de
 * doublon — l'unicité `(lease_id, period_start)` est de toute façon tenue
 * par la base.
 *
 * En campagne ciblée (`target`), la condition de date est levée : c'est le
 * gestionnaire qui décide d'émettre, par exemple, les factures du mois à
 * venir dès le 25.
 */
export function planNextInvoice(input: InvoicePlanInput): PlannedInvoice | null {
  const horizon = addDays(input.today, input.generateDaysBefore);
  const until =
    input.target && compareDates(endOfMonth(input.target), horizon) > 0
      ? endOfMonth(input.target)
      : horizon;

  const covered = new Set(input.invoicedStarts.map(toIsoDate));
  const periods = billingPeriods(input.terms, until).filter(
    (p) => compareDates(p.periodEnd, input.floor) >= 0 && !covered.has(toIsoDate(p.periodStart)),
  );

  const target = input.target ?? null;
  const candidate = target
    ? periods.find(
        (p) =>
          (compareDates(p.periodStart, target) <= 0 && compareDates(target, p.periodEnd) <= 0) ||
          sameMonth(p.periodStart, target),
      )
    : periods[0];
  if (!candidate) return null;

  if (
    !target &&
    compareDates(addDays(candidate.dueDate, -input.generateDaysBefore), input.today) > 0
  ) {
    return null;
  }

  const applicable = rentAt(input.initial, input.revisions, candidate.periodStart);
  return {
    period: candidate,
    rentAmount: periodAmount(applicable.rentAmount, candidate, input.terms.rentPeriod),
    chargesAmount: periodAmount(applicable.chargesAmount, candidate, input.terms.rentPeriod),
  };
}
