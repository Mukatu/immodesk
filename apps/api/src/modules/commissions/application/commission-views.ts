import { toJsonAmount, toJsonAmountOrNull } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';

export interface CommissionRow {
  id: string;
  organization_id: string;
  mandate_id: string | null;
  landlord_id: string;
  lease_id: string | null;
  property_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  status: string;
  basis: string;
  period_start: Date;
  period_end: Date;
  base_amount: bigint;
  rate_bps: number | null;
  flat_amount: bigint | null;
  amount: bigint;
  vat_rate_bps: number;
  vat_amount: bigint;
  total_amount: bigint;
  currency: string;
  owner_statement_id: string | null;
  accrued_at: Date | null;
  settled_at: Date | null;
  reversal_of_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * `Commission` du contrat (docs/api/phase7-contract.md, § Types), étendue de
 * quelques champs de traçabilité (`propertyId`, `invoiceId`, `currency`,
 * `accruedAt`) utiles à l'affichage mais non listés au contrat — même
 * pratique que `ExpenseView` vis-à-vis d'`Expense`.
 */
export interface CommissionView {
  id: string;
  mandateId: string | null;
  landlordId: string;
  leaseId: string | null;
  propertyId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  status: string;
  basis: string;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  rateBps: number | null;
  flatAmount: number | null;
  amount: number;
  vatRateBps: number;
  vatAmount: number;
  totalAmount: number;
  currency: 'XAF';
  ownerStatementId: string | null;
  accruedAt: string | null;
  settledAt: string | null;
  reversalOfId: string | null;
  notes: string | null;
}

export function toCommissionView(row: CommissionRow): CommissionView {
  return {
    id: row.id,
    mandateId: row.mandate_id,
    landlordId: row.landlord_id,
    leaseId: row.lease_id,
    propertyId: row.property_id,
    invoiceId: row.invoice_id,
    paymentId: row.payment_id,
    status: row.status,
    basis: row.basis,
    periodStart: toIsoDate(row.period_start) as string,
    periodEnd: toIsoDate(row.period_end) as string,
    baseAmount: toJsonAmount(row.base_amount),
    rateBps: row.rate_bps,
    flatAmount: toJsonAmountOrNull(row.flat_amount),
    amount: toJsonAmount(row.amount),
    vatRateBps: row.vat_rate_bps,
    vatAmount: toJsonAmount(row.vat_amount),
    totalAmount: toJsonAmount(row.total_amount),
    currency: 'XAF',
    ownerStatementId: row.owner_statement_id,
    accruedAt: toIsoInstant(row.accrued_at),
    settledAt: toIsoInstant(row.settled_at),
    reversalOfId: row.reversal_of_id,
    notes: row.notes,
  };
}
