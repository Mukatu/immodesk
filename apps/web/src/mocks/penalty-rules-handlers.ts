import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 3 (règles de pénalité), routes conformes à
 * docs/api/phase3-contract.md. Même principe que billing-handlers.ts.
 */
import { API_BASE } from './api-base';
import { nextId, notFound, orgIdFromRequest, unauthorizedOrg } from './handlers';
import {
  penaltyRules,
  seedPenaltyRulesDemoData,
  type MockPenaltyRule,
  type PenaltyBasisMock,
} from './penalty-rules-seed';

export { seedPenaltyRulesDemoData };

function serialize(rule: MockPenaltyRule) {
  const { organizationId: _organizationId, ...rest } = rule;
  return rest;
}

interface PenaltyRuleBody {
  name: string;
  basis: PenaltyBasisMock;
  rateBps?: number;
  flatAmount?: number;
  graceDays?: number;
  capAmount?: number;
  capRateBps?: number;
  maxPeriods?: number;
  appliesToCharges?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
}

export const penaltyRulesHandlers = [
  http.get(`${API_BASE}/penalty-rules`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const items = [...penaltyRules.values()]
      .filter((r) => r.organizationId === organizationId)
      .map(serialize);
    return HttpResponse.json({ items });
  }),

  http.post(`${API_BASE}/penalty-rules`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as PenaltyRuleBody;
    const rule: MockPenaltyRule = {
      id: nextId('penaltyrule'),
      organizationId,
      name: body.name,
      basis: body.basis,
      rateBps: body.rateBps ?? null,
      flatAmount: body.flatAmount ?? null,
      graceDays: body.graceDays ?? null,
      capAmount: body.capAmount ?? null,
      capRateBps: body.capRateBps ?? null,
      maxPeriods: body.maxPeriods ?? null,
      appliesToCharges: body.appliesToCharges ?? false,
      isActive: body.isActive ?? true,
      isDefault: body.isDefault ?? false,
      createdAt: new Date().toISOString(),
    };
    penaltyRules.set(rule.id, rule);
    return HttpResponse.json(serialize(rule), { status: 201 });
  }),

  http.patch(`${API_BASE}/penalty-rules/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const rule = penaltyRules.get(String(params.id));
    if (!rule || rule.organizationId !== organizationId) {
      return notFound('BILLING.PENALTY_RULE_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<PenaltyRuleBody>;
    Object.assign(rule, body);
    return HttpResponse.json(serialize(rule));
  }),
];
