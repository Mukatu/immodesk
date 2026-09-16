import { DomainError } from '../../../shared/errors/domain-error';

export const INSPECTION_TYPES = ['MOVE_IN', 'MOVE_OUT', 'PERIODIC', 'CONTRADICTORY'] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const INSPECTION_STATUSES = [
  'DRAFT',
  'IN_PROGRESS',
  'PENDING_SIGNATURE',
  'SIGNED',
  'DISPUTED',
  'CANCELLED',
] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

/** Six niveaux (contrat, § Énumérations) : le plan en citait cinq, à tort. */
export const INSPECTION_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'MISSING'] as const;
export type InspectionCondition = (typeof INSPECTION_CONDITIONS)[number];

const CONDITION_LEVEL: Readonly<Record<InspectionCondition, number>> = {
  NEW: 0,
  GOOD: 1,
  FAIR: 2,
  POOR: 3,
  DAMAGED: 4,
  MISSING: 5,
};

export function conditionLevel(condition: InspectionCondition): number {
  return CONDITION_LEVEL[condition];
}

/** Statuts au-delà desquels aucun poste ni aucune photo ne peut changer (arbitrage 3). */
const LOCKED_STATUSES: readonly InspectionStatus[] = ['SIGNED', 'DISPUTED', 'CANCELLED'];

export function assertNotLocked(status: InspectionStatus): void {
  if (LOCKED_STATUSES.includes(status)) {
    throw new DomainError('INSPECTIONS.LOCKED', { status });
  }
}

/**
 * Une photo devient obligatoire dès que l'état atteint le seuil paramétré
 * (contrat, arbitrage 6, et `facilities.inspectionPhotoRequiredFrom`).
 */
export function isPhotoRequired(
  condition: InspectionCondition,
  requiredFrom: 'POOR' | 'DAMAGED',
): boolean {
  return conditionLevel(condition) >= conditionLevel(requiredFrom);
}

export type ChargedTo = 'LANDLORD' | 'TENANT' | 'ORGANIZATION';

/** Statut dérivé lorsqu'un premier poste est saisi (contrat § États des lieux). */
export function nextStatusOnFirstItem(status: InspectionStatus): InspectionStatus {
  return status === 'DRAFT' ? 'IN_PROGRESS' : status;
}

/**
 * Comparaison entrée/sortie d'un couple de postes appariés par pièce et
 * élément normalisés (contrat § Comparaison).
 */
export type ComparisonStatus = 'UNCHANGED' | 'DEGRADED' | 'IMPROVED' | 'ADDED' | 'MISSING';

export function normalizeKey(roomLabel: string, elementLabel: string): string {
  return `${roomLabel.trim().toLowerCase()}::${elementLabel.trim().toLowerCase()}`;
}

export function compareConditions(
  entry: InspectionCondition | null,
  exit: InspectionCondition | null,
): { degradationLevels: number; status: ComparisonStatus } {
  if (entry && !exit) return { degradationLevels: 0, status: 'MISSING' };
  if (!entry && exit) return { degradationLevels: 0, status: 'ADDED' };
  if (!entry || !exit) return { degradationLevels: 0, status: 'UNCHANGED' };
  const delta = conditionLevel(exit) - conditionLevel(entry);
  if (delta > 0) return { degradationLevels: delta, status: 'DEGRADED' };
  if (delta < 0) return { degradationLevels: 0, status: 'IMPROVED' };
  return { degradationLevels: 0, status: 'UNCHANGED' };
}

/** Marqueur du poste d'origine, inséré dans le libellé/la description d'une écriture dérivée. */
export function itemMarker(itemId: string): string {
  return `(poste ${itemId})`;
}

export function deductionReason(roomLabel: string, elementLabel: string, itemId: string): string {
  return `Retenue état des lieux — ${roomLabel} / ${elementLabel} ${itemMarker(itemId)}`;
}
