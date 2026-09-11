import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 3 (quittances), routes conformes à docs/api/phase3-contract.md.
 * Même principe que billing-handlers.ts : Maps/helpers importés depuis handlers.ts,
 * API_BASE depuis son propre module.
 */
import { API_BASE } from './api-base';
import {
  landlords,
  landlordSummaryFor,
  matchesQuery,
  nextId,
  notFound,
  organizations,
  orgIdFromRequest,
  paginate,
  properties,
  serializeTenant,
  tenants,
  unauthorizedOrg,
} from './handlers';
import { messageLogs, type MockMessageLog } from './messages-seed';
import { computeInvoiceTotals, type MockInvoice } from './billing-seed';
import {
  nextReceiptNumber,
  receipts,
  receiptsByToken,
  seedReceiptsDemoData,
  type MockReceipt,
} from './receipts-seed';

export { seedReceiptsDemoData };

/**
 * Crée la quittance (+ un message_log WhatsApp "envoyé") dès qu'une facture
 * passe PAID suite à une allocation de paiement — appelé depuis
 * payments-handlers.ts, jamais depuis le seed de démonstration (qui construit
 * sa propre quittance figée). Idempotent : ne recrée rien si déjà fait.
 */
export function createReceiptForPaidInvoice(invoice: MockInvoice): MockReceipt | null {
  if (invoice.receiptId) return receipts.get(invoice.receiptId) ?? null;
  const totals = computeInvoiceTotals(invoice);
  const now = new Date().toISOString();
  const yearMonth = invoice.periodStart.slice(0, 7);
  const token = nextId('vtoken');
  const property = properties.get(invoice.propertyId);
  const landlord = property ? landlords.get(property.landlordId) : undefined;
  const org = organizations.get(invoice.organizationId);
  const lastAllocation = invoice.allocations[invoice.allocations.length - 1];

  const receipt: MockReceipt = {
    id: nextId('receipt'),
    organizationId: invoice.organizationId,
    receiptNumber: nextReceiptNumber(yearMonth),
    status: 'SENT',
    issueDate: now.slice(0, 10),
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    totalAmount: totals.totalAmount,
    rentAmount: totals.rentAmount,
    chargesAmount: totals.chargesAmount,
    penaltyAmount: totals.penaltyAmount,
    remainingBalanceAmount: 0,
    tenantId: invoice.tenantId,
    paymentId: lastAllocation?.paymentId ?? '',
    invoiceId: invoice.id,
    sentAt: now,
    sentChannel: 'WHATSAPP',
    verificationToken: token,
    landlordDisplayName: landlord ? landlordSummaryFor(landlord).displayName : 'Bailleur inconnu',
    organizationName: org?.tradeName ?? org?.legalName ?? 'Organisation',
    documentId: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
  };
  receipts.set(receipt.id, receipt);
  receiptsByToken.set(token, receipt.id);
  invoice.receiptId = receipt.id;

  const messageId = nextId('msglog');
  const log: MockMessageLog = {
    id: messageId,
    organizationId: invoice.organizationId,
    notificationId: nextId('notification'),
    channel: 'WHATSAPP',
    status: 'SENT',
    provider: 'meta_whatsapp',
    providerMessageId: `wamid.${messageId}`,
    toAddress: tenants.get(invoice.tenantId)?.primaryPhone ?? '+242060000000',
    templateCode: 'RECEIPT_ISSUED',
    contentPreview: `Quittance ${receipt.receiptNumber} — merci pour votre règlement.`,
    costAmount: 15,
    queuedAt: now,
    sentAt: now,
    deliveredAt: null,
    readAt: null,
    failedAt: null,
    errorCode: null,
    errorMessage: null,
    relatedEntityType: 'Receipt',
    relatedEntityId: receipt.id,
  };
  messageLogs.set(messageId, log);

  return receipt;
}

function tenantSummary(tenantId: string) {
  const tenant = tenants.get(tenantId);
  return tenant
    ? { id: tenant.id, displayName: serializeTenant(tenant).displayName }
    : { id: tenantId, displayName: 'Locataire inconnu' };
}

