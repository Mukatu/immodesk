import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';

export interface CashReceiptRow {
  id: string;
  organization_id: string;
  payment_id: string | null;
  lease_id: string | null;
  tenant_id: string;
  collector_user_id: string;
  remittance_id: string | null;
  receipt_number: string;
  status: string;
  amount: bigint;
  received_at: Date;
  payer_name: string;
  payer_phone: string | null;
  purpose: string | null;
  signature_document_id: string | null;
  signature_hash: string | null;
  document_id: string | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  client_ref: string | null;
  created_at: Date;
}

export interface CashReceiptSummaryRow extends CashReceiptRow {
  tenant_party_type: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  collector_name: string | null;
}

export const CASH_RECEIPT_SUMMARY_SELECT = `
  cr.*, t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
  coalesce(u.display_name, concat_ws(' ', u.first_name, u.last_name), u.phone_e164) AS collector_name`;

export const CASH_RECEIPT_SUMMARY_FROM = `
  cash_receipts cr
  JOIN tenants t ON t.id = cr.tenant_id
  JOIN users u ON u.id = cr.collector_user_id`;

export interface CashReceiptSummaryView {
  id: string;
  receiptNumber: string;
  status: string;
  amount: number;
  receivedAt: string;
  tenant: { id: string; displayName: string };
  collectorUserId: string;
  collectorName: string;
  remittanceId: string | null;
  paymentId: string | null;
}

export function toCashReceiptSummary(row: CashReceiptSummaryRow): CashReceiptSummaryView {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    status: row.status,
    amount: toJsonAmount(row.amount),
    receivedAt: row.received_at.toISOString(),
    tenant: {
      id: row.tenant_id,
      displayName: displayNameOf({
        partyType: row.tenant_party_type as PartyType,
        firstName: row.tenant_first_name,
        lastName: row.tenant_last_name,
        companyName: row.tenant_company_name,
      }),
    },
    collectorUserId: row.collector_user_id,
    collectorName: row.collector_name ?? '',
    remittanceId: row.remittance_id,
    paymentId: row.payment_id,
  };
}

export interface CashReceiptDetailView extends CashReceiptSummaryView {
  payerName: string;
  payerPhone: string | null;
  purpose: string | null;
  leaseId: string | null;
  signatureDocumentId: string | null;
  signatureHash: string | null;
  documentId: string | null;
  allocations: Array<{ invoiceId: string; invoiceNumber: string | null; amount: number }>;
  cancelledAt: string | null;
  cancellationReason: string | null;
  clientRef: string | null;
}

export function toCashReceiptDetail(
  row: CashReceiptSummaryRow,
  allocations: Array<{ invoiceId: string; invoiceNumber: string | null; amount: number }>,
): CashReceiptDetailView {
  return {
    ...toCashReceiptSummary(row),
    payerName: row.payer_name,
    payerPhone: row.payer_phone,
    purpose: row.purpose,
    leaseId: row.lease_id,
    signatureDocumentId: row.signature_document_id,
    signatureHash: row.signature_hash,
    documentId: row.document_id,
    allocations,
    cancelledAt: toIsoInstant(row.cancelled_at),
    cancellationReason: row.cancellation_reason,
    clientRef: row.client_ref,
  };
}
