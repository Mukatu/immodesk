import { daysBetween } from '../../leases/domain/calendar';

/**
 * Tranches d'ancienneté des impayés (contrat phase 9, § « Tableaux de
 * bord »). Domaine pur : aucune dépendance Nest ni Prisma, et surtout AUCUN
 * appel à la date du jour — l'ancre (`asOf`) est toujours fournie par
 * l'appelant, ce qui rend le calcul testable avec des dates figées.
 */
export const ARREARS_BUCKET_LABELS = ['0-30', '31-60', '61-90', '90+'] as const;
export type ArrearsBucketLabel = (typeof ARREARS_BUCKET_LABELS)[number];

/**
 * Jours de retard à la date `asOf`, jamais négatifs : une facture dont
 * l'échéance n'est pas encore passée à `asOf` ne contribue pas aux impayés.
 */
export function daysOverdueAt(dueDate: Date, asOf: Date): number {
  return Math.max(0, daysBetween(dueDate, asOf));
}

/**
 * Tranche d'ancienneté pour un nombre de jours de retard donné.
 * Bornes inclusives basses : 0 à 30, 31 à 60, 61 à 90, au-delà de 90.
 */
export function bucketForDaysOverdue(daysOverdue: number): ArrearsBucketLabel {
  if (daysOverdue <= 30) return '0-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}
