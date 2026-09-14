import { DomainError } from '../../../shared/errors/domain-error';

export const DECLARATION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'MATCHED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;
export type DeclarationStatus = (typeof DECLARATION_STATUSES)[number];

/**
 * Machine à états d'une déclaration de virement (contrat phase 4, § « Virement
 * déclaré »). `MATCHED` est réservé au rapprochement de la phase 6 : aucun
 * chemin de la phase 4 n'y mène.
 */
export const DECLARATION_TRANSITIONS: Readonly<
  Record<DeclarationStatus, readonly DeclarationStatus[]>
> = {
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  MATCHED: [],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function assertDeclarationTransition(from: DeclarationStatus, to: DeclarationStatus): void {
  if (!DECLARATION_TRANSITIONS[from].includes(to)) {
    throw new DomainError('BANK.INVALID_TRANSITION', { from, to });
  }
}

const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 18;
/** Lundi (1) à samedi (6) : jours ouvrés à Brazzaville. Dimanche (0) chômé. */
function isBusinessDay(date: Date): boolean {
  return date.getUTCDay() !== 0;
}

/**
 * Heures OUVRÉES écoulées entre deux instants : seules les heures des jours
 * ouvrés (lundi-samedi), dans la plage 08h-18h, sont comptées. Une
 * approximation horaire (pas à la minute) suffit à l'indicateur d'ancienneté
 * du contrat (seuil 72 h) et reste simple à tester.
 */
export function businessHoursElapsed(from: Date, to: Date): number {
  if (to <= from) return 0;
  let hours = 0;
  const cursor = new Date(from);
  cursor.setUTCMinutes(0, 0, 0);
  while (cursor < to) {
    if (isBusinessDay(cursor)) {
      const hour = cursor.getUTCHours();
      if (hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR) hours += 1;
    }
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }
  return hours;
}

export const AGED_ALERT_THRESHOLD_HOURS = 72;
