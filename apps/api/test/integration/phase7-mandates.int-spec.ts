import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { createAgency, dropOrganization, isoDate, type Agency } from './phase3-fixtures';
import { createLandlordAndProperty } from './phase7-fixtures';

describe('Phase 7 — mandats de gestion', () => {
  let ctx: TestContext;
  let agency: Agency;
  const as = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Mandats7');
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    await stopTestApp(ctx);
  });

  it('cycle de vie : DRAFT à la création puis ACTIVE après activation', async () => {
    const { landlordId, propertyId } = await createLandlordAndProperty(ctx, agency, 'Cycle');

    const created = await api(ctx, 'POST', '/management-mandates', {
      ...as(),
      body: {
        landlordId,
        propertyIds: [propertyId],
        startDate: isoDate(),
        commissionBasis: 'RATE_BPS_ON_RENT_COLLECTED',
        commissionRateBps: 1000,
      },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      status: 'DRAFT',
      landlordId,
      propertyIds: [propertyId],
      signedAt: null,
    });

    const activated = await api(ctx, 'POST', `/management-mandates/${created.body.id}/activate`, {
      ...as(),
    });
    // Pas de `@HttpCode` sur `activate` dans le contrôleur : 201, défaut Nest pour un POST.
    expect(activated.status).toBe(201);
    expect(activated.body.status).toBe('ACTIVE');
    expect(activated.body.signedAt).not.toBeNull();
  });

  it('refuse un second mandat actif sur un bien déjà mandaté : 409 AGENCY.PROPERTY_ALREADY_MANDATED', async () => {
    const { landlordId, propertyId } = await createLandlordAndProperty(ctx, agency, 'Conflit');

    const first = await api(ctx, 'POST', '/management-mandates', {
      ...as(),
      body: {
        landlordId,
        propertyIds: [propertyId],
        startDate: isoDate(),
        commissionBasis: 'RATE_BPS_ON_RENT_COLLECTED',
        commissionRateBps: 1000,
      },
    });
    expect(first.status).toBe(201);
    const firstActivated = await api(
      ctx,
      'POST',
      `/management-mandates/${first.body.id}/activate`,
      as(),
    );
    expect(firstActivated.status).toBe(201);

    const second = await api(ctx, 'POST', '/management-mandates', {
      ...as(),
      body: {
        landlordId,
        propertyIds: [propertyId],
        startDate: isoDate(),
        commissionBasis: 'RATE_BPS_ON_RENT_COLLECTED',
        commissionRateBps: 800,
      },
    });
    expect(second.status).toBe(201);

    const secondActivation = await api(
      ctx,
      'POST',
      `/management-mandates/${second.body.id}/activate`,
      as(),
    );
    expect(secondActivation.status).toBe(409);
    expect(secondActivation.body.code).toBe('AGENCY.PROPERTY_ALREADY_MANDATED');
  });

  it('bascule mono-bien vers portefeuille via POST /{id}/properties', async () => {
    const { landlordId, propertyId: propertyA } = await createLandlordAndProperty(
      ctx,
      agency,
      'PortefeuilleA',
    );
    const propertyB = await api(ctx, 'POST', '/properties', {
      ...as(),
      body: {
        landlordId,
        name: 'Résidence PortefeuilleB',
        addressLine: '2, avenue de test',
        district: 'Bacongo',
      },
    });
    expect(propertyB.status).toBe(201);

    const mandate = await api(ctx, 'POST', '/management-mandates', {
      ...as(),
      body: {
        landlordId,
        propertyIds: [propertyA],
        startDate: isoDate(),
        commissionBasis: 'RATE_BPS_ON_RENT_COLLECTED',
        commissionRateBps: 1000,
      },
    });
    expect(mandate.status).toBe(201);
    const activated = await api(
      ctx,
      'POST',
      `/management-mandates/${mandate.body.id}/activate`,
      as(),
    );
    expect(activated.body.propertyIds).toEqual([propertyA]);

    const attached = await api(ctx, 'POST', `/management-mandates/${mandate.body.id}/properties`, {
      ...as(),
      body: { propertyIds: [propertyB.body.id] },
    });
    expect(attached.status).toBe(201);
    // Portefeuille : `property_id` redevient NULL, `propertyIds` (dérivé) est
    // donc vide, mais `properties` liste tout le portefeuille du bailleur.
    expect(attached.body.propertyIds).toEqual([]);
    const attachedIds = attached.body.properties.map((p: any) => p.id).sort();
    expect(attachedIds).toEqual([propertyA, propertyB.body.id].sort());
  });
});
