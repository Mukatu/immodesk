import { addDays, compareDates, daysBetween } from '../../leases/domain/calendar';
import { BUSINESS_UTC_OFFSET_MINUTES } from '../../../shared/time/business-date';
import type { DunningInvoiceState, DunningRuleTerms } from './dunning-types';

/**
 * Jours de retard signés : positif après l'échéance, négatif avant (rappel
 * courtois `DAYS_BEFORE_DUE`). Jamais construit à partir de la date du jour :
 * `today` est toujours un paramètre explicite (contrat, tranche 5).
 */
export function daysOverdueOf(dueDate: Date, today: Date): number {
  return daysBetween(dueDate, today);
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Lundi suivant (inclus si `date` est déjà un lundi... jamais le cas ici). */
function nextMonday(date: Date): Date {
  let d = date;
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

/**
 * Jour naturel de déclenchement du palier pour cette facture, AVANT prise en
 * compte de `skipWeekends`.
 *
 * - `DAYS_AFTER_DUE` : `dueDate + offsetDays`.
 * - `DAYS_BEFORE_DUE` : `dueDate - offsetDays` (rappel avant terme).
 * - `ON_ISSUE` : `issueDate + offsetDays` (0 par défaut : jour même).
 * - `ON_OVERDUE` : lendemain de la fin de tolérance (bascule OVERDUE),
 *   décalé de `offsetDays` si non nul.
 */
function naturalTriggerDate(rule: DunningRuleTerms, invoice: DunningInvoiceState): Date {
  switch (rule.triggerType) {
    case 'DAYS_AFTER_DUE':
      return addDays(invoice.dueDate, rule.offsetDays);
    case 'DAYS_BEFORE_DUE':
      return addDays(invoice.dueDate, -rule.offsetDays);
    case 'ON_ISSUE':
      return addDays(invoice.issueDate, rule.offsetDays);
    case 'ON_OVERDUE':
      return addDays(invoice.graceUntilDate ?? invoice.dueDate, rule.offsetDays + 1);
  }
}

/**
 * Jour EFFECTIF de déclenchement : le jour naturel, reporté au lundi suivant
 * si `skipWeekends` et que ce jour tombe un samedi ou un dimanche.
 *
 * Pure et déterministe : aucune horloge, aucun accès base. C'est ce qui
 * permet de tester le report du week-end sans dépendre de la date du jour.
 */
export function effectiveTriggerDate(rule: DunningRuleTerms, invoice: DunningInvoiceState): Date {
  const natural = naturalTriggerDate(rule, invoice);
  return rule.skipWeekends ? nextMonday(natural) : natural;
}

/** Vrai si le palier de cette règle correspond EXACTEMENT au jour `today`. */
export function matchesToday(
  rule: DunningRuleTerms,
  invoice: DunningInvoiceState,
  today: Date,
): boolean {
  return compareDates(effectiveTriggerDate(rule, invoice), today) === 0;
}

/** Vrai si le solde de la facture est sous le minimum de relance de la règle. */
export function isBelowMinimum(rule: DunningRuleTerms, invoice: DunningInvoiceState): boolean {
  return invoice.balanceAmount < rule.minBalanceAmount;
}

/**
 * Sélectionne, parmi des règles actives, celle dont le palier correspond
 * EXACTEMENT au décalage de cette facture à cette date (contrat, tranche 2 :
 * « un seul palier par rang » garantit qu'au plus une règle matche par rang,
 * mais deux règles de rangs différents peuvent en théorie matcher le même
 * jour — la plus petite `stepOrder` l'emporte).
 *
 * Le seuil `minBalanceAmount` n'est PAS filtré ici : une règle sous le seuil
 * doit tout de même produire une ligne `dunning_runs` SKIPPED (motif lisible),
 * pas une absence silencieuse.
 */
export function selectMatchingRule(
  rules: readonly DunningRuleTerms[],
  invoice: DunningInvoiceState,
  today: Date,
): DunningRuleTerms | null {
  const sorted = [...rules].sort((a, b) => a.stepOrder - b.stepOrder);
  for (const rule of sorted) {
    if (matchesToday(rule, invoice, today)) return rule;
  }
  return null;
}

/**
 * Heure Brazzaville atteinte pour cette règle : la CRON tourne chaque heure
 * (0 à 23) ; une règle n'est traitée qu'à partir de l'heure configurée
 * (`sendHourLocal`), jamais avant — ce qui exclut tout envoi nocturne sans
 * qu'il soit nécessaire de borner dynamiquement le motif cron lui-même
 * (les règles sont mutables via CRUD, contrainte documentée dans le
 * compte rendu de livraison).
 */
export function isHourReached(rule: DunningRuleTerms, currentHourLocal: number): boolean {
  return currentHourLocal >= rule.sendHourLocal;
}

/**
 * Heure civile Africa/Brazzaville (UTC+1 fixe, sans heure d'été) d'un
 * instant donné. Toujours appelée avec un instant explicite dans les tests.
 */
export function brazzavilleHourOf(now: Date): number {
  const shifted = new Date(now.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60_000);
  return shifted.getUTCHours();
}
