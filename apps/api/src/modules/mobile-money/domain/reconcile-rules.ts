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

/**
 * Délai minimal entre deux ordres d'exécution d'un retrait OpenPay après un refus définitif
 * (HTTP 400 : solde insuffisant...) : aucun virement n'est parti, la relance est seulement espacée.
 */
export const PAYOUT_EXECUTE_RETRY_MINUTES = 30;

/**
 * Âges (minutes) entre lesquels une initiation OpenPay sans référence peut être REJOUÉE (clé
 * d'idempotence) : trop tôt, l'appel d'origine est peut-être encore en cours ; trop tard, un
 * rejeu qui crée réellement la transaction enverrait un push USSD inattendu. La borne haute
 * dépasse la période du cron (5 min) : une fenêtre contient toujours au moins un passage.
 */
export const INITIATION_REPLAY_MIN_AGE_MINUTES = 1;
export const INITIATION_REPLAY_MAX_AGE_MINUTES = 6;

export function isInitiationReplayable(initiatedAt: Date, now: Date): boolean {
  const ageMs = now.getTime() - initiatedAt.getTime();
  return (
    ageMs >= INITIATION_REPLAY_MIN_AGE_MINUTES * 60_000 &&
    ageMs < INITIATION_REPLAY_MAX_AGE_MINUTES * 60_000
  );
}

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
 * intervalle minimal depuis la dernière vérification. Il borne le polling du
 * client comme les callbacks ; le plafond propre aux callbacks (fenêtre
 * glissante) est porté par `OpenPayApiLimiter`, jamais par un compteur global
 * que le polling épuiserait en quelques minutes.
 */
export function isCheckThrottled(
  tx: { status_checked_at: Date | null },
  limits: { minIntervalSeconds: number },
  now: Date,
): boolean {
  return (
    tx.status_checked_at !== null &&
    now.getTime() - tx.status_checked_at.getTime() < limits.minIntervalSeconds * 1000
  );
}

/**
 * Origine d'une vérification de statut :
 * - `CALLBACK` : déclenchée par un callback (non signé donc forgeable) : intervalle
 *   minimal ET plafond par fenêtre glissante ;
 * - `REFRESH` : demandée par un utilisateur (polling du client) : intervalle minimal ;
 * - `RECONCILE` : rattrapage interne, déjà espacé par son repli : jamais freiné.
 */
export type CheckOrigin = 'CALLBACK' | 'REFRESH' | 'RECONCILE';

/**
 * Un reversement attend l'approbation d'OpenPay au moins 25 h (`execution_date` >= +24 h
 * + marge d'une heure) : il n'expire pas avec les collectes. 48 h = 25 h + 23 h de marge
 * d'approbation ; passé ce délai, le retrait est annulé chez le fournisseur avant d'être expiré.
 */
export const OWNER_PAYOUT_EXPIRY_MINUTES = 48 * 60;

/** Une transaction `INITIATED` jamais sortie de cet état est expirée après ce délai. */
export function isInitiatedExpired(initiatedAt: Date, now: Date, expiryMinutes: number): boolean {
  return now.getTime() - initiatedAt.getTime() >= expiryMinutes * 60_000;
}
