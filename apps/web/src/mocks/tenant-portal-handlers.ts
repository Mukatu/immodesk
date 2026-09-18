import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 10, portail locataire, conforme à
 * docs/api/phase10-contract.md section « Portail locataire ». Réutilise les
 * Maps déjà seedées par les phases 3-4 (`invoices`, `receipts`,
 * `transferDeclarations`, `momoTransactions`) : le contrat ne décrit aucune
 * table propre à ce portail.
 *
 * RÈGLES CENTRALES :
 * - Arbitrage n°4 : aucun rôle stocké. Le jeton (`tenantPortalTokens`,
 *   accessToken -> tenantId) est propre à ce fichier, jamais partagé avec
 *   `accessTokens` (agence, handlers.ts) ni le portail bailleur.
 * - Périmètre : baux ACTIFS du tenantId résolu depuis `Authorization: Bearer`
 *   (jamais X-Organization-Id). Toute lecture hors périmètre répond 404,
 *   jamais 403 (règle de cloisonnement du projet).
 * - OTP : motif LOGIN implicite, même code de démonstration que le reste du
 *   mock (`DEV_OTP_CODE`, voir handlers.ts).
 */
import { API_BASE } from './api-base';
import {
  DEV_OTP_CODE,
  documents,
  type MockDocument,
  nextId,
  normalizePhone,
  notFound,
  paginate,
  properties,
  serializeDocument,
  serializeTenant,
  tenants,
  units,
} from './handlers';
import { leases } from './leases-seed';
import { computeInvoiceTotals, invoices, type MockInvoice } from './billing-seed';
import { receipts } from './receipts-seed';
import { buildPaymentInstructions } from './payment-methods-handlers';
import { applyAllocations } from './payments-handlers';
import { nextPaymentReference, payments, type MockPayment } from './payments-seed';
import {
  momoTransactions,
  nextMomoAggregatorReference,
  transferDeclarations,
  type MockMomoTransaction,
  type MockTransferDeclaration,
  type MomoProviderMock,
} from './payments-phase4-seed';
import { seedTenantPortalDemoData, tenantPortalTokens } from './tenant-portal-seed';

export { seedTenantPortalDemoData };

function badRequest(code: string, message: string) {
  return HttpResponse.json({ code, message }, { status: 400 });
}

function unauthorizedTenant() {
  return HttpResponse.json(
    { code: 'IAM.UNAUTHORIZED', message: 'Session locataire invalide ou expirée.' },
    { status: 401 },
  );
}

/** Même liste que payment-methods-handlers.ts (non exportée là-bas). */
const OPEN_INVOICE_STATUSES_TENANT = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

/** Résout le tenantId depuis le jeton du portail — jamais depuis un en-tête d'organisation. */
function tenantIdFromRequest(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return tenantPortalTokens.get(auth.slice('Bearer '.length)) ?? null;
}

/** Périmètre de la session : baux ACTIFS rattachés à ce tenantId (arbitrage n°4). */
function activeLeaseIdsFor(tenantId: string): Set<string> {
  return new Set(
    [...leases.values()]
      .filter((l) => l.primaryTenantId === tenantId && l.status === 'ACTIVE' && !l.deletedAt)
      .map((l) => l.id),
  );
}

/** Même principe que `receiptSummaryOrNull` de billing-handlers.ts, réduit aux champs utiles au portail. */
function tenantReceiptRefOrNull(receiptId: string | null) {
  if (!receiptId) return null;
  const receipt = receipts.get(receiptId);
  if (!receipt) return null;
  return { id: receipt.id, receiptNumber: receipt.receiptNumber };
}

function serializeTenantInvoice(invoice: MockInvoice) {
  const totals = computeInvoiceTotals(invoice);
  const lease = leases.get(invoice.leaseId);
  const unit = units.get(invoice.unitId);
  const property = properties.get(invoice.propertyId);
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    lease: { id: invoice.leaseId, reference: lease?.reference ?? null },
    unit: { id: invoice.unitId, code: unit?.code ?? '—' },
    property: { id: invoice.propertyId, name: property?.name ?? '—' },
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    dueDate: invoice.dueDate,
    totalAmount: totals.totalAmount,
    paidAmount: totals.paidAmount,
    balanceAmount: totals.balanceAmount,
    rentAmount: totals.rentAmount,
    chargesAmount: totals.chargesAmount,
    penaltyAmount: totals.penaltyAmount,
    issuedAt: invoice.issuedAt,
    paidAt: invoice.paidAt,
    receipt: tenantReceiptRefOrNull(invoice.receiptId),
  };
}

