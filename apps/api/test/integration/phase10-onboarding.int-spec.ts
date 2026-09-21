import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { addMember, createAgency, dropOrganization, type Agency } from './phase3-fixtures';

/**
 * Phase 10 — onboarding guidé (`/v1/onboarding/{orgId}/…`) : trois étapes
 * idempotentes qui délèguent aux modules existants (portfolio, leases,
 * organizations), plus l'état DÉRIVÉ.
 */
describe('Phase 10 — onboarding guidé', () => {
  let ctx: TestContext;
  let agency: Agency;
  let viewer: { accessToken: string; userId: string };
  let landlordId: string;
  let unitId: string;
  let tenantId: string;

  const asOwner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Onboarding');
    viewer = await addMember(ctx, agency.organizationId, 'VIEWER');

    const landlord = await api(ctx, 'POST', '/landlords', {
      ...asOwner(),
      body: { lastName: 'Bailleur Onboarding', primaryPhone: '+242061900001' },
    });
    landlordId = landlord.body.id;

    const tenant = await api(ctx, 'POST', '/tenants', {
      ...asOwner(),
      body: { lastName: 'Locataire Onboarding', primaryPhone: '+242061900002' },
    });
    tenantId = tenant.body.id;
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId, viewer.userId]);
    await stopTestApp(ctx);
  });

  it('état initial : les trois étapes sont à faire', async () => {
    const res = await api(ctx, 'GET', `/onboarding/${agency.organizationId}/state`, asOwner());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      firstPropertyDone: false,
      firstLeaseDone: false,
      inviteDone: false,
    });
  });

  it('orgId du chemin différent de l’en-tête : 404 ORG.NOT_MEMBER', async () => {
    const res = await api(
      ctx,
      'GET',
      '/onboarding/00000000-0000-0000-0000-000000000000/state',
      asOwner(),
    );
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ORG.NOT_MEMBER');
  });

  it('VIEWER ne peut pas lancer la première étape (OWNER requis)', async () => {
    const res = await api(ctx, 'POST', `/onboarding/${agency.organizationId}/first-property`, {
      accessToken: viewer.accessToken,
      organizationId: agency.organizationId,
      body: { landlordId, name: 'Résidence', addressLine: '1 rue Test', district: 'Bacongo' },
    });
    expect(res.status).toBe(403);
  });

  it('étape 1 : premier bien, puis 409 en la rejouant', async () => {
    const created = await api(ctx, 'POST', `/onboarding/${agency.organizationId}/first-property`, {
      ...asOwner(),
      body: {
        landlordId,
        name: 'Résidence Onboarding',
        addressLine: '1 rue Test',
        district: 'Bacongo',
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Résidence Onboarding');

    const propertyId = created.body.id;
    const unit = await api(ctx, 'POST', `/properties/${propertyId}/units`, {
      ...asOwner(),
      body: { code: 'A1' },
    });
    expect(unit.status).toBe(201);
    unitId = unit.body.id;

    const replay = await api(ctx, 'POST', `/onboarding/${agency.organizationId}/first-property`, {
      ...asOwner(),
      body: { landlordId, name: 'Autre bien', addressLine: '2 rue Test', district: 'Bacongo' },
    });
    expect(replay.status).toBe(409);
    expect(replay.body.code).toBe('ONBOARDING.STEP_ALREADY_DONE');

    const state = await api(ctx, 'GET', `/onboarding/${agency.organizationId}/state`, asOwner());
    expect(state.body.firstPropertyDone).toBe(true);
    expect(state.body.firstLeaseDone).toBe(false);
  });

  it('étape 2 : premier bail, puis 409 en la rejouant', async () => {
    const created = await api(ctx, 'POST', `/onboarding/${agency.organizationId}/first-lease`, {
      ...asOwner(),
      body: { unitId, primaryTenantId: tenantId, startDate: '2026-01-01', rentAmount: 150_000 },
    });
    expect(created.status).toBe(201);
    expect(created.body.rentAmount).toBe(150_000);

    const replay = await api(ctx, 'POST', `/onboarding/${agency.organizationId}/first-lease`, {
      ...asOwner(),
      body: { unitId, primaryTenantId: tenantId, startDate: '2026-01-01', rentAmount: 150_000 },
    });
    expect(replay.status).toBe(409);
    expect(replay.body.code).toBe('ONBOARDING.STEP_ALREADY_DONE');

    const state = await api(ctx, 'GET', `/onboarding/${agency.organizationId}/state`, asOwner());
    expect(state.body.firstLeaseDone).toBe(true);
    expect(state.body.inviteDone).toBe(false);
  });

  it('étape 3 : première invitation, puis 409 en la rejouant', async () => {
    const created = await api(ctx, 'POST', `/onboarding/${agency.organizationId}/invite`, {
      ...asOwner(),
      body: { phone: '+242061900099', role: 'MANAGER', fullName: 'Collègue Test' },
    });
    expect(created.status).toBe(201);
    expect(created.body.role).toBe('MANAGER');

    const replay = await api(ctx, 'POST', `/onboarding/${agency.organizationId}/invite`, {
      ...asOwner(),
      body: { phone: '+242061900098', role: 'VIEWER' },
    });
    expect(replay.status).toBe(409);
    expect(replay.body.code).toBe('ONBOARDING.STEP_ALREADY_DONE');

    const state = await api(ctx, 'GET', `/onboarding/${agency.organizationId}/state`, asOwner());
    expect(state.body).toEqual({ firstPropertyDone: true, firstLeaseDone: true, inviteDone: true });
  });
});
