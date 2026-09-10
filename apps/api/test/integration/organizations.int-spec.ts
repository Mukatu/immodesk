import {
  api,
  cleanupUser,
  login,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

describe('Organisations, membres et invitations', () => {
  let ctx: TestContext;
  const ownerPhone = uniquePhone();
  const collaboratorPhone = uniquePhone();
  const outsiderPhone = uniquePhone();

  let owner: { accessToken: string; refreshToken: string; userId: string };
  let organizationId: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    owner = await login(ctx, ownerPhone);
  });

  afterAll(async () => {
    for (const phone of [ownerPhone, collaboratorPhone, outsiderPhone]) {
      await cleanupUser(ctx, phone);
    }
    await stopTestApp(ctx);
  });

  it('crée une organisation dont le créateur devient OWNER', async () => {
    const created = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: {
        type: 'AGENCY',
        legalName: "Agence d'intégration SARL",
        tradeName: 'Agence Intégration',
        city: 'Brazzaville',
        district: 'Bacongo',
        contactPhone: ownerPhone,
      },
    });

    expect(created.status).toBe(201);
    expect(created.body.type).toBe('AGENCY');
    expect(created.body.status).toBe('ACTIVE');
    expect(created.body.slug).toMatch(/^agence-integration/);
    organizationId = created.body.id;

    // Le créateur est OWNER et les paramètres par défaut existent.
    const membership = await ctx.admin.organization_members.findFirst({
      where: { organization_id: organizationId, user_id: owner.userId },
    });
    expect(membership?.role).toBe('OWNER');
    expect(membership?.status).toBe('ACTIVE');

    const settings = await ctx.admin.organization_settings.findUnique({
      where: { organization_id: organizationId },
    });
    expect(settings).toMatchObject({
      default_payment_due_day: 5,
      timezone: 'Africa/Brazzaville',
      currency: 'XAF',
    });

    // La création est tracée dans audit_logs.
    const auditRows = await ctx.admin.audit_logs.findMany({
      where: { organization_id: organizationId },
      select: { reason: true, action: true },
    });
    expect(auditRows.map((r) => r.reason)).toEqual(
      expect.arrayContaining(['ORGANIZATION_CREATED', 'MEMBER_JOINED']),
    );

    // L'organisation apparaît dans /v1/me.
    const me = await api(ctx, 'GET', '/me', { accessToken: owner.accessToken });
    expect(me.body.organizations).toHaveLength(1);
    expect(me.body.organizations[0].role).toBe('OWNER');
    expect(me.body.organizations[0].organization.id).toBe(organizationId);
  });

  it("exige l'en-tête X-Organization-Id sur les routes d'organisation", async () => {
    const missing = await api(ctx, 'GET', `/organizations/${organizationId}`, {
      accessToken: owner.accessToken,
    });
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe('ORG.CONTEXT_MISSING');
  });

  it('lit et met à jour les paramètres, avec trace d’audit', async () => {
    const read = await api(ctx, 'GET', `/organizations/${organizationId}/settings`, {
      accessToken: owner.accessToken,
      organizationId,
    });
    expect(read.status).toBe(200);
    expect(read.body.currency).toBe('XAF');
    expect(read.body.defaultPaymentDueDay).toBe(5);

    const updated = await api(ctx, 'PATCH', `/organizations/${organizationId}/settings`, {
      accessToken: owner.accessToken,
      organizationId,
      body: { defaultPaymentDueDay: 10, defaultGraceDays: 3 },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.defaultPaymentDueDay).toBe(10);
    expect(updated.body.defaultGraceDays).toBe(3);

    const audited = await ctx.admin.audit_logs.findFirst({
      where: { organization_id: organizationId, reason: 'ORGANIZATION_SETTINGS_UPDATED' },
    });
    expect(audited).not.toBeNull();
    expect(audited!.changed_fields).toEqual(
      expect.arrayContaining(['defaultGraceDays', 'defaultPaymentDueDay']),
    );
    expect((audited!.previous_state as any).defaultPaymentDueDay).toBe(5);
    expect((audited!.new_state as any).defaultPaymentDueDay).toBe(10);
  });

  it('invite un collaborateur, qui accepte et devient membre', async () => {
    const invited = await api(ctx, 'POST', `/organizations/${organizationId}/invitations`, {
      accessToken: owner.accessToken,
      organizationId,
      body: { phone: collaboratorPhone, role: 'COLLECTOR', fullName: 'Alphonse Ngoma' },
    });
    expect(invited.status).toBe(201);
    expect(invited.body.status).toBe('PENDING');
    expect(invited.body.role).toBe('COLLECTOR');

    // Le jeton part par SMS ; seul son condensat est en base.
    const sms = ctx.sms.peekLastMessage();
    expect(sms?.to).toBe(collaboratorPhone);
    const token = sms!.body.match(/\/([A-Za-z0-9_-]{20,})\s*$/)?.[1];
    expect(token).toBeDefined();

    const storedInvitation = await ctx.admin.invitations.findUnique({
      where: { id: invited.body.id },
    });
    expect(storedInvitation!.token_hash).not.toContain(token!);

    // Consultation publique avant acceptation.
    const peeked = await api(ctx, 'GET', `/invitations/${token}`);
    expect(peeked.status).toBe(200);
    expect(peeked.body.organizationName).toBe('Agence Intégration');
    expect(peeked.body.role).toBe('COLLECTOR');

    // Un tiers ne peut pas consommer le lien.
    const outsider = await login(ctx, outsiderPhone);
    const stolen = await api(ctx, 'POST', `/invitations/${token}/accept`, {
      accessToken: outsider.accessToken,
    });
    expect(stolen.status).toBe(403);
    expect(stolen.body.code).toBe('INVITATION.PHONE_MISMATCH');

    // Le destinataire accepte.
    const collaborator = await login(ctx, collaboratorPhone);
    const accepted = await api(ctx, 'POST', `/invitations/${token}/accept`, {
      accessToken: collaborator.accessToken,
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body.role).toBe('COLLECTOR');
    expect(accepted.body.organization.id).toBe(organizationId);

    // Le lien ne peut pas être rejoué.
    const replayed = await api(ctx, 'POST', `/invitations/${token}/accept`, {
      accessToken: collaborator.accessToken,
    });
    expect(replayed.status).toBe(409);
    expect(replayed.body.code).toBe('INVITATION.ALREADY_USED');

    // Visibilité partagée : le collaborateur voit l'organisation.
    const collaboratorMe = await api(ctx, 'GET', '/me', {
      accessToken: collaborator.accessToken,
    });
    expect(collaboratorMe.body.organizations).toHaveLength(1);

    // Mais un COLLECTOR ne peut pas lister les membres (rôle MANAGER requis).
    const forbidden = await api(ctx, 'GET', `/organizations/${organizationId}/members`, {
      accessToken: collaborator.accessToken,
      organizationId,
    });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('IAM.FORBIDDEN');

    const audited = await ctx.admin.audit_logs.findMany({
      where: { organization_id: organizationId },
      select: { reason: true },
    });
    expect(audited.map((r) => r.reason)).toEqual(
      expect.arrayContaining(['INVITATION_CREATED', 'INVITATION_ACCEPTED']),
    );
  });

  it("répond 404 (jamais 403) sur l'organisation d'autrui", async () => {
    const outsider = await login(ctx, outsiderPhone);
    const response = await api(ctx, 'GET', `/organizations/${organizationId}`, {
      accessToken: outsider.accessToken,
      organizationId,
    });
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('ORG.NOT_MEMBER');
  });

  it('protège le dernier OWNER (409 ORG.LAST_OWNER)', async () => {
    const members = await api(ctx, 'GET', `/organizations/${organizationId}/members`, {
      accessToken: owner.accessToken,
      organizationId,
    });
    expect(members.status).toBe(200);
    const ownerMember = members.body.items.find((m: any) => m.role === 'OWNER');
    expect(ownerMember).toBeDefined();

    const demoted = await api(
      ctx,
      'PATCH',
      `/organizations/${organizationId}/members/${ownerMember.id}`,
      { accessToken: owner.accessToken, organizationId, body: { role: 'MANAGER' } },
    );
    expect(demoted.status).toBe(409);
    expect(demoted.body.code).toBe('ORG.LAST_OWNER');

    const removed = await api(
      ctx,
      'DELETE',
      `/organizations/${organizationId}/members/${ownerMember.id}`,
      { accessToken: owner.accessToken, organizationId },
    );
    expect(removed.status).toBe(409);
    expect(removed.body.code).toBe('ORG.LAST_OWNER');

    // Avec un second OWNER, la rétrogradation redevient possible.
    const collaboratorMember = members.body.items.find((m: any) => m.role === 'COLLECTOR');
    const promoted = await api(
      ctx,
      'PATCH',
      `/organizations/${organizationId}/members/${collaboratorMember.id}`,
      { accessToken: owner.accessToken, organizationId, body: { role: 'OWNER' } },
    );
    expect(promoted.status).toBe(200);
    expect(promoted.body.role).toBe('OWNER');

    const nowAllowed = await api(
      ctx,
      'PATCH',
      `/organizations/${organizationId}/members/${ownerMember.id}`,
      { accessToken: owner.accessToken, organizationId, body: { role: 'MANAGER' } },
    );
    expect(nowAllowed.status).toBe(200);
    expect(nowAllowed.body.role).toBe('MANAGER');
  });

  it('expose les drapeaux de fonctionnalité de l’organisation courante', async () => {
    await ctx.admin.feature_flags.create({
      data: {
        organization_id: organizationId,
        key: 'demo.banner',
        is_enabled: true,
        rollout_percentage: 100,
      },
    });

    // Le OWNER a été rétrogradé MANAGER au test précédent : on utilise le
    // second OWNER pour continuer à disposer d'un accès complet.
    const response = await api(ctx, 'GET', '/feature-flags', {
      accessToken: owner.accessToken,
      organizationId,
    });
    expect(response.status).toBe(200);
    expect(response.body.flags['demo.banner']).toBe(true);
  });

  it('rejette une charge utile invalide en 422 VALIDATION.INVALID_PAYLOAD', async () => {
    const response = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: { type: 'INCONNU', legalName: '', city: 'Brazzaville', contactPhone: 'abc' },
    });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION.INVALID_PAYLOAD');
    expect(Array.isArray(response.body.details.fields)).toBe(true);
  });
});
