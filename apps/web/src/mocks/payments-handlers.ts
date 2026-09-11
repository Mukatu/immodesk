import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 3 (paiements, crédits locataire, relevé), routes conformes
 * à docs/api/phase3-contract.md. Même principe que billing-handlers.ts : Maps
 * importées depuis leur module de seed, API_BASE depuis son propre module.
 */
import { API_BASE } from './api-base';
import {
  conflict,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  serializeTenant,
  tenants,
  unauthorizedOrg,
} from './handlers';
import { leases } from './leases-seed';
import {
  computeInvoiceTotals,
  invoices,
  recalcInvoiceStatus,
  type MockAllocation,
} from './billing-seed';
import { createReceiptForPaidInvoice } from './receipts-handlers';
import { receipts as receiptsById } from './receipts-seed';
import {
  nextPaymentReference,
  nextReversalReference,
  payments,
  tenantCredits,
  type MockPayment,
  type MockPaymentAllocation,
  type MockTenantCredit,
  type PaymentMethodMock,
} from './payments-seed';

export { seedPaymentsDemoData } from './payments-seed';

const OPEN_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

function tenantRef(tenantId: string) {
  const tenant = tenants.get(tenantId);
  if (!tenant) return { id: tenantId, displayName: 'Locataire inconnu' };
  return { id: tenant.id, displayName: serializeTenant(tenant).displayName };
}

function leaseRef(leaseId: string | null) {
  if (!leaseId) return null;
  const lease = leases.get(leaseId);
  return lease ? { id: lease.id, reference: lease.reference } : null;
}

function allocatedAmountOf(payment: MockPayment): number {
  return payment.allocations.filter((a) => !a.isReversal).reduce((sum, a) => sum + a.amount, 0);
}

function serializePaymentSummary(payment: MockPayment) {
  const allocatedAmount = allocatedAmountOf(payment);
  return {
    id: payment.id,
    reference: payment.reference,
    method: payment.method,
    status: payment.status,
    direction: payment.direction,
    amount: payment.amount,
    allocatedAmount,
    unallocatedAmount: payment.amount - allocatedAmount,
    paymentDate: payment.paymentDate,
    tenant: tenantRef(payment.tenantId),
    lease: leaseRef(payment.leaseId),
    receivedByUserId: payment.receivedByUserId,
    reversalOfId: payment.reversalOfId,
  };
}

function serializePaymentDetail(payment: MockPayment) {
  return {
    ...serializePaymentSummary(payment),
    externalReference: payment.externalReference,
    feeAmount: payment.feeAmount,
    netAmount: payment.amount - payment.feeAmount,
    confirmedAt: payment.confirmedAt,
    rejectedAt: payment.rejectedAt,
    rejectionReason: payment.rejectionReason,
    reversedAt: payment.reversedAt,
    reversalReason: payment.reversalReason,
    allocations: payment.allocations,
    cashReceipt: null,
    receipts: [],
    clientRef: payment.clientRef,
    notes: payment.notes,
    createdAt: payment.createdAt,
  };
}

function serializeTenantCredit(credit: MockTenantCredit) {
  return {
    id: credit.id,
    tenantId: credit.tenantId,
    leaseId: credit.leaseId,
    status: credit.status,
    origin: credit.origin,
    amount: credit.amount,
    usedAmount: credit.usedAmount,
    remainingAmount: credit.amount - credit.usedAmount,
    sourcePaymentId: credit.sourcePaymentId,
    sourceInvoiceId: credit.sourceInvoiceId,
    expiresAt: credit.expiresAt,
    createdAt: credit.createdAt,
  };
}

/**
 * Applique un budget (auto ou explicite) sur les factures ouvertes du locataire,
 * plus ancienne d'abord, puis crédite le reliquat. Mute les factures concernées
 * (Map partagée avec billing-handlers) et retourne les allocations créées.
 */
