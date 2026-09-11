import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 3 (facturation), routes conformes à docs/api/phase3-contract.md.
 * Suit le principe de leases-handlers.ts : import de valeurs depuis handlers.ts
 * (Maps/helpers lus seulement au moment des requêtes), API_BASE depuis son
 * propre module pour éviter tout cycle de TDZ au build de production.
 */
import { API_BASE } from './api-base';
import {
  conflict,
  matchesQuery,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  properties,
  serializeTenant,
  tenants,
  unauthorizedOrg,
  units,
} from './handlers';
import { leases } from './leases-seed';
import { receipts } from './receipts-seed';
import {
  computeInvoiceTotals,
  invoices,
  nextInvoiceNumber,
  recalcInvoiceStatus,
  seedBillingDemoData,
  type InvoiceLineTypeMock,
  type MockInvoice,
} from './billing-seed';

export { seedBillingDemoData };

const billingRuns = new Map<
  string,
  {
    runId: string;
    status: 'RUNNING' | 'DONE' | 'FAILED';
    startedAt: string;
    finishedAt: string | null;
    created: number;
    skipped: number;
    errors: { leaseId: string; reason: string }[];
  }
>();

function tenantRef(tenantId: string) {
  const tenant = tenants.get(tenantId);
  if (!tenant) return { id: tenantId, displayName: 'Locataire inconnu', primaryPhone: '' };
  const serialized = serializeTenant(tenant);
  return { id: tenant.id, displayName: serialized.displayName, primaryPhone: tenant.primaryPhone };
}

function unitRef(unitId: string) {
  const unit = units.get(unitId);
  return { id: unitId, code: unit?.code ?? '—' };
}

function propertyRef(propertyId: string) {
  const property = properties.get(propertyId);
  return { id: propertyId, name: property?.name ?? '—' };
}

function serializeInvoiceSummary(invoice: MockInvoice) {
  const totals = computeInvoiceTotals(invoice);
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    lease: { id: invoice.leaseId, reference: leases.get(invoice.leaseId)?.reference ?? null },
    tenant: tenantRef(invoice.tenantId),
    unit: unitRef(invoice.unitId),
    property: propertyRef(invoice.propertyId),
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    dueDate: invoice.dueDate,
    graceUntilDate: invoice.graceUntilDate,
    totalAmount: totals.totalAmount,
    paidAmount: totals.paidAmount,
    balanceAmount: totals.balanceAmount,
  };
}

function receiptSummaryOrNull(receiptId: string) {
  const receipt = receipts.get(receiptId);
  if (!receipt) return null;
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    status: receipt.status,
    issueDate: receipt.issueDate,
    periodStart: receipt.periodStart,
    periodEnd: receipt.periodEnd,
    totalAmount: receipt.totalAmount,
    tenant: tenantRef(receipt.tenantId),
    paymentId: receipt.paymentId,
    invoiceId: receipt.invoiceId,
    sentAt: receipt.sentAt,
    sentChannel: receipt.sentChannel,
  };
}

function serializeInvoiceDetail(invoice: MockInvoice) {
  const totals = computeInvoiceTotals(invoice);
  return {
    ...serializeInvoiceSummary(invoice),
    rentAmount: totals.rentAmount,
    chargesAmount: totals.chargesAmount,
    penaltyAmount: totals.penaltyAmount,
    otherAmount: totals.otherAmount,
    discountAmount: totals.discountAmount,
    issueDate: invoice.issueDate,
    issuedAt: invoice.issuedAt,
    paidAt: invoice.paidAt,
    cancelledAt: invoice.cancelledAt,
    cancellationReason: invoice.cancellationReason,
    lines: invoice.lines,
    allocations: invoice.allocations,
    receipt: invoice.receiptId ? receiptSummaryOrNull(invoice.receiptId) : null,
    documentId: invoice.documentId,
    notes: invoice.notes,
  };
}

