import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 3 (caisse : reçus, collecteurs, remises), routes conformes
 * à docs/api/phase3-contract.md. Même principe que billing-handlers.ts /
 * payments-handlers.ts : Maps importées depuis leur module de seed.
 */
import { API_BASE } from './api-base';
import {
  computeInvoiceTotals,
  invoices,
  recalcInvoiceStatus,
  type MockAllocation,
} from './billing-seed';
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
import {
  nextPaymentReference,
  payments,
  tenantCredits,
  type MockPayment,
  type MockTenantCredit,
} from './payments-seed';
import {
  cashReceipts,
  expectedAmountOf,
  nextCashReceiptNumber,
  nextRemittanceReference,
  remittances,
  type MockCashReceipt,
  type MockCashReceiptAllocation,
  type MockRemittance,
} from './cash-seed';

export { seedCashDemoData } from './cash-seed';

const OPEN_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];
/** Valeur par défaut du plafond de caisse démarcheur (voir CashSettings.collectorHoldingCapAmount). */
const DEFAULT_CAP_AMOUNT = 500000;

function tenantName(tenantId: string): string {
  const tenant = tenants.get(tenantId);
  return tenant ? serializeTenant(tenant).displayName : 'Locataire inconnu';
}

function serializeCashReceiptSummary(r: MockCashReceipt) {
  return {
    id: r.id,
    receiptNumber: r.receiptNumber,
    status: r.status,
    amount: r.amount,
    receivedAt: r.receivedAt,
    tenant: { id: r.tenantId, displayName: tenantName(r.tenantId) },
    collectorUserId: r.collectorUserId,
    collectorName: r.collectorName,
    remittanceId: r.remittanceId,
    paymentId: r.paymentId,
  };
}

function serializeCashReceiptDetail(r: MockCashReceipt) {
  return {
    ...serializeCashReceiptSummary(r),
    payerName: r.payerName,
    payerPhone: r.payerPhone,
    purpose: r.purpose,
    leaseId: r.leaseId,
    signatureDocumentId: r.signatureDocumentId,
    signatureHash: r.signatureHash,
    documentId: r.documentId,
    allocations: r.allocations,
    cancelledAt: r.cancelledAt,
    cancellationReason: r.cancellationReason,
    clientRef: r.clientRef,
  };
}

function collectorBalance(userId: string, collectorName: string, organizationId: string) {
  const held = [...cashReceipts.values()].filter(
    (r) =>
      r.organizationId === organizationId && r.collectorUserId === userId && r.status === 'ISSUED',
  );
  const heldAmount = held.reduce((sum, r) => sum + r.amount, 0);
  const oldestReceiptAt = held.reduce<string | null>(
    (oldest, r) => (!oldest || r.receivedAt < oldest ? r.receivedAt : oldest),
    null,
  );
  const lastRemittance = [...remittances.values()]
    .filter((rem) => rem.organizationId === organizationId && rem.collectorUserId === userId)
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))[0];
  return {
    userId,
    fullName: collectorName,
    heldAmount,
    receiptsCount: held.length,
    oldestReceiptAt,
    capAmount: DEFAULT_CAP_AMOUNT,
    overCap: heldAmount > DEFAULT_CAP_AMOUNT,
    lastRemittanceAt: lastRemittance?.openedAt ?? null,
  };
}

function serializeRemittanceSummary(r: MockRemittance) {
  const expectedAmount = expectedAmountOf(r);
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    collectorUserId: r.collectorUserId,
    collectorName: r.collectorName,
    declaredAmount: r.declaredAmount,
    expectedAmount,
    countedAmount: r.countedAmount,
    varianceAmount: r.countedAmount > 0 ? r.countedAmount - expectedAmount : 0,
    receiptsCount: r.items.length,
    openedAt: r.openedAt,
    submittedAt: r.submittedAt,
    verifiedAt: r.verifiedAt,
  };
}

function serializeRemittanceDetail(r: MockRemittance) {
  return {
    ...serializeRemittanceSummary(r),
    items: r.items,
    denominations: r.denominations,
    verifiedByUserId: r.verifiedByUserId,
    rejectionReason: r.rejectionReason,
    depositedAt: r.depositedAt,
    depositBankAccountId: r.depositBankAccountId,
    notes: r.notes,
  };
}

/**
 * Affecte le montant d'un reçu de caisse sur les factures ouvertes du locataire
 * (plus ancienne d'abord), crédite le reliquat, et pousse le paiement CASH
 * confirmé correspondant. Même règle que payments-handlers.ts::applyAllocations.
 */
