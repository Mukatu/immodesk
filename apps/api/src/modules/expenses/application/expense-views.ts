import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';

export interface ExpenseRow {
  id: string;
  organization_id: string;
  property_id: string | null;
  unit_id: string | null;
  lease_id: string | null;
  landlord_id: string | null;
  reference: string;
  category: string;
  status: string;
  borne_by: string;
  label: string;
  description: string | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  supplier_niu: string | null;
  amount: bigint;
  vat_rate_bps: number;
  vat_amount: bigint;
  total_amount: bigint;
  currency: string;
  expense_date: Date;
  is_rebillable: boolean;
  is_deductible_from_rent: boolean;
  owner_statement_id: string | null;
  invoice_document_id: string | null;
  approved_by_user_id: string | null;
  approved_at: Date | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** `Expense` du contrat (docs/api/phase7-contract.md, § Types). */
export interface ExpenseView {
  id: string;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  landlordId: string | null;
  category: string;
  label: string;
  description: string | null;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierNiu: string | null;
  amount: number;
  vatRateBps: number;
  expenseDate: string;
  borneBy: string;
  isRebillable: boolean;
  isDeductibleFromRent: boolean;
  invoiceDocumentId: string | null;
  clientRef: string | null;
  notes: string | null;
  reference: string;
  status: string;
  vatAmount: number;
  totalAmount: number;
  currency: 'XAF';
  ownerStatementId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export function toExpenseView(row: ExpenseRow): ExpenseView {
  return {
    id: row.id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    leaseId: row.lease_id,
    landlordId: row.landlord_id,
    category: row.category,
    label: row.label,
    description: row.description,
    supplierName: row.supplier_name,
    supplierPhone: row.supplier_phone,
    supplierNiu: row.supplier_niu,
    amount: toJsonAmount(row.amount),
    vatRateBps: row.vat_rate_bps,
    expenseDate: toIsoDate(row.expense_date) as string,
    borneBy: row.borne_by,
    isRebillable: row.is_rebillable,
    isDeductibleFromRent: row.is_deductible_from_rent,
    invoiceDocumentId: row.invoice_document_id,
    clientRef: row.client_ref,
    notes: row.notes,
    reference: row.reference,
    status: row.status,
    vatAmount: toJsonAmount(row.vat_amount),
    totalAmount: toJsonAmount(row.total_amount),
    currency: 'XAF',
    ownerStatementId: row.owner_statement_id,
    approvedByUserId: row.approved_by_user_id,
    approvedAt: toIsoInstant(row.approved_at),
    createdAt: row.created_at.toISOString(),
  };
}
