import { v7 as uuidv7 } from 'uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { addMember, createAgency, dropOrganization, type Agency } from './phase3-fixtures';

/**
 * Phase 9 — quatre tableaux de bord (`GET /v1/dashboards/*`).
 *
 * IMPÉRATIF : toutes les dates sont des LITTÉRAUX ISO fixés à l'écriture du
 * test (2026-05 à 2026-09), jamais dérivés de `new Date()` — ni côté
 * fixture, ni côté assertion. `asOf`/`from`/`to` sont toujours passés
 * explicitement à l'API : les tranches d'ancienneté et la durée de vacance
 * sont calculées depuis ces ancres, jamais depuis la date d'exécution du
 * test (piège déjà rencontré sur ce projet).
 *
 * Les factures et paiements sont insérés directement en SQL (rôle
 * d'administration) plutôt que par la campagne de facturation : celle-ci
 * calcule ses échéances depuis « aujourd'hui », ce qui romprait précisément
 * l'ancrage recherché ici.
 */
describe('Phase 9 — tableaux de bord', () => {
  let ctx: TestContext;
  let agency: Agency;
  let viewer: { accessToken: string; userId: string };
  let propertyId: string;
  let propertyDecoyId: string;
  let tenantId: string;

  const owner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Reporting');
    viewer = await addMember(ctx, agency.organizationId, 'VIEWER');

    const landlordId = uuidv7();
    propertyId = uuidv7();
    tenantId = uuidv7();
    const unitOccupiedId = uuidv7();
    const unitVacantId = uuidv7();
    const leaseActiveId = uuidv7();
    const leaseEndedId = uuidv7();

    // Décor d'un second immeuble, jamais interrogé par `propertyId` : prouve
    // que le filtre exclut réellement ses montants énormes des résultats.
    const landlordId2 = uuidv7();
    propertyDecoyId = uuidv7();
    const propertyId2 = propertyDecoyId;
    const unitDecoyId = uuidv7();
    const tenantId2 = uuidv7();

    const orgId = agency.organizationId;
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO landlords (id, organization_id, last_name, primary_phone) VALUES ($1::uuid,$2::uuid,'Bailleur Reporting','+242060000001')`,
      landlordId,
      orgId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO properties (id, organization_id, landlord_id, name, address_line, district) VALUES ($1::uuid,$2::uuid,$3::uuid,'Résidence Reporting','1 rue Test','Bacongo')`,
      propertyId,
      orgId,
      landlordId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO units (id, organization_id, property_id, code, status) VALUES ($1::uuid,$2::uuid,$3::uuid,'U1','OCCUPIED')`,
      unitOccupiedId,
      orgId,
      propertyId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO units (id, organization_id, property_id, code, status) VALUES ($1::uuid,$2::uuid,$3::uuid,'U2','AVAILABLE')`,
      unitVacantId,
      orgId,
      propertyId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO tenants (id, organization_id, first_name, last_name, primary_phone) VALUES ($1::uuid,$2::uuid,'Jean','Ngoma','+242060000002')`,
      tenantId,
      orgId,
    );
    // Bail actif sur le lot occupé.
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO leases (id, organization_id, unit_id, property_id, landlord_id, primary_tenant_id, reference, status, start_date, rent_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'BAIL-TEST-1','ACTIVE','2026-01-01',100000)`,
      leaseActiveId,
      orgId,
      unitOccupiedId,
      propertyId,
      landlordId,
      tenantId,
    );
    // Bail résilié sur le lot vacant : fin le 2026-06-30, donc 79 jours de
    // vacance à l'ancre du 2026-09-17 utilisée par les tests ci-dessous.
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO leases (id, organization_id, unit_id, property_id, landlord_id, primary_tenant_id, reference, status, start_date, end_date, move_out_date, rent_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'BAIL-TEST-2','TERMINATED','2025-01-01','2026-06-30','2026-06-30',80000)`,
      leaseEndedId,
      orgId,
      unitVacantId,
      propertyId,
      landlordId,
      tenantId,
    );

    // Facture de mai 2026, soldée par un paiement CASH le jour de l'échéance.
    const invoicePaidId = uuidv7();
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO rent_invoices (id, organization_id, lease_id, tenant_id, unit_id, property_id, landlord_id, invoice_number, status, period_start, period_end, due_date, total_amount, paid_amount, balance_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,'LOY-TEST-0001','PAID','2026-05-01','2026-05-31','2026-05-05',100000,100000,0)`,
      invoicePaidId,
      orgId,
      leaseActiveId,
      tenantId,
      unitOccupiedId,
      propertyId,
      landlordId,
    );
    const paymentId = uuidv7();
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO payments (id, organization_id, tenant_id, lease_id, landlord_id, method, status, reference, amount, payment_date)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,'CASH','CONFIRMED','PAY-TEST-1',100000,'2026-05-05')`,
      paymentId,
      orgId,
      tenantId,
      leaseActiveId,
      landlordId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO payment_allocations (id, organization_id, payment_id, invoice_id, amount, allocation_date)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,100000,'2026-05-05')`,
      uuidv7(),
      orgId,
      paymentId,
      invoicePaidId,
    );

    // Facture impayée, échéance 2026-08-01 : 47 jours de retard à l'ancre du
    // 2026-09-17 → tranche 31-60.
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO rent_invoices (id, organization_id, lease_id, tenant_id, unit_id, property_id, landlord_id, invoice_number, status, period_start, period_end, due_date, total_amount, paid_amount, balance_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,'LOY-TEST-0002','OVERDUE','2026-08-01','2026-08-31','2026-08-01',90000,0,90000)`,
      uuidv7(),
      orgId,
      leaseActiveId,
      tenantId,
      unitOccupiedId,
      propertyId,
      landlordId,
    );
    // Facture impayée, échéance 2026-05-20 : 120 jours de retard → tranche 90+.
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO rent_invoices (id, organization_id, lease_id, tenant_id, unit_id, property_id, landlord_id, invoice_number, status, period_start, period_end, due_date, total_amount, paid_amount, balance_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,'LOY-TEST-0003','OVERDUE','2026-05-15','2026-05-31','2026-05-20',60000,0,60000)`,
      uuidv7(),
      orgId,
      leaseActiveId,
      tenantId,
      unitOccupiedId,
      propertyId,
      landlordId,
    );

    // Décor : second immeuble, jamais loué (exclu de la moyenne de vacance),
    // et une facture énorme, très en retard, qui NE DOIT apparaître dans
    // aucun résultat filtré sur `propertyId`.
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO landlords (id, organization_id, last_name, primary_phone) VALUES ($1::uuid,$2::uuid,'Bailleur Decor','+242060000003')`,
      landlordId2,
      orgId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO properties (id, organization_id, landlord_id, name, address_line, district) VALUES ($1::uuid,$2::uuid,$3::uuid,'Résidence Décor','2 rue Test','Moungali')`,
      propertyId2,
      orgId,
      landlordId2,
    );
    // OCCUPIED d'emblée (comme `unitOccupiedId` ci-dessus) : le bail ACTIVE
    // créé plus bas n'écrit lui-même aucun statut de lot dans ce fixture SQL.
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO units (id, organization_id, property_id, code, status) VALUES ($1::uuid,$2::uuid,$3::uuid,'D1','OCCUPIED')`,
      unitDecoyId,
      orgId,
      propertyId2,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO tenants (id, organization_id, first_name, last_name, primary_phone) VALUES ($1::uuid,$2::uuid,'Decor','Test','+242060000004')`,
      tenantId2,
      orgId,
    );
    const leaseDecoyId = uuidv7();
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO leases (id, organization_id, unit_id, property_id, landlord_id, primary_tenant_id, reference, status, start_date, rent_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'BAIL-DECOR','ACTIVE','2024-01-01',999999)`,
      leaseDecoyId,
      orgId,
      unitDecoyId,
      propertyId2,
      landlordId2,
      tenantId2,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO rent_invoices (id, organization_id, lease_id, tenant_id, unit_id, property_id, landlord_id, invoice_number, status, period_start, period_end, due_date, total_amount, paid_amount, balance_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,'LOY-DECOR-0001','OVERDUE','2020-01-01','2020-01-31','2020-01-01',999999999,0,999999999)`,
      uuidv7(),
      orgId,
      leaseDecoyId,
      tenantId2,
      unitDecoyId,
      propertyId2,
      landlordId2,
    );
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId, viewer.userId]);
    await stopTestApp(ctx);
  });

  it('collection-rate : dû, encaissé, taux, série mensuelle filtrés par immeuble', async () => {
    const res = await api(
      ctx,
      'GET',
      `/dashboards/collection-rate?from=2026-05-01&to=2026-08-31&propertyId=${propertyId}`,
      owner(),
    );
    expect(res.status).toBe(200);
    expect(res.body.dueAmount).toBe(250_000);
    expect(res.body.collectedAmount).toBe(100_000);
    expect(res.body.outstandingAmount).toBe(150_000);
    expect(res.body.collectionRateBps).toBe(4_000);
    const may = res.body.series.find((s: { period: string }) => s.period === '2026-05');
    expect(may).toMatchObject({ dueAmount: 160_000, collectedAmount: 100_000 });
    const property = res.body.byProperty.find(
      (p: { propertyId: string }) => p.propertyId === propertyId,
    );
    expect(property.dueAmount).toBe(250_000);
  });

  it('arrears : tranches 31-60 et 90+, débiteur le plus en retard, décor exclu', async () => {
    const res = await api(
      ctx,
      'GET',
      `/dashboards/arrears?asOf=2026-09-17&propertyId=${propertyId}`,
      owner(),
    );
    expect(res.status).toBe(200);
    expect(res.body.totalAmount).toBe(150_000);
    expect(res.body.invoicesCount).toBe(2);
    const b3160 = res.body.buckets.find((b: { label: string }) => b.label === '31-60');
    expect(b3160).toMatchObject({ amount: 90_000, invoicesCount: 1 });
    const b90 = res.body.buckets.find((b: { label: string }) => b.label === '90+');
    expect(b90).toMatchObject({ amount: 60_000, invoicesCount: 1 });
    const zeroBucket = res.body.buckets.find((b: { label: string }) => b.label === '0-30');
    expect(zeroBucket).toMatchObject({ amount: 0, invoicesCount: 0 });
    expect(res.body.topDebtors[0]).toMatchObject({
      tenantId,
      phone: '+242060000002',
      amount: 150_000,
      oldestDueDate: '2026-05-20',
      daysOverdue: 120,
    });
  });

  it('vacancy : lot vacant, durée moyenne depuis la fin du dernier bail', async () => {
    const res = await api(
      ctx,
      'GET',
      `/dashboards/vacancy?asOf=2026-09-17&propertyId=${propertyId}`,
      owner(),
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      unitsCount: 2,
      occupiedCount: 1,
      vacantCount: 1,
      vacancyRateBps: 5_000,
      averageVacancyDays: 79,
    });
  });

  it('vacancy : l’immeuble décor est loué (ACTIVE), donc sans lot vacant', async () => {
    const res = await api(
      ctx,
      'GET',
      `/dashboards/vacancy?asOf=2026-09-17&propertyId=${propertyDecoyId}`,
      owner(),
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ unitsCount: 1, occupiedCount: 1, vacantCount: 0 });
  });

  it('payment-methods : répartition par mode sur la période, décor exclu', async () => {
    const res = await api(
      ctx,
      'GET',
      `/dashboards/payment-methods?from=2026-05-01&to=2026-05-31&propertyId=${propertyId}`,
      owner(),
    );
    expect(res.status).toBe(200);
    expect(res.body.totalAmount).toBe(100_000);
    const cash = res.body.byMethod.find((m: { method: string }) => m.method === 'CASH');
    expect(cash).toMatchObject({ amount: 100_000, shareBps: 10_000, count: 1 });
    const momo = res.body.byMethod.find((m: { method: string }) => m.method === 'MOBILE_MONEY');
    expect(momo).toMatchObject({ amount: 0, shareBps: 0, count: 0 });
  });

  it('collection-rate : refuse une période inversée (from > to)', async () => {
    const res = await api(
      ctx,
      'GET',
      '/dashboards/collection-rate?from=2026-09-01&to=2026-01-01',
      owner(),
    );
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('REPORTING.INVALID_PERIOD');
  });

  it('VIEWER peut consulter les quatre tableaux de bord (lecture seule)', async () => {
    const asViewer = { accessToken: viewer.accessToken, organizationId: agency.organizationId };
    for (const path of [
      '/dashboards/collection-rate',
      '/dashboards/arrears',
      '/dashboards/vacancy',
      '/dashboards/payment-methods',
    ]) {
      const res = await api(ctx, 'GET', path, asViewer);
      expect(res.status).toBe(200);
    }
  });
});
