/**
 * Date métier Immodesk : le jour civil à Brazzaville.
 *
 * `Africa/Brazzaville` est à UTC+1 toute l'année, sans heure d'été
 * (docs/02_architecture_technique.md, § 7.1). Une facture dont l'échéance
 * est le 5 est exigible le 5 À BRAZZAVILLE : à 23 h 30 UTC le 4, il est déjà
 * le 5 sur place. Le décalage étant fixe, un simple décalage d'une heure
 * suffit — aucune base de fuseaux n'est nécessaire, et le calcul reste pur.
 *
 * Le résultat est une date civile à minuit UTC, compatible avec toutes les
 * fonctions de `leases/domain/calendar.ts`.
 */
export const BUSINESS_UTC_OFFSET_MINUTES = 60;

export function businessToday(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60_000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

/** Période `YYYYMM` d'une date civile (numérotation mensuelle). */
export function yearMonthOf(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** `YYYY-MM` → premier et dernier jour du mois, ou `null` si la forme diffère. */
export function monthBounds(period: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}
