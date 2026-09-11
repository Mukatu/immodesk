/**
 * Mock MSW — Phase 3 (facturation), état en mémoire et données de démonstration
 * pour la Résidence Mpila, conformes à docs/api/phase3-contract.md. Suit le
 * même principe que leases-seed.ts : Maps exportées, seed appelé une fois par
 * handlers.ts après seedLeasesDemoData (dépend des baux/lots/locataires déjà
 * seedés) pour ne jamais laisser d'organisation e2e fraîche pré-remplie.
 */

export type InvoiceStatusMock =
  'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type InvoiceLineTypeMock =
  | 'RENT'
  | 'WATER_CHARGE'
  | 'ELECTRICITY_CHARGE'
  | 'SERVICE_CHARGE'
  | 'PENALTY'
  | 'DEPOSIT'
  | 'AGENCY_FEE'
  | 'REPAIR_REBILL'
  | 'DISCOUNT'
  | 'OTHER';

export interface MockInvoiceLine {
  id: string;
  invoiceId: string;
  lineType: InvoiceLineTypeMock;
  label: string;
  description?: string;
  quantity?: number;
  unitPriceAmount: number;
  amount: number;
  vatRateBps: number;
  vatAmount: number;
  isCredit: boolean;
  periodStart?: string;
  periodEnd?: string;
  position: number;
}

export interface MockAllocation {
  id: string;
  invoiceId: string | null;
  paymentId: string;
  paymentReference: string;
  method: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'BANK_CHECK';
  amount: number;
  allocationDate: string;
  isReversal: boolean;
  tenantCreditId?: string | null;
}

export interface MockInvoice {
  id: string;
  organizationId: string;
  invoiceNumber: string | null;
  status: InvoiceStatusMock;
  leaseId: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  graceUntilDate: string | null;
  issueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;
  documentId: string | null;
  receiptId: string | null;
  createdAt: string;
  updatedAt: string;
  lines: MockInvoiceLine[];
  allocations: MockAllocation[];
}

export const invoices = new Map<string, MockInvoice>();

let invoiceSeq = 0;
export function nextInvoiceNumber(yearMonth: string): string {
  invoiceSeq += 1;
  return `LOY-${yearMonth.replace('-', '')}-${String(invoiceSeq).padStart(5, '0')}`;
}

export function computeInvoiceTotals(invoice: MockInvoice) {
  let rentAmount = 0;
  let chargesAmount = 0;
  let penaltyAmount = 0;
  let otherAmount = 0;
  let discountAmount = 0;
  for (const line of invoice.lines) {
    const signed = line.isCredit ? -line.amount : line.amount;
    if (line.lineType === 'RENT') rentAmount += signed;
    else if (
      line.lineType === 'SERVICE_CHARGE' ||
      line.lineType === 'WATER_CHARGE' ||
      line.lineType === 'ELECTRICITY_CHARGE'
    )
      chargesAmount += signed;
    else if (line.lineType === 'PENALTY') penaltyAmount += signed;
    else if (line.lineType === 'DISCOUNT') discountAmount += signed;
    else otherAmount += signed;
  }
  const totalAmount = rentAmount + chargesAmount + penaltyAmount + otherAmount + discountAmount;
  // Une allocation de contre-passation (isReversal: true) annule l'effet de
  // l'allocation d'origine sur le montant payé : on nette plutôt que d'ignorer,
  // pour rester cohérent avec l'ajout append-only d'une écriture miroir.
  const paidAmount = invoice.allocations.reduce(
    (sum, a) => sum + (a.isReversal ? -a.amount : a.amount),
    0,
  );
  return {
    rentAmount,
    chargesAmount,
    penaltyAmount,
    otherAmount,
    discountAmount,
    totalAmount,
    paidAmount,
    balanceAmount: totalAmount - paidAmount,
  };
}

/** Recalcule le statut d'une facture à partir de son solde et de sa date de grâce (mutation en place). */
export function recalcInvoiceStatus(invoice: MockInvoice, today = new Date()): void {
  if (invoice.status === 'CANCELLED' || invoice.status === 'DRAFT') return;
  const { paidAmount, totalAmount } = computeInvoiceTotals(invoice);
  if (paidAmount >= totalAmount && totalAmount > 0) {
    invoice.status = 'PAID';
    invoice.paidAt = invoice.paidAt ?? new Date().toISOString();
    return;
  }
  const graceUntil = invoice.graceUntilDate ? new Date(invoice.graceUntilDate) : null;
  if (graceUntil && graceUntil < today) {
    invoice.status = 'OVERDUE';
  } else {
    invoice.status = paidAmount > 0 ? 'PARTIALLY_PAID' : 'ISSUED';
  }
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthStart(offsetMonths: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
}

function monthEnd(offsetMonths: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths + 1, 0));
}

function yearMonthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface SeedBillingLease {
  id: string;
  organizationId: string;
  unitId: string;
  propertyId: string;
  primaryTenantId: string;
  rentAmount: number;
  paymentDueDay: number;
  graceDays: number;
  status: string;
}

export interface SeedBillingDeps {
  leases: SeedBillingLease[];
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
}

function makeLine(
  invoiceId: string,
  nextId: (prefix: string) => string,
  lineType: InvoiceLineTypeMock,
  label: string,
  amount: number,
  position: number,
): MockInvoiceLine {
  return {
    id: nextId('invoiceline'),
    invoiceId,
    lineType,
    label,
    unitPriceAmount: amount,
    amount,
    vatRateBps: 0,
    vatAmount: 0,
    isCredit: false,
    position,
  };
}

/** Seed de 3 factures démonstration (ISSUED, PARTIALLY_PAID, OVERDUE) pour la Résidence Mpila. */
export function seedBillingDemoData(deps: SeedBillingDeps): void {
  const { leases, DEMO_ORG_ID, nextId } = deps;
  const now = new Date().toISOString();

  const mpilaLeases = leases.filter(
    (l) => l.organizationId === DEMO_ORG_ID && l.status === 'ACTIVE',
  );
  const leaseA = mpilaLeases[0];
  if (!leaseA) return;
  const leaseB = mpilaLeases[1] ?? leaseA;

  function buildInvoice(
    lease: SeedBillingLease,
    offsetMonths: number,
    status: InvoiceStatusMock,
    paidRatio: number,
    dueOffsetDays: number,
  ): void {
    const start = monthStart(offsetMonths);
    const end = monthEnd(offsetMonths);
    const yearMonth = yearMonthOf(start);
    // Décalage explicite depuis aujourd'hui (plutôt que le jour d'échéance réel du
    // bail) pour garantir des statuts stables quel que soit le jour d'exécution.
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + dueOffsetDays);
    const grace = new Date(due);
    grace.setUTCDate(grace.getUTCDate() + lease.graceDays);

    const invoiceId = nextId('invoice');
    const lines = [makeLine(invoiceId, nextId, 'RENT', 'Loyer', lease.rentAmount, 0)];
    const allocations: MockAllocation[] =
      paidRatio > 0
        ? [
            {
              id: nextId('allocation'),
              invoiceId,
              paymentId: nextId('payment'),
              paymentReference: `PAY-${yearMonth.replace('-', '')}-${String(invoiceSeq).padStart(5, '0')}`,
              method: 'CASH',
              amount: Math.round(lease.rentAmount * paidRatio),
              allocationDate: toDateOnly(new Date()),
              isReversal: false,
            },
          ]
        : [];

    const invoice: MockInvoice = {
      id: invoiceId,
      organizationId: DEMO_ORG_ID,
      invoiceNumber: status === 'DRAFT' ? null : nextInvoiceNumber(yearMonth),
      status,
      leaseId: lease.id,
      tenantId: lease.primaryTenantId,
      unitId: lease.unitId,
      propertyId: lease.propertyId,
      periodStart: toDateOnly(start),
      periodEnd: toDateOnly(end),
      dueDate: toDateOnly(due),
      graceUntilDate: toDateOnly(grace),
      issueDate: toDateOnly(start),
      issuedAt: status === 'DRAFT' ? null : now,
      paidAt: status === 'PAID' ? now : null,
      cancelledAt: null,
      cancellationReason: null,
      notes: null,
      documentId: null,
      receiptId: null,
      createdAt: now,
      updatedAt: now,
      lines,
      allocations,
    };
    invoices.set(invoice.id, invoice);
    recalcInvoiceStatus(invoice, new Date());
  }

  buildInvoice(leaseA, 0, 'ISSUED', 0, 5);
  buildInvoice(leaseB, 0, 'PARTIALLY_PAID', 0.6, 2);
  buildInvoice(leaseA, -1, 'OVERDUE', 0, -20);
  // Facture soldée (période précédente) : sert de base à la quittance de démonstration.
  buildInvoice(leaseB, -1, 'PAID', 1, -35);
}