function settleCashReceipt(params: {
  organizationId: string;
  tenantId: string;
  amount: number;
  explicit?: { invoiceId: string; amount: number }[];
  autoAllocate?: boolean;
  paymentId: string;
  paymentReference: string;
}): MockCashReceiptAllocation[] {
  const { organizationId, tenantId, amount, explicit, autoAllocate, paymentId, paymentReference } =
    params;
  const result: MockCashReceiptAllocation[] = [];
  let remaining = amount;

  function allocateTo(invoiceId: string, wanted: number) {
    const invoice = invoices.get(invoiceId);
    if (!invoice || invoice.organizationId !== organizationId || remaining <= 0) return;
    const totals = computeInvoiceTotals(invoice);
    const toAllocate = Math.min(wanted, totals.balanceAmount, remaining);
    if (toAllocate <= 0) return;
    const alloc: MockAllocation = {
      id: nextId('allocation'),
      invoiceId: invoice.id,
      paymentId,
      paymentReference,
      method: 'CASH',
      amount: toAllocate,
      allocationDate: new Date().toISOString().slice(0, 10),
      isReversal: false,
    };
    invoice.allocations.push(alloc);
    recalcInvoiceStatus(invoice);
    remaining -= toAllocate;
    result.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: toAllocate,
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
  }

  return result;
}

