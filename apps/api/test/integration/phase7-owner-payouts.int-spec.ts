import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { addMember, createAgency, dropOrganization, type Agency } from './phase3-fixtures';
import {
  pollStatementRun,
  previousPeriod,
  seedMandatePortfolio,
  type MandatePortfolioRow,
} from './phase7-fixtures';

describe('Phase 7 — reversements aux bailleurs', () => {
  let ctx: TestContext;
  let agency: Agency;
  let accountant: { accessToken: string; userId: string };
  let portfolio: MandatePortfolioRow[];
  const period = previousPeriod();
  const asOwner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });
  const asAccountant = () => ({
    accessToken: accountant.accessToken,
    organizationId: agency.organizationId,
  });

  async function statementIdFor(landlordId: string): Promise<string> {
    const row = await ctx.admin.owner_statements.findFirst({
      where: {
        organization_id: agency.organizationId,
        landlord_id: landlordId,
        period_start: new Date(period.start),
      },
      select: { id: true },
    });
    if (!row) throw new Error(`Aucun relevé pour le bailleur ${landlordId}.`);
    return row.id;
  }

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Payouts7');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
    portfolio = await seedMandatePortfolio(ctx.admin, agency.organizationId, 2, period, {
      rentAmount: 200_000,
      salt: 'p',
    });

    const run = await api(ctx, 'POST', '/owner-statements/runs', {
      ...asAccountant(),
      body: { period: period.period },
    });
    expect(run.status).toBe(202);
    const report = await pollStatementRun(ctx, agency, run.body.runId, 30_000);
    expect(report).toMatchObject({ status: 'DONE', created: 2, errors: [] });
  }, 90_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      accountant.userId,
    ]);
    await stopTestApp(ctx);
  });

  it('cycle complet : relevé émis → reversement PENDING → APPROVED → PAID, relevé soldé', async () => {
    const statementId = await statementIdFor(portfolio[0].landlordId);

    const issued = await api(ctx, 'POST', `/owner-statements/${statementId}/issue`, asOwner());
    expect(issued.status).toBe(201);
    expect(issued.body.status).toBe('ISSUED');
    expect(issued.body.netPayableAmount).toBeGreaterThan(0);

    const created = await api(ctx, 'POST', '/owner-payouts', {
      ...asAccountant(),
      body: { statementId, method: 'CASH' },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      status: 'PENDING',
      statementId,
      method: 'CASH',
      amount: issued.body.netPayableAmount,
    });

    const approved = await api(ctx, 'POST', `/owner-payouts/${created.body.id}/approve`, asOwner());
    expect(approved.status).toBe(201);
    expect(approved.body.status).toBe('APPROVED');

    const executed = await api(ctx, 'POST', `/owner-payouts/${created.body.id}/execute`, {
      ...asAccountant(),
      body: {},
    });
    expect(executed.status).toBe(201);
    expect(executed.body.status).toBe('PAID');
    expect(executed.body.paidAt).not.toBeNull();

    const statement = await ctx.admin.owner_statements.findUnique({ where: { id: statementId } });
    expect(statement?.status).toBe('PAID');
    expect(statement?.settled_at).not.toBeNull();
  });

  it('refuse un reversement virement sans coordonnées bancaires : 409 AGENCY.PAYOUT_MISSING_BANK_DETAILS', async () => {
    const statementId = await statementIdFor(portfolio[1].landlordId);
    const issued = await api(ctx, 'POST', `/owner-statements/${statementId}/issue`, asOwner());
    expect(issued.status).toBe(201);

    const landlord = await ctx.admin.landlords.findUnique({
      where: { id: portfolio[1].landlordId },
      select: { default_bank_account_id: true },
    });
    expect(landlord?.default_bank_account_id).toBeNull();

    const refused = await api(ctx, 'POST', '/owner-payouts', {
      ...asAccountant(),
      body: { statementId, method: 'BANK_TRANSFER' },
    });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('AGENCY.PAYOUT_MISSING_BANK_DETAILS');
  });
});
