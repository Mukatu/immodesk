import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 4, virement bancaire déclaré, conforme à
 * docs/api/phase4-contract.md. Même principe que mobile-money-handlers.ts :
 * réutilise `applyAllocations` et `serializePaymentDetail` de
 * payments-handlers.ts plutôt que de dupliquer la logique d'imputation.
 *
 * RÈGLE CENTRALE (arbitrage 1 et 3 du contrat) : une déclaration ne crée
 * jamais de payment. `.../approve` applique `confirmOnApproval` de
 * l'organisation : `true` → payment CONFIRMED alloué avec quittance ; `false`
 * → payment PENDING_VERIFICATION non alloué.
 */
import { API_BASE } from './api-base';
import {
  conflict,
  documents,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  serializeTenant,
  tenants,
  unauthorizedOrg,
} from './handlers';
import { applyAllocations, serializePaymentDetail } from './payments-handlers';
import { nextPaymentReference, payments, type MockPayment } from './payments-seed';
import { invoices } from './billing-seed';
import {
  getOrInitPaymentMethodsSettings,
  transferDeclarations,
  type MockTransferDeclaration,
} from './payments-phase4-seed';

const AGED_THRESHOLD_HOURS = 72;

/** Le contrat réserve les codes 4xx métier virement à ce statut HTTP. */
function unprocessable(code: string, message: string) {
  return HttpResponse.json({ code, message }, { status: 422 });
}

function tenantRef(tenantId: string) {
  const tenant = tenants.get(tenantId);
  if (!tenant) return { id: tenantId, displayName: 'Locataire inconnu' };
  return { id: tenant.id, displayName: serializeTenant(tenant).displayName };
}

function invoiceRef(invoiceId: string | null) {
  if (!invoiceId) return null;
  const invoice = invoices.get(invoiceId);
  return invoice ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber } : null;
}

/** `ageHours` alimente l'indicateur d'ancienneté (> 72h) du contrat. */
function serializeTransferDeclaration(declaration: MockTransferDeclaration) {
  const ageHours = Math.round(
    (Date.now() - new Date(declaration.createdAt).getTime()) / (3600 * 1000),
  );
  return {
    id: declaration.id,
    status: declaration.status,
    tenant: tenantRef(declaration.tenantId),
    leaseId: declaration.leaseId,
    invoice: invoiceRef(declaration.invoiceId),
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
    submittedByUserId: declaration.submittedByUserId,
    reviewedByUserId: declaration.reviewedByUserId,
    reviewedAt: declaration.reviewedAt,
    rejectionReason: declaration.rejectionReason,
    matchedStatementLineId: declaration.matchedStatementLineId,
    ageHours,
    createdAt: declaration.createdAt,
  };
}

function isAged(declaration: MockTransferDeclaration): boolean {
  const hours = (Date.now() - new Date(declaration.createdAt).getTime()) / (3600 * 1000);
  return (
    hours > AGED_THRESHOLD_HOURS &&
    (declaration.status === 'SUBMITTED' || declaration.status === 'UNDER_REVIEW')
  );
}

