import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { createAgency, dropOrganization, type Agency } from './phase3-fixtures';
import {
  pollStatementRun,
  previousPeriod,
  seedMandatePortfolio,
  type MandatePortfolioRow,
} from './phase7-fixtures';

describe('Phase 7 — campagne mensuelle de relevés de gérance', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: MandatePortfolioRow[];
  const period = previousPeriod();
  const as = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Campagne7');
    portfolio = await seedMandatePortfolio(ctx.admin, agency.organizationId, 50, period, {
      salt: 'a',
    });
  }, 120_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    await stopTestApp(ctx);
  });

  it('campagne sur 50 mandats puis relance sans doublon (idempotence)', async () => {
    const run = await api(ctx, 'POST', '/owner-statements/runs', {
      ...as(),
      body: { period: period.period },
    });
    expect(run.status).toBe(202);
    const report = await pollStatementRun(ctx, agency, run.body.runId, 60_000);
    expect(report.status).toBe('DONE');
    expect(report.errors).toEqual([]);
    expect(report.created).toBe(50);

    const statements = await ctx.admin.owner_statements.findMany({
      where: { organization_id: agency.organizationId, period_start: new Date(period.start) },
    });
    expect(statements).toHaveLength(50);
    const landlordIds = new Set(statements.map((s) => s.landlord_id));
    expect(landlordIds.size).toBe(50);

    const rerun = await api(ctx, 'POST', '/owner-statements/runs', {
      ...as(),
      body: { period: period.period },
    });
    expect(rerun.status).toBe(202);
    const rerunReport = await pollStatementRun(ctx, agency, rerun.body.runId, 60_000);
    expect(rerunReport).toMatchObject({ status: 'DONE', created: 0, skipped: 50, errors: [] });

    const stillCount = await ctx.admin.owner_statements.count({
      where: { organization_id: agency.organizationId, period_start: new Date(period.start) },
    });
    expect(stillCount).toBe(50);
  }, 120_000);

  it('atomicité : chaque relevé porte au moins une ligne RENT_COLLECTED, cohérente avec le net à reverser', async () => {
    const row = portfolio[0];
    const statement = await ctx.admin.owner_statements.findFirst({
      where: {
        organization_id: agency.organizationId,
        landlord_id: row.landlordId,
        period_start: new Date(period.start),
      },
    });
    expect(statement).not.toBeNull();

    const lines = await ctx.admin.owner_statement_lines.findMany({
      where: { statement_id: statement!.id },
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.line_type === 'RENT_COLLECTED')).toBe(true);

    const credit = lines.filter((l) => !l.is_debit).reduce((sum, l) => sum + l.amount, 0n);
    const debit = lines.filter((l) => l.is_debit).reduce((sum, l) => sum + l.amount, 0n);
    // net = crédits − débits + report (déjà signé, voir owner-statement-rules.ts) ;
    // à la première campagne le report est nul.
    expect(credit - debit + statement!.carry_forward_amount).toBe(statement!.net_payable_amount);
    // Commission 10 %, sans TVA (fixture) : loyer encaissé × 0,9 = net.
    expect(statement!.net_payable_amount).toBe((BigInt(row.rentAmount) * 9n) / 10n);
  });

  it('encaissement au comptoir sans payments.lease_id : commission et RENT_COLLECTED bien présents', async () => {
    // Même période que la campagne principale : un mandat de plus, ajouté
    // après coup, pour vérifier isolément le mécanisme du comptoir.
    const [counter] = await seedMandatePortfolio(ctx.admin, agency.organizationId, 1, period, {
      salt: 'ctr',
    });

    const payment = await ctx.admin.payments.findUnique({ where: { id: counter.paymentId } });
    expect(payment?.lease_id).toBeNull();
    expect(payment?.status).toBe('CONFIRMED');

    const run = await api(ctx, 'POST', '/owner-statements/runs', {
      ...as(),
      body: { period: period.period },
    });
    expect(run.status).toBe(202);
    const report = await pollStatementRun(ctx, agency, run.body.runId, 30_000);
    expect(report.status).toBe('DONE');
    expect(report.errors).toEqual([]);

    const commission = await ctx.admin.commissions.findFirst({
      where: { organization_id: agency.organizationId, payment_id: counter.paymentId },
    });
    expect(commission).not.toBeNull();
    expect(commission?.status).toBe('ACCRUED');

    const statement = await ctx.admin.owner_statements.findFirst({
      where: { organization_id: agency.organizationId, landlord_id: counter.landlordId },
    });
    expect(statement).not.toBeNull();
    const rentLine = await ctx.admin.owner_statement_lines.findFirst({
      where: {
        statement_id: statement!.id,
        line_type: 'RENT_COLLECTED',
        payment_id: counter.paymentId,
      },
    });
    expect(rentLine).not.toBeNull();
  }, 60_000);
});