function applyAllocations(params: {
  organizationId: string;
  tenantId: string;
  budget: number;
  explicit?: { invoiceId: string; amount: number }[];
  autoAllocate?: boolean;
  paymentId: string;
  paymentReference: string;
  method: PaymentMethodMock;
}): MockPaymentAllocation[] {
  const {
    organizationId,
    tenantId,
    budget,
    explicit,
    autoAllocate,
    paymentId,
    paymentReference,
    method,
  } = params;
  const result: MockPaymentAllocation[] = [];
  let remaining = budget;

  function allocateTo(invoiceId: string, wanted: number) {
    const invoice = invoices.get(invoiceId);
    if (!invoice || invoice.organizationId !== organizationId || remaining <= 0) return;
    const totals = computeInvoiceTotals(invoice);
    const toAllocate = Math.min(wanted, totals.balanceAmount, remaining);
    if (toAllocate <= 0) return;
    const mockAlloc: MockAllocation = {
      id: nextId('allocation'),
      invoiceId: invoice.id,
      paymentId,
      paymentReference,
      method,
      amount: toAllocate,
      allocationDate: new Date().toISOString().slice(0, 10),
      isReversal: false,
    };
    invoice.allocations.push(mockAlloc);
    recalcInvoiceStatus(invoice);
    if (invoice.status === 'PAID') createReceiptForPaidInvoice(invoice);
    remaining -= toAllocate;
    result.push({
      id: mockAlloc.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      tenantCreditId: null,
      amount: toAllocate,
      isReversal: false,
    });
  }

  if (explicit && explicit.length > 0) {
    for (const line of explicit) allocateTo(line.invoiceId, line.amount);
  } else if (autoAllocate !== false) {
    const openInvoices = [...invoices.values()]
      .filter(
        (i) =>
          i.organizationId === organizationId &&
          i.tenantId === tenantId &&
          OPEN_STATUSES.includes(i.status),
      )
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
    for (const invoice of openInvoices)
      allocateTo(invoice.id, computeInvoiceTotals(invoice).balanceAmount);
  }

  if (remaining > 0) {
    const creditId = nextId('credit');
    const credit: MockTenantCredit = {
      id: creditId,
      organizationId,
      tenantId,
      leaseId: null,
      status: 'OPEN',
      origin: 'OVERPAYMENT',
      amount: remaining,
      usedAmount: 0,
      sourcePaymentId: paymentId,
      sourceInvoiceId: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    };
    tenantCredits.set(creditId, credit);
    result.push({
      id: nextId('allocation'),
      invoiceId: null,
      invoiceNumber: null,
      tenantCreditId: creditId,
      amount: remaining,
      isReversal: false,
    });
  }

  return result;
}