function serializeReceiptSummary(receipt: MockReceipt) {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    status: receipt.status,
    issueDate: receipt.issueDate,
    periodStart: receipt.periodStart,
    periodEnd: receipt.periodEnd,
    totalAmount: receipt.totalAmount,
    tenant: tenantSummary(receipt.tenantId),
    paymentId: receipt.paymentId,
    invoiceId: receipt.invoiceId,
    sentAt: receipt.sentAt,
    sentChannel: receipt.sentChannel,
  };
}

function serializeReceiptDetail(receipt: MockReceipt) {
  const logs = [...messageLogs.values()]
    .filter((m) => m.relatedEntityType === 'Receipt' && m.relatedEntityId === receipt.id)
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  return {
    ...serializeReceiptSummary(receipt),
    rentAmount: receipt.rentAmount,
    chargesAmount: receipt.chargesAmount,
    penaltyAmount: receipt.penaltyAmount,
    remainingBalanceAmount: receipt.remainingBalanceAmount,
    verificationUrl: `/verifier/${receipt.verificationToken}`,
    documentId: receipt.documentId,
    cancelledAt: receipt.cancelledAt,
    cancellationReason: receipt.cancellationReason,
    messageLogs: logs,
  };
}

export const receiptsHandlers = [
  http.get(`${API_BASE}/receipts`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    const status = url.searchParams.get('status');
    const period = url.searchParams.get('period');
    const q = url.searchParams.get('q');
    const items = [...receipts.values()]
      .filter((r) => r.organizationId === organizationId)
      .filter((r) => !tenantId || r.tenantId === tenantId)
      .filter((r) => !status || r.status === status)
      .filter((r) => !period || r.periodStart?.startsWith(period))
      .filter((r) =>
        matchesQuery(
          q,
          r.receiptNumber,
          tenants.get(r.tenantId)?.firstName,
          tenants.get(r.tenantId)?.lastName,
        ),
      )
      .map(serializeReceiptSummary);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/receipts/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const receipt = receipts.get(String(params.id));
    if (!receipt || receipt.organizationId !== organizationId)
      return notFound('RECEIPTS.NOT_FOUND');
    return HttpResponse.json(serializeReceiptDetail(receipt));
  }),

  http.get(`${API_BASE}/receipts/:id/pdf`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const receipt = receipts.get(String(params.id));
    if (!receipt || receipt.organizationId !== organizationId)
      return notFound('RECEIPTS.NOT_FOUND');
    return HttpResponse.json({
      downloadUrl: `https://mock.immodesk.internal/documents/${receipt.id}.pdf`,
      expiresAt: new Date(Date.now() + 604_800_000).toISOString(),
    });
  }),

  http.post(`${API_BASE}/receipts/:id/send`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const receipt = receipts.get(String(params.id));
    if (!receipt || receipt.organizationId !== organizationId)
      return notFound('RECEIPTS.NOT_FOUND');
    receipt.status = 'SENT';
    receipt.sentAt = new Date().toISOString();
    return HttpResponse.json({ notificationId: nextId('notification') }, { status: 202 });
  }),

  // Route publique, sans en-tête d'organisation ni authentification : n'expose que
  // les champs autorisés par le contrat (jamais téléphone ni adresse du locataire).
  http.get(`${API_BASE}/public/receipts/verify/:token`, ({ params }) => {
    const receiptId = receiptsByToken.get(String(params.token));
    const receipt = receiptId ? receipts.get(receiptId) : undefined;
    if (!receipt) {
      return HttpResponse.json(
        { code: 'RECEIPTS.VERIFICATION_NOT_FOUND', message: 'Quittance introuvable pour ce lien.' },
        { status: 404 },
      );
    }
    const period = receipt.periodStart ? receipt.periodStart.slice(0, 7) : null;
    return HttpResponse.json({
      receiptNumber: receipt.receiptNumber,
      issueDate: receipt.issueDate,
      period,
      totalAmount: receipt.totalAmount,
      tenantName: tenantSummary(receipt.tenantId).displayName,
      landlordDisplayName: receipt.landlordDisplayName,
      organizationName: receipt.organizationName,
      status: receipt.status,
    });
  }),
];
