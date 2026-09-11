import { compareDates, endOfMonth, startOfMonth, toIsoDate } from '../../leases/domain/calendar';

const FRENCH_MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** `2026-06-01` → « 1er juin 2026 ». Aucun fuseau : c'est une date civile. */
export function frenchLongDate(date: Date): string {
  const day = date.getUTCDate();
  return `${day === 1 ? '1er' : day} ${FRENCH_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Mois en toutes lettres : « septembre 2026 ». */
export function frenchMonth(date: Date): string {
  return `${FRENCH_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Libellé d'une période facturée, tel qu'imprimé sur une facture, une
 * quittance ou un message : « septembre 2026 » pour un mois civil complet,
 * « du 12 au 31 mars 2026 » ou « du 1er juillet au 30 septembre 2026 »
 * sinon.
 */
export function periodLabel(start: Date, end: Date): string {
  const fullMonth =
    compareDates(start, startOfMonth(start)) === 0 && compareDates(end, endOfMonth(start)) === 0;
  if (fullMonth) return frenchMonth(start);
  if (toIsoDate(start).slice(0, 7) === toIsoDate(end).slice(0, 7)) {
    const day = start.getUTCDate();
    return `du ${day === 1 ? '1er' : day} au ${frenchLongDate(end)}`;
  }
  return `du ${frenchLongDate(start)} au ${frenchLongDate(end)}`;
}
