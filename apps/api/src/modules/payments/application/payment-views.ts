import { toJsonAmount } from '../../../shared/money/amount';
import { publicInvoiceNumber } from '../../billing/application/invoice-views';
import type { CashReceiptSummaryView } from '../../cash/application/cash-receipt-views';
import { publicReference } from '../../leases/application/lease-views';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import type { ReceiptSummaryView } from '../../receipts/application/receipt-views';

export interface PaymentRow {
  id: string;
  organization_id: string;
  tenant_id: string | null;
  lease_id: string | null;
  landlord_id: string | null;
  direction: string;
  method: string;
  status: string;
  reference: string;
  external_reference: string | null;
  amount: bigint;
  fee_amount: bigint;
  fee_bearer: string;
  net_amount: bigint;
  allocated_amount: bigint;
  unallocated_amount: bigint;
  payment_date: Date;
  value_date: Date | null;
  received_by_user_id: string | null;
  bank_account_id: string | null;
  confirmed_at: Date | null;
  confirmed_by_user_id: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  reversed_at: Date | null;
  reversal_of_id: string | null;
  reversal_reason: string | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
}

export interface PaymentSummaryRow extends PaymentRow {
  tenant_party_type: string | null;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  lease_reference: string | null;
}

export const PAYMENT_SUMMARY_SELECT = `
  pm.*, t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
  l.reference AS lease_reference`;

export const PAYMENT_SUMMARY_FROM = `
  payments pm
  LEFT JOIN tenants t ON t.id = pm.tenant_id
  LEFT JOIN leases l ON l.id = pm.lease_id`;

export interface PaymentSummaryView {
  id: string;
  reference: string;
  method: string;
  status: string;
  direction: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  paymentDate: string;
  tenant: { id: string; displayName: string } | null;
  lease: { id: string; reference: string | null } | null;
  receivedByUserId: string | null;
  reversalOfId: string | null;
}

export function toPaymentSummary(row: PaymentSummaryRow): PaymentSummaryView {
  return {
    id: row.id,
    reference: row.reference,
    method: row.method,
    status: row.status,
    direction: row.direction,
    amount: toJsonAmount(row.amount),
    allocatedAmount: toJsonAmount(row.allocated_amount),
    unallocatedAmount: toJsonAmount(row.unallocated_amount),
    paymentDate: toIsoDate(row.payment_date) as string,
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
    lease: row.lease_id
      ? {
          id: row.lease_id,
          reference: row.lease_reference ? publicReference(row.lease_reference) : null,
        }
      : null,
    receivedByUserId: row.received_by_user_id,
    reversalOfId: row.reversal_of_id,
  };
}

export interface PaymentAllocationRow {
  id: string;
  invoice_id: string | null;
  invoice_number: string | null;
  tenant_credit_id: string | null;
  amount: bigint;
  is_reversal: boolean;
}

export interface PaymentDetailView extends PaymentSummaryView {
  externalReference: string | null;
  feeAmount: number;
  netAmount: number;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  allocations: Array<{
    id: string;
    invoiceId: string | null;
    invoiceNumber: string | null;
    tenantCreditId: string | null;
    amount: number;
    isReversal: boolean;
  }>;
  cashReceipt: CashReceiptSummaryView | null;
  receipts: ReceiptSummaryView[];
  clientRef: string | null;
  notes: string | null;
  createdAt: string;
}

/**
 * Détail d'un paiement. Pour un paiement d'ORIGINE contre-passé, la date et
 * le motif de contre-passation sont DÉRIVÉS de l'écriture miroir : le
 * contrat interdit de modifier la ligne d'origine, fût-ce une colonne de
 * workflow.
 */
export function toPaymentDetail(
  row: PaymentSummaryRow,
  allocations: readonly PaymentAllocationRow[],
  cashReceipt: CashReceiptSummaryView | null,
  receipts: ReceiptSummaryView[],
  mirror: { created_at: Date; reversal_reason: string | null } | null,
): PaymentDetailView {
  return {
    ...toPaymentSummary(row),
    externalReference: row.external_reference,
    feeAmount: toJsonAmount(row.fee_amount),
    netAmount: toJsonAmount(row.net_amount),
    confirmedAt: toIsoInstant(row.confirmed_at),
    rejectedAt: toIsoInstant(row.rejected_at),
    rejectionReason: row.rejection_reason,
    reversedAt: toIsoInstant(row.reversed_at ?? mirror?.created_at ?? null),
    reversalReason: row.reversal_reason ?? mirror?.reversal_reason ?? null,
    allocations: allocations.map((a) => ({
      id: a.id,
      invoiceId: a.invoice_id,
      invoiceNumber: a.invoice_number ? publicInvoiceNumber(a.invoice_number) : null,
      tenantCreditId: a.tenant_credit_id,
      amount: toJsonAmount(a.amount),
      isReversal: a.is_reversal,
    })),
    cashReceipt,
    receipts,
    clientRef: row.client_ref,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

export interface TenantCreditRow {
  id: string;
  tenant_id: string;
  lease_id: string | null;
  status: string;
  origin: string;
  amount: bigint;
  used_amount: bigint;
  remaining_amount: bigint;
  source_payment_id: string | null;
  source_invoice_id: string | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface TenantCreditView {
  id: string;
  tenantId: string;
  leaseId: string | null;
  status: string;
  origin: string;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  sourcePaymentId: string | null;
  sourceInvoiceId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function toTenantCreditView(row: TenantCreditRow): TenantCreditView {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    leaseId: row.lease_id,
    status: row.status,
    origin: row.origin,
    amount: toJsonAmount(row.amount),
    usedAmount: toJsonAmount(row.used_amount),
    remainingAmount: toJsonAmount(row.remaining_amount),
    sourcePaymentId: row.source_payment_id,
    sourceInvoiceId: row.source_invoice_id,
    expiresAt: toIsoDate(row.expires_at),
    createdAt: row.created_at.toISOString(),
  };
}
