import { v7 as uuidv7 } from 'uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  addMember,
  createAgency,
  dropOrganization,
  isoDate,
  seedLeases,
  type Agency,
} from './phase3-fixtures';

function buildBatch(deviceId: string, operations: unknown[]) {
  return {
    batchRef: uuidv7(),
    deviceId,
    devicePlatform: 'android',
    appVersion: '1.5.0',
    operations,
  };
}

describe('Phase 8 — extension du protocole de synchronisation (trois nouveaux types)', () => {
  let ctx: TestContext;
  let agency: Agency;
  let manager: { accessToken: string; userId: string };
  let collector: { accessToken: string; userId: string };

  const org = (token: string) => ({ accessToken: token, organizationId: agency.organizationId });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Sync8');
    manager = await addMember(ctx, agency.organizationId, 'MANAGER');
    collector = await addMember(ctx, agency.organizationId, 'COLLECTOR');
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      manager.userId,
      collector.userId,
    ]);
    await stopTestApp(ctx);
  });

  it('rejoue un lot contenant INSPECTION, METER_READING et MAINTENANCE_UPDATE sans les dupliquer', async () => {
    const portfolio = await seedLeases(ctx.admin, agency.organizationId, 1, {
      startDate: isoDate(-30),
    });
    const lease = portfolio.leases[0];

    const meter = await api(ctx, 'POST', '/meters', {
      ...org(manager.accessToken),
      body: {
        propertyId: portfolio.propertyId,
        unitId: lease.unitId,
        meterType: 'ELECTRICITY_E2C',
        serialNumber: `SYNC-${uuidv7()}`,
      },
    });
    expect(meter.status).toBe(201);

    const request = await api(ctx, 'POST', '/maintenance-requests', {
      ...org(manager.accessToken),
      body: {
        propertyId: portfolio.propertyId,
        unitId: lease.unitId,
        title: 'Fuite',
        description: 'Fuite sous évier.',
      },
    });
    expect(request.status).toBe(201);
    await api(
      ctx,
      'POST',
      `/maintenance-requests/${request.body.id}/acknowledge`,
      org(manager.accessToken),
    );
    await api(ctx, 'POST', `/maintenance-requests/${request.body.id}/assign`, {
      ...org(manager.accessToken),
      body: { assignedToUserId: collector.userId },
    });

    const inspectionOp = {
      clientRef: uuidv7(),
      type: 'INSPECTION',
      clientCreatedAt: new Date().toISOString(),
      payload: { unitId: lease.unitId, leaseId: lease.leaseId, inspectionType: 'PERIODIC' },
    };
    const meterReadingOp = {
      clientRef: uuidv7(),
      type: 'METER_READING',
      clientCreatedAt: new Date().toISOString(),
      payload: { meterId: meter.body.id, readingDate: isoDate(0), currentIndex: 42 },
    };
    const maintenanceUpdateOp = {
      clientRef: uuidv7(),
      type: 'MAINTENANCE_UPDATE',
      clientCreatedAt: new Date().toISOString(),
      payload: {
        requestId: request.body.id,
        newStatus: 'IN_PROGRESS',
        message: 'Sur place, diagnostic en cours.',
      },
    };

    const body = buildBatch('device-phase8', [inspectionOp, meterReadingOp, maintenanceUpdateOp]);
    const first = await api(ctx, 'POST', '/sync/batches', { body, ...org(collector.accessToken) });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('APPLIED');
    expect(first.body.results.map((r: { outcome: string }) => r.outcome)).toEqual([
      'APPLIED',
      'APPLIED',
      'APPLIED',
    ]);
    expect(first.body.results[0].resourceType).toBe('inspections');
    expect(first.body.results[1].resourceType).toBe('meter_readings');
    expect(first.body.results[2].resourceType).toBe('maintenance_updates');

    const requestAfter = await ctx.admin.maintenance_requests.findUniqueOrThrow({
      where: { id: request.body.id },
    });
    expect(requestAfter.status).toBe('IN_PROGRESS');

    const replay = await api(ctx, 'POST', '/sync/batches', { body, ...org(collector.accessToken) });
    expect(replay.status).toBe(200);
    expect(replay.body.batchId).toBe(first.body.batchId);
    expect(replay.body.results).toEqual(first.body.results);

    const inspectionCount = await ctx.admin.inspections.count({
      where: { organization_id: agency.organizationId, client_ref: inspectionOp.clientRef },
    });
    expect(inspectionCount).toBe(1);
    const readingCount = await ctx.admin.meter_readings.count({
      where: { organization_id: agency.organizationId, client_ref: meterReadingOp.clientRef },
    });
    expect(readingCount).toBe(1);
  });
});
