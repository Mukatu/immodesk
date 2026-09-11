/**
 * Calendrier des baux : dates civiles, sans heure et sans fuseau.
 *
 * Une date de bail (`start_date`, `effective_date`, `movement_date`) est une
 * DATE SQL : le 1er juin 2026 est le 1er juin 2026 à Brazzaville comme
 * ailleurs. Toute la manipulation se fait donc en UTC à minuit, ce qui évite
 * le piège classique du `new Date('2026-06-01')` interprété en heure locale
 * puis reculé d'un jour par `toISOString()`.
 *
 * Domaine pur : aucune dépendance Nest ni Prisma.
 */

/** `YYYY-MM-DD` → Date à minuit UTC. Lève si la chaîne n'est pas une date. */
export function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new RangeError(`Date civile attendue au format AAAA-MM-JJ : « ${value} ».`);
  }
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(m) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    // 2026-02-30 passerait le test de forme mais désignerait le 2 mars :
    // mieux vaut refuser que décaler silencieusement une échéance.
    throw new RangeError(`Date civile inexistante : « ${value} ».`);
  }
  return date;
}

/** Date → `YYYY-MM-DD`, en UTC. */
export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Minuit UTC du jour porté par un instant quelconque. */
export function startOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function addDays(value: Date, days: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days));
}

export function addMonths(value: Date, months: number): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + months;
  const day = value.getUTCDate();
  // Le 31 janvier + 1 mois n'existe pas : on ramène au dernier jour du mois
  // d'arrivée plutôt que de déborder sur le 3 mars.
  const target = new Date(Date.UTC(year, month, 1));
  const last = daysInMonth(target.getUTCFullYear(), target.getUTCMonth() + 1);
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, last)));
}

/** Nombre de jours du mois (1-12). Février vaut 28 ou 29, jamais une moyenne. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isLeapYear(year: number): boolean {
  return daysInMonth(year, 2) === 29;
}

export function startOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export function endOfMonth(value: Date): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + 1;
  return new Date(Date.UTC(year, month - 1, daysInMonth(year, month)));
}

/** Différence en jours civils, `to - from`. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function compareDates(a: Date, b: Date): number {
  const left = startOfDay(a).getTime();
  const right = startOfDay(b).getTime();
  return left === right ? 0 : left < right ? -1 : 1;
}

/**
 * Jour d'exigibilité du loyer pour un mois donné.
 *
 * Le DDL borne `payment_due_day` à 28 précisément pour qu'aucun mois ne
 * puisse manquer le jour convenu — février compris. Le repli sur le dernier
 * jour du mois reste codé : une reprise de données ou une future règle
 * « échéance au 31 » ne doit pas produire une date inexistante.
 */
export function resolvePaymentDueDate(paymentDueDay: number, year: number, month: number): Date {
  const last = daysInMonth(year, month);
  const day = Math.min(Math.max(Math.trunc(paymentDueDay), 1), last);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Borne haute admise par le DDL pour `leases.payment_due_day`. */
export const MAX_PAYMENT_DUE_DAY = 28;
