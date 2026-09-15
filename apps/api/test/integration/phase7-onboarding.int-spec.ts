import { api, login, startTestApp, stopTestApp, uniquePhone, type TestContext } from './helpers';
import { dropOrganization } from './phase3-fixtures';

describe('Phase 7 — onboarding du gestionnaire indépendant', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestApp();
  }, 60_000);

  afterAll(async () => {
    await stopTestApp(ctx);
  });

  it('crée organisation, bailleur, bien et mandat en une seule transaction, avec la commission par défaut', async () => {
    const phone = uniquePhone();
    // Utilisateur authentifié mais SANS organisation : exactement le
    // parcours visé (`POST /v1/organizations/independent-manager/onboarding`
    // n'exige ni `@Roles(...)` ni `@RequireOrganization()`).
    const user = await login(ctx, phone);

    const response = await api(ctx, 'POST', '/organizations/independent-manager/onboarding', {
      accessToken: user.accessToken,
      body: {
        organization: {
          legalName: 'Gestion Indépendante Nzoko',
          city: 'Brazzaville',
          contactPhone: phone,
        },
        landlord: { lastName: 'Nzoko', primaryPhone: uniquePhone() },
        property: {
          name: 'Résidence Nzoko',
          addressLine: '12, rue des Manguiers',
          district: 'Ouenzé',
        },
      },
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('organization');
    expect(response.body).toHaveProperty('landlord');
    expect(response.body).toHaveProperty('property');
    expect(response.body).toHaveProperty('mandate');

    expect(response.body.organization.type).toBe('INDEPENDENT_MANAGER');
    expect(response.body.landlord.id).toBeTruthy();
    expect(response.body.property.id).toBeTruthy();

    // La commission par défaut (10 %, base « loyer encaissé ») s'applique
    // sans que l'appelant l'ait fournie — voir `onboarding.service.ts` et
    // `AGENCY_DEFAULT_COMMISSION_RATE_BPS` (config.schema.ts, défaut 1000).
    expect(response.body.mandate).toMatchObject({
      commissionBasis: 'RATE_BPS_ON_RENT_COLLECTED',
      commissionRateBps: 1000,
      status: 'DRAFT',
      landlordId: response.body.landlord.id,
      propertyIds: [response.body.property.id],
    });

    const orgRow = await ctx.admin.organizations.findUnique({
      where: { id: response.body.organization.id },
      select: { type: true },
    });
    expect(orgRow?.type).toBe('INDEPENDENT_MANAGER');

    // `dropOrganization` désactive les déclencheurs append-only (`audit_logs`,
    // alimenté par l'onboarding) avant de nettoyer — un simple `DELETE` direct
    // sur `organizations` serait rejeté par la cascade vers `audit_logs`.
    await dropOrganization(ctx.admin, response.body.organization.id, [user.userId]);
  });
});
