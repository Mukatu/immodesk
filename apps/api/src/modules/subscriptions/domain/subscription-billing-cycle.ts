import { addDays, addMonths } from '../../leases/domain/calendar';

/**
 * Calendrier de facturation d'un abonnement (contrat phase 10, § « Facturation »).
 * Réutilise le calendrier civil déjà éprouvé de `leases/domain/calendar.ts`
 * (dates à minuit UTC, sans fuseau) plutôt que d'en réécrire un.
 *
 * Domaine pur.
 */
export type BillingInterval = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export function intervalMonths(interval: BillingInterval): number {
  if (interval === 'MONTHLY') return 1;
  if (interval === 'QUARTERLY') return 3;
  return 12;
}

/**
 * Borne de fin d'une période démarrant à `periodStart`, incluse (`period_end
 * DATE`) : le dernier jour AVANT le début de la période suivante.
 */
export function computePeriodEnd(periodStart: Date, interval: BillingInterval): Date {
  return addDays(addMonths(periodStart, intervalMonths(interval)), -1);
}

/** Début de la période suivante : le lendemain de la fin de la période donnée. */
export function nextPeriodStart(periodEnd: Date): Date {
  return addDays(periodEnd, 1);
}

/**
 * `trial_ends_at` à la souscription : `trial_days` jours civils après
 * aujourd'hui. `trial_days` vaut 0 pour un plan sans essai — la période
 * d'essai est alors immédiatement écoulée (`trial_ends_at = today`), ce qui
 * ancre directement la première échéance sur le jour de souscription.
 */
export function computeTrialEndsAt(today: Date, trialDays: number): Date {
  return addDays(today, Math.max(0, Math.trunc(trialDays)));
}
