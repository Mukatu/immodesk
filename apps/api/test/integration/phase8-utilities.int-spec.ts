import { v7 as uuidv7 } from 'uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  addMember,
  createAgency,
  dropOrganization,
  firstOfMonth,
  pollRun,
  seedLeases,
  type Agency,
  type BulkPortfolio,
} from './phase3-fixtures';

describe('Phase 8 — compteurs, grilles tarifaires, campagne de refacturation', () => {
  let ctx: TestContext;
  let agency: Agency;
  let manager: { accessToken: string; userId: string };
  let owner: () => { accessToken: string; organizationId: string };

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Utilities');
    manager = await addMember(ctx, agency.organizationId, 'MANAGER');
    owner = () => ({
      accessToken: agency.owner.accessToken,
      organizationId: agency.organizationId,
    });
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId, manager.userId]);
    await stopTestApp(ctx);
  });

  const org = (token: string) => ({ accessToken: token, organizationId: agency.organizationId });

  it('idempotence d’un relevé par clientRef, refus d’un index régressif, passage par zéro confirmé', async () => {
    const portfolio = await seedLeases(ctx.admin, agency.organizationId, 1, {
      startDate: firstOfMonth(-1),
    });
    const unitId = portfolio.leases[0].unitId;

    const meter = await api(ctx, 'POST', '/meters', {
      ...org(manager.accessToken),
      body: {
        propertyId: portfolio.propertyId,
        unitId,
        meterType: 'WATER_LCDE',
        serialNumber: `MTR-${uuidv7()}`,
        digitsCount: 5,
      },
    });
    expect(meter.status).toBe(201);
    const meterId = meter.body.id;

    const clientRef = uuidv7();
    const first = await api(ctx, 'POST', `/meters/${meterId}/readings`, {
      ...org(manager.accessToken),
      body: { readingDate: firstOfMonth(0), currentIndex: 50, clientRef },
    });
    expect(first.status).toBe(201);
    expect(first.body.consumption).toBe(50);

    const replay = await api(ctx, 'POST', `/meters/${meterId}/readings`, {
      ...org(manager.accessToken),
      body: { readingDate: firstOfMonth(0), currentIndex: 50, clientRef },
    });
    expect(replay.status).toBe(200);
    expect(replay.body.id).toBe(first.body.id);

    const regressive = await api(ctx, 'POST', `/meters/${meterId}/readings`, {
      ...org(manager.accessToken),
      body: { readingDate: firstOfMonth(1), currentIndex: 10, clientRef: uuidv7() },
    });
    expect(regressive.status).toBe(422);
    expect(regressive.body.code).toBe('METERS.INDEX_REGRESSION');

    const rollover = await api(ctx, 'POST', `/meters/${meterId}/readings`, {
      ...org(manager.accessToken),
      body: {
        readingDate: firstOfMonth(1),
        currentIndex: 10,
        rolloverApplied: true,
        clientRef: uuidv7(),
      },
    });
    expect(rollover.status).toBe(201);
    // Capacité 10^5 = 100000, previous 50 → consommation = 100000 - 50 + 10 = 99960.
    expect(rollover.body.consumption).toBe(99_960);
    expect(rollover.body.rolloverApplied).toBe(true);
  });

  it('valorise un relevé, crée une ligne liée, et ne refacture jamais deux fois le même relevé', async () => {
    const period = firstOfMonth(0);
    const portfolio = await seedLeases(ctx.admin, agency.organizationId, 1, { startDate: period });
    const lease = portfolio.leases[0];

    const billingRun = await api(ctx, 'POST', '/billing/runs', {
      ...owner(),
      body: { periodStart: period },
    });
    await pollRun(ctx, agency, billingRun.body.runId);
    const invoice = await ctx.admin.rent_invoices.findFirstOrThrow({
      where: {
        organization_id: agency.organizationId,
        lease_id: lease.leaseId,
        period_start: new Date(period),
      },
    });

    await api(ctx, 'POST', '/utility-tariffs', {
      ...org(agency.owner.accessToken),
      body: {
        propertyId: portfolio.propertyId,
        meterType: 'WATER_LCDE',
        basis: 'PER_UNIT_CONSUMED',
        label: 'Eau test',
        unitPriceAmount: 500,
        effectiveFrom: firstOfMonth(-6),
      },
    });

    const meter = await api(ctx, 'POST', '/meters', {
      ...org(manager.accessToken),
      body: {
        propertyId: portfolio.propertyId,
        unitId: lease.unitId,
        meterType: 'WATER_LCDE',
        serialNumber: `MTR-${uuidv7()}`,
      },
    });
    const reading = await api(ctx, 'POST', `/meters/${meter.body.id}/readings`, {
      ...org(manager.accessToken),
      body: { readingDate: period, currentIndex: 20, clientRef: uuidv7() },
    });
    expect(reading.status).toBe(201);

    const run1 = await api(ctx, 'POST', '/billing/utility-runs', {
      ...org(manager.accessToken),
      body: { periodStart: period },
    });
    expect(run1.status).toBe(202);
    const status1 = await api(
      ctx,
      'GET',
      `/billing/utility-runs/${run1.body.runId}`,
      org(manager.accessToken),
    );
    expect(status1.body.created).toBe(1);

    const lines = await ctx.admin.invoice_lines.findMany({
      where: { invoice_id: invoice.id, meter_reading_id: reading.body.id },
    });
    expect(lines).toHaveLength(1);
    expect(Number(lines[0].amount)).toBe(10_000); // 20 m³ × 500 XAF

    const run2 = await api(ctx, 'POST', '/billing/utility-runs', {
      ...org(manager.accessToken),
      body: { periodStart: period },
    });
    const status2 = await api(
      ctx,
      'GET',
      `/billing/utility-runs/${run2.body.runId}`,
      org(manager.accessToken),
    );
    expect(status2.body.created).toBe(0);

    const linesAfterRelaunch = await ctx.admin.invoice_lines.findMany({
      where: { invoice_id: invoice.id, meter_reading_id: reading.body.id },
    });
    expect(linesAfterRelaunch).toHaveLength(1);
  }, 30_000);

  it('campagne sur 200 lots, rapport des lots ignorés faute de relevé', async () => {
    const period = firstOfMonth(0);
    const portfolio: BulkPortfolio = await seedLeases(ctx.admin, agency.organizationId, 200, {
      startDate: period,
      phoneSuffix: '2',
    });
    const billingRun = await api(ctx, 'POST', '/billing/runs', {
      ...owner(),
      body: { periodStart: period },
    });
    await pollRun(ctx, agency, billingRun.body.runId, 120_000);

    await ctx.admin.utility_tariffs.create({
      data: {
        id: uuidv7(),
        organization_id: agency.organizationId,
        property_id: portfolio.propertyId,
        meter_type: 'ELECTRICITY_E2C',
        basis: 'PER_UNIT_CONSUMED',
        label: 'Électricité 200 lots',
        unit_price_amount: 100n,
        effective_from: new Date(firstOfMonth(-6)),
      },
    });

    const meters = portfolio.leases.map((l) => ({
      id: uuidv7(),
      organization_id: agency.organizationId,
      property_id: portfolio.propertyId,
      unit_id: l.unitId,
      meter_type: 'ELECTRICITY_E2C' as const,
      serial_number: `BULK-${l.unitId}`,
    }));
    // 190 lots relevés, 10 sans relevé (rapport des lots ignorés).
    await ctx.admin.meters.createMany({ data: meters });
    await ctx.admin.meter_readings.createMany({
      data: meters.slice(0, 190).map((m) => ({
        id: uuidv7(),
        organization_id: agency.organizationId,
        meter_id: m.id,
        unit_id: m.unit_id,
        reading_date: new Date(period),
        previous_index: '0.000',
        current_index: '30.000',
        consumption: '30.000',
      })),
    });

    const run = await api(ctx, 'POST', '/billing/utility-runs', {
      ...org(manager.accessToken),
      body: { periodStart: period, propertyId: portfolio.propertyId },
    });
    expect(run.status).toBe(202);
    const status = await api(
      ctx,
      'GET',
      `/billing/utility-runs/${run.body.runId}`,
      org(manager.accessToken),
    );
    expect(status.body.created).toBe(190);
    expect(
      status.body.skipped.filter((s: { reason: string }) => s.reason === 'NO_READING'),
    ).toHaveLength(10);
  }, 180_000);
});
