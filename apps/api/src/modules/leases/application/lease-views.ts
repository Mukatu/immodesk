import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';

export interface LeaseRow {
  id: string;
  organization_id: string;
  unit_id: string;
  property_id: string;
  landlord_id: string;
  primary_tenant_id: string;
  mandate_id: string | null;
  reference: string;
  status: string;
  start_date: Date;
  end_date: Date | null;
  move_in_date: Date | null;
  move_out_date: Date | null;
  rent_period: string;
  rent_amount: bigint;
  charges_amount: bigint;
  charges_are_provisional: boolean;
  deposit_amount: bigint;
  agency_fee_amount: bigint;
  advance_months: number;
  currency: string;
  payment_due_day: number;
  grace_days: number;
  preferred_payment_method: string;
  collector_user_id: string | null;
  indexation_rate_bps: number | null;
  next_indexation_date: Date | null;
  notice_days: number;
  auto_renew: boolean;
  signed_at: Date | null;
  contract_document_id: string | null;
  terminated_at: Date | null;
  termination_reason: string | null;
  balance_amount: bigint;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface LeaseView {
  id: string;
  unitId: string;
  propertyId: string;
  landlordId: string;
  primaryTenantId: string;
  reference: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  rentPeriod: string;
  rentAmount: number;
  chargesAmount: number;
  chargesAreProvisional: boolean;
  depositAmount: number;
  agencyFeeAmount: number;
  advanceMonths: number;
  currency: string;
  paymentDueDay: number;
  graceDays: number;
  preferredPaymentMethod: string;
  collectorUserId: string | null;
  indexationRateBps: number | null;
  nextIndexationDate: string | null;
  noticeDays: number;
  autoRenew: boolean;
  signedAt: string | null;
  contractDocumentId: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  balanceAmount: number;
  clientRef: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Référence « non encore attribuée ».
 *
 * `leases.reference` est NOT NULL en base (contrainte d'unicité par
 * organisation), mais le contrat expose `reference: string | null` tant que
 * le bail n'est pas activé. Un brouillon porte donc une référence technique
 * réservée, rendue `null` à la présentation : l'utilisateur ne doit pas
 * mémoriser un numéro qui changera à l'activation.
 */
export const UNASSIGNED_REFERENCE_PREFIX = 'BROUILLON-';

export function publicReference(reference: string): string | null {
  return reference.startsWith(UNASSIGNED_REFERENCE_PREFIX) ? null : reference;
}

export function toLeaseView(row: LeaseRow): LeaseView {
  return {
    id: row.id,
    unitId: row.unit_id,
    propertyId: row.property_id,
    landlordId: row.landlord_id,
    primaryTenantId: row.primary_tenant_id,
    reference: publicReference(row.reference),
    status: row.status,
    startDate: toIsoDate(row.start_date) as string,
    endDate: toIsoDate(row.end_date),
    moveInDate: toIsoDate(row.move_in_date),
    moveOutDate: toIsoDate(row.move_out_date),
    rentPeriod: row.rent_period,
    // Montants XAF : BigInt en base et dans le domaine, entier JSON ici.
    rentAmount: toJsonAmount(row.rent_amount),
    chargesAmount: toJsonAmount(row.charges_amount),
    chargesAreProvisional: row.charges_are_provisional,
    depositAmount: toJsonAmount(row.deposit_amount),
    agencyFeeAmount: toJsonAmount(row.agency_fee_amount),
    advanceMonths: row.advance_months,
    currency: row.currency,
    paymentDueDay: row.payment_due_day,
    graceDays: row.grace_days,
    preferredPaymentMethod: row.preferred_payment_method,
    collectorUserId: row.collector_user_id,
    indexationRateBps: row.indexation_rate_bps,
    nextIndexationDate: toIsoDate(row.next_indexation_date),
    noticeDays: row.notice_days,
    autoRenew: row.auto_renew,
    signedAt: toIsoInstant(row.signed_at),
    contractDocumentId: row.contract_document_id,
    terminatedAt: toIsoInstant(row.terminated_at),
    terminationReason: row.termination_reason,
    balanceAmount: toJsonAmount(row.balance_amount),
    clientRef: row.client_ref,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: toIsoInstant(row.deleted_at),
  };
}

export interface LeaseSummaryRow extends LeaseRow {
  unit_code: string;
  unit_label: string | null;
  property_name: string;
  tenant_party_type: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  tenant_primary_phone: string;
}

export interface LeaseSummaryView {
  id: string;
  reference: string | null;
  status: string;
  unit: { id: string; code: string; label: string | null };
  property: { id: string; name: string };
  tenant: { id: string; displayName: string; primaryPhone: string };
  startDate: string;
  endDate: string | null;
  rentAmount: number;
  chargesAmount: number;
  paymentDueDay: number;
}

export function toLeaseSummary(row: LeaseSummaryRow): LeaseSummaryView {
  return {
    id: row.id,
    reference: publicReference(row.reference),
    status: row.status,
    unit: { id: row.unit_id, code: row.unit_code, label: row.unit_label },
    property: { id: row.property_id, name: row.property_name },
    tenant: {
      id: row.primary_tenant_id,
      displayName: displayNameOf({
        partyType: row.tenant_party_type as PartyType,
        firstName: row.tenant_first_name,
        lastName: row.tenant_last_name,
        companyName: row.tenant_company_name,
      }),
      primaryPhone: row.tenant_primary_phone,
    },
    startDate: toIsoDate(row.start_date) as string,
    endDate: toIsoDate(row.end_date),
    rentAmount: toJsonAmount(row.rent_amount),
    chargesAmount: toJsonAmount(row.charges_amount),
    paymentDueDay: row.payment_due_day,
  };
}

export interface RentRevisionRow {
  id: string;
  lease_id: string;
  effective_date: Date;
  previous_rent_amount: bigint;
  new_rent_amount: bigint;
  previous_charges_amount: bigint;
  new_charges_amount: bigint;
  reason: string | null;
  document_id: string | null;
  created_by_user_id: string | null;
  created_at: Date;
}

export interface RentRevisionView {
  id: string;
  leaseId: string;
  effectiveDate: string;
  previousRentAmount: number;
  newRentAmount: number;
  previousChargesAmount: number;
  newChargesAmount: number;
  reason: string | null;
  documentId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export function toRentRevisionView(row: RentRevisionRow): RentRevisionView {
  return {
    id: row.id,
    leaseId: row.lease_id,
    effectiveDate: toIsoDate(row.effective_date) as string,
    previousRentAmount: toJsonAmount(row.previous_rent_amount),
    newRentAmount: toJsonAmount(row.new_rent_amount),
    previousChargesAmount: toJsonAmount(row.previous_charges_amount),
    newChargesAmount: toJsonAmount(row.new_charges_amount),
    reason: row.reason,
    documentId: row.document_id,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at.toISOString(),
  };
}

export interface LeasePartyRow {
  id: string;
  lease_id: string;
  role: string;
  tenant_id: string | null;
  guarantor_id: string | null;
  share_bps: number;
  is_solidary: boolean;
  signed_at: Date | null;
  created_at: Date;
}

export interface LeasePartyView {
  id: string;
  leaseId: string;
  role: string;
  tenantId: string | null;
  guarantorId: string | null;
  displayName: string;
  shareBps: number;
  isSolidary: boolean;
  signedAt: string | null;
  createdAt: string;
}

export function toLeasePartyView(row: LeasePartyRow, displayName: string): LeasePartyView {
  return {
    id: row.id,
    leaseId: row.lease_id,
    role: row.role,
    tenantId: row.tenant_id,
    guarantorId: row.guarantor_id,
    displayName,
    shareBps: row.share_bps,
    isSolidary: row.is_solidary,
    signedAt: toIsoInstant(row.signed_at),
    createdAt: row.created_at.toISOString(),
  };
}

export interface LeaseDocumentRow {
  id: string;
  lease_id: string;
  kind: string;
  document_id: string;
  version: number;
  title: string;
  effective_date: Date | null;
  is_signed: boolean;
  signed_at: Date | null;
  signature_hash: string | null;
  generated_by_job: string | null;
  created_at: Date;
}

export interface LeaseDocumentView {
  id: string;
  leaseId: string;
  kind: string;
  documentId: string;
  version: number;
  title: string;
  effectiveDate: string | null;
  isSigned: boolean;
  signedAt: string | null;
  signatureHash: string | null;
  generatedByJob: string | null;
  createdAt: string;
}

export function toLeaseDocumentView(row: LeaseDocumentRow): LeaseDocumentView {
  return {
    id: row.id,
    leaseId: row.lease_id,
    kind: row.kind,
    documentId: row.document_id,
    version: row.version,
    title: row.title,
    effectiveDate: toIsoDate(row.effective_date),
    isSigned: row.is_signed,
    signedAt: toIsoInstant(row.signed_at),
    signatureHash: row.signature_hash,
    generatedByJob: row.generated_by_job,
    createdAt: row.created_at.toISOString(),
  };
}
