import { v7 as uuidv7 } from 'uuid';
import {
  api,
  cleanupUser,
  login,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

describe('Phase 1 — patrimoine : immeubles, lots en série, occupation', () => {
  let ctx: TestContext;
  const ownerPhone = uniquePhone();

  let owner: { accessToken: string; userId: string };
  let organizationId: string;
  let landlordId: string;
  let propertyId: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    owner = await login(ctx, ownerPhone);

    const organization = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: {
        type: 'AGENCY',
        legalName: 'Agence Patrimoine Intégration SARL',
        city: 'Brazzaville',
        district: 'Mpila',
        contactPhone: ownerPhone,
      },
    });
    organizationId = organization.body.id;

    const landlord = await api(ctx, 'POST', '/landlords', {
      accessToken: owner.accessToken,
      organizationId,
      body: {
        partyType: 'COMPANY',
        companyName: 'SCI Mpila',
        primaryPhone: uniquePhone(),
        district: 'Mpila',
      },
    });
    landlordId = landlord.body.id;
  }, 60_000);

  afterAll(async () => {
    await cleanupUser(ctx, ownerPhone);
    await stopTestApp(ctx);
  });

  const asOwner = () => ({ accessToken: owner.accessToken, organizationId });

  it('crée l’immeuble « Résidence Mpila »', async () => {
    const created = await api(ctx, 'POST', '/properties', {
      ...asOwner(),
      body: {
        landlordId,
        code: 'RES-MPILA-IT',
        name: 'Résidence Mpila',
        propertyType: 'APARTMENT_BUILDING',
        addressLine: '45, avenue de la Corniche',
        district: 'Mpila',
        arrondissement: '6e arrondissement Talangaï',
        landmark: "Derrière l'école Nganga Édouard",
      },
    });

    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Résidence Mpila');
    expect(created.body.unitsCount).toBe(0);
    propertyId = created.body.id;
  });

  it('crée 12 lots A1..A12 dans une transaction unique, taux d’occupation à 0 %', async () => {
    const created = await api(ctx, 'POST', `/properties/${propertyId}/units/bulk`, {
      ...asOwner(),
      body: {
        prefix: 'A',
        from: 1,
        to: 12,
        template: { unitType: 'APARTMENT', baseRentAmount: 150000, baseChargesAmount: 15000 },
      },
    });

    expect(created.status).toBe(201);
    expect(created.body.created).toHaveLength(12);
    expect(created.body.created.map((u: { code: string }) => u.code)).toEqual([
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'A6',
      'A7',
      'A8',
      'A9',
      'A10',
      'A11',
      'A12',
    ]);
    // Montants XAF : BigInt en base, entier JSON en sortie.
    expect(created.body.created[0].baseRentAmount).toBe(150000);
    expect(created.body.created[0].baseChargesAmount).toBe(15000);
    expect(typeof created.body.created[0].baseRentAmount).toBe('number');
    expect(created.body.created[0].currency).toBe('XAF');

    const detail = await api(ctx, 'GET', `/properties/${propertyId}`, asOwner());
    expect(detail.status).toBe(200);
    expect(detail.body.units).toHaveLength(12);
    expect(detail.body.occupancy).toEqual({
      unitsCount: 12,
      occupiedCount: 0,
      availableCount: 12,
      occupancyRateBps: 0,
    });
    // Le compteur dénormalisé est tenu à jour par l'application.
    expect(detail.body.unitsCount).toBe(12);

    const audit = await ctx.admin.audit_logs.findFirst({
      where: { organization_id: organizationId, reason: 'UNITS_BULK_CREATED' },
    });
    expect(audit).not.toBeNull();
  });

  it('annule toute la série si un seul code est en doublon (tout ou rien)', async () => {
    const before = await ctx.admin.units.count({
      where: { property_id: propertyId, deleted_at: null },
    });
    expect(before).toBe(12);

    // A10..A15 : A10, A11 et A12 existent déjà.
    const refused = await api(ctx, 'POST', `/properties/${propertyId}/units/bulk`, {
      ...asOwner(),
      body: { prefix: 'A', from: 10, to: 15, template: { baseRentAmount: 90000 } },
    });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('PORTFOLIO.UNIT_CODE_TAKEN');

    // Aucun des lots A13, A14, A15 ne doit subsister : le ROLLBACK a tout
    // annulé. Une saisie partielle serait pire que pas de saisie du tout.
    const after = await ctx.admin.units.count({
      where: { property_id: propertyId, deleted_at: null },
    });
    expect(after).toBe(12);
    const orphans = await ctx.admin.units.findMany({
      where: { property_id: propertyId, code: { in: ['A13', 'A14', 'A15'] } },
    });
    expect(orphans).toEqual([]);
  });

  it('recalcule le taux d’occupation quand un lot passe à OCCUPIED', async () => {
    const units = await api(ctx, 'GET', `/units?propertyId=${propertyId}&limit=100`, asOwner());
    expect(units.status).toBe(200);
    const four = units.body.items.slice(0, 4);

    for (const unit of four) {
      const updated = await api(ctx, 'PATCH', `/units/${unit.id}`, {
        ...asOwner(),
        body: { status: 'OCCUPIED' },
      });
      expect(updated.status).toBe(200);
    }

    const detail = await api(ctx, 'GET', `/properties/${propertyId}`, asOwner());
    // 4 occupés sur 12 : 3333 bps, arrondi au point de base le plus proche.
    expect(detail.body.occupancy).toEqual({
      unitsCount: 12,
      occupiedCount: 4,
      availableCount: 8,
      occupancyRateBps: 3333,
    });

    const list = await api(ctx, 'GET', '/properties', asOwner());
    const summary = list.body.items.find((p: { id: string }) => p.id === propertyId);
    expect(summary.occupancy.occupancyRateBps).toBe(3333);
    expect(summary.landlord.displayName).toBe('SCI Mpila');
  });

  it('filtre les lots par statut et recherche par code', async () => {
    const occupied = await api(
      ctx,
      'GET',
      `/units?propertyId=${propertyId}&status=OCCUPIED&limit=100`,
      asOwner(),
    );
    expect(occupied.body.items).toHaveLength(4);

    const byCode = await api(ctx, 'GET', `/units?propertyId=${propertyId}&q=A12`, asOwner());
    expect(byCode.body.items.map((u: { code: string }) => u.code)).toEqual(['A12']);
  });

  it('refuse de supprimer un lot rattaché à un bail ACTIF', async () => {
    // Aucune route de bail n'existe en phase 1 : le bail est inséré
    // directement en SQL, exactement comme le prévoit le contrat.
    const units = await api(ctx, 'GET', `/units?propertyId=${propertyId}&limit=100`, asOwner());
    const unit = units.body.items[0];

    const tenant = await api(ctx, 'POST', '/tenants', {
      ...asOwner(),
      body: { lastName: 'Makaya', firstName: 'Serge', primaryPhone: uniquePhone() },
    });
    const leaseId = uuidv7();

    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO leases (id, organization_id, unit_id, property_id, landlord_id,
                           primary_tenant_id, reference, status, start_date, rent_amount)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7, 'ACTIVE',
               current_date, 150000)`,
      leaseId,
      organizationId,
      unit.id,
      propertyId,
      landlordId,
      tenant.body.id,
      `BAIL-IT-${Date.now()}`,
    );

    try {
      const refused = await api(ctx, 'DELETE', `/units/${unit.id}`, asOwner());
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('PORTFOLIO.UNIT_HAS_ACTIVE_LEASE');

      // `deleted_at` reste nul : le scénario Gherkin l'exige explicitement.
      const row = await ctx.admin.units.findUnique({ where: { id: unit.id } });
      expect(row?.deleted_at).toBeNull();

      // Un bail TERMINÉ ne bloque plus rien.
      await ctx.admin.$executeRawUnsafe(
        `UPDATE leases SET status = 'TERMINATED' WHERE id = $1::uuid`,
        leaseId,
      );
      const removed = await api(ctx, 'DELETE', `/units/${unit.id}`, asOwner());
      expect(removed.status).toBe(204);

      const afterDelete = await ctx.admin.units.findUnique({ where: { id: unit.id } });
      expect(afterDelete).not.toBeNull();
      expect(afterDelete?.deleted_at).not.toBeNull();
    } finally {
      await ctx.admin.$executeRawUnsafe(`DELETE FROM leases WHERE id = $1::uuid`, leaseId);
    }
  });

  it('refuse de supprimer un immeuble qui porte encore des lots', async () => {
    const refused = await api(ctx, 'DELETE', `/properties/${propertyId}`, asOwner());
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('PORTFOLIO.PROPERTY_HAS_UNITS');
  });

  it('refuse de supprimer un bailleur qui porte encore des biens', async () => {
    const refused = await api(ctx, 'DELETE', `/landlords/${landlordId}`, asOwner());
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('PARTIES.LANDLORD_HAS_PROPERTIES');
  });

  it('répond 404 sur un immeuble d’une autre organisation, jamais 403', async () => {
    const strangerPhone = uniquePhone();
    const stranger = await login(ctx, strangerPhone);
    const otherOrg = await api(ctx, 'POST', '/organizations', {
      accessToken: stranger.accessToken,
      body: {
        type: 'AGENCY',
        legalName: 'Agence Voisine SARL',
        city: 'Pointe-Noire',
        contactPhone: strangerPhone,
      },
    });

    try {
      const hidden = await api(ctx, 'GET', `/properties/${propertyId}`, {
        accessToken: stranger.accessToken,
        organizationId: otherOrg.body.id,
      });
      expect(hidden.status).toBe(404);
      expect(hidden.body.code).toBe('PORTFOLIO.PROPERTY_NOT_FOUND');
    } finally {
      await cleanupUser(ctx, strangerPhone);
    }
  });
});
