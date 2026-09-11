import { toJsonAmount } from '../../../shared/money/amount';

export interface RemittanceRow {
  id: string;
  organization_id: string;
  collector_user_id: string;
  reference: string;
  status: string;
  opened_at: Date;
  submitted_at: Date | null;
  verified_at: Date | null;
  deposited_at: Date | null;
  declared_amount: bigint;
  counted_amount: bigint;
  expected_amount: bigint;
  variance_amount: bigint;
  receipts_count: number;
  denominations: unknown;
  deposit_bank_account_id: string | null;
  deposit_slip_document_id: string | null;
  verified_by_user_id: string | null;
  rejection_reason: string | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
}

export interface RemittanceSummaryRow extends RemittanceRow {
  collector_name: string | null;
}

export const REMITTANCE_SUMMARY_SELECT = `
  r.*, coalesce(u.display_name, nullif(concat_ws(' ', u.first_name, u.last_name), ''), u.phone_e164) AS collector_name`;
export const REMITTANCE_SUMMARY_FROM = `cash_remittances r JOIN users u ON u.id = r.collector_user_id`;

export interface RemittanceItemRow {
  id: string;
  cash_receipt_id: string;
  receipt_number: string;
  amount: bigint;
  is_verified: boolean;
  variance_amount: bigint;
  variance_reason: string | null;
}

export interface RemittanceSummaryView {
  id: string;
  reference: string;
  status: string;
  collectorUserId: string;
  collectorName: string;
  declaredAmount: number;
  expectedAmount: number;
  countedAmount: number;
  varianceAmount: number;
  receiptsCount: number;
  openedAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
}

export interface RemittanceDetailView extends RemittanceSummaryView {
  items: Array<{
    id: string;
    cashReceiptId: string;
    receiptNumber: string;
    amount: number;
    isVerified: boolean;
    varianceAmount: number;
    varianceReason: string | null;
  }>;
  denominations: Record<string, number>;
  verifiedByUserId: string | null;
  rejectionReason: string | null;
  depositedAt: string | null;
  depositBankAccountId: string | null;
  notes: string | null;
}

function instant(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toRemittanceSummary(row: RemittanceSummaryRow): RemittanceSummaryView {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    collectorUserId: row.collector_user_id,
    collectorName: row.collector_name ?? '',
    declaredAmount: toJsonAmount(row.declared_amount),
    expectedAmount: toJsonAmount(row.expected_amount),
    countedAmount: toJsonAmount(row.counted_amount),
    varianceAmount: toJsonAmount(row.variance_amount),
    receiptsCount: row.receipts_count,
    openedAt: row.opened_at.toISOString(),
    submittedAt: instant(row.submitted_at),
    verifiedAt: instant(row.verified_at),
  };
}

export function toRemittanceDetail(
  row: RemittanceSummaryRow,
  items: readonly RemittanceItemRow[],
): RemittanceDetailView {
  const denominations =
    row.denominations && typeof row.denominations === 'object' && !Array.isArray(row.denominations)
      ? (row.denominations as Record<string, number>)
      : {};
  return {
    ...toRemittanceSummary(row),
    items: items.map((item) => ({
      id: item.id,
      cashReceiptId: item.cash_receipt_id,
      receiptNumber: item.receipt_number,
      amount: toJsonAmount(item.amount),
      isVerified: item.is_verified,
      varianceAmount: toJsonAmount(item.variance_amount),
      varianceReason: item.variance_reason,
    })),
    denominations,
    verifiedByUserId: row.verified_by_user_id,
    rejectionReason: row.rejection_reason,
    depositedAt: instant(row.deposited_at),
    depositBankAccountId: row.deposit_bank_account_id,
    notes: row.notes,
  };
}
