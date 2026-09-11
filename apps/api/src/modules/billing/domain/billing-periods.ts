import {
  addDays,
  compareDates,
  resolvePaymentDueDate,
  startOfMonth,
} from '../../leases/domain/calendar';
import { prorata } from '../../leases/domain/prorata';

/** Énumération SQL `rent_period`. */
export type RentPeriod = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export const PERIOD_MONTHS: Readonly<Record<RentPeriod, number>> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
};

/** Conditions du bail utiles au découpage en périodes. */
export interface LeaseBillingTerms {
  startDate: Date;
  endDate: Date | null;
  /** Date d'effet d'une résiliation (préavis donné), si elle existe. */
  terminationDate: Date | null;
  rentPeriod: RentPeriod;
  paymentDueDay: number;
  graceDays: number;
}

export interface BillingPeriod {
  /** Bornes facturées, INCLUSES des deux côtés. */
  periodStart: Date;
  periodEnd: Date;
  /** Bornes de la période pleine (alignée sur le mois de `startDate`). */
  nominalStart: Date;
  nominalEnd: Date;
  /** Vrai si la période est tronquée (entrée ou sortie en cours de période). */
  isPartial: boolean;
  dueDate: Date;
  graceUntilDate: Date;
}

function firstOfMonthPlus(anchor: Date, months: number): Date {
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + months, 1));
}

/** Fin effective du bail : terme ou date d'effet de la résiliation, la plus proche. */
export function effectiveLeaseEnd(terms: LeaseBillingTerms): Date | null {
  const candidates = [terms.endDate, terms.terminationDate].filter((d): d is Date => d !== null);
  if (candidates.length === 0) return null;
  return candidates.reduce((min, d) => (compareDates(d, min) < 0 ? d : min));
}

/**
 * Échéance d'une période : le jour `paymentDueDay` du mois de `periodStart`
 * (borné au dernier jour du mois), puis tolérance `graceDays`.
 *
 * Une première période proratisée qui commence APRÈS le jour d'échéance (bail
 * signé le 12, échéance au 5) aurait sinon une échéance antérieure à son
 * propre début : elle est ramenée au premier jour facturé.
 */
export function dueDateOf(
  periodStart: Date,
  paymentDueDay: number,
  graceDays: number,
): { dueDate: Date; graceUntilDate: Date } {
  const resolved = resolvePaymentDueDate(
    paymentDueDay,
    periodStart.getUTCFullYear(),
    periodStart.getUTCMonth() + 1,
  );
  const dueDate = compareDates(resolved, periodStart) < 0 ? periodStart : resolved;
  return { dueDate, graceUntilDate: addDays(dueDate, graceDays) };
}

/**
 * Découpe un bail en périodes de facturation jusqu'à `until` (inclus :
 * aucune période dont le début nominal est postérieur n'est produite).
 *
 * - Périodes alignées sur le MOIS de `startDate` : mois civils, trimestres,
 *   semestres ou années à partir du 1er de ce mois.
 * - La première commence à `startDate`, la dernière s'arrête à la fin
 *   effective du bail : ces deux-là sont proratisées.
 * - Aucune période entièrement postérieure à la fin du bail.
 * - Une période d'UN seul jour (entrée le dernier jour du mois, fin le 1er)
 *   est fusionnée avec sa voisine : `rent_invoices_period_chk` exige
 *   `period_start < period_end`.
 */
export function billingPeriods(terms: LeaseBillingTerms, until: Date): BillingPeriod[] {
  const length = PERIOD_MONTHS[terms.rentPeriod];
  const anchor = startOfMonth(terms.startDate);
  const end = effectiveLeaseEnd(terms);
  const raw: Array<Omit<BillingPeriod, 'dueDate' | 'graceUntilDate' | 'isPartial'>> = [];

  for (let k = 0; k < 1200; k += 1) {
    const nominalStart = firstOfMonthPlus(anchor, k * length);
    if (compareDates(nominalStart, until) > 0) break;
    const nominalEnd = addDays(firstOfMonthPlus(anchor, (k + 1) * length), -1);
    const periodStart =
      compareDates(terms.startDate, nominalStart) > 0 ? terms.startDate : nominalStart;
    if (end && compareDates(periodStart, end) > 0) break;
    const periodEnd = end && compareDates(end, nominalEnd) < 0 ? end : nominalEnd;
    if (compareDates(periodEnd, periodStart) < 0) continue;
    raw.push({ periodStart, periodEnd, nominalStart, nominalEnd });
  }

  const merged = mergeSingleDayPeriods(raw);
  return merged.map((p) => ({
    ...p,
    isPartial:
      compareDates(p.periodStart, p.nominalStart) !== 0 ||
      compareDates(p.periodEnd, p.nominalEnd) !== 0,
    ...dueDateOf(p.periodStart, terms.paymentDueDay, terms.graceDays),
  }));
}

type RawPeriod = { periodStart: Date; periodEnd: Date; nominalStart: Date; nominalEnd: Date };

function mergeSingleDayPeriods(periods: RawPeriod[]): RawPeriod[] {
  const result = [...periods];
  for (let i = 0; i < result.length; i += 1) {
    const current = result[i];
    if (compareDates(current.periodStart, current.periodEnd) !== 0) continue;
    const next = result[i + 1];
    const previous = result[i - 1];
    if (i === 0 && next) {
      result.splice(i, 2, {
        periodStart: current.periodStart,
        periodEnd: next.periodEnd,
        nominalStart: current.nominalStart,
        nominalEnd: next.nominalEnd,
      });
    } else if (previous) {
      result.splice(i - 1, 2, {
        periodStart: previous.periodStart,
        periodEnd: current.periodEnd,
        nominalStart: previous.nominalStart,
        nominalEnd: current.nominalEnd,
      });
      i -= 1;
    } else {
      result.splice(i, 1);
      i -= 1;
    }
  }
  return result;
}

/**
 * Montant dû pour une période, à partir du montant PAR PÉRIODE du bail.
 *
 * Période pleine : le montant tel quel. Période tronquée : la fonction
 * `prorata` de la phase 2 (jour calendaire sur le mois réel), qui raisonne en
 * montant MENSUEL ; pour un loyer trimestriel, semestriel ou annuel, la part
 * mensuelle est le montant divisé par la durée, arrondi au franc le plus
 * proche (moitié vers le haut), sans jamais passer par un flottant.
 */
export function periodAmount(
  amount: bigint,
  period: BillingPeriod,
  rentPeriod: RentPeriod,
): bigint {
  if (!period.isPartial) return amount;
  const months = BigInt(PERIOD_MONTHS[rentPeriod]);
  const monthly = prorata(amount, period.periodStart, period.periodEnd);
  if (months === 1n) return monthly;
  return (2n * monthly + months) / (2n * months);
}
