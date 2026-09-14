import { Logger } from '@nestjs/common';
import { normalizePhoneE164 } from '../../src/shared/phone/e164';
import {
  api,
  cleanupUser,
  resetOtpLimits,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

/** Attend qu'une condition asynchrone devienne vraie (envoi hors requête). */
async function waitFor<T>(
  probe: () => T | null | undefined | false,
  timeoutMs = 15_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = probe();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Condition non atteinte dans le délai imparti.');
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

function uniquePhoneEndingIn99(): string {
  const suffix = String(Math.floor(Math.random() * 900_000) + 100_000);
  return `+2420${suffix}99`;
}

/**
 * OTP pour un numéro SANS organisation ET SANS utilisateur existant : chemin
 * `OtpAuthService.sendOtpWithoutTrace`, distinct du pipeline phase 3 — voir
 * le commentaire de cette méthode et la section « Écarts et limites
 * connues » (Phase 3) du README. Ce chemin n'écrit jamais `message_logs` :
 * ces tests vérifient l'envoi effectif (via les fakes) et, en cas d'échec
 * total, l'avertissement journalisé (jamais le code en clair).
 */
describe('OTP sans organisation : chemin direct (sendOtpWithoutTrace)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(ctx);
  });

  it('numéro normal : WhatsApp tenté et accepté, aucune ligne message_logs', async () => {
    const phone = uniquePhone();
    const normalized = normalizePhoneE164(phone);
    await resetOtpLimits(ctx, phone);
    const before = ctx.whatsapp.sent.length;

    const requested = await api(ctx, 'POST', '/auth/otp/request', { body: { phone } });
    expect(requested.status).toBe(201);
    expect(requested.body.channel).toBe('WHATSAPP');

    const sent = await waitFor(() =>
      ctx.whatsapp.sent.slice(before).find((m) => m.to === normalized),
    );
    expect(sent.text).toMatch(/\b\d{4,8}\b/);

    const logs = await ctx.admin.message_logs.findMany({ where: { to_address: normalized } });
    expect(logs).toHaveLength(0);

    await cleanupUser(ctx, phone);
  });

  it("channel: 'SMS' explicite : SMS seul, jamais de tentative WhatsApp", async () => {
    const phone = uniquePhone();
    const normalized = normalizePhoneE164(phone);
    await resetOtpLimits(ctx, phone);
    const beforeWa = ctx.whatsapp.sent.length;
    const beforeSms = ctx.sms.sent.length;

    const requested = await api(ctx, 'POST', '/auth/otp/request', {
      body: { phone, channel: 'SMS' },
    });
    expect(requested.status).toBe(201);
    expect(requested.body.channel).toBe('SMS');

    const sms = await waitFor(() => ctx.sms.sent.slice(beforeSms).find((m) => m.to === normalized));
    expect(sms.body).toMatch(/\b\d{4,8}\b/);
    expect(ctx.whatsapp.sent.slice(beforeWa).find((m) => m.to === normalized)).toBeUndefined();

    await cleanupUser(ctx, phone);
  });

  it('numéro finissant par 99 : échec WhatsApp puis SMS, avertissement journalisé sans le code', async () => {
    const phone = uniquePhoneEndingIn99();
    const normalized = normalizePhoneE164(phone);
    await resetOtpLimits(ctx, phone);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');
    const beforeWa = ctx.whatsapp.sent.length;
    const beforeSms = ctx.sms.sent.length;

    try {
      const requested = await api(ctx, 'POST', '/auth/otp/request', { body: { phone } });
      expect(requested.status).toBe(201);

      const waMsg = await waitFor(() =>
        ctx.whatsapp.sent.slice(beforeWa).find((m) => m.to === normalized),
      );
      const smsMsg = await waitFor(() =>
        ctx.sms.sent.slice(beforeSms).find((m) => m.to === normalized),
      );
      // Les deux fakes échouent sur ce numéro (contrat phase 3) : le code
      // réel figure encore dans le message tenté, avant échec.
      const realCode = waMsg.text.match(/\b(\d{4,8})\b/)?.[1];
      expect(realCode).toBeTruthy();
      expect(smsMsg.body).toContain(realCode!);

      const warning = await waitFor(() =>
        warnSpy.mock.calls.find((call) => String(call[0]).includes('OTP non remis')),
      );
      const message = String(warning[0]);
      expect(message).toContain('WHATSAPP=');
      expect(message).toContain('SMS=');
      expect(message).not.toContain(realCode!);

      const logs = await ctx.admin.message_logs.findMany({ where: { to_address: normalized } });
      expect(logs).toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
      await cleanupUser(ctx, phone);
    }
  });
});
