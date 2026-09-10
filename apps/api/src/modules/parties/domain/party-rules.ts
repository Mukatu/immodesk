import { DomainError } from '../../../shared/errors/domain-error';
import { normalizePhoneE164 } from '../../../shared/phone/e164';

/** Énumérations du DDL (docs/schema/schema.sql, partie 03a). */
export const PARTY_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'UNSPECIFIED'] as const;
export type Gender = (typeof GENDERS)[number];

export const ID_DOCUMENT_TYPES = [
  'CNI',
  'PASSPORT',
  'RESIDENCE_PERMIT',
  'DRIVING_LICENSE',
  'VOTER_CARD',
  'RCCM',
  'NIU',
  'OTHER',
] as const;
export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number];

export const CONTACT_OWNER_TYPES = [
  'LANDLORD',
  'TENANT',
  'GUARANTOR',
  'MEMBER',
  'SUPPLIER',
] as const;
export type ContactOwnerType = (typeof CONTACT_OWNER_TYPES)[number];

export const CONTACT_CHANNEL_TYPES = ['PHONE', 'MOBILE', 'WHATSAPP', 'EMAIL', 'FAX'] as const;
export type ContactChannelType = (typeof CONTACT_CHANNEL_TYPES)[number];

export const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'BANK_CHECK'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Segment d'URL accepté par `/v1/parties/{ownerType}/…` → type SQL. */
export const OWNER_PATH_TO_TYPE: Readonly<Record<string, ContactOwnerType>> = {
  landlords: 'LANDLORD',
  tenants: 'TENANT',
  guarantors: 'GUARANTOR',
};

export const OWNER_PATH_SEGMENTS = Object.keys(OWNER_PATH_TO_TYPE);

export interface PartyNameInput {
  partyType: PartyType;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
}

/**
 * Règle de nommage, alignée sur les contraintes `*_name_chk` du DDL :
 * une personne physique DOIT porter un `lastName`, une personne morale un
 * `companyName`. La vérification est faite ici plutôt que laissée à
 * PostgreSQL, afin de renvoyer `PARTIES.NAME_REQUIRED` et non une erreur
 * de contrainte opaque.
 */
export function assertPartyName(input: PartyNameInput): void {
  if (input.partyType === 'COMPANY') {
    if (!isFilled(input.companyName)) {
      throw new DomainError('PARTIES.NAME_REQUIRED', {
        field: 'companyName',
        partyType: 'COMPANY',
      });
    }
    return;
  }
  if (!isFilled(input.lastName)) {
    throw new DomainError('PARTIES.NAME_REQUIRED', { field: 'lastName', partyType: 'INDIVIDUAL' });
  }
}

/**
 * Nom d'affichage d'un tiers : raison sociale pour une personne morale,
 * « Prénom NOM » pour une personne physique. Jamais vide : la contrainte de
 * nommage garantit qu'au moins l'un des deux champs est renseigné.
 */
export function displayNameOf(input: PartyNameInput): string {
  if (input.partyType === 'COMPANY') {
    return (input.companyName ?? '').trim() || (input.lastName ?? '').trim();
  }
  const parts = [input.firstName, input.lastName]
    .map((p) => (p ?? '').trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(' ') : (input.companyName ?? '').trim();
}

/**
 * Normalise un téléphone de tiers en E.164 en remontant le code d'erreur du
 * contrat de phase 1 (`PARTIES.PHONE_INVALID`) plutôt que celui de l'auth.
 */
export function normalizePartyPhone(raw: string, field = 'primaryPhone'): string {
  try {
    return normalizePhoneE164(raw);
  } catch {
    throw new DomainError('PARTIES.PHONE_INVALID', { field, phone: raw });
  }
}

/** Variante tolérante : `undefined`/vide reste `null`. */
export function normalizeOptionalPhone(
  raw: string | null | undefined,
  field: string,
): string | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;
  return normalizePartyPhone(raw, field);
}

/** Valeur d'un canal de contact : téléphone normalisé, e-mail en minuscules. */
export function normalizeChannelValue(channelType: ContactChannelType, value: string): string {
  if (channelType === 'EMAIL') return value.trim().toLowerCase();
  return normalizePartyPhone(value, 'value');
}

function isFilled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Chaîne nettoyée, ou `null` si vide. */
export function trimOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