export const cashHandlers = [
  http.get(`${API_BASE}/cash-receipts`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const collectorUserId = url.searchParams.get('collectorUserId');
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const items = [...cashReceipts.values()]
      .filter((r) => r.organizationId === organizationId)
      .filter((r) => !collectorUserId || r.collectorUserId === collectorUserId)
      .filter((r) => !status || r.status === status)
      .filter((r) => !from || r.receivedAt >= from)
      .filter((r) => !to || r.receivedAt <= to)
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
      .map(serializeCashReceiptSummary);

    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/cash-receipts/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const receipt = cashReceipts.get(String(params.id));
    if (!receipt || receipt.organizationId !== organizationId)
      return notFound('CASH.RECEIPT_NOT_FOUND');
    return HttpResponse.json(serializeCashReceiptDetail(receipt));
  }),

  http.post(`${API_BASE}/cash-receipts`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      tenantId: string;
      leaseId?: string;
      amount: number;
      payerName?: string;
      payerPhone?: string;
      purpose?: string;
      receivedAt?: string;
      autoAllocate?: boolean;
      allocations?: { invoiceId: string; amount: number }[];
      signatureDataUrl?: string;
      paperReceiptDocumentId?: string;
      clientRef: string;
    };

    const existing = [...cashReceipts.values()].find(
      (r) => r.organizationId === organizationId && r.clientRef && r.clientRef === body.clientRef,
    );
    if (existing) return HttpResponse.json(serializeCashReceiptDetail(existing), { status: 200 });

    const now = new Date().toISOString();
    const receivedAt = body.receivedAt ?? now;
    const yearMonth = receivedAt.slice(0, 7);
    const paymentId = nextId('payment');
    const paymentReference = nextPaymentReference(yearMonth);
    const receiptId = nextId('cash-receipt');
    const receiptNumber = nextCashReceiptNumber('IMD', 'JPM');

    const cashAllocations = settleCashReceipt({
      organizationId,
      tenantId: body.tenantId,
      amount: body.amount,
      explicit: body.allocations,
      autoAllocate: body.autoAllocate,
      paymentId,
      paymentReference,
    });

    const payment: MockPayment = {
      id: paymentId,
      organizationId,
      reference: paymentReference,
      method: 'CASH',
      status: 'CONFIRMED',
      direction: 'INBOUND',
      amount: body.amount,
      tenantId: body.tenantId,
      leaseId: body.leaseId ?? null,
      paymentDate: receivedAt.slice(0, 10),
      externalReference: null,
      feeAmount: 0,
      confirmedAt: now,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalReason: null,
      reversalOfId: null,
      receivedByUserId: null,
      clientRef: body.clientRef,
      notes: 'Encaissement espèces au comptoir.',
      createdAt: now,
      allocations: cashAllocations.map((a) => ({
        id: nextId('allocation'),
        invoiceId: a.invoiceId,
        invoiceNumber: a.invoiceNumber,
        tenantCreditId: null,
        amount: a.amount,
        isReversal: false,
      })),
    };
    payments.set(paymentId, payment);

    const receipt: MockCashReceipt = {
      id: receiptId,
      organizationId,
      receiptNumber,
      status: 'ISSUED',
      amount: body.amount,
      receivedAt,
      tenantId: body.tenantId,
      payerName: body.payerName ?? tenantName(body.tenantId),
      payerPhone: body.payerPhone ?? null,
      purpose: body.purpose ?? null,
      leaseId: body.leaseId ?? null,
      collectorUserId: 'user-collector-demo',
      collectorName: 'Jean-Pierre Milandou',
      remittanceId: null,
      paymentId,
      signatureDocumentId: body.signatureDataUrl
        ? nextId('document')
        : (body.paperReceiptDocumentId ?? null),
      signatureHash: body.signatureDataUrl ? 'sha256-demo' : null,
      documentId: null,
      allocations: cashAllocations,
      cancelledAt: null,
      cancellationReason: null,
      clientRef: body.clientRef,
      createdAt: now,
    };
    cashReceipts.set(receiptId, receipt);

    return HttpResponse.json(serializeCashReceiptDetail(receipt), { status: 201 });
  }),

  http.get(`${API_BASE}/cash-receipts/:id/pdf`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const receipt = cashReceipts.get(String(params.id));
    if (!receipt || receipt.organizationId !== organizationId)
      return notFound('CASH.RECEIPT_NOT_FOUND');
    return HttpResponse.json({
      downloadUrl: `https://mock.immodesk.internal/documents/${receipt.id}.pdf`,
      expiresAt: new Date(Date.now() + 604_800_000).toISOString(),
    });
  }),

  http.post(`${API_BASE}/cash-receipts/:id/send`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const receipt = cashReceipts.get(String(params.id));
    if (!receipt || receipt.organizationId !== organizationId)
      return notFound('CASH.RECEIPT_NOT_FOUND');
    return HttpResponse.json({ notificationId: nextId('notification') }, { status: 202 });
  }),

  http.get(`${API_BASE}/cash/collectors`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const collectorIds = new Set(
      [...cashReceipts.values()]
        .filter((r) => r.organizationId === organizationId)
        .map((r) => r.collectorUserId),
    );
    const items = [...collectorIds].map((userId) => {
      const receipt = [...cashReceipts.values()].find((r) => r.collectorUserId === userId);
      return collectorBalance(userId, receipt?.collectorName ?? userId, organizationId);
    });
    return HttpResponse.json({ items });
  }),

  http.get(`${API_BASE}/cash/collectors/:userId/balance`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const userId = String(params.userId);
    const receipt = [...cashReceipts.values()].find((r) => r.collectorUserId === userId);
    return HttpResponse.json(
      collectorBalance(userId, receipt?.collectorName ?? userId, organizationId),
    );
  }),

  http.get(`${API_BASE}/cash-remittances`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const collectorUserId = url.searchParams.get('collectorUserId');

    const items = [...remittances.values()]
      .filter((r) => r.organizationId === organizationId)
      .filter((r) => !status || r.status === status)
      .filter((r) => !collectorUserId || r.collectorUserId === collectorUserId)
      .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))
      .map(serializeRemittanceSummary);

    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/cash-remittances/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const remittance = remittances.get(String(params.id));
    if (!remittance || remittance.organizationId !== organizationId)
      return notFound('CASH.REMITTANCE_NOT_FOUND');
    return HttpResponse.json(serializeRemittanceDetail(remittance));
  }),

  http.post(`${API_BASE}/cash-remittances`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      cashReceiptIds: string[];
      declaredAmount: number;
      denominations?: Record<string, number>;
      submit?: boolean;
      notes?: string;
      clientRef?: string;
    };

    const collectorReceipts = body.cashReceiptIds
      .map((id) => cashReceipts.get(id))
      .filter((r): r is MockCashReceipt => Boolean(r) && r!.organizationId === organizationId);
    if (collectorReceipts.length === 0) return notFound('CASH.RECEIPT_NOT_FOUND');
    const collectorUserId = collectorReceipts[0]!.collectorUserId;

    if (collectorReceipts.some((r) => r.status === 'REMITTED' || r.remittanceId)) {
      return conflict('CASH.RECEIPT_ALREADY_REMITTED', 'Un ou plusieurs reçus ont déjà été remis.');
    }
    const hasOpenRemittance = [...remittances.values()].some(
      (r) =>
        r.organizationId === organizationId &&
        r.collectorUserId === collectorUserId &&
        (r.status === 'OPEN' || r.status === 'SUBMITTED'),
    );
    if (hasOpenRemittance) {
      return conflict(
        'CASH.REMITTANCE_ALREADY_OPEN',
        'Ce démarcheur a déjà une remise ouverte ou soumise.',
      );
    }

    const now = new Date().toISOString();
    const submit = body.submit !== false;
    const remittanceId = nextId('remittance');
    const remittance: MockRemittance = {
      id: remittanceId,
      organizationId,
      reference: nextRemittanceReference(now.slice(0, 7)),
      status: submit ? 'SUBMITTED' : 'OPEN',
      collectorUserId,
      collectorName: collectorReceipts[0]!.collectorName,
      declaredAmount: body.declaredAmount,
      countedAmount: 0,
      items: collectorReceipts.map((r) => ({
        id: nextId('remittance-item'),
        cashReceiptId: r.id,
        receiptNumber: r.receiptNumber,
        amount: r.amount,
        isVerified: false,
        varianceAmount: 0,
        varianceReason: null,
      })),
      denominations: body.denominations ?? {},
      verifiedByUserId: null,
      rejectionReason: null,
      depositedAt: null,
      depositBankAccountId: null,
      notes: body.notes ?? null,
      openedAt: now,
      submittedAt: submit ? now : null,
      verifiedAt: null,
      clientRef: body.clientRef ?? null,
    };
    remittances.set(remittanceId, remittance);
    collectorReceipts.forEach((r) => {
      r.remittanceId = remittanceId;
    });

    return HttpResponse.json(serializeRemittanceDetail(remittance), { status: 201 });
  }),

  http.post(`${API_BASE}/cash-remittances/:id/submit`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const remittance = remittances.get(String(params.id));
    if (!remittance || remittance.organizationId !== organizationId)
      return notFound('CASH.REMITTANCE_NOT_FOUND');
    remittance.status = 'SUBMITTED';
    remittance.submittedAt = new Date().toISOString();
    return HttpResponse.json(serializeRemittanceDetail(remittance));
  }),

  http.post(`${API_BASE}/cash-remittances/:id/verify`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const remittance = remittances.get(String(params.id));
    if (!remittance || remittance.organizationId !== organizationId)
      return notFound('CASH.REMITTANCE_NOT_FOUND');
    const body = (await request.json()) as {
      countedAmount: number;
      items?: {
        cashReceiptId: string;
        isVerified: boolean;
        varianceAmount?: number;
        varianceReason?: string;
      }[];
      notes?: string;
    };

    remittance.countedAmount = body.countedAmount;
    if (body.notes) remittance.notes = body.notes;
    for (const item of remittance.items) {
      const provided = body.items?.find((i) => i.cashReceiptId === item.cashReceiptId);
      item.isVerified = provided?.isVerified ?? true;
      item.varianceAmount = provided?.varianceAmount ?? 0;
      item.varianceReason = provided?.varianceReason ?? null;
      const receipt = cashReceipts.get(item.cashReceiptId);
      if (receipt) receipt.status = 'REMITTED';
    }
    remittance.status = 'VERIFIED';
    remittance.verifiedAt = new Date().toISOString();
    remittance.verifiedByUserId = 'user-manager-demo';

    return HttpResponse.json(serializeRemittanceDetail(remittance));
  }),

  http.post(`${API_BASE}/cash-remittances/:id/reject`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const remittance = remittances.get(String(params.id));
    if (!remittance || remittance.organizationId !== organizationId)
      return notFound('CASH.REMITTANCE_NOT_FOUND');
    const body = (await request.json()) as { reason: string };
    remittance.status = 'REJECTED';
    remittance.rejectionReason = body.reason;
    for (const item of remittance.items) {
      const receipt = cashReceipts.get(item.cashReceiptId);
      if (receipt) {
        receipt.status = 'ISSUED';
        receipt.remittanceId = null;
      }
    }
    return HttpResponse.json(serializeRemittanceDetail(remittance));
  }),

  http.post(`${API_BASE}/cash-remittances/:id/deposit`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const remittance = remittances.get(String(params.id));
    if (!remittance || remittance.organizationId !== organizationId)
      return notFound('CASH.REMITTANCE_NOT_FOUND');
    const body = (await request.json()) as {
      bankAccountId: string;
      depositedAt: string;
      depositSlipDocumentId?: string;
    };
    remittance.status = 'DEPOSITED';
    remittance.depositedAt = body.depositedAt;
    remittance.depositBankAccountId = body.bankAccountId;
    return HttpResponse.json(serializeRemittanceDetail(remittance));
  }),
];
