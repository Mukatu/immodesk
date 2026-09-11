/**
 * Mock MSW — Phase 3 (quittances), état en mémoire et donnée de démonstration
 * pour la Résidence Mpila, conforme à docs/api/phase3-contract.md. Même principe
 * que billing-seed.ts / payments-seed.ts : seed appelé après ces deux-là (dépend
 * d'une facture PAID et de son paiement).
 */
import { computeInvoiceTotals, type MockInvoice } from './billing-seed';

export type ReceiptStatusMock = 'DRAFT' | 'GENERATING' | 'ISSUED' | 'SENT' | 'CANCELLED';
export type NotificationChannelMock = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';

export interface MockReceipt {
  id: string;
  organizationId: string;
  receiptNumber: string;
  status: ReceiptStatusMock;
  issueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalAmount: number;
  rentAmount: number;
  chargesAmount: number;
  penaltyAmount: number;
  remainingBalanceAmount: number;
  tenantId: string;
  paymentId: string;
  invoiceId: string | null;
  sentAt: string | null;
  sentChannel: NotificationChannelMock | null;
  verificationToken: string;
  landlordDisplayName: string;
  organizationName: string;
  documentId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export const receipts = new Map<string, MockReceipt>();
export const receiptsByToken = new Map<string, string>(); // token -> receiptId

let receiptSeq = 0;
export function nextReceiptNumber(yearMonth: string): string {
  receiptSeq += 1;
  return `QUI-${yearMonth.replace('-', '')}-${String(receiptSeq).padStart(5, '0')}`;
}

export interface SeedReceiptsDeps {
  invoices: Map<string, MockInvoice>;
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
  landlordDisplayNameForProperty: (propertyId: string) => string;
  organizationName: string;
}

/** Seed d'une quittance SENT, générée pour la facture PAID du seed billing. */
export function seedReceiptsDemoData(deps: SeedReceiptsDeps): void {
  const { invoices, DEMO_ORG_ID, nextId, landlordDisplayNameForProperty, organizationName } = deps;
  const now = new Date().toISOString();

  const paidInvoice = [...invoices.values()].find(
    (i) => i.organizationId === DEMO_ORG_ID && i.status === 'PAID',
  );
  if (!paidInvoice) return;
  const allocation = paidInvoice.allocations[0];
  if (!allocation) return;

  const totals = computeInvoiceTotals(paidInvoice);
  const yearMonth = paidInvoice.periodStart.slice(0, 7);
  const token = nextId('vtoken');

  const receipt: MockReceipt = {
    id: nextId('receipt'),
    organizationId: DEMO_ORG_ID,
    receiptNumber: nextReceiptNumber(yearMonth),
    status: 'SENT',
    issueDate: now.slice(0, 10),
    periodStart: paidInvoice.periodStart,
    periodEnd: paidInvoice.periodEnd,
    totalAmount: totals.totalAmount,
    rentAmount: totals.rentAmount,
    chargesAmount: totals.chargesAmount,
    penaltyAmount: totals.penaltyAmount,
    remainingBalanceAmount: 0,
    tenantId: paidInvoice.tenantId,
    paymentId: allocation.paymentId,
    invoiceId: paidInvoice.id,
    sentAt: now,
    sentChannel: 'WHATSAPP',
    verificationToken: token,
    landlordDisplayName: landlordDisplayNameForProperty(paidInvoice.propertyId),
    organizationName,
    documentId: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
  };
  receipts.set(receipt.id, receipt);
  receiptsByToken.set(token, receipt.id);
  paidInvoice.receiptId = receipt.id;
}
