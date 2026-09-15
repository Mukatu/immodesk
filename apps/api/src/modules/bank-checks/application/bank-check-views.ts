import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import { publicInvoiceNumber } from '../../billing/application/invoice-views';
import type { ReconciliationMatchView } from '../../reconciliation/application/reconciliation-views';

export interface BankCheckRow {
  id: string;
  organization_id: string;
  tenant_id: string | null;
  lease_id: string | null;
  payment_id: string | null;
  status: string;
  check_number: string;
  drawer_name: string;
  drawer_bank_code: string;
  drawer_bank_name: string;
  drawer_account_number: string | null;
  amount: bigint;
  issue_date: Date;
  received_at: Date;
  deposit_date: Date | null;
  deposit_bank_account_id: string | null;
  clearing_date: Date | null;
  cleared_at: Date | null;
  bounced_at: Date | null;
  bounce_reason: string | null;
  bounce_fee_amount: bigint;
  image_document_id: string | null;
  received_by_user_id: string | null;
  notes: string | null;
  created_at: Date;
}

export interface BankCheckDetailRow extends BankCheckRow {
  tenant_party_type: string | null;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
}

export const BANK_CHECK_SELECT = 'bc.*';
export const BANK_CHECK_FROM = 'bank_checks bc';

/** `invoiceId` n'est jamais dans cette forme : la table ne porte pas cette colonne (contrat § « Chèques »). */
export interface BankCheckView {
  id: string;
  tenantId: string | null;
  leaseId: string | null;
  checkNumber: string;
  drawerName: string;
  drawerBankCode: string;
  drawerBankName: string;
  drawerAccountNumber: string | null;
  amount: number;
  issueDate: string;
  receivedAt: string;
  imageDocumentId: string | null;
  notes: string | null;
  status: string;
  paymentId: string | null;
  depositDate: string | null;
  depositBankAccountId: string | null;
  clearingDate: string | null;
  bouncedAt: string | null;
  bounceReason: string | null;
  bounceFeeAmount: number;
  receivedByUserId: string | null;
  ageDays: number;
}

export interface BankCheckDetailView extends BankCheckView {
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  matches: ReconciliationMatchView[];
}

export function toBankCheckView(row: BankCheckRow, now: Date = new Date()): BankCheckView {
  const ageDays = Math.max(0, Math.floor((now.getTime() - row.received_at.getTime()) / 86_400_000));
  return {
    id: row.id,
    tenantId: row.tenant_id,
    leaseId: row.lease_id,
    checkNumber: row.check_number,
    drawerName: row.drawer_name,
    drawerBankCode: row.drawer_bank_code,
    drawerBankName: row.drawer_bank_name,
    drawerAccountNumber: row.drawer_account_number,
    amount: toJsonAmount(row.amount),
    issueDate: toIsoDate(row.issue_date) as string,
    receivedAt: toIsoInstant(row.received_at) as string,
    imageDocumentId: row.image_document_id,
    notes: row.notes,
    status: row.status,
    paymentId: row.payment_id,
    depositDate: toIsoDate(row.deposit_date),
    depositBankAccountId: row.deposit_bank_account_id,
    clearingDate: toIsoDate(row.clearing_date),
    bouncedAt: toIsoInstant(row.bounced_at),
    bounceReason: row.bounce_reason,
    bounceFeeAmount: toJsonAmount(row.bounce_fee_amount),
    receivedByUserId: row.received_by_user_id,
    ageDays,
  };
}

export function toBankCheckDetailView(
  row: BankCheckDetailRow,
  matches: ReconciliationMatchView[],
  now: Date = new Date(),
): BankCheckDetailView {
  return {
    ...toBankCheckView(row, now),
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
    matches,
  };
}
