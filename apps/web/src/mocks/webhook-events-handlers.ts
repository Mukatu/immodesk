import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 4, webhooks Mobile Money/agrégateur, conforme à
 * docs/api/phase4-contract.md. Le contrat réserve ces routes à OWNER, mais
 * comme le reste de ce mock (organizations/:id/settings, payments-handlers.ts,
 * etc.) aucun contrôle de rôle n'est fait ici — seule l'appartenance à
 * l'organisation (X-Organization-Id) est vérifiée, par cohérence avec la
 * convention déjà en place dans handlers.ts.
 */
import { API_BASE } from './api-base';
import { notFound, orgIdFromRequest, paginate, unauthorizedOrg } from './handlers';
import { webhookEvents, type MockWebhookEvent } from './payments-phase4-seed';

function serializeWebhookEvent(event: MockWebhookEvent) {
  const { organizationId: _organizationId, ...rest } = event;
  return rest;
}

export const webhookEventsHandlers = [
  http.get(`${API_BASE}/webhook-events`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    const status = url.searchParams.get('status');
    const signatureValid = url.searchParams.get('signatureValid');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...webhookEvents.values()]
      .filter((e) => e.organizationId === organizationId)
      .filter((e) => !source || e.source === source)
      .filter((e) => !status || e.status === status)
      .filter((e) => signatureValid === null || String(e.signatureValid) === signatureValid)
      .filter((e) => !from || e.receivedAt.slice(0, 10) >= from)
      .filter((e) => !to || e.receivedAt.slice(0, 10) <= to)
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
      .map(serializeWebhookEvent);
    return HttpResponse.json(paginate(items));
  }),

  /** Retraitement idempotent (contrat) — simulé de façon synchrone, sans file réelle. */
  http.post(`${API_BASE}/webhook-events/:id/replay`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const event = webhookEvents.get(String(params.id));
    if (!event || event.organizationId !== organizationId) {
      return notFound('WEBHOOKS.NOT_FOUND');
    }
    event.status = 'PROCESSING';
    event.processingAttempts += 1;
    event.status = 'PROCESSED';
    event.processedAt = new Date().toISOString();
    event.errorMessage = null;
    return HttpResponse.json(serializeWebhookEvent(event), { status: 202 });
  }),
];
