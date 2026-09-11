import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 3 (journal des messages), routes conformes à
 * docs/api/phase3-contract.md. Même principe que billing-handlers.ts.
 */
import { API_BASE } from './api-base';
import { nextId, notFound, orgIdFromRequest, paginate, unauthorizedOrg } from './handlers';
import { messageLogs, seedMessagesDemoData } from './messages-seed';

export { seedMessagesDemoData };

export const messagesHandlers = [
  http.get(`${API_BASE}/message-logs`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const channel = url.searchParams.get('channel');
    const status = url.searchParams.get('status');
    const relatedEntityType = url.searchParams.get('relatedEntityType');
    const relatedEntityId = url.searchParams.get('relatedEntityId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...messageLogs.values()]
      .filter((m) => m.organizationId === organizationId)
      .filter((m) => !channel || m.channel === channel)
      .filter((m) => !status || m.status === status)
      .filter((m) => !relatedEntityType || m.relatedEntityType === relatedEntityType)
      .filter((m) => !relatedEntityId || m.relatedEntityId === relatedEntityId)
      .filter((m) => !from || m.queuedAt >= from)
      .filter((m) => !to || m.queuedAt <= to)
      .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))
      .map(({ organizationId: _organizationId, ...rest }) => rest);
    return HttpResponse.json(paginate(items));
  }),

  http.post(`${API_BASE}/message-logs/:id/retry`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const log = messageLogs.get(String(params.id));
    if (!log || log.organizationId !== organizationId) return notFound('MESSAGING.LOG_NOT_FOUND');
    log.status = 'SENT';
    log.sentAt = new Date().toISOString();
    log.failedAt = null;
    log.errorCode = null;
    log.errorMessage = null;
    return HttpResponse.json({ notificationId: nextId('notification') }, { status: 202 });
  }),
];
