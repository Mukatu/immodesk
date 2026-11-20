import { newId as uuidv7 } from '../../src/shared/ids/uuid';
import { MOMO_WEBHOOK_ENQUEUE_FAILED } from '../../src/modules/mobile-money/infrastructure/momo-reference-resolver';
import { WebhookEventsService } from '../../src/modules/webhooks/application/webhook-events.service';
import { startTestApp, stopTestApp, type TestContext } from './helpers';

/**
 * Durcissement Mobile Money en production : la route du simulateur n'existe
 * plus (404) et la reprise d'un événement dont la mise en file a échoué.
 */
describe('Mobile Money : durcissement production', () => {
  const saved = { ...process.env };
  let ctx: TestContext;

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://app.immodesk.cg',
      CURSOR_SECRET: 'cursor-secret-de-production-xx',
      OTP_PEPPER: 'pepper-de-production',
      WHATSAPP_APP_SECRET: 'whatsapp-app-secret-prod',
      WHATSAPP_VERIFY_TOKEN: 'whatsapp-verify-token-prod',
      SMS_GATEWAY_WEBHOOK_SECRET: 'sms-webhook-secret-prod',
      LINK_SIGNING_SECRET: 'link-signing-secret-de-production',
      MOMO_SIMULATOR_SECRET: 'momo-simulator-secret-prod',
      MOMO_PROVIDER_DEFAULT: 'CINETPAY',
      CINETPAY_API_KEY: 'k',
      CINETPAY_SITE_ID: 's',
      CINETPAY_SECRET_KEY: 'x',
      MOMO_WEBHOOK_BASE_URL: 'https://api.immodesk.cg',
    });
    ctx = await startTestApp();
  }, 60_000);

  afterAll(async () => {
    await ctx.admin.webhook_events.deleteMany({
      where: { external_event_id: { startsWith: 'dur-prod-' } },
    });
    await stopTestApp(ctx);
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  });

  const post = (path: string) =>
    fetch(`${ctx.baseUrl}/webhooks/mobile-money/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });

  it('la route du simulateur répond 404 en production', async () => {
    expect((await post('simulator')).status).toBe(404);
  });

  it('la route du fournisseur réel reste montée (non signé : 200, ignoré)', async () => {
    expect((await post('cinetpay')).status).toBe(200);
  });

  it('un événement FAILED faute de mise en file est repris à la relance, pas un autre FAILED', async () => {
    const events = ctx.app.get(WebhookEventsService);
    const input = (externalEventId: string) => ({
      organizationId: null,
      source: 'CINETPAY',
      eventType: 'momo.succeeded',
      externalEventId,
      signatureHeader: 'x',
      signatureValid: true,
      requestPath: '/v1/webhooks/mobile-money/cinetpay',
      sourceIp: '127.0.0.1',
      headers: {},
      rawPayload: {},
    });
    const retry = `dur-prod-${uuidv7()}`;
    const first = await events.persist(input(retry));
    await events.markStatus(first.id, 'PROCESSING');
    await events.markStatus(first.id, 'FAILED', { errorMessage: MOMO_WEBHOOK_ENQUEUE_FAILED });
    const again = await events.persist(input(retry));
    expect(again).toEqual({ id: first.id, duplicate: false });
    const row = await ctx.admin.webhook_events.findUniqueOrThrow({ where: { id: first.id } });
    expect(row.status).toBe('RECEIVED');
    expect(row.error_message).toBeNull();

    const other = `dur-prod-${uuidv7()}`;
    const second = await events.persist(input(other));
    await events.markStatus(second.id, 'FAILED', {
      errorMessage: 'MOMO.WEBHOOK_REFERENCE_UNRESOLVED',
    });
    expect((await events.persist(input(other))).duplicate).toBe(true);

    const stuck = `dur-prod-${uuidv7()}`;
    const third = await events.persist(input(stuck));
    await events.markStatus(third.id, 'PROCESSING');
    expect((await events.persist(input(stuck))).duplicate).toBe(true);
  });
});
