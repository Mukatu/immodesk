import { createHash } from 'node:crypto';
import { api, startTestApp, stopTestApp, type ApiResponse, type TestContext } from './helpers';
import { addMember, createAgency, dropOrganization, type Agency } from './phase3-fixtures';

/**
 * Phase 10 — import de portefeuille (`POST /v1/portfolio-imports`,
 * `GET /v1/portfolio-imports/{jobId}`). Aucune table dédiée : le fichier et
 * le rapport vivent dans `documents` (genre `OTHER`), même mécanique que les
 * exports de la phase 9 (202 + jobId + suivi).
 */
describe('Phase 10 — import de portefeuille', () => {
  let ctx: TestContext;
  let agency: Agency;
  let accountant: { accessToken: string; userId: string };

  const asOwner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Imports');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      accountant.userId,
    ]);
    await stopTestApp(ctx);
  });

  /** Téléverse un CSV via le mécanisme habituel du module documents. */
  async function uploadCsv(
    auth: { accessToken: string; organizationId: string },
    csv: string,
  ): Promise<string> {
    const body = Buffer.from(csv, 'utf8');
    const signed = await api(ctx, 'POST', '/documents/upload-url', {
      ...auth,
      body: {
        fileName: 'portefeuille.csv',
        mimeType: 'text/csv',
        sizeBytes: body.length,
        kind: 'OTHER',
      },
    });
    expect(signed.status).toBe(201);

    const put = await fetch(signed.body.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/csv' },
      body,
    });
    expect(put.status).toBe(200);

    const registered = await api(ctx, 'POST', '/documents', {
      ...auth,
      body: {
        objectKey: signed.body.objectKey,
        fileName: 'portefeuille.csv',
        mimeType: 'text/csv',
        sizeBytes: body.length,
        kind: 'OTHER',
        checksumSha256: createHash('sha256').update(body).digest('hex'),
      },
    });
    expect(registered.status).toBe(201);
    return registered.body.id;
  }

  async function pollUntilDone(
    auth: { accessToken: string; organizationId: string },
    jobId: string,
  ): Promise<ApiResponse> {
    const deadline = Date.now() + 20_000;
    for (;;) {
      const res = await api(ctx, 'GET', `/portfolio-imports/${jobId}`, auth);
      if (res.body.status === 'COMPLETED' || res.body.status === 'FAILED') return res;
      if (Date.now() > deadline)
        throw new Error(`Import ${jobId} non terminé dans le délai imparti.`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Cinq lignes valides (un bailleur, un bien, deux lots, un locataire, un
  // bail) et UNE ligne fautive (`LOT` sans code, colonne obligatoire vide) :
  // le rapport doit compter 6 lignes lues, 5 créées, 1 rejetée avec motif.
  const CSV = [
    'BAILLEUR;L1;Import Bailleur;;;+242062000001',
    'BIEN;B1;L1;Residence Import;10 Avenue Test;Ouenze',
    'LOT;U1;B1;A1;100000;2',
    'LOT;U2;B1;',
    'LOCATAIRE;T1;Import Locataire;;+242062000002',
    'BAIL;U1;T1;2026-02-01;100000',
  ].join('\n');

  it('traite une ligne fautive sans interrompre les autres, et journalise son motif', async () => {
    const documentId = await uploadCsv(asOwner(), CSV);

    const created = await api(ctx, 'POST', '/portfolio-imports', {
      ...asOwner(),
      body: { documentId },
    });
    expect(created.status).toBe(202);
    expect(created.body.jobId).toBeDefined();

    const report = await pollUntilDone(asOwner(), created.body.jobId);
    expect(report.status).toBe(200);
    expect(report.body.status).toBe('COMPLETED');
    expect(report.body.totalRows).toBe(6);
    expect(report.body.createdCount).toBe(5);
    expect(report.body.rejectedCount).toBe(1);
    expect(report.body.rejected).toHaveLength(1);
    expect(report.body.rejected[0]).toMatchObject({ line: 4 });
    expect(report.body.rejected[0].reason).toContain('code');
    expect(report.body.documentId).toBeDefined();
    expect(report.body.downloadUrl).toContain('http');
  });

  it('deux imports simultanés sur la même organisation : 409 IMPORTS.ALREADY_RUNNING', async () => {
    const first = await uploadCsv(asOwner(), CSV);
    const second = await uploadCsv(asOwner(), CSV);

    const started = await api(ctx, 'POST', '/portfolio-imports', {
      ...asOwner(),
      body: { documentId: first },
    });
    expect(started.status).toBe(202);

    const blocked = await api(ctx, 'POST', '/portfolio-imports', {
      ...asOwner(),
      body: { documentId: second },
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('IMPORTS.ALREADY_RUNNING');

    await pollUntilDone(asOwner(), started.body.jobId);
  });

  it("job d'une autre organisation : 404, jamais 403", async () => {
    const other = await createAgency(ctx, 'ImportsAutre');
    const res = await api(ctx, 'GET', '/portfolio-imports/00000000-0000-0000-0000-000000000000', {
      accessToken: other.owner.accessToken,
      organizationId: other.organizationId,
    });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('IMPORTS.JOB_NOT_FOUND');
    await dropOrganization(ctx.admin, other.organizationId, [other.owner.userId]);
  });

  it('ACCOUNTANT ne peut pas lancer un import (OWNER/MANAGER requis)', async () => {
    const documentId = await uploadCsv(asOwner(), CSV);
    const res = await api(ctx, 'POST', '/portfolio-imports', {
      accessToken: accountant.accessToken,
      organizationId: agency.organizationId,
      body: { documentId },
    });
    expect(res.status).toBe(403);
  });
});
