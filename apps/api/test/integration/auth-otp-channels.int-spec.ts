import { normalizePhoneE164 } from '../../src/shared/phone/e164';
import {
  api,
  cleanupUser,
  login,
  newUuid,
  resetOtpLimits,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

/** Attend qu'une condition asynchrone devienne vraie (pipeline BullMQ). */
async function waitFor<T>(
  probe: () => Promise<T | null | undefined | false>,
  timeoutMs = 15_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Condition non atteinte dans le délai imparti.');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Numéro de test se terminant par 99 : échec simulé, WhatsApp comme SMS. */
function uniquePhoneEndingIn99(): string {
  const suffix = String(Math.floor(Math.random() * 900_000) + 100_000);
  return `+2420${suffix}99`;
}

/** Rattache directement un numéro à l'organisation, sans passer par les invitations. */
async function attachOrgMember(
  ctx: TestContext,
  organizationId: string,
  phone: string,
): Promise<void> {
  const user = await ctx.admin.users.upsert({
    where: { phone_e164: phone },
    create: { id: newUuid(), phone_e164: phone, status: 'ACTIVE', locale: 'fr-CG' },
    update: {},
  });
  await ctx.admin.organization_members.create({
    data: { organization_id: organizationId, user_id: user.id, role: 'MANAGER' },
  });
}

describe("OTP : WhatsApp d'abord, repli SMS, canal explicite", () => {
  let ctx: TestContext;
  const ownerPhone = uniquePhone();
  const failingPhone = uniquePhoneEndingIn99();
  const smsOnlyPhone = uniquePhone();
  let organizationId: string;
  let ownerAccessToken: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    const owner = await login(ctx, ownerPhone);
    ownerAccessToken = owner.accessToken;
    const created = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: {
        type: 'INDEPENDENT_LANDLORD',
        legalName: 'Bailleur OTP Test',
        city: 'Brazzaville',
        contactPhone: ownerPhone,
      },
    });
    organizationId = created.body.id;
    await attachOrgMember(ctx, organizationId, failingPhone);
    await attachOrgMember(ctx, organizationId, smsOnlyPhone);
  });

  afterAll(async () => {
    for (const phone of [failingPhone, smsOnlyPhone, ownerPhone]) {
      await cleanupUser(ctx, phone);
    }
    await stopTestApp(ctx);
  });

  it('numéro normal : WhatsApp par défaut, une ligne message_logs SENT, code jamais en clair', async () => {
    await resetOtpLimits(ctx, ownerPhone);
    const requested = await api(ctx, 'POST', '/auth/otp/request', { body: { phone: ownerPhone } });
    expect(requested.status).toBe(201);
    expect(requested.body.channel).toBe('WHATSAPP');

    const logs = await waitFor(async () => {
      const rows = await ctx.admin.message_logs.findMany({
        where: { related_entity_type: 'otp_codes', related_entity_id: requested.body.requestId },
        orderBy: { queued_at: 'asc' },
      });
      return rows.length > 0 ? rows : null;
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      channel: 'WHATSAPP',
      status: 'SENT',
      template_code: 'OTP_CODE',
    });
    expect(logs[0].content_preview).toBe('Code de connexion Immodesk (code expurgé).');
    expect(logs[0].content_preview).not.toMatch(/\d{4,8}/);

    // Le vrai code est bien parti chez le fournisseur (fake), mais ne doit
    // jamais avoir été persisté en clair dans `notifications` (body ou
    // payload), contrairement à `otp_codes.code_hash` (haché, par design).
    const normalizedOwnerPhone = normalizePhoneE164(ownerPhone);
    const sentToProvider = [...ctx.whatsapp.sent]
      .reverse()
      .find((m) => m.to === normalizedOwnerPhone);
    const realCode = sentToProvider?.text.match(/\b(\d{4,8})\b/)?.[1];
    expect(realCode).toBeTruthy();

    const notification = await ctx.admin.notifications.findUnique({
      where: { id: logs[0].notification_id! },
    });
    expect(notification).not.toBeNull();
    expect(notification!.body).toBe('Code de connexion Immodesk (code expurgé).');
    expect(notification!.body).not.toContain(realCode!);
    const variables = (notification!.payload as { variables: Record<string, string> }).variables;
    expect(variables.code).toBe('[REDACTED]');
    expect(JSON.stringify(notification!.payload)).not.toContain(realCode!);
  });

  it('numéro finissant par 99 : échec WhatsApp puis repli SMS, code jamais en clair', async () => {
    await resetOtpLimits(ctx, failingPhone);
    const requested = await api(ctx, 'POST', '/auth/otp/request', {
      body: { phone: failingPhone },
    });
    expect(requested.status).toBe(201);
    expect(requested.body.channel).toBe('WHATSAPP');

    const logs = await waitFor(async () => {
      const rows = await ctx.admin.message_logs.findMany({
        where: { related_entity_type: 'otp_codes', related_entity_id: requested.body.requestId },
        orderBy: { queued_at: 'asc' },
      });
      return rows.length >= 2 ? rows : null;
    });

    expect(logs.map((l) => l.channel)).toEqual(['WHATSAPP', 'SMS']);
    expect(logs[0].status).toBe('FAILED');
    for (const log of logs) {
      expect(log.content_preview).toBe('Code de connexion Immodesk (code expurgé).');
      expect(log.content_preview).not.toMatch(/\d{4,8}/);
      expect(JSON.stringify(log.raw_payload)).not.toMatch(/"\d{4,8}"/);
    }
  });

  it('channel: "SMS" explicite : une seule ligne message_logs SMS, jamais de tentative WhatsApp', async () => {
    await resetOtpLimits(ctx, smsOnlyPhone);
    const requested = await api(ctx, 'POST', '/auth/otp/request', {
      body: { phone: smsOnlyPhone, channel: 'SMS' },
    });
    expect(requested.status).toBe(201);
    expect(requested.body.channel).toBe('SMS');

    const logs = await waitFor(async () => {
      const rows = await ctx.admin.message_logs.findMany({
        where: { related_entity_type: 'otp_codes', related_entity_id: requested.body.requestId },
        orderBy: { queued_at: 'asc' },
      });
      return rows.length > 0 ? rows : null;
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ channel: 'SMS', status: 'SENT', template_code: 'OTP_CODE' });
    expect(logs[0].content_preview).toBe('Code de connexion Immodesk (code expurgé).');
  });

  it("refuse la relance d'un message OTP_CODE (modèle d'authentification)", async () => {
    await resetOtpLimits(ctx, ownerPhone);
    const requested = await api(ctx, 'POST', '/auth/otp/request', { body: { phone: ownerPhone } });
    expect(requested.status).toBe(201);

    const logs = await waitFor(async () => {
      const rows = await ctx.admin.message_logs.findMany({
        where: { related_entity_type: 'otp_codes', related_entity_id: requested.body.requestId },
      });
      return rows.length > 0 ? rows : null;
    });

    const retry = await api(ctx, 'POST', `/message-logs/${logs[0].id}/retry`, {
      accessToken: ownerAccessToken,
      organizationId,
    });
    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe('NOTIFICATIONS.RETRY_NOT_ALLOWED');
  });
});
