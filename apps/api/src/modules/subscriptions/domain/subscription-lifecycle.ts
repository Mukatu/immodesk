/**
 * Machine à états d'un abonnement (contrat phase 10, § « Cycle de vie »).
 *
 * TRIALING → ACTIVE (premier encaissement) ou EXPIRED (essai épuisé, jamais
 * payé). ACTIVE → PAST_DUE (échéance dépassée) → SUSPENDED (au-delà du délai
 * de grâce). Une résiliation pose `cancelled_at` sans changer le statut
 * immédiatement : le passage à CANCELLED n'intervient qu'à la fin de la
 * période courante. Domaine pur : aucune dépendance Nest ni Prisma, les
 * fonctions ne lisent ni n'écrivent rien — elles prennent une décision à
 * partir de champs déjà chargés.
 */
export const SUBSCRIPTION_STATUSES = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Statuts pour lesquels une prochaine facture périodique doit encore être émise. */
export const BILLABLE_STATUSES: readonly SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE'];

export function isBillable(status: SubscriptionStatus): boolean {
  return BILLABLE_STATUSES.includes(status);
}

/** Un abonnement déjà résilié ne peut pas l'être une seconde fois (409). */
export function canRequestCancellation(status: SubscriptionStatus): boolean {
  return status !== 'CANCELLED';
}

/**
 * Lecture seule pour tous les rôles sauf OWNER (contrat, § « Suspension »).
 * Contrôle purement applicatif : aucune autre colonne ne porte cet état.
 */
export function isReadOnlyForNonOwner(status: SubscriptionStatus): boolean {
  return status === 'SUSPENDED';
}

/**
 * TRIALING → EXPIRED : l'essai s'achève sans qu'aucun encaissement n'ait eu
 * lieu. Si un paiement était survenu, `applyPaymentConfirmed` aurait déjà
 * fait passer le statut à ACTIVE — atteindre cette règle en TRIALING signifie
 * donc bien « jamais payé ».
 */
export function shouldExpireTrial(
  status: SubscriptionStatus,
  trialEndsAt: Date | null,
  today: Date,
): boolean {
  return status === 'TRIALING' && trialEndsAt !== null && trialEndsAt.getTime() <= today.getTime();
}

/** Statut atteint après un encaissement confirmé (jamais sur le seul webhook). */
export function statusAfterPaymentConfirmed(status: SubscriptionStatus): SubscriptionStatus {
  return status === 'CANCELLED' || status === 'EXPIRED' ? status : 'ACTIVE';
}

/** ACTIVE devient PAST_DUE dès qu'une facture ISSUED dépasse son échéance. */
export function shouldMarkPastDue(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE';
}

/** PAST_DUE devient SUSPENDED au-delà de `grace_days` depuis l'échéance impayée. */
export function shouldSuspend(
  status: SubscriptionStatus,
  earliestUnpaidDueDate: Date | null,
  graceDays: number,
  today: Date,
): boolean {
  if (status !== 'PAST_DUE' || earliestUnpaidDueDate === null) return false;
  const deadline = new Date(earliestUnpaidDueDate.getTime() + graceDays * 86_400_000);
  return deadline.getTime() <= today.getTime();
}

/**
 * Finalisation d'une résiliation demandée : seulement à la fin de la période
 * courante, jamais immédiatement (contrat, § « Cycle de vie »).
 */
export function shouldFinalizeCancellation(
  status: SubscriptionStatus,
  cancelledAt: Date | null,
  currentPeriodEnd: Date,
  today: Date,
): boolean {
  return (
    cancelledAt !== null && status !== 'CANCELLED' && currentPeriodEnd.getTime() <= today.getTime()
  );
}
