import { toJsonAmount } from '../../../shared/money/amount';
import { publicReference } from '../../leases/application/lease-views';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import type { ReceiptSummaryView } from '../../receipts/application/receipt-views';

/**
 * Numéro technique d'une facture en brouillon. `rent_invoices.invoice_number`
 * est NOT NULL, mais numéroter un brouillon consommerait un numéro de la
 * série LOY pour une facture qui ne sera peut-être jamais émise — ce qui
 * ruinerait la continuité exigée par un contrôle comptable. L'API le rend
 * `null` (même procédé que `BROUILLON-` pour les baux).
 */
export const DRAFT_NUMBER_PREFIX = 'BROUILLON-';

export function publicInvoiceNumber(invoiceNumber: string): string | null {
  return invoiceNumber.startsWith(DRAFT_NUMBER_PREFIX) ? null : invoiceNumber;
}

export interface InvoiceRow {
  id: string;
  organization_id: string;
  lease_id: string;
  tenant_id: string;
  unit_id: string;
  property_id: string;
  landlord_id: string;
  invoice_number: string;
  status: string;
  period_start: Date;
  period_end: Date;
  issue_date: Date;
  due_date: Date;
  grace_until_date: Date | null;
  rent_amount: bigint;
  charges_amount: bigint;
  penalty_amount: bigint;
  other_amount: bigint;
  discount_amount: bigint;
  total_amount: bigint;
  paid_amount: bigint;
  balance_amount: bigint;
  penalty_rule_id: string | null;
  last_penalty_run_date: Date | null;
  issued_at: Date | null;
  paid_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  document_id: string | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceSummaryRow extends InvoiceRow {
  lease_reference: string;
  tenant_party_type: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  tenant_primary_phone: string;
  unit_code: string;
  property_name: string;
}

/** Colonnes et jointures communes aux listes et au détail. */
export const INVOICE_SUMMARY_SELECT = `
  ri.*, l.reference AS lease_reference,
  t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
  t.primary_phone AS tenant_primary_phone,
  u.code AS unit_code, p.name AS property_name`;

export const INVOICE_SUMMARY_FROM = `
  rent_invoices ri
  JOIN leases l ON l.id = ri.lease_id
  JOIN tenants t ON t.id = ri.tenant_id
  JOIN units u ON u.id = ri.unit_id
  JOIN properties p ON p.id = ri.property_id`;

export interface InvoiceSummaryView {
  id: string;
  invoiceNumber: string | null;
  status: string;
  lease: { id: string; reference: string | null };
  tenant: { id: string; displayName: string; primaryPhone: string };
  unit: { id: string; code: string };
  property: { id: string; name: string };
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  graceUntilDate: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

export function tenantDisplayName(row: {
  tenant_party_type: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
}): string {
  return displayNameOf({
    partyType: row.tenant_party_type as PartyType,
    firstName: row.tenant_first_name,
    lastName: row.tenant_last_name,
    companyName: row.tenant_company_name,
  });
}

export function toInvoiceSummary(row: InvoiceSummaryRow): InvoiceSummaryView {
  return {
    id: row.id,
    invoiceNumber: publicInvoiceNumber(row.invoice_number),
    status: row.status,
    lease: { id: row.lease_id, reference: publicReference(row.lease_reference) },
    tenant: {
      id: row.tenant_id,
      displayName: tenantDisplayName(row),
      primaryPhone: row.tenant_primary_phone,
    },
    unit: { id: row.unit_id, code: row.unit_code },
    property: { id: row.property_id, name: row.property_name },
    periodStart: toIsoDate(row.period_start) as string,
    periodEnd: toIsoDate(row.period_end) as string,
    dueDate: toIsoDate(row.due_date) as string,
    graceUntilDate: toIsoDate(row.grace_until_date),
    totalAmount: toJsonAmount(row.total_amount),
    paidAmount: toJsonAmount(row.paid_amount),
    balanceAmount: toJsonAmount(row.balance_amount),
  };
}

export interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  line_type: string;
  label: string;
  description: string | null;
  quantity: { toString(): string } | number | string;
  unit_price_amount: bigint;
  amount: bigint;
  vat_rate_bps: number;
  vat_amount: bigint;
  is_credit: boolean;
  period_start: Date | null;
  period_end: Date | null;
  position: number;
}

export interface InvoiceLineView {
  id: string;
  invoiceId: string;
  lineType: string;
  label: string;
  description: string | null;
  quantity: number;
  unitPriceAmount: number;
  amount: number;
  vatRateBps: number;
  vatAmount: number;
  isCredit: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  position: number;
}

export function toInvoiceLineView(row: InvoiceLineRow): InvoiceLineView {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    lineType: row.line_type,
    label: row.label,
    description: row.description,
    // NUMERIC(12,3) : trois décimales au plus, exactement représentables ici.
    quantity: Number(row.quantity.toString()),
    unitPriceAmount: toJsonAmount(row.unit_price_amount),
    amount: toJsonAmount(row.amount),
    vatRateBps: row.vat_rate_bps,
    vatAmount: toJsonAmount(row.vat_amount),
    isCredit: row.is_credit,
    periodStart: toIsoDate(row.period_start),
    periodEnd: toIsoDate(row.period_end),
    position: row.position,
  };
}

export interface AllocationRow {
  id: string;
  payment_id: string;
  payment_reference: string;
  method: string;
  amount: bigint;
  allocation_date: Date;
  is_reversal: boolean;
}

export interface AllocationView {
  id: string;
  paymentId: string;
  paymentReference: string;
  method: string;
  amount: number;
  allocationDate: string;
  isReversal: boolean;
}

export function toAllocationView(row: AllocationRow): AllocationView {
  return {
    id: row.id,
    paymentId: row.payment_id,
    paymentReference: row.payment_reference,
    method: row.method,
    amount: toJsonAmount(row.amount),
    allocationDate: toIsoDate(row.allocation_date) as string,
    isReversal: row.is_reversal,
  };
}

export interface InvoiceDetailView extends InvoiceSummaryView {
  rentAmount: number;
  chargesAmount: number;
  penaltyAmount: number;
  otherAmount: number;
  discountAmount: number;
  issueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  lines: InvoiceLineView[];
  allocations: AllocationView[];
  receipt: ReceiptSummaryView | null;
  documentId: string | null;
  notes: string | null;
}

export function toInvoiceDetail(
  row: InvoiceSummaryRow,
  lines: readonly InvoiceLineRow[],
  allocations: readonly AllocationRow[],
  receipt: ReceiptSummaryView | null,
): InvoiceDetailView {
  return {
    ...toInvoiceSummary(row),
    rentAmount: toJsonAmount(row.rent_amount),
    chargesAmount: toJsonAmount(row.charges_amount),
    penaltyAmount: toJsonAmount(row.penalty_amount),
    otherAmount: toJsonAmount(row.other_amount),
    discountAmount: toJsonAmount(row.discount_amount),
    issueDate: toIsoDate(row.issue_date) as string,
    issuedAt: toIsoInstant(row.issued_at),
    paidAt: toIsoInstant(row.paid_at),
    cancelledAt: toIsoInstant(row.cancelled_at),
    cancellationReason: row.cancellation_reason,
    lines: lines.map(toInvoiceLineView),
    allocations: allocations.map(toAllocationView),
    receipt,
    documentId: row.document_id,
    notes: row.notes,
  };
}
