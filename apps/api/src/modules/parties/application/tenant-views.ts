import { displayNameOf, type PartyType } from '../domain/party-rules';
import { toAmountNumber, toIsoDate, toIsoInstant } from './party-views';

export interface TenantRow {
  id: string;
  party_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  gender: string;
  birth_date: Date | null;
  birth_place: string | null;
  nationality: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_expiry: Date | null;
  id_document_id: string | null;
  rccm_number: string | null;
  niu_number: string | null;
  profession: string | null;
  employer_name: string | null;
  monthly_income: bigint | null;
  currency: string;
  primary_phone: string;
  secondary_phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  address_line: string | null;
  district: string | null;
  city: string;
  country_code: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TenantView {
  id: string;
  partyType: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  gender: string;
  birthDate: string | null;
  birthPlace: string | null;
  nationality: string | null;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
  idDocumentExpiry: string | null;
  idDocumentId: string | null;
  rccmNumber: string | null;
  niuNumber: string | null;
  profession: string | null;
  employerName: string | null;
  monthlyIncome: number | null;
  currency: string;
  primaryPhone: string;
  secondaryPhone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  addressLine: string | null;
  district: string | null;
  city: string;
  countryCode: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  clientRef: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toTenantView(row: TenantRow): TenantView {
  return {
    id: row.id,
    partyType: row.party_type,
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
    birthPlace: row.birth_place,
    nationality: row.nationality,
    idDocumentType: row.id_document_type,
    idDocumentNumber: row.id_document_number,
    idDocumentExpiry: toIsoDate(row.id_document_expiry),
    idDocumentId: row.id_document_id,
    rccmNumber: row.rccm_number,
    niuNumber: row.niu_number,
    profession: row.profession,
    employerName: row.employer_name,
    monthlyIncome: toAmountNumber(row.monthly_income),
    currency: row.currency,
    primaryPhone: row.primary_phone,
    secondaryPhone: row.secondary_phone,
    whatsappPhone: row.whatsapp_phone,
    email: row.email,
    addressLine: row.address_line,
    district: row.district,
    city: row.city,
    countryCode: row.country_code,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    clientRef: row.client_ref,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: toIsoInstant(row.deleted_at),
  };
}

export interface GuarantorRow {
  id: string;
  tenant_id: string | null;
  party_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  relationship: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_id: string | null;
  profession: string | null;
  employer_name: string | null;
  monthly_income: bigint | null;
  guarantee_amount: bigint | null;
  currency: string;
  primary_phone: string;
  email: string | null;
  address_line: string | null;
  district: string | null;
  city: string;
  country_code: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface GuarantorView {
  id: string;
  tenantId: string | null;
  partyType: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  relationship: string | null;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
  idDocumentId: string | null;
  profession: string | null;
  employerName: string | null;
  monthlyIncome: number | null;
  guaranteeAmount: number | null;
  currency: string;
  primaryPhone: string;
  email: string | null;
  addressLine: string | null;
  district: string | null;
  city: string;
  countryCode: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toGuarantorView(row: GuarantorRow): GuarantorView {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    partyType: row.party_type,
    displayName: displayNameOf({
      partyType: row.party_type as PartyType,
      firstName: row.first_name,
      lastName: row.last_name,
      companyName: row.company_name,
    }),
    firstName: row.first_name,
    lastName: row.last_name,
    companyName: row.company_name,
    relationship: row.relationship,
    idDocumentType: row.id_document_type,
    idDocumentNumber: row.id_document_number,
    idDocumentId: row.id_document_id,
    profession: row.profession,
    employerName: row.employer_name,
    monthlyIncome: toAmountNumber(row.monthly_income),
    guaranteeAmount: toAmountNumber(row.guarantee_amount),
    currency: row.currency,
    primaryPhone: row.primary_phone,
    email: row.email,
    addressLine: row.address_line,
    district: row.district,
    city: row.city,
    countryCode: row.country_code,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: toIsoInstant(row.deleted_at),
  };
}
