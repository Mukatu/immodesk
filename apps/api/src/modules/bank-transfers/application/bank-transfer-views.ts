import { toJsonAmount } from '../../../shared/money/amount';
import { publicInvoiceNumber } from '../../billing/application/invoice-views';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import { businessHoursElapsed } from '../domain/bank-transfer-rules';

export interface TransferDeclarationRow {
  id: string;
  organization_id: string;
  tenant_id: string | null;
  lease_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  status: string;
  declared_amount: bigint;
  transfer_date: Date;
  transfer_reference: string | null;
  payer_name: string;
  payer_bank_code: string | null;
  payer_bank_name: string | null;
  payer_account_number: string | null;
  beneficiary_bank_account_id: string | null;
  proof_document_id: string | null;
  submitted_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  matched_statement_line_id: string | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
}

export interface TransferDeclarationSummaryRow extends TransferDeclarationRow {
  tenant_party_type: string | null;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  invoice_number: string | null;
}

export const TRANSFER_SUMMARY_SELECT = `
  b.*, t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
  ri.invoice_number AS invoice_number`;

export const TRANSFER_SUMMARY_FROM = `
  bank_transfer_declarations b
  LEFT JOIN tenants t ON t.id = b.tenant_id
  LEFT JOIN rent_invoices ri ON ri.id = b.invoice_id`;

export interface TransferDeclarationView {
  id: string;
  status: string;
  tenantId: string;
  leaseId: string | null;
  invoiceId: string | null;
  declaredAmount: number;
  transferDate: string;
  transferReference: string | null;
  payerName: string;
  payerBankCode: string | null;
  payerBankName: string | null;
  payerAccountNumber: string | null;
  beneficiaryBankAccountId: string | null;
  proofDocumentId: string | null;
  clientRef: string | null;
  notes: string | null;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  paymentId: string | null;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  matchedStatementLineId: string | null;
  ageHours: number;
  createdAt: string;
}

export function toTransferDeclarationView(
  row: TransferDeclarationSummaryRow,
  now: Date = new Date(),
): TransferDeclarationView {
  const isPending = row.status === 'SUBMITTED' || row.status === 'UNDER_REVIEW';
  return {
    id: row.id,
    status: row.status,
    tenantId: row.tenant_id as string,
    leaseId: row.lease_id,
    invoiceId: row.invoice_id,
    declaredAmount: toJsonAmount(row.declared_amount),
    transferDate: toIsoDate(row.transfer_date) as string,
    transferReference: row.transfer_reference,
    payerName: row.payer_name,
    payerBankCode: row.payer_bank_code,
    payerBankName: row.payer_bank_name,
    payerAccountNumber: row.payer_account_number,
    beneficiaryBankAccountId: row.beneficiary_bank_account_id,
    proofDocumentId: row.proof_document_id,
    clientRef: row.client_ref,
    notes: row.notes,
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
    submittedByUserId: row.submitted_by_user_id,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: toIsoInstant(row.reviewed_at),
    rejectionReason: row.rejection_reason,
    matchedStatementLineId: row.matched_statement_line_id,
    ageHours: isPending ? businessHoursElapsed(row.created_at, now) : 0,
    createdAt: row.created_at.toISOString(),
  };
}
