/**
 * Incident de plateforme (docs/api/phase11-contract.md, § Plan de go-live
 * 11.F, arbitrage 14).
 *
 * Un seul incident courant à la fois : c'est le drapeau GLOBAL
 * `platform_incident` de `feature_flags` (`feature_flags_global_key_uk`
 * interdit qu'il y en ait deux). La gravité est une valeur applicative
 * (`MINOR`/`MAJOR`/`CRITICAL`), portée par `payload`, pas par une énumération
 * SQL. Logique pure ; la lecture/écriture du drapeau vit dans
 * `application/incidents.service.ts`.
 */

export type IncidentSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface IncidentUpdateEntry {
  at: string;
  message: string;
}

export interface IncidentPayload {
  reference: string;
  title: string;
  severity: IncidentSeverity;
  startedAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdateEntry[];
}

export class IncidentAlreadyOpenError extends Error {
  constructor() {
    super('Un incident est déjà ouvert : mettez-le à jour plutôt que d’en déclarer un second.');
    this.name = 'IncidentAlreadyOpenError';
  }
}

export class IncidentNotFoundError extends Error {
  constructor() {
    super('Aucun incident courant à mettre à jour ou à résoudre.');
    this.name = 'IncidentNotFoundError';
  }
}

/** Un incident est « courant » tant qu'il n'a pas de `resolvedAt`. */
export function isOpenIncident(current: IncidentPayload | null): current is IncidentPayload {
  return current !== null && current.resolvedAt === null;
}

export function assertNoOpenIncident(current: IncidentPayload | null): void {
  if (isOpenIncident(current)) throw new IncidentAlreadyOpenError();
}

/** Renvoie l'incident courant s'il est bien ouvert, sinon lève. */
export function requireOpenIncident(current: IncidentPayload | null): IncidentPayload {
  if (!isOpenIncident(current)) throw new IncidentNotFoundError();
  return current;
}

export function declareIncident(input: {
  reference: string;
  title: string;
  severity: IncidentSeverity;
  startedAt: Date;
}): IncidentPayload {
  return {
    reference: input.reference,
    title: input.title,
    severity: input.severity,
    startedAt: input.startedAt.toISOString(),
    resolvedAt: null,
    updates: [],
  };
}

/** Mise à jour intermédiaire : jamais diffusée en audit (arbitrage 4). */
export function appendIncidentUpdate(
  current: IncidentPayload | null,
  message: string,
  at: Date,
): IncidentPayload {
  const open = requireOpenIncident(current);
  return { ...open, updates: [...open.updates, { at: at.toISOString(), message }] };
}

export function resolveIncident(current: IncidentPayload | null, at: Date): IncidentPayload {
  const open = requireOpenIncident(current);
  return { ...open, resolvedAt: at.toISOString() };
}
