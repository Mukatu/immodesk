import {
  api,
  cleanupUser,
  login,
  readOtpCodeFromSms,
  resetOtpLimits,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

describe("Cycle d'authentification OTP", () => {
  let ctx: TestContext;
  const phone = uniquePhone();

  beforeAll(async () => {
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await cleanupUser(ctx, phone);
    await stopTestApp(ctx);
  });

  it('déroule demande → vérification → appel authentifié → rotation → rejeu → déconnexion', async () => {
    // --- 1. Demande d'un code -------------------------------------------
    await resetOtpLimits(ctx, phone);
    const requested = await api(ctx, 'POST', '/auth/otp/request', { body: { phone } });

    expect(requested.status).toBe(201);
    expect(requested.body).toMatchObject({
      channel: 'SMS',
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
    });
    expect(requested.body.requestId).toBeDefined();

    // Le code est stocké HACHÉ : la valeur claire n'est jamais en base.
    const code = readOtpCodeFromSms(ctx);
    const stored = await ctx.admin.otp_codes.findFirst({
      where: { phone_e164: phone },
      orderBy: { created_at: 'desc' },
    });
    expect(stored).not.toBeNull();
    expect(stored!.code_hash).not.toContain(code);
    expect(stored!.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored!.attempts).toBe(0);
    expect(stored!.max_attempts).toBe(5);
    const ttlMs = stored!.expires_at.getTime() - stored!.created_at.getTime();
    expect(ttlMs).toBeGreaterThan(290_000);
    expect(ttlMs).toBeLessThanOrEqual(300_000);

    // --- 2. Un code erroné est refusé et compté -------------------------
    const wrong = await api(ctx, 'POST', '/auth/otp/verify', {
      body: { phone, code: code === '000000' ? '111111' : '000000' },
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('IAM.OTP_INVALID');
    expect(wrong.body.message).toBe('Code incorrect.');

    // --- 3. Vérification réussie ----------------------------------------
    const verified = await api(ctx, 'POST', '/auth/otp/verify', {
      body: { phone, code, deviceName: 'Samsung A14' },
    });
    expect(verified.status).toBe(200);
    expect(verified.body.accessToken).toEqual(expect.any(String));
    expect(verified.body.refreshToken).toEqual(expect.any(String));
    expect(verified.body.user.phone).toBe(phone);
    expect(verified.body.organizations).toEqual([]);

    // Le code est consommé et ne peut plus servir.
    const consumed = await ctx.admin.otp_codes.findUnique({ where: { id: stored!.id } });
    expect(consumed!.consumed_at).not.toBeNull();
    const replayedOtp = await api(ctx, 'POST', '/auth/otp/verify', { body: { phone, code } });
    expect(replayedOtp.status).toBe(401);

    // --- 4. Appel authentifié -------------------------------------------
    const me = await api(ctx, 'GET', '/me', { accessToken: verified.body.accessToken });
    expect(me.status).toBe(200);
    expect(me.body.user.phone).toBe(phone);

    const anonymous = await api(ctx, 'GET', '/me');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.code).toBe('IAM.UNAUTHENTICATED');

    // --- 5. Rotation du refresh token -----------------------------------
    const rotated = await api(ctx, 'POST', '/auth/refresh', {
      body: { refreshToken: verified.body.refreshToken },
    });
    expect(rotated.status).toBe(200);
    expect(rotated.body.refreshToken).not.toBe(verified.body.refreshToken);

    const newAccess = await api(ctx, 'GET', '/me', { accessToken: rotated.body.accessToken });
    expect(newAccess.status).toBe(200);

    // --- 6. Rejeu de l'ancien jeton : révocation de toute la famille ----
    const replayed = await api(ctx, 'POST', '/auth/refresh', {
      body: { refreshToken: verified.body.refreshToken },
    });
    expect(replayed.status).toBe(401);
    expect(replayed.body.code).toBe('IAM.REFRESH_REVOKED');

    // Le jeton issu de la rotation est lui aussi révoqué : l'appareil entier
    // est déconnecté, c'est la réaction attendue à un vol de session.
    const afterFamilyRevocation = await api(ctx, 'POST', '/auth/refresh', {
      body: { refreshToken: rotated.body.refreshToken },
    });
    expect(afterFamilyRevocation.status).toBe(401);

    const family = await ctx.admin.refresh_tokens.findMany({
      where: { users: { phone_e164: phone } },
      select: { revoked_at: true, revoked_reason: true },
    });
    expect(family.length).toBeGreaterThanOrEqual(2);
    expect(family.every((t) => t.revoked_at !== null)).toBe(true);
    expect(family.some((t) => t.revoked_reason === 'REUSE_DETECTED')).toBe(true);

    // --- 7. Déconnexion --------------------------------------------------
    const session = await login(ctx, phone);
    const loggedOut = await api(ctx, 'POST', '/auth/logout', {
      accessToken: session.accessToken,
      body: { refreshToken: session.refreshToken },
    });
    expect(loggedOut.status).toBe(204);

    const afterLogout = await api(ctx, 'POST', '/auth/refresh', {
      body: { refreshToken: session.refreshToken },
    });
    expect(afterLogout.status).toBe(401);
  });

  it('verrouille le code à la cinquième tentative erronée (429 IAM.OTP_LOCKED)', async () => {
    const lockPhone = uniquePhone();
    try {
      await resetOtpLimits(ctx, lockPhone);
      await api(ctx, 'POST', '/auth/otp/request', { body: { phone: lockPhone } });
      const realCode = readOtpCodeFromSms(ctx);
      const wrongCode = realCode === '999999' ? '111111' : '999999';

      const statuses: number[] = [];
      const codes: string[] = [];
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const response = await api(ctx, 'POST', '/auth/otp/verify', {
          body: { phone: lockPhone, code: wrongCode },
        });
        statuses.push(response.status);
        codes.push(response.body.code);
      }

      expect(statuses.slice(0, 4)).toEqual([401, 401, 401, 401]);
      expect(codes.slice(0, 4).every((c) => c === 'IAM.OTP_INVALID')).toBe(true);
      // La 5e tentative verrouille.
      expect(statuses[4]).toBe(429);
      expect(codes[4]).toBe('IAM.OTP_LOCKED');

      // Le bon code ne fonctionne plus : le code est invalidé.
      const tooLate = await api(ctx, 'POST', '/auth/otp/verify', {
        body: { phone: lockPhone, code: realCode },
      });
      expect([401, 429]).toContain(tooLate.status);
    } finally {
      await cleanupUser(ctx, lockPhone);
    }
  });

  it('impose un délai de renvoi de 60 secondes puis limite à 3 demandes / 10 min', async () => {
    const limitedPhone = uniquePhone();
    try {
      await resetOtpLimits(ctx, limitedPhone);

      const first = await api(ctx, 'POST', '/auth/otp/request', { body: { phone: limitedPhone } });
      expect(first.status).toBe(201);

      // Deuxième demande immédiate : refusée par le délai plancher.
      const tooSoon = await api(ctx, 'POST', '/auth/otp/request', {
        body: { phone: limitedPhone },
      });
      expect(tooSoon.status).toBe(429);
      expect(tooSoon.body.code).toBe('IAM.OTP_RESEND_TOO_SOON');
      expect(tooSoon.body.details.retryAfterSeconds).toBeGreaterThan(0);

      // Le quota par numéro (3 / 10 min) est compté indépendamment du délai
      // plancher : la 4e demande est rejetée par la limitation de débit.
      let rateLimited = false;
      for (let i = 0; i < 4; i += 1) {
        await ctx.admin.otp_codes.deleteMany({ where: { phone_e164: limitedPhone } });
        const response = await api(ctx, 'POST', '/auth/otp/request', {
          body: { phone: limitedPhone },
        });
        if (response.status === 429 && response.body.code === 'IAM.RATE_LIMITED') {
          rateLimited = true;
          break;
        }
      }
      expect(rateLimited).toBe(true);
    } finally {
      await resetOtpLimits(ctx, limitedPhone);
      await cleanupUser(ctx, limitedPhone);
    }
  });

  it('normalise le numéro : les formes nationale et internationale ouvrent la même session', async () => {
    const national = '066555001';
    const international = '+242066555001';
    try {
      await resetOtpLimits(ctx, international);
      const requested = await api(ctx, 'POST', '/auth/otp/request', { body: { phone: national } });
      expect(requested.status).toBe(201);

      const code = readOtpCodeFromSms(ctx);
      const verified = await api(ctx, 'POST', '/auth/otp/verify', {
        body: { phone: international, code },
      });
      expect(verified.status).toBe(200);
      expect(verified.body.user.phone).toBe(international);
    } finally {
      await cleanupUser(ctx, international);
    }
  });

  it('rejette un jeton d’accès invalide', async () => {
    const response = await api(ctx, 'GET', '/me', { accessToken: 'jeton.bidon.forge' });
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('IAM.TOKEN_INVALID');
  });
});
