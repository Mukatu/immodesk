/**
 * Rattrapage des transactions Mobile Money agrégateur restées `PENDING`
 * (contrat phase 4, § « Rattrapage »).
 *
 * Le job `momo:reconcile-pending` reprend toute transaction `PENDING` de
 * plus de 3 minutes, avec un repli croissant sur une fenêtre bornée par
 * `pendingExpiryMinutes`. Domaine pur : aucune dépendance à BullMQ ni à
 * l'horloge système au-delà des `Date` passées en paramètre.
 */
export const RECONCILE_BACKOFF_MINUTES = [3, 5, 10, 20, 30] as const;

/**
 * Une transaction est reprise dès que le délai du palier courant est
 * écoulé depuis la dernière vérification (ou l'initiation, à défaut).
 */
export function isDueForRecheck(
  lastCheckedAt: Date | null,
  initiatedAt: Date,
  statusCheckCount: number,
  now: Date,
): boolean {
  const step =
    RECONCILE_BACKOFF_MINUTES[Math.min(statusCheckCount, RECONCILE_BACKOFF_MINUTES.length - 1)];
  const reference = lastCheckedAt ?? initiatedAt;
  return now.getTime() - reference.getTime() >= step * 60_000;
}

/** Fenêtre d'expiration dépassée : la transaction n'attend plus de webhook. */
export function isExpired(initiatedAt: Date, now: Date, pendingExpiryMinutes: number): boolean {
  return now.getTime() - initiatedAt.getTime() >= pendingExpiryMinutes * 60_000;
}