export const billingHandlers = [
  http.get(`${API_BASE}/invoices`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const period = url.searchParams.get('period');
    const propertyId = url.searchParams.get('propertyId');
    const leaseId = url.searchParams.get('leaseId');
    const tenantId = url.searchParams.get('tenantId');
    const overdueOnly = url.searchParams.get('overdueOnly') === 'true';
    const q = url.searchParams.get('q');

    const items = [...invoices.values()]
      .filter((i) => i.organizationId === organizationId)
      .filter((i) => !status || i.status === status)
      .filter((i) => !period || i.periodStart.slice(0, 7) === period)
      .filter((i) => !propertyId || i.propertyId === propertyId)
      .filter((i) => !leaseId || i.leaseId === leaseId)
      .filter((i) => !tenantId || i.tenantId === tenantId)
      .filter((i) => !overdueOnly || i.status === 'OVERDUE')
      .filter((i) => matchesQuery(q, i.invoiceNumber, tenantRef(i.tenantId).displayName))
      .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
      .map(serializeInvoiceSummary);

    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/invoices/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const invoice = invoices.get(String(params.id));
    if (!invoice || invoice.organizationId !== organizationId) {
      return notFound('BILLING.INVOICE_NOT_FOUND');
    }
    return HttpResponse.json(serializeInvoiceDetail(invoice));
  }),

  http.post(`${API_BASE}/invoices`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      leaseId: string;
      periodStart: string;
      periodEnd: string;
      dueDate?: string;
      notes?: string;
      issue?: boolean;
      lines: { lineType: InvoiceLineTypeMock; label: string; unitPriceAmount: number }[];
    };
    const lease = leases.get(body.leaseId);
    const now = new Date().toISOString();
    const invoiceId = nextId('invoice');
    const yearMonth = body.periodStart.slice(0, 7);
    const invoice: MockInvoice = {
      id: invoiceId,
      organizationId,
      invoiceNumber: body.issue ? nextInvoiceNumber(yearMonth) : null,
      status: body.issue ? 'ISSUED' : 'DRAFT',
      leaseId: body.leaseId,
      tenantId: lease?.primaryTenantId ?? '',
      unitId: lease?.unitId ?? '',
      propertyId: lease?.propertyId ?? '',
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      dueDate: body.dueDate ?? body.periodStart,
      graceUntilDate: body.dueDate ?? body.periodStart,
      issueDate: body.periodStart,
      issuedAt: body.issue ? now : null,
      paidAt: null,
      cancelledAt: null,
      cancellationReason: null,
      notes: body.notes ?? null,
      documentId: null,
      receiptId: null,
      createdAt: now,
      updatedAt: now,
      lines: body.lines.map((line, index) => ({
        id: nextId('invoiceline'),
        invoiceId,
        lineType: line.lineType,
        label: line.label,
        unitPriceAmount: line.unitPriceAmount,
        amount: line.unitPriceAmount,
        vatRateBps: 0,
        vatAmount: 0,
        isCredit: line.lineType === 'DISCOUNT',
        position: index,
      })),
      allocations: [],
    };
    invoices.set(invoice.id, invoice);
    return HttpResponse.json(serializeInvoiceDetail(invoice), { status: 201 });
  }),

  http.post(`${API_BASE}/invoices/:id/lines`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const invoice = invoices.get(String(params.id));
    if (!invoice || invoice.organizationId !== organizationId) {
      return notFound('BILLING.INVOICE_NOT_FOUND');
    }
    if (invoice.status !== 'DRAFT') {
      return conflict(
        'BILLING.INVOICE_NOT_EDITABLE',
        'Seule une facture brouillon peut être modifiée.',
      );
    }
    const body = (await request.json()) as {
      lineType: InvoiceLineTypeMock;
      label: string;
      unitPriceAmount: number;
    };
    invoice.lines.push({
      id: nextId('invoiceline'),
      invoiceId: invoice.id,
      lineType: body.lineType,
      label: body.label,
      unitPriceAmount: body.unitPriceAmount,
      amount: body.unitPriceAmount,
      vatRateBps: 0,
      vatAmount: 0,
      isCredit: body.lineType === 'DISCOUNT',
      position: invoice.lines.length,
    });
    invoice.updatedAt = new Date().toISOString();
    return HttpResponse.json(serializeInvoiceDetail(invoice));
  }),

  http.delete(`${API_BASE}/invoices/:id/lines/:lineId`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const invoice = invoices.get(String(params.id));
    if (!invoice || invoice.organizationId !== organizationId) {
      return notFound('BILLING.INVOICE_NOT_FOUND');
    }
    if (invoice.status !== 'DRAFT') {
      return conflict(
        'BILLING.INVOICE_NOT_EDITABLE',
        'Seule une facture brouillon peut être modifiée.',
      );
    }
    invoice.lines = invoice.lines.filter((line) => line.id !== String(params.lineId));
    invoice.updatedAt = new Date().toISOString();
    return HttpResponse.json(serializeInvoiceDetail(invoice));
  }),

  http.post(`${API_BASE}/invoices/:id/issue`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const invoice = invoices.get(String(params.id));
    if (!invoice || invoice.organizationId !== organizationId) {
      return notFound('BILLING.INVOICE_NOT_FOUND');
    }
    const now = new Date().toISOString();
    invoice.status = 'ISSUED';
    invoice.invoiceNumber =
      invoice.invoiceNumber ?? nextInvoiceNumber(invoice.periodStart.slice(0, 7));
    invoice.issuedAt = now;
    invoice.updatedAt = now;
    recalcInvoiceStatus(invoice);
    return HttpResponse.json(serializeInvoiceDetail(invoice));
  }),

  http.post(`${API_BASE}/invoices/:id/cancel`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const invoice = invoices.get(String(params.id));
    if (!invoice || invoice.organizationId !== organizationId) {
      return notFound('BILLING.INVOICE_NOT_FOUND');
    }
    const totals = computeInvoiceTotals(invoice);
    if (totals.paidAmount > 0) {
      return conflict(
        'BILLING.INVOICE_HAS_PAYMENTS',
        'Cette facture a déjà des paiements affectés.',
      );
    }
    const body = (await request.json()) as { reason: string };
    invoice.status = 'CANCELLED';
    invoice.cancelledAt = new Date().toISOString();
    invoice.cancellationReason = body.reason;
    invoice.updatedAt = new Date().toISOString();
    return HttpResponse.json(serializeInvoiceDetail(invoice));
  }),

  http.get(`${API_BASE}/invoices/:id/pdf`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const invoice = invoices.get(String(params.id));
    if (!invoice || invoice.organizationId !== organizationId) {
      return notFound('BILLING.INVOICE_NOT_FOUND');
    }
    return HttpResponse.json({
      downloadUrl: `https://mock-storage.immodesk.internal/invoices/${invoice.id}.pdf`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }),

  // Campagne de facturation : simule RUNNING puis DONE après un court délai,
  // consultable par polling GET /billing/runs/:runId (voir useBillingRun).
  http.post(`${API_BASE}/billing/runs`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json().catch(() => ({}))) as {
      periodStart?: string;
      dryRun?: boolean;
    };
    const runId = nextId('billingrun');
    const startedAt = new Date().toISOString();
    billingRuns.set(runId, {
      runId,
      status: 'RUNNING',
      startedAt,
      finishedAt: null,
      created: 0,
      skipped: 0,
      errors: [],
    });

    const orgLeases = [...leases.values()].filter(
      (l) => l.organizationId === organizationId && l.status === 'ACTIVE',
    );
    setTimeout(() => {
      const run = billingRuns.get(runId);
      if (!run) return;
      run.status = 'DONE';
      run.finishedAt = new Date().toISOString();
      const alreadyInvoiced = new Set(
        [...invoices.values()]
          .filter((i) => i.organizationId === organizationId)
          .map((i) => `${i.leaseId}:${i.periodStart.slice(0, 7)}`),
      );
      const period = body.periodStart?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
      for (const lease of orgLeases) {
        const key = `${lease.id}:${period}`;
        if (alreadyInvoiced.has(key)) {
          run.skipped += 1;
          continue;
        }
        if (!body.dryRun) {
          const invoiceId = nextId('invoice');
          const now = new Date().toISOString();
          const invoice: MockInvoice = {
            id: invoiceId,
            organizationId,
            invoiceNumber: nextInvoiceNumber(period),
            status: 'ISSUED',
            leaseId: lease.id,
            tenantId: lease.primaryTenantId,
            unitId: lease.unitId,
            propertyId: lease.propertyId,
            periodStart: `${period}-01`,
            periodEnd: `${period}-28`,
            dueDate: `${period}-05`,
            graceUntilDate: `${period}-08`,
            issueDate: `${period}-01`,
            issuedAt: now,
            paidAt: null,
            cancelledAt: null,
            cancellationReason: null,
            notes: null,
            documentId: null,
            receiptId: null,
            createdAt: now,
            updatedAt: now,
            lines: [
              {
                id: nextId('invoiceline'),
                invoiceId,
                lineType: 'RENT',
                label: 'Loyer',
                unitPriceAmount: lease.rentAmount,
                amount: lease.rentAmount,
                vatRateBps: 0,
                vatAmount: 0,
                isCredit: false,
                position: 0,
              },
            ],
            allocations: [],
          };
          invoices.set(invoiceId, invoice);
        }
        run.created += 1;
      }
    }, 1200);

    return HttpResponse.json({ runId }, { status: 202 });
  }),

  http.get(`${API_BASE}/billing/runs/:runId`, ({ params }) => {
    const run = billingRuns.get(String(params.runId));
    if (!run) return notFound('BILLING.RUN_NOT_FOUND');
    return HttpResponse.json(run);
  }),

  http.get(`${API_BASE}/billing/dashboard`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const period = url.searchParams.get('period') ?? new Date().toISOString().slice(0, 7);

    const periodInvoices = [...invoices.values()].filter(
      (i) =>
        i.organizationId === organizationId &&
        i.periodStart.slice(0, 7) === period &&
        i.status !== 'CANCELLED',
    );

    let expectedAmount = 0;
    let collectedAmount = 0;
    let overdueAmount = 0;
    let paidCount = 0;
    const byProperty = new Map<
      string,
      { propertyId: string; name: string; expected: number; collected: number; outstanding: number }
    >();
    const byMethod: Record<string, number> = {
      CASH: 0,
      MOBILE_MONEY: 0,
      BANK_TRANSFER: 0,
      BANK_CHECK: 0,
    };

    for (const invoice of periodInvoices) {
      const totals = computeInvoiceTotals(invoice);
      expectedAmount += totals.totalAmount;
      collectedAmount += totals.paidAmount;
      if (invoice.status === 'OVERDUE') overdueAmount += totals.balanceAmount;
      if (invoice.status === 'PAID') paidCount += 1;

      const propertyName = propertyRef(invoice.propertyId).name;
      const entry = byProperty.get(invoice.propertyId) ?? {
        propertyId: invoice.propertyId,
        name: propertyName,
        expected: 0,
        collected: 0,
        outstanding: 0,
      };
      entry.expected += totals.totalAmount;
      entry.collected += totals.paidAmount;
      entry.outstanding += totals.balanceAmount;
      byProperty.set(invoice.propertyId, entry);

      for (const allocation of invoice.allocations) {
        if (!allocation.isReversal) {
          byMethod[allocation.method] = (byMethod[allocation.method] ?? 0) + allocation.amount;
        }
      }
    }

    return HttpResponse.json({
      period,
      expectedAmount,
      collectedAmount,
      outstandingAmount: expectedAmount - collectedAmount,
      overdueAmount,
      invoicesCount: periodInvoices.length,
      paidCount,
      byProperty: [...byProperty.values()],
      byMethod,
    });
  }),
];
