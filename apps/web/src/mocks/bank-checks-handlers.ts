import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 6 (chèques), routes conformes à docs/api/phase6-contract.md.
 * Même principe que les autres handlers de phase 6 : Maps importées depuis
 * bank-reconciliation-seed.ts.
 */
import { API_BASE } from './api-base';
import {
  badRequest,
  conflict,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  unauthorizedOrg,
} from './handlers';
import {
  bankChecks,
  checkDetail,
  serializeCheck,
  type MockBankCheck,
} from './bank-reconciliation-seed';

export const bankChecksHandlers = [
  http.post(`${API_BASE}/bank-checks`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      tenantId: string;
      leaseId?: string;
      invoiceId?: string;
      checkNumber: string;
      drawerName: string;
      drawerBankCode: string;
      drawerBankName: string;
      drawerAccountNumber?: string;
      amount: number;
      issueDate: string;
      receivedAt?: string;
      imageDocumentId?: string;
      notes?: string;
    };
    const duplicate = [...bankChecks.values()].some(
      (c) =>
        c.organizationId === organizationId &&
        c.drawerBankCode === body.drawerBankCode &&
        c.checkNumber === body.checkNumber,
    );
    if (duplicate) {
      return conflict('BANK.CHECK_ALREADY_REGISTERED', 'Ce chèque est déjà enregistré.');
    }
    const now = new Date().toISOString();
    const check: MockBankCheck = {
      id: nextId('check'),
      organizationId,
      tenantId: body.tenantId,
      leaseId: body.leaseId ?? null,
      invoiceId: body.invoiceId ?? null,
      checkNumber: body.checkNumber,
      drawerName: body.drawerName,
      drawerBankCode: body.drawerBankCode,
      drawerBankName: body.drawerBankName,
      drawerAccountNumber: body.drawerAccountNumber ?? null,
      amount: body.amount,
      issueDate: body.issueDate,
      receivedAt: body.receivedAt ?? now,
      imageDocumentId: body.imageDocumentId ?? null,
      notes: body.notes ?? null,
      status: 'RECEIVED',
      paymentId: nextId('payment'),
      depositDate: null,
      depositBankAccountId: null,
      clearingDate: null,
      bouncedAt: null,
      bounceReason: null,
      bounceFeeAmount: 0,
      receivedByUserId: null,
    };
    bankChecks.set(check.id, check);
    return HttpResponse.json(serializeCheck(check), { status: 201 });
  }),

  http.get(`${API_BASE}/bank-checks`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const tenantId = url.searchParams.get('tenantId');
    const dueBefore = url.searchParams.get('dueBefore');
    const items = [...bankChecks.values()]
      .filter((c) => c.organizationId === organizationId)
      .filter((c) => !status || c.status === status)
      .filter((c) => !tenantId || c.tenantId === tenantId)
      .filter((c) => !dueBefore || c.issueDate <= dueBefore)
      .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1))
      .map(serializeCheck);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/bank-checks/:id`, ({ params }) => {
    const check = bankChecks.get(String(params.id));
    if (!check) return notFound('BANK.CHECK_NOT_FOUND', 'Chèque introuvable.');
    return HttpResponse.json(checkDetail(check));
  }),

  http.post(`${API_BASE}/bank-checks/:id/deposit`, async ({ params, request }) => {
    const check = bankChecks.get(String(params.id));
    if (!check) return notFound('BANK.CHECK_NOT_FOUND', 'Chèque introuvable.');
    const body = (await request.json()) as { depositDate: string; depositBankAccountId: string };
    check.status = 'DEPOSITED';
    check.depositDate = body.depositDate;
    check.depositBankAccountId = body.depositBankAccountId;
    return HttpResponse.json(checkDetail(check));
  }),

  http.post(`${API_BASE}/bank-checks/:id/clear`, async ({ params, request }) => {
    const check = bankChecks.get(String(params.id));
    if (!check) return notFound('BANK.CHECK_NOT_FOUND', 'Chèque introuvable.');
    const body = (await request.json().catch(() => ({}))) as { clearingDate?: string };
    check.status = 'CLEARED';
    check.clearingDate = body.clearingDate ?? new Date().toISOString().slice(0, 10);
    return HttpResponse.json(checkDetail(check));
  }),

  http.post(`${API_BASE}/bank-checks/:id/bounce`, async ({ params, request }) => {
    const check = bankChecks.get(String(params.id));
    if (!check) return notFound('BANK.CHECK_NOT_FOUND', 'Chèque introuvable.');
    const body = (await request.json()) as { reason?: string; bounceFeeAmount?: number };
    if (!body.reason) return badRequest('BANK.REASON_REQUIRED', 'Le motif est obligatoire.');
    check.status = 'BOUNCED';
    check.bouncedAt = new Date().toISOString();
    check.bounceReason = body.reason;
    check.bounceFeeAmount = body.bounceFeeAmount ?? 0;
    return HttpResponse.json(checkDetail(check));
  }),

  http.post(`${API_BASE}/bank-checks/:id/cancel`, ({ params }) => {
    const check = bankChecks.get(String(params.id));
    if (!check) return notFound('BANK.CHECK_NOT_FOUND', 'Chèque introuvable.');
    check.status = 'CANCELLED';
    return HttpResponse.json(checkDetail(check));
  }),

  http.post(`${API_BASE}/bank-checks/:id/return`, ({ params }) => {
    const check = bankChecks.get(String(params.id));
    if (!check) return notFound('BANK.CHECK_NOT_FOUND', 'Chèque introuvable.');
    check.status = 'RETURNED';
    return HttpResponse.json(checkDetail(check));
  }),
];
