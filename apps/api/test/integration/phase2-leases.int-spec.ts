import {
  api,
  cleanupUser,
  login,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

/** `AAAA-MM-JJ` d'une date décalée de `days` jours par rapport à aujourd'hui. */
function isoDate(days = 0): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days))
    .toISOString()
    .slice(0, 10);
}

describe('Phase 2 — baux : cycle de vie, chevauchement, numérotation, dépôts', () => {
  let ctx: TestContext;
  const ownerPhone = uniquePhone();

  let owner: { accessToken: string; userId: string };
  let organizationId: string;
  let landlordId: string;
  let propertyId: string;
  const units = new Map<string, string>();
  const tenants: string[] = [];

  beforeAll(async () => {
    ctx = await startTestApp();
    owner = await login(ctx, ownerPhone);

    const organization = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: {
        type: 'AGENCY',
        legalName: 'Agence Baux Intégration SARL',
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
        companyName: 'SCI Les Manguiers',
        primaryPhone: uniquePhone(),
        district: 'Mpila',
      },
    });
    landlordId = landlord.body.id;

    const property = await api(ctx, 'POST', '/properties', {
      accessToken: owner.accessToken,
      organizationId,
      body: {
        landlordId,
        name: 'Résidence Mpila',
        propertyType: 'APARTMENT_BUILDING',
        addressLine: '45, avenue de la Corniche',
        district: 'Mpila',
      },
    });
    propertyId = property.body.id;

    const bulk = await api(ctx, 'POST', `/properties/${propertyId}/units/bulk`, {
      accessToken: owner.accessToken,
      organizationId,
      body: {
        prefix: 'B',
        from: 1,
        to: 8,
        template: { unitType: 'APARTMENT', baseRentAmount: 150000, depositMonths: 2 },
      },
    });
    for (const unit of bulk.body.created) units.set(unit.code, unit.id);

    for (let i = 0; i < 4; i += 1) {
      const tenant = await api(ctx, 'POST', '/tenants', {
        accessToken: owner.accessToken,
        organizationId,
        body: {
          partyType: 'INDIVIDUAL',
          firstName: 'Locataire',
          lastName: `Bail ${i}`,
          primaryPhone: uniquePhone(),
          district: 'Poto-Poto',
        },
      });
      tenants.push(tenant.body.id);
    }
  }, 120_000);

  afterAll(async () => {
    await cleanupUser(ctx, ownerPhone);
    await stopTestApp(ctx);
  });

  const asOwner = () => ({ accessToken: owner.accessToken, organizationId });

  const createLease = async (unitCode: string, tenantIndex: number, overrides = {}) =>
    api(ctx, 'POST', '/leases', {
      ...asOwner(),
      body: {
        unitId: units.get(unitCode),
        primaryTenantId: tenants[tenantIndex],
        startDate: isoDate(-30),
        endDate: isoDate(335),
        rentAmount: 150000,
        chargesAmount: 10000,
        depositAmount: 300000,
        paymentDueDay: 5,
        ...overrides,
      },
    });

  // -------------------------------------------------------------------------
  // Scénario Gherkin : activation et création du dépôt
  // -------------------------------------------------------------------------
  it('active un bail : lot OCCUPIED, dépôt de 300 000 à 0 encaissé, audit écrit', async () => {
    const created = await createLease('B1', 0);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('DRAFT');
    // Aucun numéro consommé tant que le bail n'est pas activé.
    expect(created.body.reference).toBeNull();

    const activated = await api(ctx, 'POST', `/leases/${created.body.id}/activate`, {
      ...asOwner(),
      body: { moveInDate: isoDate(-30) },
    });

    expect(activated.status).toBe(200);
    expect(activated.body.status).toBe('ACTIVE');
    expect(activated.body.reference).toMatch(/^BAIL-\d{4}-\d{5}$/);
    expect(activated.body.deposit).toMatchObject({
      status: 'PENDING',
      requiredAmount: 300000,
      collectedAmount: 0,
      heldAmount: 0,
      monthsEquivalent: 2,
    });
    expect(activated.body.parties).toHaveLength(1);
    expect(activated.body.parties[0]).toMatchObject({ role: 'PRIMARY_TENANT', shareBps: 10000 });

    const unit = await api(ctx, 'GET', `/units/${units.get('B1')}`, asOwner());
    expect(unit.body.status).toBe('OCCUPIED');

    const audits = await ctx.admin.audit_logs.findMany({
      where: {
        organization_id: organizationId,
        entity_id: created.body.id,
        action: 'STATE_TRANSITION',
      },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits.some((a) => a.reason === 'LEASE_ACTIVATED')).toBe(true);
  });

  it('refuse une transition invalide avec details.from et details.to', async () => {
    const lease = await createLease('B2', 1);
    await api(ctx, 'POST', `/leases/${lease.body.id}/activate`, { ...asOwner(), body: {} });

    const again = await api(ctx, 'POST', `/leases/${lease.body.id}/activate`, {
      ...asOwner(),
      body: {},
    });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('LEASES.INVALID_TRANSITION');
    expect(again.body.details).toMatchObject({ from: 'ACTIVE', to: 'ACTIVE' });
  });

  // -------------------------------------------------------------------------
  // Scénario Gherkin : refus du chevauchement, garanti EN BASE
  // -------------------------------------------------------------------------
  it('refuse un chevauchement de baux sur le même lot, lot occupé ou non', async () => {
    // Les deux brouillons sont créés PENDANT que le lot est encore libre :
    // c'est le cas réel d'une agence qui prépare la relocation avant le
    // départ du locataire en place.
    const first = await createLease('B5', 1, { startDate: isoDate(-20), endDate: isoDate(340) });
    const second = await createLease('B5', 2, { startDate: isoDate(10), endDate: isoDate(200) });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    expect(
      (await api(ctx, 'POST', `/leases/${first.body.id}/activate`, { ...asOwner(), body: {} }))
        .status,
    ).toBe(200);

    // 1. Lot OCCUPIED : la garde de disponibilité se déclenche la première.
    const occupied = await api(ctx, 'POST', `/leases/${second.body.id}/activate`, {
      ...asOwner(),
      body: {},
    });
    expect(occupied.status).toBe(409);
    expect(occupied.body.code).toBe('LEASES.UNIT_NOT_AVAILABLE');

    // 2. Dérive de données : le lot est remis AVAILABLE à la main alors qu'un
    // bail y court toujours. Le contrôle de chevauchement prend alors le
    // relais — et c'est bien lui que le Gherkin exige.
    await ctx.admin.units.update({
      where: { id: units.get('B5') },
      data: { status: 'AVAILABLE' },
    });

    const overlapping = await api(ctx, 'POST', `/leases/${second.body.id}/activate`, {
      ...asOwner(),
      body: {},
    });
    expect(overlapping.status).toBe(409);
    expect(overlapping.body.code).toBe('LEASES.OVERLAP');
    expect(overlapping.body.details.conflictingLeaseId).toBe(first.body.id);

    // Aucune ligne n'est passée à l'état actif.
    const stillDraft = await api(ctx, 'GET', `/leases/${second.body.id}`, asOwner());
    expect(stillDraft.body.status).toBe('DRAFT');
    expect(
      await ctx.admin.leases.count({
        where: { organization_id: organizationId, unit_id: units.get('B5'), status: 'ACTIVE' },
      }),
    ).toBe(1);

    await ctx.admin.units.update({
      where: { id: units.get('B5') },
      data: { status: 'OCCUPIED' },
    });
  });

  it('la contrainte `leases_no_overlap_excl` refuse le chevauchement EN BASE, hors de tout code applicatif', async () => {
    const active = await ctx.admin.leases.findFirst({
      where: { organization_id: organizationId, unit_id: units.get('B1'), status: 'ACTIVE' },
      select: { id: true },
    });
    expect(active).not.toBeNull();

    // Écriture DIRECTE avec le rôle d'administration : aucune vérification
    // applicative ne s'interpose. Seule la contrainte d'exclusion peut refuser.
    const insert = ctx.admin.$executeRawUnsafe(
      `INSERT INTO leases (id, organization_id, unit_id, property_id, landlord_id,
                           primary_tenant_id, reference, status, start_date, end_date, rent_amount)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
               $6, 'ACTIVE', $7::date, $8::date, 150000)`,
      organizationId,
      units.get('B1'),
      propertyId,
      landlordId,
      tenants[3],
      `EXCL-${Date.now()}`,
      isoDate(0),
      isoDate(60),
    );

    await expect(insert).rejects.toThrow(/23P01|leases_no_overlap_excl|exclusion/i);

    const activeCount = await ctx.admin.leases.count({
      where: { organization_id: organizationId, unit_id: units.get('B1'), status: 'ACTIVE' },
    });
    expect(activeCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Atomicité de l'activation
  // -------------------------------------------------------------------------
  it('annule TOUTE l’activation si l’insertion du dépôt échoue', async () => {
    const lease = await createLease('B4', 0);
    const leaseId = lease.body.id;

    const sequenceBefore = await ctx.admin.sequences.findFirst({
      where: { organization_id: organizationId, kind: 'LEASE' },
      select: { last_value: true },
    });

    // Artifice RÉSERVÉ AUX TESTS : un déclencheur qui fait échouer l'insertion
    // du dépôt. C'est le seul moyen d'éprouver le ROLLBACK sans attendre une
    // panne réelle — aucune contrainte du DDL ne peut être violée par une
    // activation par ailleurs valide.
    await ctx.admin.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION test_fail_deposit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'échec simulé de l''insertion du dépôt'; END $$`);
    await ctx.admin.$executeRawUnsafe(
      `CREATE TRIGGER trg_test_fail_deposit BEFORE INSERT ON deposits
         FOR EACH ROW EXECUTE FUNCTION test_fail_deposit()`,
    );

    try {
      const activated = await api(ctx, 'POST', `/leases/${leaseId}/activate`, {
        ...asOwner(),
        body: {},
      });
      expect(activated.status).toBe(500);
    } finally {
      await ctx.admin.$executeRawUnsafe(`DROP TRIGGER trg_test_fail_deposit ON deposits`);
      await ctx.admin.$executeRawUnsafe(`DROP FUNCTION test_fail_deposit()`);
    }

    // --- Les CINQ écritures de l'activation ont été annulées --------------
    const row = await ctx.admin.leases.findUniqueOrThrow({ where: { id: leaseId } });
    expect(row.status).toBe('DRAFT');
    expect(row.reference.startsWith('BROUILLON-')).toBe(true);
    expect(row.move_in_date).toBeNull();

    const unit = await ctx.admin.units.findUniqueOrThrow({ where: { id: units.get('B4') } });
    expect(unit.status).toBe('AVAILABLE');

    expect(await ctx.admin.lease_parties.count({ where: { lease_id: leaseId } })).toBe(0);
    expect(await ctx.admin.deposits.count({ where: { lease_id: leaseId } })).toBe(0);

    // Le compteur de numérotation est revenu en arrière avec la transaction :
    // aucun trou n'a été creusé dans la série par cet échec.
    const sequenceAfter = await ctx.admin.sequences.findFirst({
      where: { organization_id: organizationId, kind: 'LEASE' },
      select: { last_value: true },
    });
    expect(sequenceAfter?.last_value).toBe(sequenceBefore?.last_value);

    // Et le bail reste activable une fois l'incident passé.
    const retry = await api(ctx, 'POST', `/leases/${leaseId}/activate`, { ...asOwner(), body: {} });
    expect(retry.status).toBe(200);
    expect(retry.body.status).toBe('ACTIVE');
  }, 120_000);

  // -------------------------------------------------------------------------
  // Numérotation sous charge concurrente
  // -------------------------------------------------------------------------
  it('attribue 100 références concurrentes sans trou ni doublon', async () => {
    const bulk = await api(ctx, 'POST', `/properties/${propertyId}/units/bulk`, {
      ...asOwner(),
      body: {
        prefix: 'C',
        from: 1,
        to: 100,
        padding: 3,
        template: { unitType: 'STUDIO', baseRentAmount: 75000, depositMonths: 2 },
      },
    });
    expect(bulk.body.created).toHaveLength(100);

    const drafts = await Promise.all(
      bulk.body.created.map((unit: { id: string }) =>
        api(ctx, 'POST', '/leases', {
          ...asOwner(),
          body: {
            unitId: unit.id,
            primaryTenantId: tenants[0],
            startDate: isoDate(0),
            endDate: isoDate(365),
            rentAmount: 75000,
            depositAmount: 150000,
          },
        }),
      ),
    );
    expect(drafts.every((d) => d.status === 201)).toBe(true);

    const before = await ctx.admin.sequences.findFirst({
      where: { organization_id: organizationId, kind: 'LEASE' },
      select: { last_value: true },
    });
    const start = Number(before?.last_value ?? 0n);

    // 100 activations SIMULTANÉES : chacune réserve son numéro dans sa propre
    // transaction. `next_sequence` étant un INSERT … ON CONFLICT DO UPDATE
    // RETURNING, PostgreSQL sérialise les prétendants sur la ligne du
    // compteur ; aucun numéro ne peut être servi deux fois.
    const activations = await Promise.all(
      drafts.map((draft) =>
        api(ctx, 'POST', `/leases/${draft.body.id}/activate`, { ...asOwner(), body: {} }),
      ),
    );
    expect(activations.filter((a) => a.status === 200)).toHaveLength(100);

    const references = activations.map((a) => a.body.reference as string);
    expect(new Set(references).size).toBe(100);
    expect(references.every((r) => /^BAIL-\d{4}-\d{5}$/.test(r))).toBe(true);

    const counters = references.map((r) => Number(r.split('-')[2])).sort((a, b) => a - b);
    expect(counters[0]).toBe(start + 1);
    expect(counters[99]).toBe(start + 100);
    // Série strictement contiguë : ni trou, ni doublon.
    expect(counters.every((value, index) => value === start + 1 + index)).toBe(true);
  }, 300_000);
});
