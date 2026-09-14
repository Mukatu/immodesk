import { toJsonAmount } from '../../../shared/money/amount';
import { publicInvoiceNumber } from '../../billing/application/invoice-views';
import { toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';

export interface MomoTransactionRow {
  id: string;
  organization_id: string;
  payment_id: string | null;
  tenant_id: string | null;
  lease_id: string | null;
  invoice_id: string | null;
  provider: string;
  aggregator: string | null;
  channel: string;
  status: string;
  provider_transaction_id: string | null;
  aggregator_transaction_id: string | null;
  merchant_reference: string;
  payer_msisdn: string;
  payee_msisdn: string | null;
  amount: bigint;
  fee_amount: bigint;
  fee_bearer: string;
  net_amount: bigint;
  declared_by_user_id: string | null;
  proof_document_id: string | null;
  verified_by_user_id: string | null;
  verified_at: Date | null;
  rejection_reason: string | null;
  failure_code: string | null;
  failure_message: string | null;
  initiated_at: Date;
  completed_at: Date | null;
  expires_at: Date | null;
  status_checked_at: Date | null;
  status_check_count: number;
  created_at: Date;
}

export interface MomoTransactionSummaryRow extends MomoTransactionRow {
  tenant_party_type: string | null;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  invoice_number: string | null;
  payment_received_by_user_id: string | null;
}

export const MOMO_SUMMARY_SELECT = `
  m.*, t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
  ri.invoice_number AS invoice_number, p.received_by_user_id AS payment_received_by_user_id`;

export const MOMO_SUMMARY_FROM = `
  mobile_money_transactions m
  LEFT JOIN tenants t ON t.id = m.tenant_id
  LEFT JOIN rent_invoices ri ON ri.id = m.invoice_id
  LEFT JOIN payments p ON p.id = m.payment_id`;

/** Initiateur visible d'une transaction, pour la restriction COLLECTOR. */
export function momoInitiatorUserId(row: MomoTransactionSummaryRow): string | null {
  return row.channel === 'DECLARED' ? row.declared_by_user_id : row.payment_received_by_user_id;
}

export interface MomoTransactionView {
  id: string;
  channel: string;
  status: string;
  provider: string;
  aggregator: string | null;
  merchantReference: string;
  providerTransactionId: string | null;
  aggregatorTransactionId: string | null;
  payerMsisdn: string;
  payeeMsisdn: string | null;
  amount: number;
  feeAmount: number;
  feeBearer: string;
  netAmount: number;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  paymentId: string | null;
  proofDocumentId: string | null;
  declaredByUserId: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  initiatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  statusCheckedAt: string | null;
  statusCheckCount: number;
}

export function toMomoTransactionView(row: MomoTransactionSummaryRow): MomoTransactionView {
  return {
    id: row.id,
    channel: row.channel,
    status: row.status,
    provider: row.provider,
    aggregator: row.aggregator,
    merchantReference: row.merchant_reference,
    providerTransactionId: row.provider_transaction_id,
    aggregatorTransactionId: row.aggregator_transaction_id,
    payerMsisdn: row.payer_msisdn,
    payeeMsisdn: row.payee_msisdn,
    amount: toJsonAmount(row.amount),
    feeAmount: toJsonAmount(row.fee_amount),
    feeBearer: row.fee_bearer,
    netAmount: toJsonAmount(row.net_amount),
    tenant: row.tenant_id
      ? {
          id: row.tenant_id,
          displayName: displayNameOf({
            partyType: (row.tenant_party_type ?? 'INDIVIDUAL') as PartyType,
            firstName: row.tenant_first_name,
            lastName: row.tenant_last_name,
            companyName: row.tenant_company_name,
          }),
        }
      : null,
    invoice: row.invoice_id
      ? {
          id: row.invoice_id,
          invoiceNumber: row.invoice_number ? publicInvoiceNumber(row.invoice_number) : null,
        }
      : null,
    paymentId: row.payment_id,
    proofDocumentId: row.proof_document_id,
    declaredByUserId: row.declared_by_user_id,
    verifiedByUserId: row.verified_by_user_id,
    verifiedAt: toIsoInstant(row.verified_at),
    rejectionReason: row.rejection_reason,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    initiatedAt: row.initiated_at.toISOString(),
    completedAt: toIsoInstant(row.completed_at),
    expiresAt: toIsoInstant(row.expires_at),
    statusCheckedAt: toIsoInstant(row.status_checked_at),
    statusCheckCount: row.status_check_count,
  };
}
