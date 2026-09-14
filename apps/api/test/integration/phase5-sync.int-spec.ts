import { v7 as uuidv7 } from 'uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  addMember,
  createAgency,
  dropOrganization,
  isoDate,
  SIGNATURE_PNG,
  type Agency,
} from './phase3-fixtures';
import { cancelInvoice, seedOpenInvoices, type SeededInvoice } from './phase5-fixtures';

type Collector = { accessToken: string; userId: string; phone: string };

function cashOp(
  clientRef: string,
  tenantId: string,
  invoiceId: string,
  amount: number,
  when: Date,
) {
  return {
    clientRef,
    type: 'CASH_RECEIPT',
    clientCreatedAt: when.toISOString(),
    payload: {
      tenantId,
      amount,
      autoAllocate: false,
      allocations: [{ invoiceId, amount }],
      signatureDataUrl: SIGNATURE_PNG,
    },
  };
}

function buildBatch(deviceId: string, operations: unknown[]) {
  return {
    batchRef: uuidv7(),
    deviceId,
    devicePlatform: 'android',
    appVersion: '1.4.0',
    operations,
  };
}

describe('Phase 5 — synchronisation mobile par lots', () => {
  let ctx: TestContext;
  let agency: Agency;
  let collector: Collector;
  const extraUserIds: string[] = [];
  let pullScopeCollectorB: Collector;
  let pullScopeSeededB: Awaited<ReturnType<typeof seedOpenInvoices>>;

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Sync');
    collector = await addMember(ctx, agency.organizationId, 'COLLECTOR');
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      collector.userId,
      ...extraUserIds,
    ]);
    await stopTestApp(ctx);
  });

  it('rejoue le même batchRef sans dupliquer un encaissement', async () => {
    const { invoices } = await seedOpenInvoices(ctx.admin, agency.organizationId, 1, {
      startDate: isoDate(-10),
      collectorUserId: collector.userId,
      phoneSuffix: '1',
    });
    const inv = invoices[0];
    const body = buildBatch('device-replay', [
      cashOp(uuidv7(), inv.tenantId, inv.invoiceId, inv.amount, new Date()),
    ]);

    const first = await api(ctx, 'POST', '/sync/batches', {
      body,
      accessToken: collector.accessToken,
      organizationId: agency.organizationId,
    });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('APPLIED');
    expect(first.body.results[0].outcome).toBe('APPLIED');

    const second = await api(ctx, 'POST', '/sync/batches', {
      body,
      accessToken: collector.accessToken,
      organizationId: agency.organizationId,
    });
    expect(second.status).toBe(200);
    expect(second.body.batchId).toBe(first.body.batchId);
    expect(second.body).toEqual(first.body);

    const count = await ctx.admin.cash_receipts.count({ where: { tenant_id: inv.tenantId } });
    expect(count).toBe(1);
  });

  it('rejette un lot au-delà de la limite d’opérations avec 413 SYNC.BATCH_TOO_LARGE', async () => {
    const operations = Array.from({ length: 101 }, (_, i) =>
      cashOp(uuidv7(), uuidv7(), uuidv7(), 1000, new Date(Date.now() + i)),
    );
    const res = await api(ctx, 'POST', '/sync/batches', {
      body: buildBatch('device-too-large', operations),
      accessToken: collector.accessToken,
      organizationId: agency.organizationId,
    });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('SYNC.BATCH_TOO_LARGE');
  });

  describe('lot mêlant succès et conflit, puis résolution', () => {
    let invoices: SeededInvoice[];
    let propertyId: string;
    let landlordId: string;
    let batchId: string;
    let conflictClientRef: string;
    let conflictedInvoice: SeededInvoice;

    it('applique 11 opérations sur 12, la 12e en conflit sur une facture annulée entre-temps', async () => {
      const seeded = await seedOpenInvoices(ctx.admin, agency.organizationId, 12, {
        startDate: isoDate(-10),
        collectorUserId: collector.userId,
        phoneSuffix: '2',
      });
      invoices = seeded.invoices;
      propertyId = seeded.portfolio.propertyId;
      landlordId = seeded.portfolio.landlordId;
      conflictedInvoice = invoices[5];
      await cancelInvoice(ctx.admin, conflictedInvoice.invoiceId);

      const operations = invoices.map((inv, i) =>
        cashOp(uuidv7(), inv.tenantId, inv.invoiceId, inv.amount, new Date(Date.now() + i * 10)),
      );
      const res = await api(ctx, 'POST', '/sync/batches', {
        body: buildBatch('device-12', operations),
        accessToken: collector.accessToken,
        organizationId: agency.organizationId,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PARTIALLY_APPLIED');
      expect(res.body.operationsCount).toBe(12);
      expect(res.body.appliedCount).toBe(11);
      expect(res.body.conflictsCount).toBe(1);
      expect(res.body.rejectedCount).toBe(0);

      const conflictResult = res.body.results.find(
        (r: { outcome: string }) => r.outcome === 'CONFLICT',
      );
      expect(conflictResult).toBeTruthy();
      expect(conflictResult.code).toBe('PAYMENTS.INVOICE_NOT_OPEN');
      expect(conflictResult.retryable).toBe(false);

      batchId = res.body.batchId;
      conflictClientRef = conflictResult.clientRef;
    });

    it('résout le conflit en APPLY sur une autre facture : un seul reçu de caisse est créé', async () => {
      const redirectInvoiceId = uuidv7();
      await ctx.admin.$executeRawUnsafe(
        `INSERT INTO rent_invoices
           (id, organization_id, lease_id, tenant_id, unit_id, property_id, landlord_id,
            invoice_number, status, period_start, period_end, due_date, rent_amount, total_amount, balance_amount)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8,
                 'ISSUED', current_date + 30, current_date + 59, current_date + 35, $9::bigint, $9::bigint, $9::bigint)`,
        redirectInvoiceId,
        agency.organizationId,
        conflictedInvoice.leaseId,
        conflictedInvoice.tenantId,
        conflictedInvoice.unitId,
        propertyId,
        landlordId,
        `SYNC-INV-REDIR-${redirectInvoiceId.slice(-12)}`,
        String(conflictedInvoice.amount),
      );

      const list = await api(ctx, 'GET', '/sync/conflicts', {
        accessToken: agency.owner.accessToken,
        organizationId: agency.organizationId,
      });
      expect(list.status).toBe(200);
      const conflict = list.body.items.find(
        (c: { clientRef: string }) => c.clientRef === conflictClientRef,
      );
      expect(conflict).toBeTruthy();
      expect(conflict.resolution).toBeNull();

      const resolved = await api(ctx, 'POST', `/sync/conflicts/${conflict.id}/resolve`, {
        body: {
          decision: 'APPLY',
          overrides: {
            allocations: [{ invoiceId: redirectInvoiceId, amount: conflictedInvoice.amount }],
          },
          reason: 'Facture de repli choisie par le gestionnaire',
        },
        accessToken: agency.owner.accessToken,
        organizationId: agency.organizationId,
      });
      expect(resolved.status).toBe(200);
      expect(resolved.body.conflict.resolution).toBe('APPLIED');
      expect(resolved.body.conflict.resolutionReason).toBe(
        'Facture de repli choisie par le gestionnaire',
      );
      expect(resolved.body.result.outcome).toBe('CONFLICT');
      expect(resolved.body.result.resourceType).toBe('cash_receipts');
      expect(resolved.body.result.resourceId).toEqual(expect.any(String));

      const receiptCount = await ctx.admin.cash_receipts.count({
        where: { tenant_id: conflictedInvoice.tenantId, client_ref: conflictClientRef },
      });
      expect(receiptCount).toBe(1);

      const batch = await api(ctx, 'GET', `/sync/batches/${batchId}`, {
        accessToken: agency.owner.accessToken,
        organizationId: agency.organizationId,
      });
      expect(batch.body.status).toBe('APPLIED');
      expect(batch.body.appliedCount).toBe(12);
      expect(batch.body.conflictsCount).toBe(0);

      // Une résolution déjà appliquée refuse une seconde tentative.
      const again = await api(ctx, 'POST', `/sync/conflicts/${conflict.id}/resolve`, {
        body: { decision: 'DISCARD', reason: 'Trop tard' },
        accessToken: agency.owner.accessToken,
        organizationId: agency.organizationId,
      });
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('SYNC.CONFLICT_ALREADY_RESOLVED');
    });
  });

  it('abandonne un conflit avec DISCARD : motif obligatoire, conservé et exposé', async () => {
    const { invoices } = await seedOpenInvoices(ctx.admin, agency.organizationId, 1, {
      startDate: isoDate(-10),
      collectorUserId: collector.userId,
      phoneSuffix: '5',
    });
    const invoice = invoices[0];
    await cancelInvoice(ctx.admin, invoice.invoiceId);
    const clientRef = uuidv7();
    const res = await api(ctx, 'POST', '/sync/batches', {
      body: buildBatch('device-discard', [
        cashOp(clientRef, invoice.tenantId, invoice.invoiceId, invoice.amount, new Date()),
      ]),
      accessToken: collector.accessToken,
      organizationId: agency.organizationId,
    });
    expect(res.body.status).toBe('REJECTED');
    expect(res.body.conflictsCount).toBe(1);

    const list = await api(ctx, 'GET', '/sync/conflicts?resolved=false', {
      accessToken: agency.owner.accessToken,
      organizationId: agency.organizationId,
    });
    const conflict = list.body.items.find((c: { clientRef: string }) => c.clientRef === clientRef);
    expect(conflict).toBeTruthy();

    const withoutReason = await api(ctx, 'POST', `/sync/conflicts/${conflict.id}/resolve`, {
      body: { decision: 'DISCARD' },
      accessToken: agency.owner.accessToken,
      organizationId: agency.organizationId,
    });
    expect(withoutReason.status).toBe(422);
    expect(withoutReason.body.code).toBe('SYNC.DISCARD_REASON_REQUIRED');

    const discarded = await api(ctx, 'POST', `/sync/conflicts/${conflict.id}/resolve`, {
      body: { decision: 'DISCARD', reason: 'Locataire injoignable, encaissement annulé' },
      accessToken: agency.owner.accessToken,
      organizationId: agency.organizationId,
    });
    expect(discarded.status).toBe(200);
    expect(discarded.body.conflict.resolution).toBe('DISCARDED');
    expect(discarded.body.conflict.resolutionReason).toBe(
      'Locataire injoignable, encaissement annulé',
    );
    expect(discarded.body.result.outcome).toBe('CONFLICT');

    const resolvedList = await api(
      ctx,
      'GET',
      `/sync/conflicts?resolved=true&collectorUserId=${collector.userId}`,
      {
        accessToken: agency.owner.accessToken,
        organizationId: agency.organizationId,
      },
    );
    const found = resolvedList.body.items.find(
      (c: { clientRef: string }) => c.clientRef === clientRef,
    );
    expect(found?.resolutionReason).toBe('Locataire injoignable, encaissement annulé');

    const receiptCount = await ctx.admin.cash_receipts.count({ where: { client_ref: clientRef } });
    expect(receiptCount).toBe(0);
  });

  it('deux démarcheurs synchronisent de gros lots simultanément, sans interblocage ni perte', async () => {
    const collectorB = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    extraUserIds.push(collectorB.userId);

    const [seededA, seededB] = await Promise.all([
      seedOpenInvoices(ctx.admin, agency.organizationId, 20, {
        startDate: isoDate(-5),
        collectorUserId: collector.userId,
        phoneSuffix: '6',
      }),
      seedOpenInvoices(ctx.admin, agency.organizationId, 20, {
        startDate: isoDate(-5),
        collectorUserId: collectorB.userId,
        phoneSuffix: '7',
      }),
    ]);

    const batchFor = (seeded: typeof seededA, deviceId: string) =>
      buildBatch(
        deviceId,
        seeded.invoices.map((inv, i) =>
          cashOp(uuidv7(), inv.tenantId, inv.invoiceId, inv.amount, new Date(Date.now() + i)),
        ),
      );

    const [resA, resB] = await Promise.all([
      api(ctx, 'POST', '/sync/batches', {
        body: batchFor(seededA, 'device-collector-A'),
        accessToken: collector.accessToken,
        organizationId: agency.organizationId,
      }),
      api(ctx, 'POST', '/sync/batches', {
        body: batchFor(seededB, 'device-collector-B'),
        accessToken: collectorB.accessToken,
        organizationId: agency.organizationId,
      }),
    ]);

    expect(resA.status).toBe(200);
    expect(resA.body.status).toBe('APPLIED');
    expect(resA.body.appliedCount).toBe(20);
    expect(resB.status).toBe(200);
    expect(resB.body.status).toBe('APPLIED');
    expect(resB.body.appliedCount).toBe(20);

    const countA = await ctx.admin.cash_receipts.count({
      where: { tenant_id: { in: seededA.invoices.map((i) => i.tenantId) } },
    });
    const countB = await ctx.admin.cash_receipts.count({
      where: { tenant_id: { in: seededB.invoices.map((i) => i.tenantId) } },
    });
    expect(countA).toBe(20);
    expect(countB).toBe(20);

    pullScopeCollectorB = collectorB;
    pullScopeSeededB = seededB;
  }, 45_000);

  it('GET /v1/sync/pull ne montre à un COLLECTOR que sa propre tournée', async () => {
    const res = await api(ctx, 'GET', '/sync/pull', {
      accessToken: collector.accessToken,
      organizationId: agency.organizationId,
    });
    expect(res.status).toBe(200);

    const leaseIds = res.body.changed.leases.map((l: { id: string }) => l.id);
    const tenantIds = res.body.changed.tenants.map((t: { id: string }) => t.id);
    const otherLeaseIds = pullScopeSeededB.portfolio.leases.map(
      (l: { leaseId: string }) => l.leaseId,
    );
    const otherTenantIds = pullScopeSeededB.invoices.map((i: SeededInvoice) => i.tenantId);

    for (const id of otherLeaseIds) expect(leaseIds).not.toContain(id);
    for (const id of otherTenantIds) expect(tenantIds).not.toContain(id);

    // Témoin : B a bien encaissé, pour prouver que l'absence ci-dessus est
    // un filtrage de périmètre et non l'absence de toute donnée à exclure.
    const receiptCollectorIds = new Set(
      (await ctx.admin.cash_receipts.findMany({ select: { collector_user_id: true } })).map(
        (r) => r.collector_user_id,
      ),
    );
    expect(receiptCollectorIds.has(pullScopeCollectorB.userId)).toBe(true);

    const receiptIds = res.body.changed.cashReceipts.map((r: { id: string }) => r.id);
    const bReceiptIds = (
      await ctx.admin.cash_receipts.findMany({
        where: { collector_user_id: pullScopeCollectorB.userId },
        select: { id: true },
      })
    ).map((r) => r.id);
    for (const id of bReceiptIds) expect(receiptIds).not.toContain(id);
  });

  it('GET /v1/sync/batches expose deviceId, devicePlatform, appVersion et collector', async () => {
    const res = await api(ctx, 'GET', '/sync/batches?collectorUserId=' + collector.userId, {
      accessToken: agency.owner.accessToken,
      organizationId: agency.organizationId,
    });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    const item = res.body.items[0];
    expect(item).toEqual(
      expect.objectContaining({
        deviceId: expect.any(String),
        devicePlatform: 'android',
        appVersion: '1.4.0',
        collector: expect.objectContaining({
          userId: collector.userId,
          fullName: expect.any(String),
        }),
      }),
    );
  });
});
