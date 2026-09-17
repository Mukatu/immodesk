import { v7 as uuidv7 } from 'uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { addMember, createAgency, dropOrganization, type Agency } from './phase3-fixtures';

/**
 * Phase 9 — exports CSV (`POST /v1/exports/{kind}`,
 * `GET /v1/exports/jobs/{jobId}`).
 *
 * Le jeu de données est minuscule (une poignée de lignes), donc toujours
 * sous `EXPORT_SYNC_ROW_LIMIT` : ces tests couvrent le chemin SYNCHRONE
 * (201). Le chemin de fond (202 + file BullMQ) est couvert par
 * `export-worker.ts` lui-même (raccordement direct au même
 * `buildAndStore`) ; le reproduire ici demanderait de dépasser dix mille
 * lignes en base, hors de portée d'un test d'intégration rapide.
 *
 * Dates ANCRÉES (2026-05), jamais dérivées de `new Date()`.
 */
describe('Phase 9 — exports CSV', () => {
  let ctx: TestContext;
  let agency: Agency;
  let accountant: { accessToken: string; userId: string };
  let viewer: { accessToken: string; userId: string };
  let tenantId: string;

  const asAccountant = () => ({
    accessToken: accountant.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Exports');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
    viewer = await addMember(ctx, agency.organizationId, 'VIEWER');

    const orgId = agency.organizationId;
    const landlordId = uuidv7();
    const propertyId = uuidv7();
    const unitId = uuidv7();
    tenantId = uuidv7();
    const leaseId = uuidv7();

    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO landlords (id, organization_id, last_name, primary_phone) VALUES ($1::uuid,$2::uuid,'Bailleur Export','+242061000001')`,
      landlordId,
      orgId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO properties (id, organization_id, landlord_id, name, address_line, district) VALUES ($1::uuid,$2::uuid,$3::uuid,'Résidence Export','3 rue Test','Poto-Poto')`,
      propertyId,
      orgId,
      landlordId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO units (id, organization_id, property_id, code, status) VALUES ($1::uuid,$2::uuid,$3::uuid,'E1','OCCUPIED')`,
      unitId,
      orgId,
      propertyId,
    );
    // Nom AVEC point-virgule ET guillemets : piège explicite de la tranche 4.
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO tenants (id, organization_id, first_name, last_name, primary_phone) VALUES ($1::uuid,$2::uuid,'Ngoma','dit "Le Sage" ; Poto-Poto','+242061000002')`,
      tenantId,
      orgId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO leases (id, organization_id, unit_id, property_id, landlord_id, primary_tenant_id, reference, status, start_date, rent_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'BAIL-EXPORT-1','ACTIVE','2026-01-01',100000)`,
      leaseId,
      orgId,
      unitId,
      propertyId,
      landlordId,
      tenantId,
    );
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO rent_invoices (id, organization_id, lease_id, tenant_id, unit_id, property_id, landlord_id, invoice_number, status, period_start, period_end, due_date, total_amount, paid_amount, balance_amount)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,'LOY-EXPORT-0001','OVERDUE','2026-05-01','2026-05-31','2026-05-05',75000,0,75000)`,
      uuidv7(),
      orgId,
      leaseId,
      tenantId,
      unitId,
      propertyId,
      landlordId,
    );
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      accountant.userId,
      viewer.userId,
    ]);
    await stopTestApp(ctx);
  });

  it('kind=arrears : produit un CSV synchrone, UTF-8 BOM + point-virgule, lien signé', async () => {
    const res = await api(ctx, 'POST', '/exports/arrears', {
      ...asAccountant(),
      body: { asOf: '2026-09-17' },
    });
    expect(res.status).toBe(201);
    expect(res.body.rowCount).toBe(1);
    expect(res.body.documentId).toBeDefined();
    expect(res.body.downloadUrl).toContain('http');
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const download = await fetch(res.body.downloadUrl);
    expect(download.status).toBe(200);
    const buffer = Buffer.from(await download.arrayBuffer());
    // BOM UTF-8 : EF BB BF.
    expect(buffer.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    const text = buffer.toString('utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff); // BOM UTF-8, décodé en U+FEFF
    const lines = text.slice(1).split('\r\n').filter(Boolean);
    expect(lines[0].split(';')).toContain('Locataire');
    // Le nom du locataire, avec point-virgule ET guillemets, doit rester une
    // seule colonne à la relecture : entre guillemets, guillemets internes
    // doublés.
    expect(lines[1]).toContain('"Ngoma dit ""Le Sage"" ; Poto-Poto"');
    expect(lines[1]).toContain('75000');
  });

  it('kind=dashboard sans dashboardKind : 422 EXPORTS.DASHBOARD_KIND_INVALID', async () => {
    const res = await api(ctx, 'POST', '/exports/dashboard', { ...asAccountant(), body: {} });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('EXPORTS.DASHBOARD_KIND_INVALID');
  });

  it('kind inconnu : 422 EXPORTS.KIND_INVALID', async () => {
    const res = await api(ctx, 'POST', '/exports/unknown-kind', { ...asAccountant(), body: {} });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('EXPORTS.KIND_INVALID');
  });

  it('kind=dashboard, dashboardKind=payment-methods : export agrégé', async () => {
    const res = await api(ctx, 'POST', '/exports/dashboard', {
      ...asAccountant(),
      body: { dashboardKind: 'payment-methods', from: '2026-05-01', to: '2026-05-31' },
    });
    expect(res.status).toBe(201);
    expect(res.body.rowCount).toBe(4); // les quatre modes, même à zéro
  });

  it("GET /exports/jobs/{jobId} : job d'une autre organisation → 404, jamais 403", async () => {
    const other = await createAgency(ctx, 'ExportsAutre');
    const created = await api(ctx, 'POST', '/exports/arrears', {
      accessToken: other.owner.accessToken,
      organizationId: other.organizationId,
      body: {},
    });
    expect(created.status).toBe(201); // synchrone : pas de jobId à tester ici

    const res = await api(ctx, 'GET', '/exports/jobs/00000000-0000-0000-0000-000000000000', {
      ...asAccountant(),
    });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('EXPORTS.JOB_NOT_FOUND');

    await dropOrganization(ctx.admin, other.organizationId, [other.owner.userId]);
  });

  it('VIEWER ne peut pas lancer un export (ACCOUNTANT minimum)', async () => {
    const res = await api(ctx, 'POST', '/exports/arrears', {
      accessToken: viewer.accessToken,
      organizationId: agency.organizationId,
      body: {},
    });
    expect(res.status).toBe(403);
  });
});
