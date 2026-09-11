import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 3 (gabarits de notification), routes conformes à
 * docs/api/phase3-contract.md. Même principe que billing-handlers.ts. Le test
 * d'un gabarit écrit une entrée dans le journal des messages (messages-seed).
 */
import { API_BASE } from './api-base';
import { nextId, notFound, orgIdFromRequest, unauthorizedOrg } from './handlers';
import {
  notificationTemplates,
  seedNotificationTemplatesDemoData,
  type MockNotificationTemplate,
} from './notification-templates-seed';
import { messageLogs, type MockMessageLog } from './messages-seed';

export { seedNotificationTemplatesDemoData };

function serialize(template: MockNotificationTemplate) {
  const { organizationId: _organizationId, ...rest } = template;
  return rest;
}

interface UpdateTemplateBody {
  body?: string;
  subject?: string;
  providerTemplateName?: string;
  providerTemplateLang?: string;
  isActive?: boolean;
}

export const notificationTemplatesHandlers = [
  http.get(`${API_BASE}/notification-templates`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const items = [...notificationTemplates.values()]
      .filter((t) => t.organizationId === organizationId)
      .map(serialize);
    return HttpResponse.json({ items });
  }),

  http.patch(`${API_BASE}/notification-templates/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const template = notificationTemplates.get(String(params.id));
    if (!template || template.organizationId !== organizationId) {
      return notFound('MESSAGING.TEMPLATE_NOT_FOUND');
    }
    const body = (await request.json()) as UpdateTemplateBody;
    Object.assign(template, body);
    return HttpResponse.json(serialize(template));
  }),

  http.post(`${API_BASE}/notification-templates/:id/test`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const template = notificationTemplates.get(String(params.id));
    if (!template || template.organizationId !== organizationId) {
      return notFound('MESSAGING.TEMPLATE_NOT_FOUND');
    }
    const body = (await request.json()) as { phone: string };
    const notificationId = nextId('notification');
    const now = new Date().toISOString();
    const log: MockMessageLog = {
      id: nextId('msglog'),
      organizationId,
      notificationId,
      channel: template.channel,
      status: 'SENT',
      provider: template.channel === 'WHATSAPP' ? 'meta_whatsapp' : 'android_gateway_sms',
      providerMessageId: `test.${notificationId}`,
      toAddress: body.phone,
      templateCode: template.code,
      contentPreview: `[Test] ${template.body}`,
      costAmount: template.channel === 'WHATSAPP' ? 15 : 25,
      queuedAt: now,
      sentAt: now,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      errorCode: null,
      errorMessage: null,
      relatedEntityType: 'NotificationTemplate',
      relatedEntityId: template.id,
    };
    messageLogs.set(log.id, log);
    return HttpResponse.json({ notificationId }, { status: 202 });
  }),
];
