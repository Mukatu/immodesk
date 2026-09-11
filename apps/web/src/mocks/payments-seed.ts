/**
 * Mock MSW — Phase 3 (paiements et crédits), état en mémoire et données de
 * démonstration, conformes à docs/api/phase3-contract.md. Suit le principe de
 * billing-seed.ts : seed appelé après seedBillingDemoData (dépend des factures
 * déjà seedées) pour rattacher un paiement confirmé à une facture existante.
 */
import {
  computeInvoiceTotals,
  type InvoiceStatusMock,
  type MockAllocation,
  type MockInvoice,
} from './billing-seed';

export type PaymentMethodMock = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'BANK_CHECK';
export type PaymentStatusMock =
  'PENDING' | 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';

export interface MockPaymentAllocation {
  id: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  tenantCreditId: string | null;
  amount: number;
  isReversal: boolean;
}

export interface MockPayment {
  id: string;
  organizationId: string;
  reference: string;
  method: PaymentMethodMock;
  status: PaymentStatusMock;
  direction: 'INBOUND' | 'OUTBOUND';
  amount: number;
  tenantId: string;
  leaseId: string | null;
  paymentDate: string;
  externalReference: string | null;
  feeAmount: number;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  reversalOfId: string | null;
  receivedByUserId: string | null;
  clientRef: string | null;
  notes: string | null;
  createdAt: string;
  allocations: MockPaymentAllocation[];
}

export type CreditStatusMock = 'OPEN' | 'PARTIALLY_USED' | 'USED' | 'REFUNDED' | 'EXPIRED';

export interface MockTenantCredit {
  id: string;
  organizationId: string;
  tenantId: string;
  leaseId: string | null;
  status: CreditStatusMock;
  origin: string;
  amount: number;
  usedAmount: number;
  sourcePaymentId: string | null;
  sourceInvoiceId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const payments = new Map<string, MockPayment>();
export const tenantCredits = new Map<string, MockTenantCredit>();

let paymentSeq = 0;
export function nextPaymentReference(yearMonth: string): string {
  paymentSeq += 1;
  return `PAY-${yearMonth.replace('-', '')}-${String(paymentSeq).padStart(5, '0')}`;
}

let reversalSeq = 0;
export function nextReversalReference(yearMonth: string): string {
  reversalSeq += 1;
  return `REV-${yearMonth.replace('-', '')}-${String(reversalSeq).padStart(5, '0')}`;
}

export interface SeedPaymentsDeps {
  invoices: Map<string, MockInvoice>;
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
}

const OPEN_STATUSES: InvoiceStatusMock[] = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

/** Seed d'un paiement CONFIRMED (déjà alloué à une facture partiellement payée) et d'un PENDING_VERIFICATION. */
export function seedPaymentsDemoData(deps: SeedPaymentsDeps): void {
  const { invoices, DEMO_ORG_ID, nextId } = deps;
  const now = new Date().toISOString();
  const yearMonth = now.slice(0, 7);

  const demoInvoices = [...invoices.values()].filter((i) => i.organizationId === DEMO_ORG_ID);
  const partiallyPaid = demoInvoices.find((i) => i.status === 'PARTIALLY_PAID');
  const openForSecondTenant = demoInvoices.find(
    (i) => OPEN_STATUSES.includes(i.status) && i.id !== partiallyPaid?.id,
  );

  if (partiallyPaid) {
    const existingAllocation: MockAllocation | undefined = partiallyPaid.allocations[0];
    const paymentId = existingAllocation?.paymentId ?? nextId('payment');
    const reference = existingAllocation?.paymentReference ?? nextPaymentReference(yearMonth);
    const amount =
      existingAllocation?.amount ??
      Math.round(computeInvoiceTotals(partiallyPaid).balanceAmount / 2);
    const payment: MockPayment = {
      id: paymentId,
      organizationId: DEMO_ORG_ID,
      reference,
      method: 'CASH',
      status: 'CONFIRMED',
      direction: 'INBOUND',
      amount,
      tenantId: partiallyPaid.tenantId,
      leaseId: partiallyPaid.leaseId,
      paymentDate: now.slice(0, 10),
      externalReference: null,
      feeAmount: 0,
      confirmedAt: now,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalReason: null,
      reversalOfId: null,
      receivedByUserId: null,
      clientRef: null,
      notes: 'Premier encaissement au comptoir.',
      createdAt: now,
      allocations: [
        {
          id: nextId('allocation'),
          invoiceId: partiallyPaid.id,
          invoiceNumber: partiallyPaid.invoiceNumber,
          tenantCreditId: null,
          amount,
          isReversal: false,
        },
      ],
    };
    payments.set(payment.id, payment);
  }

  const paidInvoice = demoInvoices.find((i) => i.status === 'PAID');
  if (paidInvoice) {
    const existingAllocation: MockAllocation | undefined = paidInvoice.allocations[0];
    if (existingAllocation) {
      const payment: MockPayment = {
        id: existingAllocation.paymentId,
        organizationId: DEMO_ORG_ID,
        reference: existingAllocation.paymentReference,
        method: 'CASH',
        status: 'CONFIRMED',
        direction: 'INBOUND',
        amount: existingAllocation.amount,
        tenantId: paidInvoice.tenantId,
        leaseId: paidInvoice.leaseId,
        paymentDate: existingAllocation.allocationDate,
        externalReference: null,
        feeAmount: 0,
        confirmedAt: now,
        rejectedAt: null,
        rejectionReason: null,
        reversedAt: null,
        reversalReason: null,
        reversalOfId: null,
        receivedByUserId: null,
        clientRef: null,
        notes: 'Loyer soldé au comptoir — quittance émise.',
        createdAt: now,
        allocations: [
          {
            id: nextId('allocation'),
            invoiceId: paidInvoice.id,
            invoiceNumber: paidInvoice.invoiceNumber,
            tenantCreditId: null,
            amount: existingAllocation.amount,
            isReversal: false,
          },
        ],
      };
      payments.set(payment.id, payment);
    }
  }

  if (openForSecondTenant) {
    const pendingId = nextId('payment');
    const payment: MockPayment = {
      id: pendingId,
      organizationId: DEMO_ORG_ID,
      reference: nextPaymentReference(yearMonth),
      method: 'MOBILE_MONEY',
      status: 'PENDING_VERIFICATION',
      direction: 'INBOUND',
      amount: computeInvoiceTotals(openForSecondTenant).balanceAmount || 50000,
      tenantId: openForSecondTenant.tenantId,
      leaseId: openForSecondTenant.leaseId,
      paymentDate: now.slice(0, 10),
      externalReference: 'MOMO-778812345',
      feeAmount: 0,
      confirmedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalReason: null,
      reversalOfId: null,
      receivedByUserId: null,
      clientRef: null,
      notes: 'Paiement Mobile Money déclaré par le locataire, à vérifier.',
      createdAt: now,
      allocations: [],
    };
    payments.set(payment.id, payment);
  }
}
