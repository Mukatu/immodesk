import { DomainError } from '../../../shared/errors/domain-error';

/** Garde-fou du contrat : au plus 200 lots par appel en série. */
export const MAX_BULK_UNITS = 200;

export interface UnitCodeSeries {
  prefix: string;
  from: number;
  to: number;
  padding?: number;
}

/**
 * Engendre la série de codes de lots d'un appel `units/bulk`.
 *
 * `{ prefix: 'A', from: 1, to: 12 }` donne `A1 … A12`.
 * `{ prefix: 'A', from: 1, to: 12, padding: 2 }` donne `A01 … A12` — le
 * remplissage sert à ce que les codes se trient correctement en ordre
 * alphabétique, ce que font tous les tableurs des agences.
 *
 * Un `padding` plus court que le nombre est ignoré plutôt que tronqué :
 * tronquer `A100` en `A00` fabriquerait un doublon silencieux.
 */
export function generateUnitCodes(series: UnitCodeSeries): string[] {
  const prefix = (series.prefix ?? '').trim();
  const from = Math.trunc(series.from);
  const to = Math.trunc(series.to);
  const padding = series.padding === undefined ? 0 : Math.trunc(series.padding);

  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to || from < 0) {
    throw new DomainError('PORTFOLIO.BULK_RANGE_INVALID', { from: series.from, to: series.to });
  }
  const count = to - from + 1;
  if (count > MAX_BULK_UNITS) {
    throw new DomainError('PORTFOLIO.BULK_RANGE_INVALID', { count, max: MAX_BULK_UNITS });
  }
  if (padding < 0 || padding > 10) {
    throw new DomainError('PORTFOLIO.BULK_RANGE_INVALID', { padding: series.padding });
  }

  const codes: string[] = [];
  for (let n = from; n <= to; n += 1) {
    codes.push(`${prefix}${String(n).padStart(padding, '0')}`);
  }
  return codes;
}

/**
 * Étiquette par défaut d'un lot engendré : le code lui-même. L'agence la
 * remplacera au cas par cas (« Studio rez-de-chaussée gauche »).
 */
export function defaultUnitLabel(code: string): string {
  return code;
}
