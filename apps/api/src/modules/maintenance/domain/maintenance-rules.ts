import { DomainError } from '../../../shared/errors/domain-error';

export const MAINTENANCE_STATUSES = [
  'OPEN',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_REPORTERS = [
  'TENANT',
  'LANDLORD',
  'COLLECTOR',
  'MANAGER',
  'INSPECTION',
] as const;
export type MaintenanceReporter = (typeof MAINTENANCE_REPORTERS)[number];

const TERMINAL: readonly MaintenanceStatus[] = ['CLOSED', 'REJECTED'];

/**
 * Graphe des transitions autorisées (contrat § Maintenance, machine à huit
 * statuts). `REJECTED` est atteignable depuis tout statut non terminal — un
 * signalement peut être refusé à tout moment avant clôture — et `RESOLVED`
 * peut être rouverte en `IN_PROGRESS` si l'intervention s'avère incomplète.
 */
const TRANSITIONS: Readonly<Record<MaintenanceStatus, readonly MaintenanceStatus[]>> = {
  OPEN: ['ACKNOWLEDGED', 'ASSIGNED', 'REJECTED'],
  ACKNOWLEDGED: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'REJECTED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED', 'REJECTED'],
  ON_HOLD: ['IN_PROGRESS', 'ASSIGNED', 'REJECTED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  REJECTED: [],
};

export function isTerminal(status: MaintenanceStatus): boolean {
  return TERMINAL.includes(status);
}

export function assertTransition(current: MaintenanceStatus, next: MaintenanceStatus): void {
  if (current === next) return;
  const allowed = TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new DomainError('MAINTENANCE.INVALID_TRANSITION', { from: current, to: next, allowed });
  }
}

export interface SlaHours {
  URGENT: number;
  HIGH: number;
  NORMAL: number;
  LOW: number;
}

/** Ajoute `days` jours OUVRÉS (hors samedi/dimanche) à un instant, en préservant l'heure. */
function addBusinessDays(from: Date, days: number): Date {
  let cursor = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    cursor = new Date(cursor.getTime() + 86_400_000);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return cursor;
}

/**
 * Délai cible calculé À LA CRÉATION selon la gravité (contrat § Maintenance) :
 * heures pour `URGENT`/`HIGH`, jours ouvrés pour `NORMAL`, jours calendaires
 * pour `LOW`. `slaHours.NORMAL`/`.LOW` sont exprimés en HEURES équivalentes
 * (24 × jours) dans `FacilitiesSettings` ; on les reconvertit ici en jours.
 */
export function computeSlaDueAt(
  priority: MaintenancePriority,
  reportedAt: Date,
  slaHours: SlaHours,
): Date {
  switch (priority) {
    case 'URGENT':
      return new Date(reportedAt.getTime() + slaHours.URGENT * 3_600_000);
    case 'HIGH':
      return new Date(reportedAt.getTime() + slaHours.HIGH * 3_600_000);
    case 'NORMAL':
      return addBusinessDays(reportedAt, Math.round(slaHours.NORMAL / 24));
    case 'LOW':
      return new Date(reportedAt.getTime() + slaHours.LOW * 3_600_000);
  }
}
