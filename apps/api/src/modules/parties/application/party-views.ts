import { toJsonAmountOrNull } from '../../../shared/money/amount';
import { displayNameOf, type PartyType } from '../domain/party-rules';

/** Date SQL `DATE` rendue en `YYYY-MM-DD` (jamais un instant UTC décalé). */
export function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function toIsoInstant(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/**
 * Montant XAF : BigInt en base et dans le domaine, entier JSON en sortie.
 * La garde de `toJsonAmountOrNull` refuse toute valeur qui ne tiendrait pas
 * exactement dans un nombre JavaScript.
 */
export function toAmountNumber(value: bigint | null): number | null {
  return toJsonAmountOrNull(value);
}

export interface LandlordRow {
  id: string;
  party_type: string;
  is_self: boolean;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  gender: string;
  birth_date: Date | null;
  nationality: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_expiry: Date | null;
  id_document_id: string | null;
  rccm_number: string | null;
  niu_number: string | null;
  primary_phone: string;
  secondary_phone: string | null;
  email: string | null;
  address_line: string | null;
  district: string | null;
  city: string;
  country_code: string;
  default_bank_account_id: string | null;
  payout_method: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface LandlordView {
  id: string;
  partyType: string;
  isSelf: boolean;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  gender: string;
  birthDate: string | null;
  nationality: string | null;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
  idDocumentExpiry: string | null;
  idDocumentId: string | null;
  rccmNumber: string | null;
  niuNumber: string | null;
  primaryPhone: string;
  secondaryPhone: string | null;
  email: string | null;
  addressLine: string | null;
  district: string | null;
  city: string;
  countryCode: string;
  defaultBankAccountId: string | null;
  payoutMethod: string;
  notes: string | null;
  propertiesCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toLandlordView(row: LandlordRow, propertiesCount = 0): LandlordView {
  return {
    id: row.id,
    partyType: row.party_type,
    isSelf: row.is_self,
    displayName: displayNameOf({
      partyType: row.party_type as PartyType,
      firstName: row.first_name,
      lastName: row.last_name,
      companyName: row.company_name,
    }),
    firstName: row.first_name,
    lastName: row.last_name,
    companyName: row.company_name,
    gender: row.gender,
    birthDate: toIsoDate(row.birth_date),
    nationality: row.nationality,
    idDocumentType: row.id_document_type,
    idDocumentNumber: row.id_document_number,
    idDocumentExpiry: toIsoDate(row.id_document_expiry),
    idDocumentId: row.id_document_id,
    rccmNumber: row.rccm_number,
    niuNumber: row.niu_number,
    primaryPhone: row.primary_phone,
    secondaryPhone: row.secondary_phone,
    email: row.email,
    addressLine: row.address_line,
    district: row.district,
    city: row.city,
    countryCode: row.country_code,
    defaultBankAccountId: row.default_bank_account_id,
    payoutMethod: row.payout_method,
    notes: row.notes,
    propertiesCount,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: toIsoInstant(row.deleted_at),
  };
}

export interface LandlordSummaryView {
  id: string;
  displayName: string;
  primaryPhone: string;
  isSelf: boolean;
}

export function toLandlordSummary(row: {
  id: string;
  party_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  primary_phone: string;
  is_self: boolean;
}): LandlordSummaryView {
  return {
    id: row.id,
    displayName: displayNameOf({
      partyType: row.party_type as PartyType,
      firstName: row.first_name,
      lastName: row.last_name,
      companyName: row.company_name,
    }),
    primaryPhone: row.primary_phone,
    isSelf: row.is_self,
  };
}

export interface ContactChannelView {
  id: string;
  ownerType: string;
  ownerId: string;
  channelType: string;
  value: string;
  label: string | null;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  optIn: boolean;
  optOutAt: string | null;
  createdAt: string;
}

export function toContactChannelView(row: {
  id: string;
  owner_type: string;
  owner_id: string;
  channel_type: string;
  value: string;
  label: string | null;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: Date | null;
  opt_in: boolean;
  opt_out_at: Date | null;
  created_at: Date;
}): ContactChannelView {
  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    channelType: row.channel_type,
    value: row.value,
    label: row.label,
    isPrimary: row.is_primary,
    isVerified: row.is_verified,
    verifiedAt: toIsoInstant(row.verified_at),
    optIn: row.opt_in,
    optOutAt: toIsoInstant(row.opt_out_at),
    createdAt: row.created_at.toISOString(),
  };
}
