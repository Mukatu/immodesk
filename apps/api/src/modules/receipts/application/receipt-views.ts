import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import type { MessageLogView } from '../../notifications/application/message-log-views';

export interface ReceiptRow {
  id: string;
  organization_id: string;
  payment_id: string;
  invoice_id: string | null;
  lease_id: string | null;
  tenant_id: string;
  landlord_id: string | null;
  unit_id: string | null;
  receipt_number: string;
  status: string;
  period_start: Date | null;
  period_end: Date | null;
  issue_date: Date;
  rent_amount: bigint;
  charges_amount: bigint;
  penalty_amount: bigint;
  total_amount: bigint;
  remaining_balance_amount: bigint;
  verification_token: string;
  verification_url: string | null;
  qr_payload: string | null;
  content_hash: string | null;
  document_id: string | null;
  generated_at: Date | null;
  sent_at: Date | null;
  sent_channel: string | null;
  message_log_id: string | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  created_at: Date;
}

export interface ReceiptSummaryRow extends ReceiptRow {
  tenant_party_type: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
}

/** Colonnes d'une quittance et du nom de son locataire. */
export const RECEIPT_SUMMARY_SELECT = `
  r.*, t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name`;

export const RECEIPT_SUMMARY_FROM = `receipts r JOIN tenants t ON t.id = r.tenant_id`;

export interface ReceiptSummaryView {
  id: string;
  receiptNumber: string;
  status: string;
  issueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalAmount: number;
  tenant: { id: string; displayName: string };
  paymentId: string;
  invoiceId: string | null;
  sentAt: string | null;
  sentChannel: string | null;
}

export function receiptTenantName(row: ReceiptSummaryRow): string {
  return displayNameOf({
    partyType: row.tenant_party_type as PartyType,
    firstName: row.tenant_first_name,
    lastName: row.tenant_last_name,
    companyName: row.tenant_company_name,
  });
}

export interface ReceiptDetailView extends ReceiptSummaryView {
  rentAmount: number;
  chargesAmount: number;
  penaltyAmount: number;
  remainingBalanceAmount: number;
  verificationUrl: string;
  documentId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  messageLogs: MessageLogView[];
}

export function toReceiptDetail(
  row: ReceiptSummaryRow,
  messageLogs: MessageLogView[],
): ReceiptDetailView {
  return {
    ...toReceiptSummary(row),
    rentAmount: toJsonAmount(row.rent_amount),
    chargesAmount: toJsonAmount(row.charges_amount),
    penaltyAmount: toJsonAmount(row.penalty_amount),
    remainingBalanceAmount: toJsonAmount(row.remaining_balance_amount),
    verificationUrl: row.verification_url ?? '',
    documentId: row.document_id,
    cancelledAt: toIsoInstant(row.cancelled_at),
    cancellationReason: row.cancellation_reason,
    messageLogs,
  };
}

export function toReceiptSummary(row: ReceiptSummaryRow): ReceiptSummaryView {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    status: row.status,
    issueDate: toIsoDate(row.issue_date) as string,
    periodStart: toIsoDate(row.period_start),
    periodEnd: toIsoDate(row.period_end),
    totalAmount: toJsonAmount(row.total_amount),
    tenant: { id: row.tenant_id, displayName: receiptTenantName(row) },
    paymentId: row.payment_id,
    invoiceId: row.invoice_id,
    sentAt: toIsoInstant(row.sent_at),
    sentChannel: row.sent_channel,
  };
}