export const paymentsHandlers = [
  http.get(`${API_BASE}/payments`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const method = url.searchParams.get('method');
    const status = url.searchParams.get('status');
    const tenantId = url.searchParams.get('tenantId');
    const leaseId = url.searchParams.get('leaseId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const items = [...payments.values()]
      .filter((p) => p.organizationId === organizationId)
      .filter((p) => !method || p.method === method)
      .filter((p) => !status || p.status === status)
      .filter((p) => !tenantId || p.tenantId === tenantId)
      .filter((p) => !leaseId || p.leaseId === leaseId)
      .filter((p) => !from || p.paymentDate >= from)
      .filter((p) => !to || p.paymentDate <= to)
      .sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1))
      .map(serializePaymentSummary);

    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/payments/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const payment = payments.get(String(params.id));
    if (!payment || payment.organizationId !== organizationId) {
      return notFound('PAYMENTS.NOT_FOUND');
    }
    return HttpResponse.json(serializePaymentDetail(payment));
  }),

  http.post(`${API_BASE}/payments`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      method: PaymentMethodMock;
      amount: number;
      tenantId: string;
      leaseId?: string;
      paymentDate?: string;
      externalReference?: string;
      feeAmount?: number;
      autoAllocate?: boolean;
      allocations?: { invoiceId: string; amount: number }[];
      confirmed?: boolean;
      clientRef?: string;
      notes?: string;
    };
    const now = new Date().toISOString();
    const paymentDate = body.paymentDate ?? now.slice(0, 10);
    const reference = nextPaymentReference(paymentDate.slice(0, 7));
    const paymentId = nextId('payment');
    const status = body.confirmed || body.method === 'CASH' ? 'CONFIRMED' : 'PENDING_VERIFICATION';

    const allocations =
      status === 'CONFIRMED'
        ? applyAllocations({
            organizationId,
            tenantId: body.tenantId,
            budget: body.amount,
            explicit: body.allocations,
            autoAllocate: body.autoAllocate,
            paymentId,
            paymentReference: reference,
            method: body.method,
          })
        : [];

    const payment: MockPayment = {
      id: paymentId,
      organizationId,
      reference,
      method: body.method,
      status,
      direction: 'INBOUND',
      amount: body.amount,
      tenantId: body.tenantId,
      leaseId: body.leaseId ?? null,
      paymentDate,
      externalReference: body.externalReference ?? null,
      feeAmount: body.feeAmount ?? 0,
      confirmedAt: status === 'CONFIRMED' ? now : null,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalReason: null,
      reversalOfId: null,
      receivedByUserId: null,
      clientRef: body.clientRef ?? null,
      notes: body.notes ?? null,
      createdAt: now,
      allocations,
    };
    payments.set(paymentId, payment);
    return HttpResponse.json(serializePaymentDetail(payment), { status: 201 });
  }),

  http.post(`${API_BASE}/payments/:id/allocations`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const payment = payments.get(String(params.id));
    if (!payment || payment.organizationId !== organizationId) {
      return notFound('PAYMENTS.NOT_FOUND');
    }
    const body = (await request.json()) as { allocations: { invoiceId: string; amount: number }[] };
    const budget = payment.amount - allocatedAmountOf(payment);
    if (body.allocations.reduce((sum, a) => sum + a.amount, 0) > budget) {
      return conflict(
        'PAYMENTS.OVER_ALLOCATED',
        'Le montant affecté dépasse le solde disponible du paiement.',
      );
    }
    const newAllocations = applyAllocations({
      organizationId,
      tenantId: payment.tenantId,
      budget,
      explicit: body.allocations,
      paymentId: payment.id,
      paymentReference: payment.reference,
      method: payment.method,
    });
    payment.allocations.push(...newAllocations);
    return HttpResponse.json(serializePaymentDetail(payment));
  }),

  http.post(`${API_BASE}/payments/:id/confirm`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const payment = payments.get(String(params.id));
    if (!payment || payment.organizationId !== organizationId) {
      return notFound('PAYMENTS.NOT_FOUND');
    }
    const body = (await request.json().catch(() => ({}))) as { valueDate?: string; note?: string };
    payment.status = 'CONFIRMED';
    payment.confirmedAt = new Date().toISOString();
    if (body.note) payment.notes = body.note;
    if (payment.allocations.length === 0) {
      const newAllocations = applyAllocations({
        organizationId,
        tenantId: payment.tenantId,
        budget: payment.amount,
        autoAllocate: true,
        paymentId: payment.id,
        paymentReference: payment.reference,
        method: payment.method,
      });
      payment.allocations.push(...newAllocations);
    }
    return HttpResponse.json(serializePaymentDetail(payment));
  }),

  http.post(`${API_BASE}/payments/:id/reject`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const payment = payments.get(String(params.id));
    if (!payment || payment.organizationId !== organizationId) {
      return notFound('PAYMENTS.NOT_FOUND');
    }
    const body = (await request.json()) as { reason: string };
    payment.status = 'REJECTED';
    payment.rejectedAt = new Date().toISOString();
    payment.rejectionReason = body.reason;
    return HttpResponse.json(serializePaymentDetail(payment));
  }),

  http.post(`${API_BASE}/payments/:id/reverse`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const payment = payments.get(String(params.id));
    if (!payment || payment.organizationId !== organizationId) {
      return notFound('PAYMENTS.NOT_FOUND');
    }
    if (payment.status !== 'CONFIRMED' || payment.reversedAt) {
      return conflict(
        'PAYMENTS.ALREADY_REVERSED',
        'Ce paiement a déjà été contre-passé ou ne peut pas l’être.',
      );
    }
    const relatedCredits = [...tenantCredits.values()].filter(
      (c) => c.sourcePaymentId === payment.id,
    );
    if (relatedCredits.some((c) => c.usedAmount > 0)) {
      return conflict(
        'PAYMENTS.CREDIT_ALREADY_USED',
        'Le crédit issu de ce paiement a déjà été utilisé.',
      );
    }

    const body = (await request.json()) as { reason: string };
    const now = new Date().toISOString();
    const reversalId = nextId('payment');
    const reversalReference = nextReversalReference(now.slice(0, 7));

    const mirrorAllocations: MockPaymentAllocation[] = [];
    for (const allocation of payment.allocations) {
      if (allocation.isReversal) continue;
      if (allocation.invoiceId) {
        const invoice = invoices.get(allocation.invoiceId);
        if (invoice) {
          invoice.allocations.push({
            id: nextId('allocation'),
            invoiceId: invoice.id,
            paymentId: reversalId,
            paymentReference: reversalReference,
            method: payment.method,
            amount: allocation.amount,
            allocationDate: now.slice(0, 10),
            isReversal: true,
          });
          recalcInvoiceStatus(invoice);
          // Contre-passation : la quittance émise pour ce règlement n'est plus
          // valide dès que la facture repasse ouverte (workflow, jamais un DELETE).
          if (invoice.status !== 'PAID' && invoice.receiptId) {
            const relatedReceipt = receiptsById.get(invoice.receiptId);
            if (relatedReceipt && relatedReceipt.status !== 'CANCELLED') {
              relatedReceipt.status = 'CANCELLED';
              relatedReceipt.cancelledAt = now;
              relatedReceipt.cancellationReason = 'Contre-passation du paiement associé.';
            }
          }
        }
      }
      if (allocation.tenantCreditId) {
        const credit = tenantCredits.get(allocation.tenantCreditId);
        if (credit) credit.status = 'REFUNDED';
      }
      mirrorAllocations.push({ ...allocation, id: nextId('allocation'), isReversal: true });
    }

    payment.reversedAt = now;
    payment.reversalReason = body.reason;

    const reversal: MockPayment = {
      id: reversalId,
      organizationId,
      reference: reversalReference,
      method: payment.method,
      status: 'REVERSED',
      direction: payment.direction === 'INBOUND' ? 'OUTBOUND' : 'INBOUND',
      amount: payment.amount,
      tenantId: payment.tenantId,
      leaseId: payment.leaseId,
      paymentDate: now.slice(0, 10),
      externalReference: null,
      feeAmount: 0,
      confirmedAt: now,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalReason: null,
      reversalOfId: payment.id,
      receivedByUserId: null,
      clientRef: null,
      notes: `Contre-passation de ${payment.reference} : ${body.reason}`,
      createdAt: now,
      allocations: mirrorAllocations,
    };
    payments.set(reversalId, reversal);

    return HttpResponse.json({
      original: serializePaymentDetail(payment),
      reversal: serializePaymentDetail(reversal),
    });
  }),

  http.get(`${API_BASE}/tenants/:tenantId/credits`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tenantId = String(params.tenantId);
    const items = [...tenantCredits.values()]
      .filter((c) => c.organizationId === organizationId && c.tenantId === tenantId)
      .map(serializeTenantCredit);
    const remainingAmount = items.reduce((sum, c) => sum + c.remainingAmount, 0);
    return HttpResponse.json({ remainingAmount, items });
  }),

  http.post(
    `${API_BASE}/tenants/:tenantId/credits/:creditId/apply`,
    async ({ params, request }) => {
      const organizationId = orgIdFromRequest(request);
      if (!organizationId) return unauthorizedOrg();
      const credit = tenantCredits.get(String(params.creditId));
      if (
        !credit ||
        credit.organizationId !== organizationId ||
        credit.tenantId !== String(params.tenantId)
      ) {
        return notFound('PAYMENTS.CREDIT_NOT_FOUND');
      }
      const body = (await request.json()) as { invoiceId: string; amount?: number };
      const invoice = invoices.get(body.invoiceId);
      if (!invoice) return notFound('BILLING.INVOICE_NOT_FOUND');
      const totals = computeInvoiceTotals(invoice);
      const remainingCredit = credit.amount - credit.usedAmount;
      const toApply = Math.min(
        body.amount ?? remainingCredit,
        remainingCredit,
        totals.balanceAmount,
      );
      if (toApply <= 0) {
        return conflict(
          'PAYMENTS.INVOICE_NOT_OPEN',
          'Cette facture ne peut pas recevoir ce crédit.',
        );
      }
      invoice.allocations.push({
        id: nextId('allocation'),
        invoiceId: invoice.id,
        paymentId: credit.sourcePaymentId ?? nextId('payment'),
        paymentReference: credit.id,
        method: 'CASH',
        amount: toApply,
        allocationDate: new Date().toISOString().slice(0, 10),
        isReversal: false,
        tenantCreditId: credit.id,
      });
      recalcInvoiceStatus(invoice);
      if (invoice.status === 'PAID') createReceiptForPaidInvoice(invoice);
      credit.usedAmount += toApply;
      credit.status = credit.usedAmount >= credit.amount ? 'USED' : 'PARTIALLY_USED';

      return HttpResponse.json({
        credit: serializeTenantCredit(credit),
        invoice: { ...invoice, ...computeInvoiceTotals(invoice) },
      });
    },
  ),

  http.get(`${API_BASE}/tenants/:tenantId/statement`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tenantId = String(params.tenantId);
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    type StatementLine = {
      date: string;
      type: 'INVOICE' | 'PAYMENT' | 'REVERSAL' | 'CREDIT';
      reference: string;
      debit: number;
      credit: number;
    };
    const rawLines: StatementLine[] = [];

    for (const invoice of invoices.values()) {
      if (invoice.organizationId !== organizationId || invoice.tenantId !== tenantId) continue;
      if (invoice.status === 'CANCELLED') continue;
      const totals = computeInvoiceTotals(invoice);
      rawLines.push({
        date: invoice.issueDate,
        type: 'INVOICE',
        reference: invoice.invoiceNumber ?? 'Brouillon',
        debit: totals.totalAmount,
        credit: 0,
      });
    }
    for (const payment of payments.values()) {
      if (payment.organizationId !== organizationId || payment.tenantId !== tenantId) continue;
      if (payment.status === 'REVERSED') {
        rawLines.push({
          date: payment.paymentDate,
          type: 'REVERSAL',
          reference: payment.reference,
          debit: payment.amount,
          credit: 0,
        });
      } else if (payment.status === 'CONFIRMED' && allocatedAmountOf(payment) > 0) {
        rawLines.push({
          date: payment.paymentDate,
          type: 'PAYMENT',
          reference: payment.reference,
          debit: 0,
          credit: allocatedAmountOf(payment),
        });
      }
    }
    for (const credit of tenantCredits.values()) {
      if (credit.organizationId !== organizationId || credit.tenantId !== tenantId) continue;
      rawLines.push({
        date: credit.createdAt.slice(0, 10),
        type: 'CREDIT',
        reference: credit.id,
        debit: 0,
        credit: credit.amount,
      });
    }

    const filtered = rawLines
      .filter((l) => !from || l.date >= from)
      .filter((l) => !to || l.date <= to)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let balance = 0;
    const lines = filtered.map((l) => {
      balance += l.debit - l.credit;
      return { ...l, balance };
    });

    return HttpResponse.json({ openingBalance: 0, lines, closingBalance: balance });
  }),
];