/** Même forme que `serializeTransferDeclaration` de bank-transfer-handlers.ts (table partagée). */
function serializeTenantDeclaration(declaration: MockTransferDeclaration) {
  return {
    id: declaration.id,
    status: declaration.status,
    leaseId: declaration.leaseId,
    invoiceId: declaration.invoiceId,
    declaredAmount: declaration.declaredAmount,
    transferDate: declaration.transferDate,
    transferReference: declaration.transferReference,
    payerName: declaration.payerName,
    payerBankCode: declaration.payerBankCode,
    payerBankName: declaration.payerBankName,
    payerAccountNumber: declaration.payerAccountNumber,
    beneficiaryBankAccountId: declaration.beneficiaryBankAccountId,
    proofDocumentId: declaration.proofDocumentId,
    clientRef: declaration.clientRef,
    notes: declaration.notes,
    paymentId: declaration.paymentId,
    reviewedAt: declaration.reviewedAt,
    rejectionReason: declaration.rejectionReason,
    createdAt: declaration.createdAt,
  };
}

/** 06 -> MTN Money, 05 -> Airtel Money — même heuristique que mobile-money-handlers.ts. */
function operatorFromMsisdn(msisdn: string): MomoProviderMock | null {
  const digits = msisdn.replace(/\D/g, '');
  const local = digits.startsWith('242') ? digits.slice(3) : digits;
  const prefix = local.slice(0, 2);
  if (prefix === '06') return 'MTN_MOMO';
  if (prefix === '05') return 'AIRTEL_MONEY';
  return null;
}

/**
 * Reproduit EXACTEMENT le simulateur de mobile-money-handlers.ts (2 derniers
 * chiffres du payerMsisdn), mais appliqué en un seul appel POST — le portail
 * locataire n'a qu'une route de paiement, pas de route de rafraîchissement
 * séparée : 01 succès, 02 échec, 03 reste PENDING puis EXPIRE au 3e appel
 * (rejoué avec le même clientRef), tout autre suffixe : succès immédiat.
 */
function advanceMomoSimulator(tx: MockMomoTransaction, invoice: MockInvoice): void {
  if (tx.status === 'SUCCEEDED' || tx.status === 'FAILED' || tx.status === 'EXPIRED') return;
  const now = new Date().toISOString();
  tx.statusCheckCount += 1;
  tx.statusCheckedAt = now;
  const suffix = tx.payerMsisdn.replace(/\D/g, '').slice(-2);

  if (suffix === '02') {
    tx.status = 'FAILED';
    tx.failureCode = 'MOMO.PROVIDER_DECLINED';
    tx.failureMessage = "Paiement refusé par l'opérateur (simulateur).";
    tx.completedAt = now;
    return;
  }
  if (suffix === '03') {
    if (tx.statusCheckCount >= 3) {
      tx.status = 'EXPIRED';
      tx.completedAt = now;
    }
    return; // Sinon : reste PENDING, aucune réponse du simulateur (à rejouer).
  }

  tx.status = 'SUCCEEDED';
  tx.completedAt = now;
  tx.verifiedAt = now;
  if (tx.paymentId) return; // Idempotent : déjà réglé lors d'un appel précédent.
  const paymentId = nextId('payment');
  const reference = nextPaymentReference(now.slice(0, 7));
  const allocations = applyAllocations({
    organizationId: invoice.organizationId,
    tenantId: tx.tenantId,
    budget: tx.amount,
    explicit: [{ invoiceId: invoice.id, amount: tx.amount }],
    paymentId,
    paymentReference: reference,
    method: 'MOBILE_MONEY',
  });
  const payment: MockPayment = {
    id: paymentId,
    organizationId: invoice.organizationId,
    reference,
    method: 'MOBILE_MONEY',
    status: 'CONFIRMED',
    direction: 'INBOUND',
    amount: tx.amount,
    tenantId: tx.tenantId,
    leaseId: invoice.leaseId,
    paymentDate: now.slice(0, 10),
    externalReference: tx.aggregatorTransactionId,
    feeAmount: 0,
    confirmedAt: now,
    rejectedAt: null,
    rejectionReason: null,
    reversedAt: null,
    reversalReason: null,
    reversalOfId: null,
    receivedByUserId: null,
    clientRef: tx.clientRef,
    notes: 'Paiement Mobile Money via le portail locataire.',
    createdAt: now,
    allocations,
  };
  payments.set(paymentId, payment);
  tx.paymentId = paymentId;
}

