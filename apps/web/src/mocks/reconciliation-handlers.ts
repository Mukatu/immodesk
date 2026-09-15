import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 6 (file de rapprochement, tableau de bord, paramètres),
 * routes conformes à docs/api/phase6-contract.md. Même principe que les
 * autres handlers de phase 6 : Maps importées depuis bank-reconciliation-seed.ts.
 */
import { API_BASE } from './api-base';
import {
  badRequest,
  bankAccounts,
  conflict,
  matchesQuery,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  unauthorizedOrg,
} from './handlers';
import {
  bankStatementLines,
  computeAgeDays,
  lineSuggestions,
  matchedAmountOf,
  reconciliationMatches,
  serializeMatch,
  serializeStatementLine,
  stateOfLine,
  type MockReconciliationMatch,
} from './bank-reconciliation-seed';

interface MockReconciliationSettings {
  suggestionThreshold: number;
  dateWindowDays: number;
  amountTolerancePercent: number;
  autoConfirmExact: boolean;
  checkClearingAlertDays: number;
  bounceFeeAmount: number;
}

const reconciliationSettings = new Map<string, MockReconciliationSettings>();

function getOrInitReconciliationSettings(organizationId: string): MockReconciliationSettings {
  let settings = reconciliationSettings.get(organizationId);
  if (!settings) {
    settings = {
      suggestionThreshold: 75,
      dateWindowDays: 15,
      amountTolerancePercent: 2,
      autoConfirmExact: true,
      checkClearingAlertDays: 15,
      bounceFeeAmount: 0,
    };
    reconciliationSettings.set(organizationId, settings);
  }
  return settings;
}

