/**
 * Rattrapage des transactions Mobile Money agrégateur restées `PENDING`
 * (contrat phase 4, § « Rattrapage »).
 *
 * Le job `momo:reconcile-pending` reprend toute transaction `PENDING` de
 * plus de 3 minutes, avec un repli croissant sur une fenêtre bornée par
 * `pendingExpiryMinutes`. Domaine pur : aucune dépendance à BullMQ ni à
 * l'horloge système au-delà des `Date` passées en paramètre.
 */
/** Âge minimal d'une transaction `PENDING` avant rattrapage. */
export const PENDING_MIN_AGE_MINUTES = 3;

/**
 * Âge minimal d'une transaction `INITIATED` : plus long, pour ne pas courir
 * après une initiation en cours (l'appel au fournisseur n'a pas encore rendu
 * la main). Au-delà, la ligne est restée coincée (crash, réponse perdue).
 */
export const INITIATED_MIN_AGE_MINUTES = 10;

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

/**
 * Anti-abus des vérifications d'une même transaction (fournisseur à webhook non
 * signé : un callback forgé ne doit pas se traduire en appels répétés) :
 * intervalle minimal depuis la dernière vérification, et plafond de vérifications.
 */
export function isCheckThrottled(
  tx: { status_checked_at: Date | null; status_check_count: number },
  limits: { minIntervalSeconds: number; maxChecks: number },
  now: Date,
): boolean {
  if (tx.status_check_count >= limits.maxChecks) return true;
  return (
    tx.status_checked_at !== null &&
    now.getTime() - tx.status_checked_at.getTime() < limits.minIntervalSeconds * 1000
  );
}

/** Une transaction `INITIATED` jamais sortie de cet état est expirée après ce délai. */
export function isInitiatedExpired(initiatedAt: Date, now: Date, expiryMinutes: number): boolean {
  return now.getTime() - initiatedAt.getTime() >= expiryMinutes * 60_000;
}
