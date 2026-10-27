/**
 * Plan de go-live par vagues (docs/api/phase11-contract.md, § 11.F,
 * arbitrages 15 et 18).
 *
 * Une vague n'est pas une entité : c'est `feature_flags.payload.wave` sur la
 * ligne `commercial_launch` de chaque organisation. Ce module ne contient que
 * la logique pure (taille de vague, dérivation du statut d'une ligne du
 * tableau de bord) ; les jointures et l'accès base vivent dans
 * `application/go-live.service.ts`.
 */

export class WaveTooLargeError extends Error {
  constructor(
    public readonly count: number,
    public readonly max: number,
  ) {
    super(`Vague de ${count} organisations : au-delà du maximum autorisé (${max}).`);
    this.name = 'WaveTooLargeError';
  }
}

export class WaveUnknownError extends Error {
  constructor(public readonly wave: string) {
    super(`Vague « ${wave} » inconnue.`);
    this.name = 'WaveUnknownError';
  }
}

export function assertWaveSize(count: number, max: number): void {
  if (count > max) throw new WaveTooLargeError(count, max);
}

/**
 * Une vague n'est « connue » que si au moins une organisation lui est déjà
 * rattachée, ou si l'appelant en fournit explicitement (activation).
 */
export function assertWaveKnown(
  wave: string,
  knownOrgCount: number,
  providedOrgCount: number,
): void {
  if (knownOrgCount === 0 && providedOrgCount === 0) throw new WaveUnknownError(wave);
}

export type GoLiveOrgStatus = 'MIGRATED' | 'PENDING' | 'ANOMALY';

export interface GoLiveOrgSignal {
  /** `commercial_launch.is_enabled` de cette organisation. */
  flagEnabled: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  now: Date;
  /** Statut d'abonnement courant, tel que porté par `subscriptions.status`. */
  subscriptionStatus: string | null;
  /** Accès refusés des dernières 24 h (`audit_logs`, opération `ACCESS_DENIED`). */
  denialsLast24h: number;
  denialThreshold: number;
  /** Taux de messages `FAILED`/`REJECTED` récents, `null` si aucune donnée. */
  messageFailureRate: number | null;
  messageFailureThreshold: number;
  onboardingComplete: boolean;
}

export interface GoLiveOrgEvaluation {
  status: GoLiveOrgStatus;
  anomalies: string[];
}

/**
 * `MIGRATED` quand le drapeau est actif et dans sa fenêtre ; `PENDING` quand
 * l'organisation est rattachée à la vague sans drapeau actif, ou avant
 * `startsAt` ; `ANOMALY` quand le drapeau est actif et qu'au moins un signal
 * se déclenche.
 */
export function evaluateGoLiveStatus(signal: GoLiveOrgSignal): GoLiveOrgEvaluation {
  const withinWindow =
    signal.flagEnabled &&
    (!signal.startsAt || signal.startsAt <= signal.now) &&
    (!signal.endsAt || signal.endsAt > signal.now);

  if (!withinWindow) {
    return { status: 'PENDING', anomalies: [] };
  }

  const anomalies: string[] = [];
  if (signal.subscriptionStatus === 'PAST_DUE') {
    anomalies.push('Abonnement en défaut de paiement (PAST_DUE).');
  }
  if (signal.subscriptionStatus === 'SUSPENDED') {
    anomalies.push('Abonnement suspendu.');
  }
  if (signal.denialsLast24h > signal.denialThreshold) {
    anomalies.push(
      `Accès refusés au-delà du seuil sur 24 h (${signal.denialsLast24h}/${signal.denialThreshold}).`,
    );
  }
  if (
    signal.messageFailureRate !== null &&
    signal.messageFailureRate > signal.messageFailureThreshold
  ) {
    anomalies.push(
      `Taux de messages échoués ou rejetés au-delà du seuil (${Math.round(
        signal.messageFailureRate * 100,
      )} %).`,
    );
  }
  if (!signal.onboardingComplete) {
    anomalies.push('Onboarding inachevé.');
  }

  return { status: anomalies.length > 0 ? 'ANOMALY' : 'MIGRATED', anomalies };
}
