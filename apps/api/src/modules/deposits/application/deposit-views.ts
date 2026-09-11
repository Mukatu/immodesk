import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';

export interface DepositRow {
  id: string;
  lease_id: string;
  tenant_id: string;
  status: string;
  required_amount: bigint;
  collected_amount: bigint;
  deducted_amount: bigint;
  refunded_amount: bigint;
  held_amount: bigint;
  currency: string;
  held_by: string;
  months_equivalent: number | null;
  due_date: Date | null;
  fully_collected_at: Date | null;
  refund_due_date: Date | null;
  refunded_at: Date | null;
  refund_bank_account_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DepositMovementRow {
  id: string;
  deposit_id: string;
  lease_id: string;
  movement_type: string;
  amount: bigint;
  currency: string;
  movement_date: Date;
  payment_id: string | null;
  inspection_id: string | null;
  reason: string | null;
  reversal_of_id: string | null;
  created_by_user_id: string | null;
  created_at: Date;
}

export interface DepositMovementView {
  id: string;
  depositId: string;
  leaseId: string;
  movementType: string;
  amount: number;
  currency: string;
  movementDate: string;
  paymentId: string | null;
  inspectionId: string | null;
  reason: string | null;
  reversalOfId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface DepositDetailView {
  id: string;
  leaseId: string;
  tenantId: string;
  status: string;
  requiredAmount: number;
  collectedAmount: number;
  deductedAmount: number;
  refundedAmount: number;
  heldAmount: number;
  currency: string;
  heldBy: string;
  monthsEquivalent: number | null;
  dueDate: string | null;
  fullyCollectedAt: string | null;
  refundDueDate: string | null;
  refundedAt: string | null;
  refundBankAccountId: string | null;
  movements: DepositMovementView[];
}

export function toDepositMovementView(row: DepositMovementRow): DepositMovementView {
  return {
    id: row.id,
    depositId: row.deposit_id,
    leaseId: row.lease_id,
    movementType: row.movement_type,
    // Montant XAF : BigInt en base, entier JSON à la présentation.
    amount: toJsonAmount(row.amount),
    currency: row.currency,
    movementDate: toIsoDate(row.movement_date) as string,
    paymentId: row.payment_id,
    inspectionId: row.inspection_id,
    reason: row.reason,
    reversalOfId: row.reversal_of_id,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at.toISOString(),
  };
}

export function toDepositDetailView(
  row: DepositRow,
  movements: readonly DepositMovementRow[],
): DepositDetailView {
  return {
    id: row.id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    status: row.status,
    requiredAmount: toJsonAmount(row.required_amount),
    collectedAmount: toJsonAmount(row.collected_amount),
    deductedAmount: toJsonAmount(row.deducted_amount),
    refundedAmount: toJsonAmount(row.refunded_amount),
    heldAmount: toJsonAmount(row.held_amount),
    currency: row.currency,
    heldBy: row.held_by,
    monthsEquivalent: row.months_equivalent,
    dueDate: toIsoDate(row.due_date),
    fullyCollectedAt: toIsoInstant(row.fully_collected_at),
    refundDueDate: toIsoDate(row.refund_due_date),
    refundedAt: toIsoInstant(row.refunded_at),
    refundBankAccountId: row.refund_bank_account_id,
    movements: movements.map(toDepositMovementView),
  };
}

export interface DepositSummaryRow extends DepositRow {
  lease_reference: string;
  unit_id: string;
  unit_code: string;
  tenant_party_type: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
}

export interface DepositSummaryView {
  id: string;
  leaseId: string;
  leaseReference: string | null;
  tenant: { id: string; displayName: string };
  unit: { id: string; code: string };
  status: string;
  requiredAmount: number;
  heldAmount: number;
  refundDueDate: string | null;
}

export function toDepositSummaryView(
  row: DepositSummaryRow,
  publicReference: (reference: string) => string | null,
): DepositSummaryView {
  return {
    id: row.id,
    leaseId: row.lease_id,
    leaseReference: publicReference(row.lease_reference),
    tenant: {
      id: row.tenant_id,
      displayName: displayNameOf({
        partyType: row.tenant_party_type as PartyType,
        firstName: row.tenant_first_name,
        lastName: row.tenant_last_name,
        companyName: row.tenant_company_name,
      }),
    },
    unit: { id: row.unit_id, code: row.unit_code },
    status: row.status,
    requiredAmount: toJsonAmount(row.required_amount),
    heldAmount: toJsonAmount(row.held_amount),
    refundDueDate: toIsoDate(row.refund_due_date),
  };
}
