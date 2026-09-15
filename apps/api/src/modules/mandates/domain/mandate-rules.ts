import { DomainError } from '../../../shared/errors/domain-error';

/** Énumération SQL `mandate_status`. */
export const MANDATE_STATUSES = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'] as const;
export type MandateStatus = (typeof MANDATE_STATUSES)[number];

/** Énumération SQL `mandate_scope`. */
export const MANDATE_SCOPES = ['FULL_MANAGEMENT', 'RENT_COLLECTION_ONLY', 'LETTING_ONLY'] as const;
export type MandateScope = (typeof MANDATE_SCOPES)[number];

/** Énumération SQL `commission_basis`. */
export const COMMISSION_BASES = [
  'RATE_BPS_ON_RENT_COLLECTED',
  'RATE_BPS_ON_RENT_DUE',
  'FLAT_AMOUNT_PER_MONTH',
  'FLAT_AMOUNT_PER_LEASE',
] as const;
export type CommissionBasis = (typeof COMMISSION_BASES)[number];

/** Statuts encore modifiables par `PATCH /{id}` (contrat, § Mandats, règle 6). */
const EDITABLE_STATUSES: readonly MandateStatus[] = ['DRAFT', 'ACTIVE', 'SUSPENDED'];

export function assertMandateEditable(status: MandateStatus): void {
  if (!EDITABLE_STATUSES.includes(status)) {
    throw new DomainError('AGENCY.MANDATE_INVALID_TRANSITION', {
      status,
      allowed: EDITABLE_STATUSES,
      action: 'PATCH',
    });
  }
}

/** DRAFT → ACTIVE uniquement : pas de réactivation depuis SUSPENDED (contrat § Mandats). */
export function assertActivatable(status: MandateStatus): void {
  if (status !== 'DRAFT') {
    throw new DomainError('AGENCY.MANDATE_INVALID_TRANSITION', {
      status,
      target: 'ACTIVE',
      allowed: ['DRAFT'],
    });
  }
}

/** ACTIVE → SUSPENDED, motif obligatoire (contrat, règle 4). */
export function assertSuspendable(status: MandateStatus, reason: string | undefined): void {
  if (status !== 'ACTIVE') {
    throw new DomainError('AGENCY.MANDATE_INVALID_TRANSITION', {
      status,
      target: 'SUSPENDED',
      allowed: ['ACTIVE'],
    });
  }
  if (!reason?.trim()) {
    throw new DomainError('AGENCY.MANDATE_REASON_REQUIRED', { action: 'suspend' });
  }
}

const TERMINABLE_STATUSES: readonly MandateStatus[] = ['ACTIVE', 'SUSPENDED'];

/** ACTIVE ou SUSPENDED → TERMINATED, date d'effet ET motif obligatoires (contrat, règle 5). */
export function assertTerminable(
  status: MandateStatus,
  effectiveDate: string | undefined,
  reason: string | undefined,
): void {
  if (!TERMINABLE_STATUSES.includes(status)) {
    throw new DomainError('AGENCY.MANDATE_INVALID_TRANSITION', {
      status,
      target: 'TERMINATED',
      allowed: TERMINABLE_STATUSES,
    });
  }
  if (!effectiveDate?.trim()) {
    throw new DomainError('AGENCY.MANDATE_TERMINATION_DATE_REQUIRED', {});
  }
  if (!reason?.trim()) {
    throw new DomainError('AGENCY.MANDATE_REASON_REQUIRED', { action: 'terminate' });
  }
}

/**
 * Un bien ne peut dépendre que d'un seul mandat actif à la fois (contrat,
 * arbitrage « un bien, un mandat actif »). `property_id = null` signifie
 * « portefeuille entier du bailleur » (voir le commentaire de tête de
 * `mandates.service.ts`) : un mandat portefeuille chevauche donc TOUJOURS
 * un autre mandat du même bailleur, qu'il soit lui-même portefeuille ou
 * borné à un bien précis, et réciproquement.
 */
export function scopesOverlap(
  candidate: { propertyId: string | null },
  other: { propertyId: string | null },
): boolean {
  if (candidate.propertyId === null || other.propertyId === null) return true;
  return candidate.propertyId === other.propertyId;
}
