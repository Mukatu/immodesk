import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import type { LandlordLinkRow } from '../../../shared/prisma/tenant-directory.service';

/** Fiche bailleur lue pour `GET /v1/portal/me` (une organisation, la « principale »). */
export interface PortalLandlordRow {
  id: string;
  party_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  primary_phone: string;
  email: string | null;
  country_code: string;
  payout_method: string;
}

export interface PortalMeView {
  landlord: {
    id: string;
    displayName: string;
    primaryPhone: string;
    email: string | null;
    isDiaspora: boolean;
    payoutMethod: string;
  };
  organizations: { id: string; name: string }[];
}

/** `isDiaspora` : `landlords.country_code` différent de `CG` (contrat). */
export function toPortalMeView(
  landlord: PortalLandlordRow,
  links: LandlordLinkRow[],
): PortalMeView {
  return {
    landlord: {
      id: landlord.id,
      displayName: displayNameOf({
        partyType: landlord.party_type as PartyType,
        firstName: landlord.first_name,
        lastName: landlord.last_name,
        companyName: landlord.company_name,
      }),
      primaryPhone: landlord.primary_phone,
      email: landlord.email,
      isDiaspora: landlord.country_code !== 'CG',
      payoutMethod: landlord.payout_method,
    },
    organizations: links.map((link) => ({ id: link.organizationId, name: link.organizationName })),
  };
}

/** Reversement — vue réduite du portail (contrat, § Portail bailleur, simplification documentée). */
export interface PortalPayoutRow {
  id: string;
  reference: string;
  status: string;
  method: string;
  amount: bigint;
  net_amount: bigint;
  paid_at: Date | null;
  created_at: Date;
}

export interface PortalPayoutView {
  id: string;
  reference: string;
  status: string;
  method: string;
  amount: number;
  netAmount: number;
  paidAt: string | null;
}

export function toPortalPayoutView(row: PortalPayoutRow): PortalPayoutView {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    method: row.method,
    amount: toJsonAmount(row.amount),
    netAmount: toJsonAmount(row.net_amount),
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
  };
}

/**
 * Encaissement confirmé — `payment_allocations` (id de tri) JOIN `payments`
 * (CONFIRMED/INBOUND) JOIN `rent_invoices` (`landlord_id` de ce bailleur).
 * `rent_invoices.tenant_id`/`unit_id` sont NOT NULL : les jointures tenant et
 * unité sont donc de vraies jointures internes, jamais nulles.
 */
export interface PortalCollectionRow {
  allocation_id: string;
  payment_id: string;
  payment_date: Date;
  method: string;
  amount: bigint;
  tenant_id: string;
  tenant_party_type: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  unit_id: string;
  unit_code: string;
  invoice_number: string | null;
}

export interface PortalCollectionView {
  paymentId: string;
  paymentDate: string;
  method: string;
  amount: number;
  tenant: { id: string; displayName: string };
  unit: { id: string; code: string };
  invoiceNumber: string | null;
}

export function toPortalCollectionView(row: PortalCollectionRow): PortalCollectionView {
  return {
    paymentId: row.payment_id,
    paymentDate: toIsoDate(row.payment_date) as string,
    method: row.method,
    amount: toJsonAmount(row.amount),
    tenant: {
      id: row.tenant_id,
      displayName: displayNameOf({
        partyType: row.tenant_party_type as PartyType,
        firstName: row.tenant_first_name,
        lastName: row.tenant_last_name,
        companyName: row.tenant_company_name,
      }),
    },
    unit: { id: row.unit_id, code: row.unit_code },
    invoiceNumber: row.invoice_number,
  };
}

/** Quittance — structure simplifiée (contrat : non détaillée au-delà de la route). */
export interface PortalReceiptRow {
  id: string;
  receipt_number: string;
  issue_date: Date;
  total_amount: bigint;
  status: string;
  document_id: string | null;
}

export interface PortalReceiptView {
  id: string;
  receiptNumber: string;
  issueDate: string;
  amount: number;
  status: string;
  documentId: string | null;
}

export function toPortalReceiptView(row: PortalReceiptRow): PortalReceiptView {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    issueDate: toIsoDate(row.issue_date) as string,
    amount: toJsonAmount(row.total_amount),
    status: row.status,
    documentId: row.document_id,
  };
}
