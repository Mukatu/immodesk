import { BillingEngineService } from '../../src/modules/billing/application/billing-engine.service';
import { parseIsoDate } from '../../src/modules/leases/domain/calendar';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  createAgency,
  dropOrganization,
  firstOfMonth,
  pollRun,
  seedLeases,
  yearMonth,
  type Agency,
  type BulkPortfolio,
} from './phase3-fixtures';

describe('Phase 3 — moteur de facturation', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  const target = firstOfMonth(1);
  const as = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Facturation');
    // Pas d'avis d'échéance pour 500 factures : le test porte sur le moteur.
    const settings = await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/settings`, {
      ...as(),
      body: {
        billing: { generateDaysBefore: 5, applyPenalties: true },
        messaging: { sendInvoiceIssued: false },
      },
    });
    expect(settings.status).toBe(200);
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 500, {
      startDate: firstOfMonth(0),
    });
  }, 120_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    await stopTestApp(ctx);
  });

  it('expose et fusionne les paramètres billing / cash / messaging', async () => {
    const res = await api(ctx, 'GET', `/organizations/${agency.organizationId}/settings`, as());
    expect(res.body.billing).toEqual({
      generateDaysBefore: 5,
      autoIssue: true,
      defaultPenaltyRuleId: null,
      applyPenalties: true,
    });
    expect(res.body.cash).toEqual({
      collectorHoldingCapAmount: 500000,
      requireTenantSignature: true,
      denominationsEnabled: false,
    });
    expect(res.body.messaging.receiptChannelOrder).toEqual(['WHATSAPP', 'SMS']);
    expect(res.body.messaging.sendInvoiceIssued).toBe(false);
    expect(res.body.timezone).toBe('Africa/Brazzaville');
  });

  it('campagne sur 500 baux en moins de 60 s, numérotation continue, relance sans doublon', async () => {
    const started = Date.now();
    const run = await api(ctx, 'POST', '/billing/runs', { ...as(), body: { periodStart: target } });
    expect(run.status).toBe(202);
    const report = await pollRun(ctx, agency, run.body.runId);
    const elapsed = Date.now() - started;
    expect(report).toMatchObject({ status: 'DONE', created: 500, errors: [] });
    expect(elapsed).toBeLessThan(60_000);

    const numbers = await ctx.admin.$queryRawUnsafe<Array<{ invoice_number: string }>>(
      `SELECT invoice_number FROM rent_invoices WHERE organization_id = $1::uuid ORDER BY invoice_number`,
      agency.organizationId,
    );
    const expected = Array.from(
      { length: 500 },
      (_, i) => `LOY-${yearMonth(target)}-${String(i + 1).padStart(5, '0')}`,
    );
    expect(numbers.map((n) => n.invoice_number)).toEqual(expected);
    const lines = await ctx.admin.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM invoice_lines il JOIN rent_invoices ri ON ri.id = il.invoice_id
        WHERE ri.organization_id = $1::uuid AND il.line_type IN ('RENT', 'SERVICE_CHARGE')`,
      agency.organizationId,
    );
    expect(Number(lines[0].count)).toBe(1000);

    const again = await api(ctx, 'POST', '/billing/runs', {
      ...as(),
      body: { periodStart: target },
    });
    const second = await pollRun(ctx, agency, again.body.runId);
    expect(second).toMatchObject({ status: 'DONE', created: 0, skipped: 500 });
    const count = await ctx.admin.rent_invoices.count({
      where: { organization_id: agency.organizationId },
    });
    expect(count).toBe(500);
  }, 120_000);

  it('liste, filtre et détaille les factures ; tableau de bord du mois', async () => {
    const page = await api(ctx, 'GET', `/invoices?period=${target.slice(0, 7)}&limit=10`, as());
    expect(page.status).toBe(200);
    expect(page.body.items).toHaveLength(10);
    expect(page.body.pageInfo.hasNextPage).toBe(true);
    const detail = await api(ctx, 'GET', `/invoices/${page.body.items[0].id}`, as());
    expect(detail.body).toMatchObject({
      status: 'ISSUED',
      totalAmount: 110000,
      balanceAmount: 110000,
    });
    expect(detail.body.lines.map((l: any) => l.lineType)).toEqual(['RENT', 'SERVICE_CHARGE']);

    const dashboard = await api(
      ctx,
      'GET',
      `/billing/dashboard?period=${target.slice(0, 7)}`,
      as(),
    );
    expect(dashboard.body).toMatchObject({
      invoicesCount: 500,
      expectedAmount: 55_000_000,
      collectedAmount: 0,
    });
    expect(dashboard.body.byMethod).toEqual({
      CASH: 0,
      MOBILE_MONEY: 0,
      BANK_TRANSFER: 0,
      BANK_CHECK: 0,
    });
  });

  it('facture manuelle : brouillon sans numéro, lignes, émission, annulation', async () => {
    const leaseId = portfolio.leases[0].leaseId;
    const duplicate = await api(ctx, 'POST', '/invoices', {
      ...as(),
      body: { leaseId, periodStart: target, periodEnd: target.slice(0, 8) + '28', lines: [] },
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('BILLING.PERIOD_ALREADY_INVOICED');

    const start = firstOfMonth(3);
    const draft = await api(ctx, 'POST', '/invoices', {
      ...as(),
      body: {
        leaseId,
        periodStart: start,
        periodEnd: start.slice(0, 8) + '28',
        lines: [{ lineType: 'RENT', label: 'Loyer', unitPriceAmount: 100000 }],
      },
    });
    expect(draft.status).toBe(201);
    expect(draft.body).toMatchObject({ status: 'DRAFT', invoiceNumber: null, totalAmount: 100000 });

    const withLine = await api(ctx, 'POST', `/invoices/${draft.body.id}/lines`, {
      ...as(),
      body: {
        lineType: 'DISCOUNT',
        label: 'Geste commercial',
        unitPriceAmount: 5000,
        isCredit: true,
      },
    });
    expect(withLine.body).toMatchObject({ totalAmount: 95000, discountAmount: 5000 });
    const lineId = withLine.body.lines.find((l: any) => l.lineType === 'DISCOUNT').id;
    const removed = await api(ctx, 'DELETE', `/invoices/${draft.body.id}/lines/${lineId}`, as());
    expect(removed.body.totalAmount).toBe(100000);

    const issued = await api(ctx, 'POST', `/invoices/${draft.body.id}/issue`, as());
    expect(issued.status).toBe(200);
    expect(issued.body.invoiceNumber).toBe(`LOY-${yearMonth(start)}-00001`);
    const locked = await api(ctx, 'POST', `/invoices/${draft.body.id}/lines`, {
      ...as(),
      body: { lineType: 'OTHER', label: 'Frais', unitPriceAmount: 1000 },
    });
    expect(locked.body.code).toBe('BILLING.INVOICE_NOT_EDITABLE');

    const cancelled = await api(ctx, 'POST', `/invoices/${draft.body.id}/cancel`, {
      ...as(),
      body: { reason: 'Émise par erreur' },
    });
    expect(cancelled.body).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'Émise par erreur',
    });
    const audit = await ctx.admin.audit_logs.count({
      where: {
        entity_id: draft.body.id,
        reason: { in: ['INVOICE_CREATED', 'INVOICE_ISSUED', 'INVOICE_CANCELLED'] },
      },
    });
    expect(audit).toBe(3);
  });

  it('règles de pénalité, passage en retard et pénalité unique par jour', async () => {
    const invalid = await api(ctx, 'POST', '/penalty-rules', {
      ...as(),
      body: { name: 'Forfait sans montant', basis: 'FLAT_AMOUNT' },
    });
    expect(invalid.body.code).toBe('BILLING.PENALTY_RULE_INVALID');
    const rule = await api(ctx, 'POST', '/penalty-rules', {
      ...as(),
      body: {
        name: 'Retard 5 % par mois',
        basis: 'RATE_BPS_PER_MONTH',
        rateBps: 500,
        isDefault: true,
      },
    });
    expect(rule.status).toBe(201);
    const list = await api(ctx, 'GET', '/penalty-rules', as());
    expect(list.body.items).toHaveLength(1);

    const engine = ctx.app.get(BillingEngineService);
    const late = parseIsoDate(`${target.slice(0, 8)}20`);
    const leaseId = portfolio.leases[1].leaseId;
    const first = await engine.runForOrganization(agency.organizationId, {
      today: late,
      leaseId,
      jobLabel: 'test',
    });
    // Le bail ciblé reçoit aussi sa facture du mois courant (règle J-N), déjà
    // hors tolérance à cette date : 500 + 1 factures passent en retard.
    expect(first.created).toBe(1);
    expect(first.overdue).toBe(501);
    expect(first.penalties).toBe(501);
    const replay = await engine.runForOrganization(agency.organizationId, {
      today: late,
      leaseId,
      jobLabel: 'test',
    });
    expect(replay).toMatchObject({ overdue: 0, penalties: 0, created: 0 });

    const invoice = await ctx.admin.rent_invoices.findFirst({
      where: { lease_id: leaseId, period_start: parseIsoDate(target) },
    });
    expect(invoice).toMatchObject({
      status: 'OVERDUE',
      penalty_amount: 5000n,
      total_amount: 115000n,
    });
  }, 120_000);
});
