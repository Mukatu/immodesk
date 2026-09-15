import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { createAgency, dropOrganization, type Agency } from './phase3-fixtures';
import {
  pollStatementRun,
  portalLogin,
  previousPeriod,
  seedMandatePortfolio,
  type MandatePortfolioRow,
} from './phase7-fixtures';

describe('Phase 7 — portail bailleur : étanchéité et lecture seule', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: MandatePortfolioRow[];
  let statementIdA: string;
  let portalA: { accessToken: string };
  let portalB: { accessToken: string };
  const period = previousPeriod();
  const asOwner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Portal7');
    portfolio = await seedMandatePortfolio(ctx.admin, agency.organizationId, 2, period, {
      salt: 'portal',
    });

    const run = await api(ctx, 'POST', '/owner-statements/runs', {
      ...asOwner(),
      body: { period: period.period },
    });
    expect(run.status).toBe(202);
    const report = await pollStatementRun(ctx, agency, run.body.runId, 30_000);
    expect(report).toMatchObject({ status: 'DONE', created: 2, errors: [] });

    const statementA = await ctx.admin.owner_statements.findFirst({
      where: { organization_id: agency.organizationId, landlord_id: portfolio[0].landlordId },
      select: { id: true },
    });
    statementIdA = statementA!.id;

    const [landlordA, landlordB] = await Promise.all([
      ctx.admin.landlords.findUnique({
        where: { id: portfolio[0].landlordId },
        select: { primary_phone: true },
      }),
      ctx.admin.landlords.findUnique({
        where: { id: portfolio[1].landlordId },
        select: { primary_phone: true },
      }),
    ]);

    portalA = await portalLogin(ctx, landlordA!.primary_phone);
    portalB = await portalLogin(ctx, landlordB!.primary_phone);
  }, 90_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    await stopTestApp(ctx);
  });

  it('le bailleur A voit son propre relevé via le portail', async () => {
    const list = await api(ctx, 'GET', '/portal/statements', { accessToken: portalA.accessToken });
    expect(list.status).toBe(200);
    expect(list.body.items.map((s: any) => s.id)).toContain(statementIdA);

    const me = await api(ctx, 'GET', '/portal/me', { accessToken: portalA.accessToken });
    expect(me.status).toBe(200);
    expect(me.body.landlord.id).toBe(portfolio[0].landlordId);
  });

  it('le bailleur B ne peut PAS accéder au relevé de A : 404, jamais 403', async () => {
    const pdf = await api(ctx, 'GET', `/portal/statements/${statementIdA}/pdf`, {
      accessToken: portalB.accessToken,
    });
    expect(pdf.status).toBe(404);
    expect(pdf.body.code).toBe('AGENCY.STATEMENT_NOT_FOUND');

    const list = await api(ctx, 'GET', '/portal/statements', { accessToken: portalB.accessToken });
    expect(list.status).toBe(200);
    expect(list.body.items.map((s: any) => s.id)).not.toContain(statementIdA);
  });

  it('aucune route d’écriture n’est exposée au portail : le module PortalController n’a que des GET', async () => {
    // `@LandlordPortal()` (voir `landlord-portal.decorator.ts`) n'est posé que
    // sur `PortalController`, qui n'expose QUE des `@Get(...)` (arbitrage
    // « toute écriture est refusée », voir le commentaire de tête de
    // `portal.controller.ts`). Il n'existe donc AUCUNE route de mutation
    // atteignable avec le jeton portail : la garantie « lecture seule »
    // repose sur cette absence de surface, pas sur un contrôle actif de
    // méthode HTTP dans `LandlordPortalGuard`. On le vérifie ici en
    // constatant qu'aucune route de ce type n'existe (404, pas 403) : le
    // routeur Nest ne trouve simplement aucun gestionnaire pour ce verbe.
    const patch = await api(ctx, 'PATCH', '/portal/me', {
      accessToken: portalA.accessToken,
      body: { notes: 'tentative de mutation' },
    });
    expect(patch.status).toBe(404);

    const post = await api(ctx, 'POST', '/portal/statements', {
      accessToken: portalA.accessToken,
      body: {},
    });
    expect(post.status).toBe(404);
  });
});