export const bankTransferHandlers = [
  http.post(`${API_BASE}/bank-transfer-declarations`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      tenantId: string;
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

    const existingByClientRef = [...transferDeclarations.values()].find(
      (d) => d.organizationId === organizationId && d.clientRef === body.clientRef,
    );
    if (existingByClientRef) {
      return HttpResponse.json(serializeTransferDeclaration(existingByClientRef), { status: 200 });
    }

    // Une même preuve (checksum du document, simplifié ici à son id) ne sert
    // qu'une fois dans l'organisation — voir docs/api/phase4-contract.md.
    const proofDuplicate = [...transferDeclarations.values()].some(
      (d) => d.organizationId === organizationId && d.proofDocumentId === body.proofDocumentId,
    );
    if (proofDuplicate) {
      return conflict(
        'BANK.PROOF_ALREADY_USED',
        'Cette pièce justificative a déjà été utilisée pour une déclaration.',
      );
    }
    if (!documents.has(body.proofDocumentId)) {
      return notFound('DOCUMENTS.NOT_FOUND');
    }

    const id = nextId('transfer');
    const now = new Date().toISOString();
    const declaration: MockTransferDeclaration = {
      id,
      organizationId,
      status: 'SUBMITTED',
      tenantId: body.tenantId,
      leaseId: body.leaseId ?? null,
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
    return HttpResponse.json(serializeTransferDeclaration(declaration), { status: 201 });
  }),

  http.get(`${API_BASE}/bank-transfer-declarations`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...transferDeclarations.values()]
      .filter((d) => d.organizationId === organizationId)
      .filter((d) => !status || d.status === status)
      .filter((d) => !from || d.createdAt.slice(0, 10) >= from)
      .filter((d) => !to || d.createdAt.slice(0, 10) <= to)
      // Les déclarations non traitées depuis plus de 72h ouvrées remontent en
      // tête de file (docs/api/phase4-contract.md, section « Virement déclaré »).
      .sort((a, b) => {
        const agedDiff = Number(isAged(b)) - Number(isAged(a));
        if (agedDiff !== 0) return agedDiff;
        return a.createdAt < b.createdAt ? 1 : -1;
      })
      .map(serializeTransferDeclaration);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/bank-transfer-declarations/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const declaration = transferDeclarations.get(String(params.id));
    if (!declaration || declaration.organizationId !== organizationId) {
      return notFound('BANK.DECLARATION_NOT_FOUND');
    }
    return HttpResponse.json(serializeTransferDeclaration(declaration));
  }),

  http.post(`${API_BASE}/bank-transfer-declarations/:id/review`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const declaration = transferDeclarations.get(String(params.id));
    if (!declaration || declaration.organizationId !== organizationId) {
      return notFound('BANK.DECLARATION_NOT_FOUND');
    }
    if (declaration.status !== 'SUBMITTED') {
      return conflict(
        'BANK.INVALID_STATUS',
        'Cette déclaration ne peut plus être prise en charge.',
      );
    }
    // La prise en charge instruit le dossier sans changer son statut final
    // (docs/api/phase4-contract.md : « Ouvrir une déclaration pour l'instruire
    // ne change pas son statut » — appliqué ici par analogie au virement).
    declaration.status = 'UNDER_REVIEW';
    return HttpResponse.json(serializeTransferDeclaration(declaration));
  }),

  http.post(`${API_BASE}/bank-transfer-declarations/:id/approve`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const declaration = transferDeclarations.get(String(params.id));
    if (!declaration || declaration.organizationId !== organizationId) {
      return notFound('BANK.DECLARATION_NOT_FOUND');
    }
    if (declaration.status !== 'SUBMITTED' && declaration.status !== 'UNDER_REVIEW') {
      return conflict('BANK.INVALID_STATUS', 'Cette déclaration a déjà été instruite.');
    }
    const body = (await request.json().catch(() => ({}))) as {
      approvedAmount?: number;
      reason?: string;
    };
    if (
      body.approvedAmount !== undefined &&
      body.approvedAmount !== declaration.declaredAmount &&
      !body.reason?.trim()
    ) {
      return unprocessable(
        'BANK.APPROVED_AMOUNT_REASON_REQUIRED',
        'Un motif est requis lorsque le montant validé diffère du montant déclaré.',
      );
    }
    const amount = body.approvedAmount ?? declaration.declaredAmount;
    const settings = getOrInitPaymentMethodsSettings(organizationId);
    const now = new Date().toISOString();
    const paymentId = nextId('payment');
    const reference = nextPaymentReference(now.slice(0, 7));

    // Arbitrage 3 du contrat : confirmOnApproval pilote le statut du
    // payment et son imputation.
    const confirmOnApproval = settings.bankTransfer.confirmOnApproval;
    const allocations = confirmOnApproval
      ? applyAllocations({
          organizationId,
          tenantId: declaration.tenantId,
          budget: amount,
          explicit: declaration.invoiceId
            ? [{ invoiceId: declaration.invoiceId, amount }]
            : undefined,
          autoAllocate: !declaration.invoiceId,
          paymentId,
          paymentReference: reference,
          method: 'BANK_TRANSFER',
        })
      : [];

    const payment: MockPayment = {
      id: paymentId,
      organizationId,
      reference,
      method: 'BANK_TRANSFER',
      status: confirmOnApproval ? 'CONFIRMED' : 'PENDING_VERIFICATION',
      direction: 'INBOUND',
      amount,
      tenantId: declaration.tenantId,
      leaseId: declaration.leaseId,
      paymentDate: now.slice(0, 10),
      externalReference: declaration.transferReference,
      feeAmount: 0,
      confirmedAt: confirmOnApproval ? now : null,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalReason: null,
      reversalOfId: null,
      receivedByUserId: null,
      clientRef: declaration.clientRef,
      notes: body.reason ?? null,
      createdAt: now,
      allocations,
    };
    payments.set(paymentId, payment);

    declaration.status = 'APPROVED';
    declaration.paymentId = paymentId;
    declaration.reviewedAt = now;

    return HttpResponse.json({
      declaration: serializeTransferDeclaration(declaration),
      payment: serializePaymentDetail(payment),
    });
  }),

  http.post(`${API_BASE}/bank-transfer-declarations/:id/reject`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const declaration = transferDeclarations.get(String(params.id));
    if (!declaration || declaration.organizationId !== organizationId) {
      return notFound('BANK.DECLARATION_NOT_FOUND');
    }
    if (declaration.status !== 'SUBMITTED' && declaration.status !== 'UNDER_REVIEW') {
      return conflict('BANK.INVALID_STATUS', 'Cette déclaration a déjà été instruite.');
    }
    const body = (await request.json()) as { reason: string };
    declaration.status = 'REJECTED';
    declaration.rejectionReason = body.reason;
    declaration.reviewedAt = new Date().toISOString();
    return HttpResponse.json(serializeTransferDeclaration(declaration));
  }),

  http.post(`${API_BASE}/bank-transfer-declarations/:id/cancel`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const declaration = transferDeclarations.get(String(params.id));
    if (!declaration || declaration.organizationId !== organizationId) {
      return notFound('BANK.DECLARATION_NOT_FOUND');
    }
    if (declaration.status !== 'SUBMITTED' && declaration.status !== 'UNDER_REVIEW') {
      return conflict(
        'BANK.INVALID_STATUS',
        'Seule une déclaration en instruction peut être retirée.',
      );
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    declaration.status = 'CANCELLED';
    declaration.notes = body.reason ? `Retirée : ${body.reason}` : declaration.notes;
    return HttpResponse.json(serializeTransferDeclaration(declaration));
  }),
];
