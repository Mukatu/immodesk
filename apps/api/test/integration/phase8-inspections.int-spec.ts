import { v7 as uuidv7 } from 'uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { addMember, createAgency, dropOrganization, isoDate, type Agency } from './phase3-fixtures';
import { seedLeases, type BulkPortfolio } from './phase3-fixtures';

async function createDocument(ctx: TestContext, organizationId: string, kind = 'INSPECTION_PHOTO') {
  const id = uuidv7();
  await ctx.admin.documents.create({
    data: {
      id,
      organization_id: organizationId,
      kind: kind as never,
      storage_provider: 'R2',
      bucket: 'immodesk-test',
      object_key: `org/${organizationId}/${kind.toLowerCase()}/${id}.jpg`,
      file_name: 'photo.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 2048n,
    },
  });
  return id;
}

describe('Phase 8 — états des lieux, dépôt, maintenance', () => {
  let ctx: TestContext;
  let agency: Agency;
  let manager: { accessToken: string; userId: string };
  let collector: { accessToken: string; userId: string };
  let portfolio: BulkPortfolio;

  const org = (token: string) => ({ accessToken: token, organizationId: agency.organizationId });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Inspections');
    manager = await addMember(ctx, agency.organizationId, 'MANAGER');
    collector = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 1, { startDate: isoDate(-400) });
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      manager.userId,
      collector.userId,
    ]);
    await stopTestApp(ctx);
  });

  it('exige une photo à partir de POOR, verrouille dès la signature (409 sur mutation ultérieure)', async () => {
    const lease = portfolio.leases[0];
    const created = await api(ctx, 'POST', '/inspections', {
      ...org(collector.accessToken),
      body: { unitId: lease.unitId, leaseId: lease.leaseId, inspectionType: 'MOVE_IN' },
    });
    expect(created.status).toBe(201);
    const inspectionId = created.body.id;

    const goodItem = await api(ctx, 'POST', `/inspections/${inspectionId}/items`, {
      ...org(collector.accessToken),
      body: { roomLabel: 'Salon', elementLabel: 'Peinture', condition: 'GOOD' },
    });
    expect(goodItem.status).toBe(201);

    const poorItem = await api(ctx, 'POST', `/inspections/${inspectionId}/items`, {
      ...org(collector.accessToken),
      body: { roomLabel: 'Cuisine', elementLabel: 'Évier', condition: 'POOR', repairAmount: 15000 },
    });
    expect(poorItem.status).toBe(201);
    const poorItemId = poorItem.body.id;

    const signWithoutPhoto = await api(ctx, 'POST', `/inspections/${inspectionId}/sign`, {
      ...org(collector.accessToken),
      body: {
        tenantSignatureDocumentId: await createDocument(ctx, agency.organizationId, 'SIGNATURE'),
      },
    });
    expect(signWithoutPhoto.status).toBe(422);
    expect(signWithoutPhoto.body.code).toBe('INSPECTIONS.PHOTO_REQUIRED');

    const photoDoc = await createDocument(ctx, agency.organizationId);
    const photo = await api(
      ctx,
      'POST',
      `/inspections/${inspectionId}/items/${poorItemId}/photos`,
      {
        ...org(collector.accessToken),
        body: { documentId: photoDoc },
      },
    );
    expect(photo.status).toBe(201);

    const signatureDoc = await createDocument(ctx, agency.organizationId, 'SIGNATURE');
    const signed = await api(ctx, 'POST', `/inspections/${inspectionId}/sign`, {
      ...org(collector.accessToken),
      body: { tenantSignatureDocumentId: signatureDoc, agentSignatureDocumentId: signatureDoc },
    });
    expect(signed.status).toBe(200);
    expect(signed.body.status).toBe('SIGNED');

    const mutationAfterLock = await api(ctx, 'POST', `/inspections/${inspectionId}/items`, {
      ...org(collector.accessToken),
      body: { roomLabel: 'Chambre', elementLabel: 'Sol', condition: 'GOOD' },
    });
    expect(mutationAfterLock.status).toBe(409);
    expect(mutationAfterLock.body.code).toBe('INSPECTIONS.LOCKED');
  });

  it('retenue sur dépôt et conversion en maintenance sont exclusives pour le même poste', async () => {
    const lease = portfolio.leases[0];
    const created = await api(ctx, 'POST', '/inspections', {
      ...org(collector.accessToken),
      body: { unitId: lease.unitId, leaseId: lease.leaseId, inspectionType: 'MOVE_OUT' },
    });
    const inspectionId = created.body.id;
    const item = await api(ctx, 'POST', `/inspections/${inspectionId}/items`, {
      ...org(collector.accessToken),
      body: {
        roomLabel: 'Salon',
        elementLabel: 'Peinture',
        condition: 'DAMAGED',
        repairAmount: 20000,
      },
    });
    const itemId = item.body.id;

    // Dépôt de garantie : 200 000 encaissés directement en base (hors périmètre du cycle de vie du bail).
    const depositId = uuidv7();
    await ctx.admin.deposits.create({
      data: {
        id: depositId,
        organization_id: agency.organizationId,
        lease_id: lease.leaseId,
        tenant_id: lease.tenantId,
        required_amount: 200_000n,
      },
    });
    await ctx.admin.deposit_movements.create({
      data: {
        id: uuidv7(),
        organization_id: agency.organizationId,
        deposit_id: depositId,
        lease_id: lease.leaseId,
        movement_type: 'COLLECTION',
        amount: 200_000n,
      },
    });

    const conversion = await api(
      ctx,
      'POST',
      `/inspections/${inspectionId}/items/${itemId}/maintenance-request`,
      { ...org(manager.accessToken), body: {} },
    );
    expect(conversion.status).toBe(201);
    expect(conversion.body.reporterType).toBe('INSPECTION');
    expect(conversion.body.inspectionId).toBe(inspectionId);

    const secondConversion = await api(
      ctx,
      'POST',
      `/inspections/${inspectionId}/items/${itemId}/maintenance-request`,
      { ...org(manager.accessToken), body: {} },
    );
    expect(secondConversion.status).toBe(409);
    expect(secondConversion.body.code).toBe('INSPECTIONS.MAINTENANCE_ALREADY_CREATED');

    const deductionWithoutOverride = await api(
      ctx,
      'POST',
      `/inspections/${inspectionId}/items/${itemId}/deposit-deduction`,
      { ...org(manager.accessToken), body: {} },
    );
    expect(deductionWithoutOverride.status).toBe(409);
    expect(deductionWithoutOverride.body.code).toBe('INSPECTIONS.MAINTENANCE_ALREADY_CREATED');

    const deductionOverride = await api(
      ctx,
      'POST',
      `/inspections/${inspectionId}/items/${itemId}/deposit-deduction`,
      { ...org(manager.accessToken), body: { managerOverride: true } },
    );
    expect(deductionOverride.status).toBe(201);

    const secondDeduction = await api(
      ctx,
      'POST',
      `/inspections/${inspectionId}/items/${itemId}/deposit-deduction`,
      { ...org(manager.accessToken), body: { managerOverride: true } },
    );
    expect(secondDeduction.status).toBe(409);
    expect(secondDeduction.body.code).toBe('INSPECTIONS.DEDUCTION_ALREADY_APPLIED');
  });
});
