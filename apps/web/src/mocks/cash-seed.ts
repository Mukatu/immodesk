/**
 * Mock MSW — Phase 3 (caisse : reçus, collecteurs, remises), état en mémoire et
 * données de démonstration pour la Résidence Mpila, conformes à
 * docs/api/phase3-contract.md. Même principe que billing-seed.ts / payments-seed.ts.
 */
import type { MockInvoice } from './billing-seed';

export type CashReceiptStatusMock = 'DRAFT' | 'ISSUED' | 'REMITTED' | 'CANCELLED';
export type RemittanceStatusMock =
  'OPEN' | 'SUBMITTED' | 'VERIFIED' | 'DEPOSITED' | 'REJECTED' | 'CANCELLED';

export interface MockCashReceiptAllocation {
  invoiceId: string;
  invoiceNumber: string | null;
  amount: number;
}

export interface MockCashReceipt {
  id: string;
  organizationId: string;
  receiptNumber: string;
  status: CashReceiptStatusMock;
  amount: number;
  receivedAt: string;
  tenantId: string;
  payerName: string;
  payerPhone: string | null;
  purpose: string | null;
  leaseId: string | null;
  collectorUserId: string;
  collectorName: string;
  remittanceId: string | null;
  paymentId: string | null;
  signatureDocumentId: string | null;
  signatureHash: string | null;
  documentId: string | null;
  allocations: MockCashReceiptAllocation[];
  cancelledAt: string | null;
  cancellationReason: string | null;
  clientRef: string | null;
  createdAt: string;
}

export interface MockRemittanceItem {
  id: string;
  cashReceiptId: string;
  receiptNumber: string;
  amount: number;
  isVerified: boolean;
  varianceAmount: number;
  varianceReason: string | null;
}

export interface MockRemittance {
  id: string;
  organizationId: string;
  reference: string;
  status: RemittanceStatusMock;
  collectorUserId: string;
  collectorName: string;
  declaredAmount: number;
  countedAmount: number;
  items: MockRemittanceItem[];
  denominations: Record<string, number>;
  verifiedByUserId: string | null;
  rejectionReason: string | null;
  depositedAt: string | null;
  depositBankAccountId: string | null;
  notes: string | null;
  openedAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  clientRef: string | null;
}

export const cashReceipts = new Map<string, MockCashReceipt>();
export const remittances = new Map<string, MockRemittance>();

/** Démarcheur de démonstration unique (pas de module "utilisateurs" côté mock phase 3). */
export const CASH_COLLECTOR = { userId: 'user-collector-demo', fullName: 'Jean-Pierre Milandou' };

let cashReceiptSeq = 0;
export function nextCashReceiptNumber(orgShort: string, collectorShort: string): string {
  cashReceiptSeq += 1;
  return `CASH-${orgShort}-${collectorShort}-${String(cashReceiptSeq).padStart(5, '0')}`;
}

let remittanceSeq = 0;
export function nextRemittanceReference(yearMonth: string): string {
  remittanceSeq += 1;
  return `REM-${yearMonth.replace('-', '')}-${String(remittanceSeq).padStart(5, '0')}`;
}

export function expectedAmountOf(remittance: MockRemittance): number {
  return remittance.items.reduce((sum, item) => sum + item.amount, 0);
}

export interface SeedCashDeps {
  invoices: Map<string, MockInvoice>;
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
  tenantName: (tenantId: string) => string;
}

/**
 * Seed de 3 reçus ISSUED du collecteur démo (encours au-dessus du plafond par
 * défaut 500 000 XAF, pour illustrer l'alerte) + 1 remise SUBMITTED en file
 * regroupant les deux premiers reçus, en attente de contrôle.
 */
export function seedCashDemoData(deps: SeedCashDeps): void {
  const { invoices, DEMO_ORG_ID, nextId, tenantName } = deps;
  const now = new Date().toISOString();
  const yearMonth = now.slice(0, 7);
  const collector = CASH_COLLECTOR;

  const demoInvoices = [...invoices.values()].filter((i) => i.organizationId === DEMO_ORG_ID);
  const targetInvoice = demoInvoices[0];
  if (!targetInvoice) return;

  const amounts = [180000, 150000, 200000];
  const createdReceipts: MockCashReceipt[] = amounts.map((amount, index) => {
    const id = nextId('cash-receipt');
    const receiptNumber = nextCashReceiptNumber('IMD', 'JPM');
    const receivedAt = new Date(Date.now() - index * 3_600_000).toISOString();
    const receipt: MockCashReceipt = {
      id,
      organizationId: DEMO_ORG_ID,
      receiptNumber,
      status: 'ISSUED',
      amount,
      receivedAt,
      tenantId: targetInvoice.tenantId,
      payerName: tenantName(targetInvoice.tenantId),
      payerPhone: null,
      purpose: 'Loyer',
      leaseId: targetInvoice.leaseId,
      collectorUserId: collector.userId,
      collectorName: collector.fullName,
      remittanceId: null,
      paymentId: null,
      signatureDocumentId: nextId('document'),
      signatureHash: 'sha256-demo',
      documentId: null,
      allocations: [],
      cancelledAt: null,
      cancellationReason: null,
      clientRef: null,
      createdAt: receivedAt,
    };
    cashReceipts.set(id, receipt);
    return receipt;
  });

  const submittedReceipts = createdReceipts.slice(0, 2);
  const remittanceId = nextId('remittance');
  const declaredAmount = submittedReceipts.reduce((sum, r) => sum + r.amount, 0);
  const remittance: MockRemittance = {
    id: remittanceId,
    organizationId: DEMO_ORG_ID,
    reference: nextRemittanceReference(yearMonth),
    status: 'SUBMITTED',
    collectorUserId: collector.userId,
    collectorName: collector.fullName,
    declaredAmount,
    countedAmount: 0,
    items: submittedReceipts.map((r) => ({
      id: nextId('remittance-item'),
      cashReceiptId: r.id,
      receiptNumber: r.receiptNumber,
      amount: r.amount,
      isVerified: false,
      varianceAmount: 0,
      varianceReason: null,
    })),
    denominations: { '10000': 25, '5000': 20, '2000': 15, '1000': 10 },
    verifiedByUserId: null,
    rejectionReason: null,
    depositedAt: null,
    depositBankAccountId: null,
    notes: null,
    openedAt: now,
    submittedAt: now,
    verifiedAt: null,
    clientRef: null,
  };
  remittances.set(remittanceId, remittance);
  submittedReceipts.forEach((r) => {
    r.remittanceId = remittanceId;
  });
}
