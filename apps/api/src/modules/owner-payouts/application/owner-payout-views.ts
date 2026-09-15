import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';

export interface OwnerPayoutRow {
  id: string;
  organization_id: string;
  landlord_id: string;
  statement_id: string | null;
  payment_id: string | null;
  reference: string;
  status: string;
  method: string;
  amount: bigint;
  fee_amount: bigint;
  fee_bearer: string;
  net_amount: bigint;
  currency: string;
  bank_account_id: string | null;
  momo_transaction_id: string | null;
  scheduled_date: Date | null;
  approved_by_user_id: string | null;
  approved_at: Date | null;
  paid_at: Date | null;
  failure_reason: string | null;
  proof_document_id: string | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** `Payout` du contrat (docs/api/phase7-contract.md, § Types). */
export interface PayoutView {
  id: string;
  reference: string;
  statementId: string | null;
  landlordId: string;
  status: string;
  method: string;
  amount: number;
  feeAmount: number;
  feeBearer: string;
  netAmount: number;
  bankAccountId: string | null;
  momoTransactionId: string | null;
  scheduledDate: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  failureReason: string | null;
  proofDocumentId: string | null;
}

export function toPayoutView(row: OwnerPayoutRow): PayoutView {
  return {
    id: row.id,
    reference: row.reference,
    statementId: row.statement_id,
    landlordId: row.landlord_id,
    status: row.status,
    method: row.method,
    amount: toJsonAmount(row.amount),
    feeAmount: toJsonAmount(row.fee_amount),
    feeBearer: row.fee_bearer,
    netAmount: toJsonAmount(row.net_amount),
    bankAccountId: row.bank_account_id,
    momoTransactionId: row.momo_transaction_id,
    scheduledDate: toIsoDate(row.scheduled_date),
    approvedByUserId: row.approved_by_user_id,
    approvedAt: toIsoInstant(row.approved_at),
    paidAt: toIsoInstant(row.paid_at),
    failureReason: row.failure_reason,
    proofDocumentId: row.proof_document_id,
  };
}
