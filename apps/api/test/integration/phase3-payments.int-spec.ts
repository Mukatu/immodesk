import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  addMember,
  createAgency,
  dropOrganization,
  firstOfMonth,
  isoDate,
  pollRun,
  seedLeases,
  type Agency,
  type BulkPortfolio,
} from './phase3-fixtures';

describe('Phase 3 — paiements, imputations, avoirs et contre-passation', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  let collector: { accessToken: string; userId: string };
  const invoiceOf = new Map<string, string>();
  const as = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Paiements');
    await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/settings`, {
      ...as(),
      body: { messaging: { sendInvoiceIssued: false } },
    });
    collector = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 6, {
      startDate: firstOfMonth(0),
    });
    const run = await api(ctx, 'POST', '/billing/runs', {
      ...as(),
      body: { periodStart: firstOfMonth(0) },
    });
    await pollRun(ctx, agency, run.body.runId);
    const invoices = await ctx.admin.rent_invoices.findMany({
      where: { organization_id: agency.organizationId },
    });
    for (const invoice of invoices) invoiceOf.set(invoice.tenant_id, invoice.id);
  }, 120_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      collector.userId,
    ]);
    await stopTestApp(ctx);
  });

  const tenant = (i: number) => portfolio.leases[i].tenantId;

  it('paiement partiel en espèces : CONFIRMED, imputation, facture PARTIALLY_PAID', async () => {
    const res = await api(ctx, 'POST', '/payments', {
      ...as(),
      body: {
        method: 'CASH',
        amount: 60000,
        tenantId: tenant(0),
        allocations: [{ invoiceId: invoiceOf.get(tenant(0)), amount: 60000 }],
      },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'CONFIRMED',
      allocatedAmount: 60000,
      unallocatedAmount: 0,
    });
    expect(res.body.reference).toMatch(/^PAY-\d{6}-\d{5}$/);
    const invoice = await api(ctx, 'GET', `/invoices/${invoiceOf.get(tenant(0))}`, as());
    expect(invoice.body).toMatchObject({
      status: 'PARTIALLY_PAID',
      paidAmount: 60000,
      balanceAmount: 50000,
    });
    expect(invoice.body.allocations).toHaveLength(1);
  });

  it('trop-perçu : avoir tenant_credits et invariant imputations + avoir = montant', async () => {
    const res = await api(ctx, 'POST', '/payments', {
      ...as(),
      body: { method: 'CASH', amount: 200000, tenantId: tenant(1), autoAllocate: true },
    });
    expect(res.status).toBe(201);
    const credits = await api(ctx, 'GET', `/tenants/${tenant(1)}/credits`, as());
    expect(credits.body.remainingAmount).toBe(90000);
    expect(credits.body.items[0]).toMatchObject({
      status: 'OPEN',
      origin: 'OVERPAYMENT',
      amount: 90000,
    });
    const sums = await ctx.admin.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT sum(amount)::bigint AS total FROM payment_allocations WHERE payment_id = $1::uuid`,
      res.body.id,
    );
    expect(sums[0].total).toBe(200000n);
    const invoice = await ctx.admin.rent_invoices.findUnique({
      where: { id: invoiceOf.get(tenant(1)) },
    });
    expect(invoice?.status).toBe('PAID');

    // L'avoir s'impute sur une facture ultérieure, sans nouveau paiement.
    const start = firstOfMonth(1);
    const later = await api(ctx, 'POST', '/invoices', {
      ...as(),
      body: {
        leaseId: portfolio.leases[1].leaseId,
        periodStart: start,
        periodEnd: `${start.slice(0, 8)}28`,
        lines: [{ lineType: 'OTHER', label: 'Réparation refacturée', unitPriceAmount: 50000 }],
        issue: true,
      },
    });
    const before = await ctx.admin.payments.count({
      where: { organization_id: agency.organizationId },
    });
    const applied = await api(
      ctx,
      'POST',
      `/tenants/${tenant(1)}/credits/${credits.body.items[0].id}/apply`,
      {
        ...as(),
        body: { invoiceId: later.body.id },
      },
    );
    expect(applied.status).toBe(200);
    expect(applied.body.credit).toMatchObject({
      status: 'PARTIALLY_USED',
      usedAmount: 50000,
      remainingAmount: 40000,
    });
    expect(applied.body.invoice.status).toBe('PAID');
    expect(
      await ctx.admin.payments.count({ where: { organization_id: agency.organizationId } }),
    ).toBe(before);
    const net = await ctx.admin.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT sum(CASE WHEN is_reversal THEN -amount ELSE amount END)::bigint AS total
         FROM payment_allocations WHERE payment_id = $1::uuid`,
      res.body.id,
    );
    expect(net[0].total).toBe(200000n);

    const refused = await api(ctx, 'POST', `/payments/${res.body.id}/reverse`, {
      ...as(),
      body: { reason: 'Test avoir' },
    });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('PAYMENTS.CREDIT_ALREADY_USED');
  });

  it('idempotence par clientRef : deux appels, un seul paiement, 200 au rejeu', async () => {
    const clientRef = `01J${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const body = {
      method: 'CASH',
      amount: 10000,
      tenantId: tenant(2),
      autoAllocate: true,
      clientRef,
    };
    const first = await api(ctx, 'POST', '/payments', { ...as(), body });
    const second = await api(ctx, 'POST', '/payments', { ...as(), body });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(
      await ctx.admin.payments.count({
        where: { organization_id: agency.organizationId, client_ref: clientRef },
      }),
    ).toBe(1);
  });

  it('idempotence par Idempotency-Key : deux appels, un seul paiement', async () => {
    const key = `cle-${Date.now()}`;
    const body = { method: 'CASH', amount: 5000, tenantId: tenant(3), autoAllocate: true };
    const first = await api(ctx, 'POST', '/payments', {
      ...as(),
      body,
      headers: { 'Idempotency-Key': key },
    });
    const second = await api(ctx, 'POST', '/payments', {
      ...as(),
      body,
      headers: { 'Idempotency-Key': key },
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    const count = await ctx.admin.payments.count({ where: { tenant_id: tenant(3) } });
    expect(count).toBe(1);
  });

  it('virement en attente : confirmation avec imputation automatique, ou rejet', async () => {
    const pending = await api(ctx, 'POST', '/payments', {
      ...as(),
      body: {
        method: 'BANK_TRANSFER',
        amount: 110000,
        tenantId: tenant(4),
        autoAllocate: true,
        externalReference: 'VIR-001',
      },
    });
    expect(pending.body).toMatchObject({ status: 'PENDING_VERIFICATION', allocatedAmount: 0 });
    const confirmed = await api(ctx, 'POST', `/payments/${pending.body.id}/confirm`, {
      ...as(),
      body: {},
    });
    expect(confirmed.body).toMatchObject({ status: 'CONFIRMED', allocatedAmount: 110000 });
    const invoice = await ctx.admin.rent_invoices.findUnique({
      where: { id: invoiceOf.get(tenant(4)) },
    });
    expect(invoice?.status).toBe('PAID');

    const other = await api(ctx, 'POST', '/payments', {
      ...as(),
      body: { method: 'MOBILE_MONEY', amount: 1000, tenantId: tenant(4) },
    });
    const rejected = await api(ctx, 'POST', `/payments/${other.body.id}/reject`, {
      ...as(),
      body: { reason: 'Référence inconnue' },
    });
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Référence inconnue',
    });
    const again = await api(ctx, 'POST', `/payments/${other.body.id}/confirm`, {
      ...as(),
      body: {},
    });
    expect(again.body.code).toBe('PAYMENTS.INVALID_TRANSITION');
  });

  it('contre-passation : miroir REVERSED, facture rouverte, paiement d’origine intact', async () => {
    const invoiceId = invoiceOf.get(tenant(5)) as string;
    const paid = await api(ctx, 'POST', '/payments', {
      ...as(),
      body: {
        method: 'CASH',
        amount: 110000,
        tenantId: tenant(5),
        allocations: [{ invoiceId, amount: 110000 }],
      },
    });
    const original = await ctx.admin.payments.findUnique({ where: { id: paid.body.id } });
    const res = await api(ctx, 'POST', `/payments/${paid.body.id}/reverse`, {
      ...as(),
      body: { reason: 'erreur de locataire' },
    });
    expect(res.status).toBe(200);
    expect(res.body.reversal).toMatchObject({
      status: 'REVERSED',
      direction: 'OUTBOUND',
      reversalOfId: paid.body.id,
    });
    expect(res.body.reversal.reference).toMatch(/^REV-\d{6}-\d{5}$/);
    expect(res.body.reversal.allocations).toEqual([
      expect.objectContaining({ invoiceId, amount: 110000, isReversal: true }),
    ]);
    expect(res.body.original.reversalReason).toBe('erreur de locataire');
    expect(await ctx.admin.payments.findUnique({ where: { id: paid.body.id } })).toEqual(original);

    const invoice = await ctx.admin.rent_invoices.findUnique({ where: { id: invoiceId } });
    const overdue = (invoice?.grace_until_date?.toISOString().slice(0, 10) ?? '9999') < isoDate(0);
    expect(invoice).toMatchObject({
      status: overdue ? 'OVERDUE' : 'ISSUED',
      paid_amount: 0n,
      balance_amount: 110000n,
    });
    const twice = await api(ctx, 'POST', `/payments/${paid.body.id}/reverse`, {
      ...as(),
      body: { reason: 'Encore' },
    });
    expect(twice.body.code).toBe('PAYMENTS.ALREADY_REVERSED');

    const statement = await api(ctx, 'GET', `/tenants/${tenant(5)}/statement`, as());
    expect(statement.body.lines.map((l: any) => l.type)).toEqual([
      'INVOICE',
      'PAYMENT',
      'REVERSAL',
    ]);
    expect(statement.body.closingBalance).toBe(110000);
  });

  it('refuse en SQL brut la modification d’un montant et la suppression d’un paiement', async () => {
    const payment = await ctx.admin.payments.findFirst({
      where: { organization_id: agency.organizationId },
    });
    await expect(
      ctx.admin.$executeRawUnsafe(
        `UPDATE payments SET amount = amount + 1 WHERE id = $1::uuid`,
        payment?.id,
      ),
    ).rejects.toThrow(/verrouill|restrict|contre-passation/i);
    await expect(
      ctx.admin.$executeRawUnsafe(`DELETE FROM payments WHERE id = $1::uuid`, payment?.id),
    ).rejects.toThrow(/DELETE interdit|restrict/i);
    await expect(
      ctx.admin.$executeRawUnsafe(
        `UPDATE payment_allocations SET amount = 1 WHERE payment_id = $1::uuid`,
        payment?.id,
      ),
    ).rejects.toThrow(/append-only|restrict/i);
  });

  it('un démarcheur ne voit que ses propres encaissements', async () => {
    const mine = await api(ctx, 'POST', '/payments', {
      accessToken: collector.accessToken,
      organizationId: agency.organizationId,
      body: { method: 'CASH', amount: 1000, tenantId: tenant(0), autoAllocate: true },
    });
    expect(mine.status).toBe(201);
    const own = await api(ctx, 'GET', `/payments/${mine.body.id}`, {
      accessToken: collector.accessToken,
      organizationId: agency.organizationId,
    });
    expect(own.status).toBe(200);
    const others = await ctx.admin.payments.findFirst({ where: { tenant_id: tenant(1) } });
    const hidden = await api(ctx, 'GET', `/payments/${others?.id}`, {
      accessToken: collector.accessToken,
      organizationId: agency.organizationId,
    });
    expect(hidden.status).toBe(404);
  });
});
