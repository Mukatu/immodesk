/**
 * Consentement locataire : un événement d'audit, pas une colonne (arbitrage
 * 6). L'état courant est DÉRIVÉ de la dernière entrée
 * `PRIVACY_CONSENT_ACCEPTED`, sur le modèle de l'avancement de l'onboarding
 * (phase 10). Domaine pur : reçoit des lignes déjà lues, ne touche pas la base.
 */
export interface ConsentAuditRow {
  occurredAt: Date;
  legalVersion: string;
  acceptedAt: string;
}

/** Catégories de données détenues sur un locataire, affichées à l'écran « mes données » du portail. */
export const TENANT_DATA_CATEGORIES = [
  'IDENTITY',
  'CONTACT',
  'LEASE',
  'FINANCIAL',
  'COMMUNICATION_HISTORY',
] as const;

export interface ConsentState {
  acceptedVersion: string | null;
  acceptedAt: string | null;
  /** `true` tant que la version courante des mentions légales n'est pas acceptée : toute écriture du portail est alors refusée (`403 PRIVACY.CONSENT_REQUIRED`). */
  consentRequired: boolean;
}

/**
 * La plus récente acceptation d'un ensemble de lignes d'audit.
 *
 * L'appelant ne passe qu'UNE ligne par organisation (déjà la plus récente de
 * chacune, résolue en amont côté application) : un locataire multi-agences
 * a potentiellement plusieurs organisations en jeu, et c'est la plus PRUDENTE
 * qui l'emporte — si une seule d'entre elles n'a pas encore vu la version
 * courante acceptée, le consentement reste requis pour la session entière.
 */
export function deriveConsentState(
  rows: readonly ConsentAuditRow[],
  currentLegalVersion: string,
): ConsentState {
  if (rows.length === 0) {
    return { acceptedVersion: null, acceptedAt: null, consentRequired: true };
  }
  const latest = [...rows].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
  const allCurrent = rows.every((r) => r.legalVersion === currentLegalVersion);
  return {
    acceptedVersion: latest.legalVersion,
    acceptedAt: latest.acceptedAt,
    consentRequired: !allCurrent,
  };
}