/**
 * Téléversement de la preuve de virement (extension raisonnable au contrat,
 * à signaler à l'équipe API).
 *
 * docs/api/phase10-contract.md renvoie explicitement, pour ce point, à la
 * mécanique de la phase 4 (« le locataire déclare un virement avec preuve
 * obligatoire, exactement comme le fait le mobile depuis la phase 4 »), donc
 * au module documents générique : `proofDocumentId` s'obtient par
 * `POST /documents/upload-url` puis `POST /documents` (docs/api/phase4-contract.md,
 * « Déclarer »). Mais ces deux routes résolvent l'organisation via
 * `orgIdFromRequest` (en-tête `X-Organization-Id`, handlers.ts), jamais
 * disponible pour une session locataire : `tenant-client.ts` n'envoie que le
 * jeton `Authorization: Bearer`, conformément à l'arbitrage n°4 (aucun rôle
 * stocké, aucun membership d'organisation pour un locataire). Le contrat
 * phase 10 ne décrit aucune route de téléversement propre au portail
 * locataire : c'est un silence, pas un choix explicite.
 *
 * Ces deux routes reproduisent donc, à l'identique, le mécanisme du module
 * documents (URL de dépôt signée puis enregistrement), scopées par bail ACTIF
 * du locataire connecté plutôt que par organisation d'agence — même principe
 * que `GET /tenant/leases/:id/payment-instructions` plus bas. Elles
 * réutilisent la même Map `documents` (aucune table propre) et le même
 * simulateur de dépôt objet (`PUT ${API_BASE}/documents/upload-object/:objectKey`,
 * handlers.ts, qui ne vérifie aucun contexte d'organisation). L'équipe API
 * devrait ajouter l'équivalent réel : une route de téléversement de document
 * scopée locataire (ex. `POST /tenant/documents/upload-url` + `POST /tenant/documents`).
 */
const TENANT_PROOF_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

function tenantProofMaxSizeBytes(mimeType: string): number {
  return mimeType === 'application/pdf' ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
}

const tenantPendingUploadObjects = new Map<
  string,
  {
    tenantId: string;
    organizationId: string;
    mimeType: string;
    sizeBytes: number;
    maxSizeBytes: number;
  }
>();

