import { toJsonAmount, toJsonAmountOrNull } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';

export interface OwnerStatementRow {
  id: string;
  organization_id: string;
  landlord_id: string;
  mandate_id: string | null;
  property_id: string | null;
  statement_number: string;
  status: string;
  period_start: Date;
  period_end: Date;
  issue_date: Date;
  rent_due_amount: bigint;
  rent_collected_amount: bigint;
  charges_collected_amount: bigint;
  commission_amount: bigint;
  commission_vat_amount: bigint;
  expenses_amount: bigint;
  deposits_held_amount: bigint;
  carry_forward_amount: bigint;
  net_payable_amount: bigint;
  currency: string;
  occupancy_rate_bps: number | null;
  collection_rate_bps: number | null;
  document_id: string | null;
  generated_by_job: string | null;
  issued_at: Date | null;
  sent_at: Date | null;
  settled_at: Date | null;
  cancelled_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Jointure minimale nécessaire à l'affichage (contrat, `StatementSummary`). */
export interface OwnerStatementJoinedRow extends OwnerStatementRow {
  landlord_party_type: string;
  landlord_first_name: string | null;
  landlord_last_name: string | null;
  landlord_company_name: string | null;
  property_name: string | null;
}

export interface OwnerStatementLineRow {
  id: string;
  organization_id: string;
  statement_id: string;
  line_type: string;
  label: string;
  property_id: string | null;
  unit_id: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  expense_id: string | null;
  commission_id: string | null;
  period_start: Date | null;
  period_end: Date | null;
  amount: bigint;
  is_debit: boolean;
  currency: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}

/** `StatementSummary` du contrat (docs/api/phase7-contract.md, § Types). */
export interface StatementSummaryView {
  id: string;
  statementNumber: string;
  status: string;
  landlord: { id: string; displayName: string };
  property: { id: string; name: string } | null;
  periodStart: string;
  periodEnd: string;
  rentCollectedAmount: number;
  commissionAmount: number;
  expensesAmount: number;
  carryForwardAmount: number;
  netPayableAmount: number;
  issuedAt: string | null;
  sentAt: string | null;
  settledAt: string | null;
}

/** `StatementLine` du contrat. */
export interface StatementLineView {
  id: string;
  lineType: string;
  label: string;
  amount: number;
  isDebit: boolean;
  position: number;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  expenseId: string | null;
  commissionId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

/**
 * `payout` (contrat, route `GET /{id}`) : lecture directe de `owner_payouts`
 * par `statement_id` (voir `owner-statements-query.service.ts`), même
 * logique que `mandates-query.service.ts` lisant `owner_statements` pour sa
 * propre fiche détaillée — pas de port, `owner-statements` reste
 * propriétaire de sa vue, `owner-payouts` de sa table.
 */
export interface PayoutView {
  id: string;
  reference: string;
  status: string;
  method: string;
  amount: number;
  netAmount: number;
  paidAt: string | null;
}

/** Colonnes de `owner_payouts` nécessaires à `PayoutView` (voir `toPayoutRefView`). */
export interface OwnerPayoutForStatementRow {
  id: string;
  reference: string;
  status: string;
  method: string;
  amount: bigint;
  net_amount: bigint;
  paid_at: Date | null;
}

export function toPayoutRefView(row: OwnerPayoutForStatementRow): PayoutView {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    method: row.method,
    amount: toJsonAmount(row.amount),
    netAmount: toJsonAmount(row.net_amount),
    paidAt: toIsoInstant(row.paid_at),
  };
}

/** `StatementDetail` du contrat : étend `StatementSummary`. */
export interface StatementDetailView extends StatementSummaryView {
  mandateId: string | null;
  chargesCollectedAmount: number;
  commissionVatAmount: number;
  depositsHeldAmount: number;
  occupancyRateBps: number | null;
  collectionRateBps: number | null;
  documentId: string | null;
  lines: StatementLineView[];
  payout: PayoutView | null;
}

export function toStatementSummaryView(row: OwnerStatementJoinedRow): StatementSummaryView {
  return {
    id: row.id,
    statementNumber: row.statement_number,
    status: row.status,
    landlord: {
      id: row.landlord_id,
      displayName: displayNameOf({
        partyType: row.landlord_party_type as PartyType,
        firstName: row.landlord_first_name,
        lastName: row.landlord_last_name,
        companyName: row.landlord_company_name,
      }),
    },
    property: row.property_id ? { id: row.property_id, name: row.property_name ?? '' } : null,
    periodStart: toIsoDate(row.period_start) as string,
    periodEnd: toIsoDate(row.period_end) as string,
    rentCollectedAmount: toJsonAmount(row.rent_collected_amount),
    commissionAmount: toJsonAmount(row.commission_amount),
    expensesAmount: toJsonAmount(row.expenses_amount),
    carryForwardAmount: toJsonAmount(row.carry_forward_amount),
    netPayableAmount: toJsonAmount(row.net_payable_amount),
    issuedAt: toIsoInstant(row.issued_at),
    sentAt: toIsoInstant(row.sent_at),
    settledAt: toIsoInstant(row.settled_at),
  };
}

export function toStatementLineView(row: OwnerStatementLineRow): StatementLineView {
  return {
    id: row.id,
    lineType: row.line_type,
    label: row.label,
    amount: toJsonAmount(row.amount),
    isDebit: row.is_debit,
    position: row.position,
    propertyId: row.property_id,
    unitId: row.unit_id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    invoiceId: row.invoice_id,
    paymentId: row.payment_id,
    expenseId: row.expense_id,
    commissionId: row.commission_id,
    periodStart: toIsoDate(row.period_start),
    periodEnd: toIsoDate(row.period_end),
  };
}

export function toStatementDetailView(
  row: OwnerStatementJoinedRow,
  lines: OwnerStatementLineRow[],
  payout: OwnerPayoutForStatementRow | null = null,
): StatementDetailView {
  return {
    ...toStatementSummaryView(row),
    mandateId: row.mandate_id,
    chargesCollectedAmount: toJsonAmount(row.charges_collected_amount),
    commissionVatAmount: toJsonAmount(row.commission_vat_amount),
    depositsHeldAmount: toJsonAmount(row.deposits_held_amount),
    occupancyRateBps: row.occupancy_rate_bps,
    collectionRateBps: row.collection_rate_bps,
    documentId: row.document_id,
    lines: lines.map(toStatementLineView),
    payout: payout ? toPayoutRefView(payout) : null,
  };
}

export function toJsonAmountSafe(value: bigint | null | undefined): number {
  return toJsonAmountOrNull(value) ?? 0;
}