export const reconciliationHandlers = [
  http.get(`${API_BASE}/bank-statement-lines`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const bankAccountId = url.searchParams.get('bankAccountId');
    const state = url.searchParams.get('state');
    const olderThanDays = url.searchParams.get('olderThanDays');
    const minAmount = url.searchParams.get('minAmount');
    const maxAmount = url.searchParams.get('maxAmount');
    const q = url.searchParams.get('q');
    const items = [...bankStatementLines.values()]
      .filter((l) => l.organizationId === organizationId)
      .filter((l) => !bankAccountId || l.bankAccountId === bankAccountId)
      .filter((l) => !state || stateOfLine(l) === state)
      .filter((l) => !olderThanDays || computeAgeDays(l.operationDate) > Number(olderThanDays))
      .filter((l) => !minAmount || l.amount >= Number(minAmount))
      .filter((l) => !maxAmount || l.amount <= Number(maxAmount))
      .filter((l) => matchesQuery(q, l.label, l.counterpartyName))
      .sort((a, b) => (a.operationDate < b.operationDate ? 1 : -1))
      .map(serializeStatementLine);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/bank-statement-lines/:id/suggestions`, ({ params }) => {
    const line = bankStatementLines.get(String(params.id));
    if (!line) return notFound('BANK.LINE_NOT_FOUND', 'Ligne de relevé introuvable.');
    return HttpResponse.json({ items: lineSuggestions.get(line.id) ?? [] });
  }),

  http.patch(`${API_BASE}/bank-statement-lines/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const line = bankStatementLines.get(String(params.id));
    if (!line || line.organizationId !== organizationId) {
      return notFound('BANK.LINE_NOT_FOUND', 'Ligne de relevé introuvable.');
    }
    const body = (await request.json()) as { isIgnored?: boolean; ignoreReason?: string };
    if (body.isIgnored !== undefined) line.isIgnored = body.isIgnored;
    if (body.ignoreReason !== undefined) line.ignoreReason = body.ignoreReason;
    return HttpResponse.json(serializeStatementLine(line));
  }),

  http.post(`${API_BASE}/reconciliation-matches`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      statementLineId: string;
      targetType: MockReconciliationMatch['targetType'];
      targetId: string;
      matchedAmount: number;
    };
    const line = bankStatementLines.get(body.statementLineId);
    if (!line || line.organizationId !== organizationId) {
      return notFound('BANK.LINE_NOT_FOUND', 'Ligne de relevé introuvable.');
    }
    const already = matchedAmountOf(line.id);
    if (already + body.matchedAmount > line.amount) {
      return conflict('BANK.OVER_MATCHED', 'Le montant rapproché dépasse le montant de la ligne.');
    }
    const now = new Date().toISOString();
    const match: MockReconciliationMatch = {
      id: nextId('match'),
      organizationId,
      statementLineId: line.id,
      targetType: body.targetType,
      targetId: body.targetId,
      matchType: 'MANUAL',
      status: 'CONFIRMED',
      matchedAmount: body.matchedAmount,
      confidenceScore: 100,
      matchCriteria: { manual: true },
      matchedByUserId: null,
      confirmedAt: now,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalOfId: null,
      createdAt: now,
    };
    reconciliationMatches.set(match.id, match);
    return HttpResponse.json(serializeMatch(match), { status: 201 });
  }),

  http.post(`${API_BASE}/reconciliation-matches/:id/confirm`, ({ params }) => {
    const match = reconciliationMatches.get(String(params.id));
    if (!match) return notFound('BANK.MATCH_NOT_FOUND', 'Rapprochement introuvable.');
    match.status = 'CONFIRMED';
    match.confirmedAt = new Date().toISOString();
    return HttpResponse.json(serializeMatch(match));
  }),

  http.post(`${API_BASE}/reconciliation-matches/:id/reject`, async ({ params, request }) => {
    const match = reconciliationMatches.get(String(params.id));
    if (!match) return notFound('BANK.MATCH_NOT_FOUND', 'Rapprochement introuvable.');
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (!body.reason) return badRequest('BANK.REASON_REQUIRED', 'Le motif est obligatoire.');
    match.status = 'REJECTED';
    match.rejectedAt = new Date().toISOString();
    match.rejectionReason = body.reason;
    return HttpResponse.json(serializeMatch(match));
  }),

  http.post(`${API_BASE}/reconciliation-matches/:id/reverse`, async ({ params, request }) => {
    const match = reconciliationMatches.get(String(params.id));
    if (!match) return notFound('BANK.MATCH_NOT_FOUND', 'Rapprochement introuvable.');
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (!body.reason) return badRequest('BANK.REASON_REQUIRED', 'Le motif est obligatoire.');
    const now = new Date().toISOString();
    match.status = 'REVERSED';
    match.reversedAt = now;
    const mirror: MockReconciliationMatch = {
      ...match,
      id: nextId('match'),
      status: 'REVERSED',
      reversalOfId: match.id,
      createdAt: now,
      confirmedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    };
    reconciliationMatches.set(mirror.id, mirror);
    return HttpResponse.json({ reversed: serializeMatch(match), mirror: serializeMatch(mirror) });
  }),

  http.get(`${API_BASE}/reconciliation/dashboard`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const bankAccountId = url.searchParams.get('bankAccountId');
    const lines = [...bankStatementLines.values()]
      .filter((l) => l.organizationId === organizationId)
      .filter((l) => !bankAccountId || l.bankAccountId === bankAccountId);
    const unmatched = lines.filter((l) => stateOfLine(l) === 'UNMATCHED');
    const matchedCount = lines.filter((l) => stateOfLine(l) === 'MATCHED').length;
    const unmatchedAmount = unmatched.reduce((sum, l) => sum + l.amount, 0);
    const oldestUnmatchedDays = unmatched.reduce(
      (max, l) => Math.max(max, computeAgeDays(l.operationDate)),
      0,
    );
    const matchedRatioBps =
      lines.length === 0 ? 0 : Math.round((matchedCount / lines.length) * 10000);

    const accountIds = [...new Set(lines.map((l) => l.bankAccountId))];
    const byAccount = accountIds.map((id) => {
      const accountLines = lines.filter((l) => l.bankAccountId === id);
      const accountUnmatched = accountLines.filter((l) => stateOfLine(l) === 'UNMATCHED');
      const accountMatchedCount = accountLines.filter((l) => stateOfLine(l) === 'MATCHED').length;
      const account = bankAccounts.get(id);
      return {
        bankAccountId: id,
        bankAccountLabel: account?.label ?? id,
        unmatchedCount: accountUnmatched.length,
        unmatchedAmount: accountUnmatched.reduce((sum, l) => sum + l.amount, 0),
        oldestUnmatchedDays: accountUnmatched.reduce(
          (max, l) => Math.max(max, computeAgeDays(l.operationDate)),
          0,
        ),
        matchedRatioBps:
          accountLines.length === 0
            ? 0
            : Math.round((accountMatchedCount / accountLines.length) * 10000),
      };
    });

    return HttpResponse.json({
      unmatchedCount: unmatched.length,
      unmatchedAmount,
      oldestUnmatchedDays,
      matchedRatioBps,
      byAccount,
    });
  }),

  http.get(`${API_BASE}/organizations/:id/reconciliation-settings`, ({ params }) =>
    HttpResponse.json(getOrInitReconciliationSettings(String(params.id))),
  ),

  http.patch(
    `${API_BASE}/organizations/:id/reconciliation-settings`,
    async ({ params, request }) => {
      const orgId = String(params.id);
      const current = getOrInitReconciliationSettings(orgId);
      const body = (await request.json()) as Partial<MockReconciliationSettings>;
      const updated: MockReconciliationSettings = { ...current, ...body };
      reconciliationSettings.set(orgId, updated);
      return HttpResponse.json(updated);
    },
  ),
];
