import { DomainError } from '../../../shared/errors/domain-error';

/**
 * Motifs de révocation de session, repris tels quels dans
 * `refresh_tokens.revoked_reason` (colonne TEXT libre, vocabulaire fixé par
 * le contrat phase 11, § Centre de sécurité).
 */
export type SessionRevokedReason =
  'USER_REVOKED' | 'ORG_REVOKE_ALL' | 'PLATFORM_REVOKE_ALL' | 'COMPROMISE';

/**
 * Vrai si la famille de jetons est déjà révoquée : la révocation d'une
 * session est alors un no-op (204), jamais une erreur (contrat, § Centre de
 * sécurité : « une session déjà coupée est un état souhaité, pas un
 * conflit »).
 */
export function isFamilyAlreadyRevoked(revokedAt: Date | null): boolean {
  return revokedAt !== null;
}

/** 409 `SECURITY.API_KEY_LIMIT_REACHED` au-delà du plafond de clés ACTIVE. */
export function assertApiKeyLimitNotReached(activeCount: number, maxPerOrg: number): void {
  if (activeCount >= maxPerOrg) {
    throw new DomainError('SECURITY.API_KEY_LIMIT_REACHED', { activeCount, max: maxPerOrg });
  }
}

/** 409 `SECURITY.API_KEY_REVOKED` : une clé déjà révoquée ne se fait pas tourner. */
export function assertApiKeyRotatable(status: string): void {
  if (status === 'REVOKED') {
    throw new DomainError('SECURITY.API_KEY_REVOKED');
  }
}

/**
 * Échéance de grâce d'une clé tournée : `graceHours = 0` vaut coupure
 * immédiate (compromission), sans traitement spécial — l'échéance est alors
 * `now`, laissant la clé ACTIVE jusqu'à la prochaine lecture qui en tiendra
 * compte (contrat : « 0 pour une coupure immédiate »).
 */
export function rotationGraceExpiresAt(now: Date, graceHours: number): Date {
  return new Date(now.getTime() + graceHours * 3_600_000);
}

/**
 * Borne la fenêtre de consultation des refus d'accès à
 * `SECURITY_DENIAL_LOOKBACK_DAYS` : `from` ne peut jamais remonter plus loin
 * que cette limite même si le client le demande, et `to` ne dépasse jamais
 * l'instant courant (contrat : « fenêtre glissante dont l'étendue par défaut
 * et maximale est SECURITY_DENIAL_LOOKBACK_DAYS »).
 */
export function clampDenialWindow(
  requested: { from?: Date; to?: Date },
  now: Date,
  lookbackDays: number,
): { from: Date; to: Date } {
  const earliestAllowed = new Date(now.getTime() - lookbackDays * 86_400_000);
  const to = requested.to && requested.to.getTime() < now.getTime() ? requested.to : now;
  const from =
    requested.from && requested.from.getTime() > earliestAllowed.getTime()
      ? requested.from
      : earliestAllowed;
  return { from, to };
}
