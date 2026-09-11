import { PdfBrowserService } from '../../src/modules/pdf/infrastructure/pdf-browser.service';
import {
  api,
  cleanupUser,
  login,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

function isoDate(days = 0): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days))
    .toISOString()
    .slice(0, 10);
}

function firstOfMonth(months: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * Génération RÉELLE du contrat PDF, Chromium compris.
 *
 * La suite se SAUTE proprement si aucun navigateur n'est installé : le
 * Chromium empaqueté par Puppeteer (≈ 180 Mo) n'est pas téléchargé dans tous
 * les environnements de build, et le repli sur un Chrome ou un Edge du
 * système peut ne rien trouver sur une machine d'intégration continue nue.
 * Un saut annoncé vaut mieux qu'un échec rouge qui ne dit rien du code.
 */
describe('Phase 2 — contrat de bail PDF (Puppeteer)', () => {
  let ctx: TestContext;
  const ownerPhone = uniquePhone();

  let owner: { accessToken: string; userId: string };
  let organizationId: string;
  let leaseId: string;
  let browserAvailable = false;

  beforeAll(async () => {
    ctx = await startTestApp();
    browserAvailable = await ctx.app.get(PdfBrowserService).available();
    if (!browserAvailable) {
      console.warn(
        '[PDF] Aucun navigateur de rendu : suite sautée. ' +
          'Renseignez PUPPETEER_EXECUTABLE_PATH (Chrome ou Edge) pour l’exécuter.',
      );
    }

    owner = await login(ctx, ownerPhone);
    const organization = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: {
        type: 'AGENCY',
        legalName: 'Agence Contrat Intégration SARL',
        city: 'Brazzaville',
        district: 'Mpila',
        contactPhone: ownerPhone,
      },
    });
    organizationId = organization.body.id;

    const landlord = await api(ctx, 'POST', '/landlords', {
      accessToken: owner.accessToken,
      organizationId,
      body: { partyType: 'COMPANY', companyName: 'SCI Contrat', primaryPhone: uniquePhone() },
    });
    const property = await api(ctx, 'POST', '/properties', {
      accessToken: owner.accessToken,
      organizationId,
      body: {
        landlordId: landlord.body.id,
        name: 'Résidence du Contrat',
        addressLine: '12, avenue de la Corniche',
        district: 'Mpila',
      },
    });
    const unit = await api(ctx, 'POST', `/properties/${property.body.id}/units`, {
      accessToken: owner.accessToken,
      organizationId,
      body: { code: 'E1', unitType: 'APARTMENT', baseRentAmount: 150000, depositMonths: 2 },
    });
    const tenant = await api(ctx, 'POST', '/tenants', {
      accessToken: owner.accessToken,
      organizationId,
      body: {
        partyType: 'INDIVIDUAL',
        firstName: 'Bernadette',
        lastName: 'Loemba',
        primaryPhone: uniquePhone(),
        district: 'Poto-Poto',
      },
    });

    const lease = await api(ctx, 'POST', '/leases', {
      accessToken: owner.accessToken,
      organizationId,
      body: {
        unitId: unit.body.id,
        primaryTenantId: tenant.body.id,
        startDate: isoDate(-10),
        endDate: isoDate(355),
        rentAmount: 150000,
        chargesAmount: 10000,
        depositAmount: 300000,
        paymentDueDay: 5,
      },
    });
    leaseId = lease.body.id;
    await api(ctx, 'POST', `/leases/${leaseId}/activate`, {
      accessToken: owner.accessToken,
      organizationId,
      body: {},
    });
  }, 180_000);

  afterAll(async () => {
    await cleanupUser(ctx, ownerPhone);
    await stopTestApp(ctx);
  });

  const asOwner = () => ({ accessToken: owner.accessToken, organizationId });

  /** Attend la fin d'un travail BullMQ, ou échoue avec son motif. */
  async function waitForJob(jobId: string): Promise<Record<string, unknown>> {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const status = await api(ctx, 'GET', `/leases/${leaseId}/contract/jobs/${jobId}`, asOwner());
      if (status.body.status === 'DONE') return status.body;
      if (status.body.status === 'FAILED') {
        throw new Error(`Génération en échec : ${status.body.error}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('Génération du contrat : délai dépassé.');
  }

  async function generate(regenerate: boolean): Promise<Record<string, unknown>> {
    const queued = await api(ctx, 'POST', `/leases/${leaseId}/contract`, {
      ...asOwner(),
      body: { regenerate },
    });
    expect(queued.status).toBe(202);
    expect(queued.body.status).toBe('QUEUED');
    return waitForJob(queued.body.jobId as string);
  }

  it('prévisualise le contrat en HTML, sans Chromium', async () => {
    const preview = await api(ctx, 'GET', `/leases/${leaseId}/contract/preview`, asOwner());
    expect(preview.status).toBe(200);
    const html = String(preview.body);
    // Handlebars échappe l'apostrophe en `&#x27;` : le rendu est correct dans
    // un navigateur, la chaîne source ne l'est pas.
    expect(html).toContain('CONTRAT DE BAIL À USAGE D');
    expect(html).toContain('HABITATION');
    expect(html).toContain('Bernadette Loemba');
    expect(html).toContain('Résidence du Contrat');
    // Montants formatés en francs CFA, sans décimale.
    expect(html).toContain('FCFA');
    // Aucune ressource externe : le rendu doit être identique hors ligne.
    expect(html).not.toMatch(/<(script|link)\b/i);
  });

  it('produit la version 1, avec empreinte et PDF déposé dans le stockage objet', async () => {
    if (!browserAvailable) return;

    const done = await generate(false);
    expect(done.version).toBe(1);
    expect(String(done.signatureHash ?? '')).toBe('');

    const documents = await api(ctx, 'GET', `/leases/${leaseId}/documents`, asOwner());
    const v1 = documents.body.items.find((d: { version: number }) => d.version === 1);
    expect(v1).toMatchObject({ kind: 'CONTRACT', version: 1, isSigned: false });
    expect(v1.title).toMatch(/^Contrat de bail BAIL-\d{4}-\d{5} v1$/);
    expect(v1.signatureHash).toMatch(/^[0-9a-f]{64}$/);
    expect(v1.generatedByJob).toContain('lease-contract:');

    // Le PDF existe bien dans le stockage objet et pèse un poids plausible.
    const document = await ctx.admin.documents.findUniqueOrThrow({
      where: { id: v1.documentId },
    });
    expect(document.kind).toBe('LEASE_CONTRACT');
    expect(document.mime_type).toBe('application/pdf');
    expect(Number(document.size_bytes)).toBeGreaterThan(3000);
    expect(document.checksum_sha256).not.toBeNull();

    const download = await api(ctx, 'GET', `/documents/${v1.documentId}/download-url`, asOwner());
    expect(download.status).toBe(200);
    const fetched = await fetch(download.body.downloadUrl);
    const bytes = Buffer.from(await fetched.arrayBuffer());
    expect(fetched.status).toBe(200);
    // Signature de fichier PDF : %PDF.
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  }, 180_000);

  it('sans `regenerate`, rend la version déjà produite au lieu d’en empiler une seconde', async () => {
    if (!browserAvailable) return;

    const done = await generate(false);
    expect(done.version).toBe(1);

    const documents = await api(ctx, 'GET', `/leases/${leaseId}/documents`, asOwner());
    expect(
      documents.body.items.filter((d: { kind: string }) => d.kind === 'CONTRACT'),
    ).toHaveLength(1);
  }, 180_000);

  it('deux rendus du même bail donnent la MÊME empreinte', async () => {
    if (!browserAvailable) return;

    const documents = await api(ctx, 'GET', `/leases/${leaseId}/documents`, asOwner());
    const v1 = documents.body.items.find((d: { version: number }) => d.version === 1);

    const done = await generate(true);
    expect(done.version).toBe(2);

    const after = await api(ctx, 'GET', `/leases/${leaseId}/documents`, asOwner());
    const v2 = after.body.items.find((d: { version: number }) => d.version === 2);

    // La date de génération est imprimée par le PIED DE PAGE de Chromium et
    // n'entre donc pas dans l'empreinte, calculée sur le HTML source. Deux
    // rendus du même jeu de données sont indiscernables.
    expect(v2.signatureHash).toBe(v1.signatureHash);
    // Les octets du PDF, eux, diffèrent : ils portent la date de création
    // dans leurs métadonnées. C'est précisément pourquoi l'empreinte
    // contractuelle ne se calcule pas sur eux.
    expect(v2.documentId).not.toBe(v1.documentId);
  }, 180_000);

  it('après une révision de loyer, la version suivante change d’empreinte et la v1 reste intacte', async () => {
    if (!browserAvailable) return;

    const before = await api(ctx, 'GET', `/leases/${leaseId}/documents`, asOwner());
    const v1Before = before.body.items.find((d: { version: number }) => d.version === 1);

    const revision = await api(ctx, 'POST', `/leases/${leaseId}/rent-revisions`, {
      ...asOwner(),
      body: { effectiveDate: firstOfMonth(0), newRentAmount: 175000, reason: 'Révision annuelle' },
    });
    expect(revision.status).toBe(201);

    const done = await generate(true);
    expect(done.version).toBe(3);

    const after = await api(ctx, 'GET', `/leases/${leaseId}/documents`, asOwner());
    const latest = after.body.items.find((d: { version: number }) => d.version === 3);
    expect(latest.signatureHash).not.toBe(v1Before.signatureHash);

    // UNE VERSION EST IMMUABLE : la v1 n'a été ni réécrite ni renumérotée.
    const v1After = after.body.items.find((d: { version: number }) => d.version === 1);
    expect(v1After).toEqual(v1Before);

    const v1Row = await ctx.admin.lease_documents.findUniqueOrThrow({
      where: { id: v1Before.id },
    });
    expect(v1Row.updated_at.getTime()).toBe(v1Row.created_at.getTime());

    // Et son PDF reste téléchargeable, inchangé.
    const download = await api(
      ctx,
      'GET',
      `/documents/${v1Before.documentId}/download-url`,
      asOwner(),
    );
    const fetched = await fetch(download.body.downloadUrl);
    expect(fetched.status).toBe(200);
  }, 180_000);

  it('personnalise le gabarit de contrat de l’organisation', async () => {
    const initial = await api(
      ctx,
      'GET',
      `/organizations/${organizationId}/contract-template`,
      asOwner(),
    );
    expect(initial.status).toBe(200);
    expect(initial.body.headerTitle).toBe("CONTRAT DE BAIL À USAGE D'HABITATION");
    expect(initial.body.signatureCity).toBe('Brazzaville');
    expect(initial.body.optionalClauses.length).toBeGreaterThan(3);

    const patched = await api(ctx, 'PATCH', `/organizations/${organizationId}/contract-template`, {
      ...asOwner(),
      body: { signatureCity: 'Pointe-Noire', showOhadaBlock: true },
    });
    expect(patched.status).toBe(200);
    expect(patched.body.signatureCity).toBe('Pointe-Noire');
    expect(patched.body.showOhadaBlock).toBe(true);
    // Les autres champs sont conservés.
    expect(patched.body.headerTitle).toBe(initial.body.headerTitle);

    const preview = await api(ctx, 'GET', `/leases/${leaseId}/contract/preview`, asOwner());
    expect(String(preview.body)).toContain('Pointe-Noire');
    expect(String(preview.body)).toContain('OHADA');
  }, 120_000);
});
