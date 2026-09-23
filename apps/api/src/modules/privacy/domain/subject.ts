import { DomainError } from '../../../shared/errors/domain-error';

/**
 * Personne concernée par un export ou un effacement (contrat phase 11,
 * § « Conformité des données personnelles »). Quatre types seulement,
 * portés par des tables distinctes — aucune n'est ajoutée.
 */
export const SUBJECT_TYPES = ['tenant', 'landlord', 'guarantor', 'user'] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export function isSubjectType(value: unknown): value is SubjectType {
  return typeof value === 'string' && (SUBJECT_TYPES as readonly string[]).includes(value);
}

/** Table portée par un type de personne concernée par l'EFFACEMENT (arbitrage 9 : `users` n'est jamais anonymisée par un effacement d'organisation). */
export type PartyTable = 'tenants' | 'landlords' | 'guarantors';

export function partyTableFor(subjectType: SubjectType): PartyTable | null {
  switch (subjectType) {
    case 'tenant':
      return 'tenants';
    case 'landlord':
      return 'landlords';
    case 'guarantor':
      return 'guarantors';
    case 'user':
      return null;
  }
}

/**
 * Vérifie qu'un `subjectType` brut (venu du corps de requête) désigne bien
 * l'un des TROIS tiers effaçables — jamais `user` : l'effacement d'un compte
 * utilisateur est hors périmètre d'une organisation (arbitrage 9), aucune
 * route de ce module ne l'expose.
 */
export function assertErasableSubject(subjectType: string): Exclude<SubjectType, 'user'> {
  if (!isSubjectType(subjectType) || subjectType === 'user') {
    throw new DomainError('PRIVACY.SUBJECT_TYPE_INVALID', { subjectType });
  }
  return subjectType;
}

/** Vérifie qu'un `subjectType` brut est l'un des QUATRE types valides (export, où `user` est admis). */
export function assertSubjectType(subjectType: string): SubjectType {
  if (!isSubjectType(subjectType)) {
    throw new DomainError('PRIVACY.SUBJECT_TYPE_INVALID', { subjectType });
  }
  return subjectType;
}

/** Table portant l'identité d'un type de sujet, `users` compris (utile à l'export, jamais à l'effacement). */
export function subjectTableOf(
  subjectType: SubjectType,
): 'tenants' | 'landlords' | 'guarantors' | 'users' {
  return partyTableFor(subjectType) ?? 'users';
}

/** Lignes minimales lues avant anonymisation : les seules colonnes qui pilotent la logique pure. */
export interface PartyAnonymizationRow {
  id: string;
  party_type: 'INDIVIDUAL' | 'COMPANY';
  primary_phone: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
}