export const tenantPortalHandlers = [
  // --- Connexion (arbitrage n°4 : otp_purpose='LOGIN' implicite, aucun motif propre) ---
  http.post(`${API_BASE}/tenant-auth/otp/request`, async ({ request }) => {
    // Ne révèle jamais si le numéro correspond à un locataire connu.
    await request.json().catch(() => null);
    return HttpResponse.json(
      {
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        resendAfter: new Date(Date.now() + 60_000).toISOString(),
      },
      { status: 202 },
    );
  }),

  http.post(`${API_BASE}/tenant-auth/otp/verify`, async ({ request }) => {
    const body = (await request.json()) as { phone: string; code: string };
    if (body.code !== DEV_OTP_CODE) {
      return HttpResponse.json(
        { code: 'IAM.OTP_INVALID', message: 'Code incorrect.' },
        { status: 401 },
      );
    }
    const normalized = normalizePhone(body.phone) ?? body.phone;
    const tenant = [...tenants.values()].find((t) => t.primaryPhone === normalized);
    if (!tenant) {
      return HttpResponse.json(
        {
          code: 'TENANT_PORTAL.PHONE_NOT_FOUND',
          message: 'Aucun locataire connu pour ce numéro.',
        },
        { status: 404 },
      );
    }
    const accessToken = nextId('tenantaccess');
    tenantPortalTokens.set(accessToken, tenant.id);
    const activeLeases = [...leases.values()].filter(
      (l) => l.primaryTenantId === tenant.id && l.status === 'ACTIVE' && !l.deletedAt,
    );
    const session = {
      tenantId: tenant.id,
      displayName: serializeTenant(tenant).displayName,
      primaryPhone: tenant.primaryPhone,
      leases: activeLeases.map((l) => ({
        id: l.id,
        reference: l.reference,
        property: properties.get(l.propertyId)?.name ?? '—',
        unit: units.get(l.unitId)?.code ?? '—',
      })),
    };
    return HttpResponse.json({ accessToken, tenant: session }, { status: 200 });
  }),

  // --- Factures (périmètre : baux ACTIFS du tenantId résolu par le jeton) ---
  http.get(`${API_BASE}/tenant/invoices`, ({ request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const leaseIds = activeLeaseIdsFor(tenantId);
    const items = [...invoices.values()]
      .filter((i) => leaseIds.has(i.leaseId))
      .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
      .map(serializeTenantInvoice);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/tenant/invoices/:id`, ({ params, request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const invoice = invoices.get(String(params.id));
    const leaseIds = activeLeaseIdsFor(tenantId);
    // Hors périmètre : 404, jamais 403 (règle de cloisonnement du projet).
    if (!invoice || !leaseIds.has(invoice.leaseId)) {
      return notFound('TENANT_PORTAL.INVOICE_NOT_FOUND');
    }
    return HttpResponse.json(serializeTenantInvoice(invoice));
  }),

  // --- Paiement Mobile Money (re-interrogation systématique, arbitrage n°8) ---
  http.post(`${API_BASE}/tenant/invoices/:id/pay`, async ({ params, request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const invoice = invoices.get(String(params.id));
    const leaseIds = activeLeaseIdsFor(tenantId);
    if (!invoice || !leaseIds.has(invoice.leaseId)) {
      return notFound('TENANT_PORTAL.INVOICE_NOT_FOUND');
    }
    const body = (await request.json()) as { payerMsisdn: string; clientRef?: string };
    const clientRef = body.clientRef ?? `tenant-pay-${invoice.id}-${tenantId}`;

    let tx = [...momoTransactions.values()].find(
      (t) => t.organizationId === invoice.organizationId && t.clientRef === clientRef,
    );
    if (!tx) {
      const provider = operatorFromMsisdn(body.payerMsisdn) ?? 'OTHER';
      const now = new Date().toISOString();
      const txId = nextId('momo');
      tx = {
        id: txId,
        organizationId: invoice.organizationId,
        channel: 'AGGREGATOR',
        status: 'PENDING',
        provider,
        aggregator: 'SIMULATOR',
        merchantReference: nextMomoAggregatorReference(now.slice(0, 7)),
        providerTransactionId: null,
        aggregatorTransactionId: `SIM-${txId}`,
        payerMsisdn: body.payerMsisdn,
        payeeMsisdn: null,
        amount: computeInvoiceTotals(invoice).balanceAmount,
        feeAmount: 0,
        feeBearer: 'TENANT',
        tenantId,
        leaseId: invoice.leaseId,
        invoiceId: invoice.id,
        paymentId: null,
        proofDocumentId: null,
        declaredByUserId: null,
        verifiedByUserId: null,
        verifiedAt: null,
        rejectionReason: null,
        failureCode: null,
        failureMessage: null,
        clientRef,
        notes: null,
        initiatedAt: now,
        completedAt: null,
        expiresAt: null,
        statusCheckedAt: null,
        statusCheckCount: 0,
      };
      momoTransactions.set(txId, tx);
    }
    advanceMomoSimulator(tx, invoice);
    return HttpResponse.json({ transactionId: tx.id, status: tx.status }, { status: 202 });
  }),

  /**
   * Compte bancaire de destination pour un virement déclaré.
   *
   * ÉCART CORRIGÉ : `GET /leases/{id}/payment-instructions` (phase 4) exige
   * `orgIdFromRequest`, jamais résolu depuis `tenantPortalTokens`
   * (tenant-client.ts n'envoie jamais X-Organization-Id). Le contrat phase 10
   * ne prévoit pas de route dédiée pour cela ; cette route la reproduit dans
   * le périmètre du portail (bail ACTIF du locataire connecté, 404 hors
   * périmètre) en réutilisant `buildPaymentInstructions`, pour que le
   * formulaire de virement propose les comptes réels plutôt qu'un champ libre.
   */
  http.get(`${API_BASE}/tenant/leases/:id/payment-instructions`, ({ params, request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const lease = leases.get(String(params.id));
    const leaseIds = activeLeaseIdsFor(tenantId);
    if (!lease || !leaseIds.has(lease.id)) {
      return notFound('TENANT_PORTAL.LEASE_NOT_FOUND');
    }
    const openInvoice = [...invoices.values()]
      .filter((i) => i.leaseId === lease.id && OPEN_INVOICE_STATUSES_TENANT.includes(i.status))
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))[0];
    const totals = openInvoice ? computeInvoiceTotals(openInvoice) : null;
    return HttpResponse.json(
      buildPaymentInstructions({
        organizationId: lease.organizationId,
        landlordId: lease.landlordId,
        transferReference: openInvoice?.invoiceNumber ?? null,
        invoice: openInvoice
          ? {
              id: openInvoice.id,
              invoiceNumber: openInvoice.invoiceNumber,
              balanceAmount: totals!.balanceAmount,
            }
          : null,
      }),
    );
  }),

  // --- Quittance (PDF déjà produit en phase 3, jeton de vérification inchangé) ---
  http.get(`${API_BASE}/tenant/receipts/:id`, ({ params, request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const receipt = receipts.get(String(params.id));
    if (!receipt || receipt.tenantId !== tenantId) {
      return notFound('TENANT_PORTAL.RECEIPT_NOT_FOUND');
    }
    return HttpResponse.json({
      downloadUrl: `https://mock.immodesk.internal/documents/${receipt.id}.pdf`,
      expiresAt: new Date(Date.now() + 604_800_000).toISOString(),
    });
  }),

  // --- Téléversement de la preuve de virement (voir le bloc de commentaires
  // et les constantes juste avant `tenantPortalHandlers`, en tête de
  // fichier : extension raisonnable au contrat, à signaler à l'équipe API) ---
  http.post(`${API_BASE}/tenant/documents/upload-url`, async ({ request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const body = (await request.json()) as {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      kind: string;
      leaseId: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    };
    // Seul cas d'usage actuel du portail locataire (voir commentaire ci-dessus).
    if (body.kind !== 'TRANSFER_PROOF') {
      return badRequest(
        'DOCUMENTS.KIND_INVALID',
        'Seule la preuve de virement peut être téléversée depuis le portail locataire.',
      );
    }
    const leaseIds = activeLeaseIdsFor(tenantId);
    const lease = body.leaseId ? leases.get(body.leaseId) : undefined;
    if (!lease || !leaseIds.has(lease.id)) {
      return notFound('TENANT_PORTAL.LEASE_NOT_FOUND');
    }
    if (!TENANT_PROOF_MIME_TYPES.includes(body.mimeType)) {
      return HttpResponse.json(
        { code: 'DOCUMENTS.MIME_NOT_ALLOWED', message: 'Type de fichier non autorisé.' },
        { status: 415 },
      );
    }
    const maxSizeBytes = tenantProofMaxSizeBytes(body.mimeType);
    if (body.sizeBytes > maxSizeBytes) {
      return HttpResponse.json(
        {
          code: 'DOCUMENTS.FILE_TOO_LARGE',
          message: 'Le fichier dépasse la taille maximale autorisée.',
        },
        { status: 413 },
      );
    }
    const objectKey = nextId('obj');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    tenantPendingUploadObjects.set(objectKey, {
      tenantId,
      organizationId: lease.organizationId,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      maxSizeBytes,
    });
    return HttpResponse.json(
      {
        // Même chemin relatif que le module documents générique (handlers.ts) :
        // PUT direct du navigateur, intercepté côté serveur par /api/proxy/*.
        uploadUrl: `/api/proxy/documents/upload-object/${objectKey}`,
        objectKey,
        expiresAt,
        maxSizeBytes,
      },
      { status: 201 },
    );
  }),

  http.post(`${API_BASE}/tenant/documents`, async ({ request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const body = (await request.json()) as {
      objectKey: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      kind: string;
      leaseId: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    };
    if (body.kind !== 'TRANSFER_PROOF') {
      return badRequest(
        'DOCUMENTS.KIND_INVALID',
        'Seule la preuve de virement peut être téléversée depuis le portail locataire.',
      );
    }
    const pending = tenantPendingUploadObjects.get(body.objectKey);
    if (!pending || pending.tenantId !== tenantId) {
      return notFound('DOCUMENTS.OBJECT_NOT_FOUND', "L'objet n'a pas été téléversé.");
    }
    const document: MockDocument = {
      id: nextId('document'),
      organizationId: pending.organizationId,
      objectKey: body.objectKey,
      kind: 'TRANSFER_PROOF',
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      widthPx: null,
      heightPx: null,
      pagesCount: null,
      relatedEntityType: body.relatedEntityType ?? 'tenant',
      relatedEntityId: body.relatedEntityId ?? tenantId,
      uploadedByUserId: null,
      uploadedAt: new Date().toISOString(),
      retentionUntil: null,
      deletedAt: null,
    };
    documents.set(document.id, document);
    return HttpResponse.json(serializeDocument(document), { status: 201 });
  }),

  // --- Virement déclaré (preuve obligatoire, validation réservée au gestionnaire) ---

  http.post(`${API_BASE}/tenant/bank-transfer-declarations`, async ({ request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const body = (await request.json()) as {
      leaseId?: string;
      invoiceId?: string;
      declaredAmount: number;
      transferDate: string;
      transferReference?: string;
      payerName: string;
      payerBankCode?: string;
      payerBankName?: string;
      payerAccountNumber?: string;
      beneficiaryBankAccountId: string;
      proofDocumentId: string;
      clientRef: string;
      notes?: string;
    };

    const leaseIds = activeLeaseIdsFor(tenantId);
    let organizationId: string;
    let leaseId: string | null = body.leaseId ?? null;
    if (body.invoiceId) {
      const invoice = invoices.get(body.invoiceId);
      if (!invoice || !leaseIds.has(invoice.leaseId)) {
        return notFound('TENANT_PORTAL.INVOICE_NOT_FOUND');
      }
      organizationId = invoice.organizationId;
      leaseId = invoice.leaseId;
    } else if (body.leaseId && leaseIds.has(body.leaseId)) {
      organizationId = leases.get(body.leaseId)!.organizationId;
    } else if (body.leaseId) {
      return notFound('TENANT_PORTAL.LEASE_NOT_FOUND');
    } else {
      return badRequest(
        'TENANT_PORTAL.LEASE_OR_INVOICE_REQUIRED',
        'leaseId ou invoiceId requis pour rattacher la déclaration.',
      );
    }

    const existingByClientRef = [...transferDeclarations.values()].find(
      (d) => d.organizationId === organizationId && d.clientRef === body.clientRef,
    );
    if (existingByClientRef) {
      return HttpResponse.json(serializeTenantDeclaration(existingByClientRef), { status: 200 });
    }
    if (!documents.has(body.proofDocumentId)) return notFound('DOCUMENTS.NOT_FOUND');

    const id = nextId('transfer');
    const now = new Date().toISOString();
    const declaration: MockTransferDeclaration = {
      id,
      organizationId,
      status: 'SUBMITTED',
      tenantId,
      leaseId,
      invoiceId: body.invoiceId ?? null,
      declaredAmount: body.declaredAmount,
      transferDate: body.transferDate,
      transferReference: body.transferReference ?? null,
      payerName: body.payerName,
      payerBankCode: body.payerBankCode ?? null,
      payerBankName: body.payerBankName ?? null,
      payerAccountNumber: body.payerAccountNumber ?? null,
      beneficiaryBankAccountId: body.beneficiaryBankAccountId,
      proofDocumentId: body.proofDocumentId,
      clientRef: body.clientRef,
      notes: body.notes ?? null,
      paymentId: null,
      submittedByUserId: null,
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
      matchedStatementLineId: null,
      createdAt: now,
    };
    transferDeclarations.set(id, declaration);
    return HttpResponse.json(serializeTenantDeclaration(declaration), { status: 201 });
  }),

  http.get(`${API_BASE}/tenant/bank-transfer-declarations`, ({ request }) => {
    const tenantId = tenantIdFromRequest(request);
    if (!tenantId) return unauthorizedTenant();
    const items = [...transferDeclarations.values()]
      .filter((d) => d.tenantId === tenantId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(serializeTenantDeclaration);
    return HttpResponse.json(paginate(items));
  }),
];
