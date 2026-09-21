import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate } from '../../leases/domain/calendar';

function toIsoInstant(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export interface SubscriptionInvoiceRow {
  id: string;
  organization_id: string;
  subscription_id: string;
  invoice_number: string;
  status: string;
  period_start: Date;
  period_end: Date;
  issue_date: Date;
  due_date: Date;
  units_count: number;
  subtotal_amount: bigint;
  discount_amount: bigint;
  vat_rate_bps: number;
  vat_amount: bigint;
  total_amount: bigint;
  paid_amount: bigint;
  currency: string;
  momo_transaction_id: string | null;
  document_id: string | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionInvoiceView {
  id: string;
  organizationId: string;
  subscriptionId: string;
  invoiceNumber: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  unitsCount: number;
  subtotalAmount: number;
  discountAmount: number;
  vatRateBps: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  momoTransactionId: string | null;
  documentId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export function toSubscriptionInvoiceView(row: SubscriptionInvoiceRow): SubscriptionInvoiceView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    subscriptionId: row.subscription_id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    periodStart: toIsoDate(row.period_start),
    periodEnd: toIsoDate(row.period_end),
    issueDate: toIsoDate(row.issue_date),
    dueDate: toIsoDate(row.due_date),
    unitsCount: row.units_count,
    subtotalAmount: toJsonAmount(row.subtotal_amount),
    discountAmount: toJsonAmount(row.discount_amount),
    vatRateBps: row.vat_rate_bps,
    vatAmount: toJsonAmount(row.vat_amount),
    totalAmount: toJsonAmount(row.total_amount),
    paidAmount: toJsonAmount(row.paid_amount),
    currency: row.currency,
    momoTransactionId: row.momo_transaction_id,
    documentId: row.document_id,
    paidAt: toIsoInstant(row.paid_at),
    createdAt: toIsoInstant(row.created_at) as string,
  };
}
