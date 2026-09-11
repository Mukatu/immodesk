import { createHash } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  addMember,
  createAgency,
  dropOrganization,
  firstOfMonth,
  pollRun,
  seedLeases,
  SIGNATURE_PNG,
  type Agency,
  type BulkPortfolio,
} from './phase3-fixtures';

type Session = { accessToken: string; userId: string };

describe('Phase 3 — espèces : reçus signés, concurrence, remises et écarts', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  let collectorA: Session;
  let collectorB: Session;
  let firstReceipt: any;
  const asOwner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });
  const as = (s: Session) => ({
    accessToken: s.accessToken,
    organizationId: agency.organizationId,
  });
  const receiptBody = (i: number, amount: number, extra: Record<string, unknown> = {}) => ({
    tenantId: portfolio.leases[i].tenantId,
    amount,
    signatureDataUrl: SIGNATURE_PNG,
    clientRef: `01J${uuidv7().replace(/-/g, '').slice(0, 23).toUpperCase()}`,
    ...extra,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Caisse');
    await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/settings`, {
      ...asOwner(),
      body: { messaging: { sendInvoiceIssued: false, sendCashReceiptToTenant: false } },
    });
    collectorA = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    collectorB = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 60, {
      startDate: firstOfMonth(0),
      collectorUserId: collectorA.userId,
    });
    const run = await api(ctx, 'POST', '/billing/runs', {
      ...asOwner(),
      body: { periodStart: firstOfMonth(0) },
    });
    await pollRun(ctx, agency, run.body.runId);
  }, 120_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      collectorA.userId,
      collectorB.userId,
    ]);
    await stopTestApp(ctx);
  });

  it('exige la signature du locataire par défaut', async () => {
    const { signatureDataUrl: _omitted, ...body } = receiptBody(0, 10000);
    const res = await api(ctx, 'POST', '/cash-receipts', { ...as(collectorA), body });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CASH.SIGNATURE_REQUIRED');
  });

  it('émet un reçu numéroté, signé (sha256), payé CASH CONFIRMED ; rejeu idempotent', async () => {
    const body = receiptBody(0, 110000);
    const res = await api(ctx, 'POST', '/cash-receipts', { ...as(collectorA), body });
    expect(res.status).toBe(201);
    expect(res.body.receiptNumber).toMatch(/^CASH-[A-Z0-9]{2,4}-[0-9A-F]{6}-000001$/);
    const expectedHash = createHash('sha256')
      .update(Buffer.from(SIGNATURE_PNG.split(',')[1], 'base64'))
      .digest('hex');
    expect(res.body.signatureHash).toBe(expectedHash);
    expect(res.body.allocations).toEqual([expect.objectContaining({ amount: 110000 })]);
    const payment = await ctx.admin.payments.findUnique({ where: { id: res.body.paymentId } });
    expect(payment).toMatchObject({
      method: 'CASH',
      status: 'CONFIRMED',
      received_by_user_id: collectorA.userId,
    });
    const signature = await ctx.admin.documents.findUnique({
      where: { id: res.body.signatureDocumentId },
    });
    expect(signature).toMatchObject({ kind: 'SIGNATURE', mime_type: 'image/png' });

    const replay = await api(ctx, 'POST', '/cash-receipts', { ...as(collectorA), body });
    expect(replay.status).toBe(200);
    expect(replay.body.id).toBe(res.body.id);
    firstReceipt = res.body;
  });

  it('50 encaissements simultanés d’un même démarcheur : séquence continue, sans doublon', async () => {
    const responses = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        api(ctx, 'POST', '/cash-receipts', { ...as(collectorB), body: receiptBody(10 + i, 20000) }),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual(Array(50).fill(201));
    const counters = responses
      .map((r) => Number(r.body.receiptNumber.split('-').at(-1)))
      .sort((a, b) => a - b);
    expect(counters).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(new Set(responses.map((r) => r.body.paymentId)).size).toBe(50);

    const balance = await api(
      ctx,
      'GET',
      `/cash/collectors/${collectorB.userId}/balance`,
      as(collectorB),
    );
    expect(balance.body).toMatchObject({
      heldAmount: 1_000_000,
      receiptsCount: 50,
      capAmount: 500_000,
      overCap: true,
    });
    const forbidden = await api(
      ctx,
      'GET',
      `/cash/collectors/${collectorA.userId}/balance`,
      as(collectorB),
    );
    expect(forbidden.status).toBe(404);
    const all = await api(ctx, 'GET', '/cash/collectors', asOwner());
    expect(all.body.items.map((i: any) => i.userId)).toEqual(
      expect.arrayContaining([collectorA.userId, collectorB.userId]),
    );
  }, 120_000);

  it('remise de 750 000 comptée 720 000 : écart enregistré et audité, reçus remis', async () => {
    const created = [];
    for (let i = 1; i <= 5; i += 1) {
      created.push(
        await api(ctx, 'POST', '/cash-receipts', {
          ...as(collectorA),
          body: receiptBody(i, 150000),
        }),
      );
    }
    const ids = created.map((r) => r.body.id);
    const remittance = await api(ctx, 'POST', '/cash-remittances', {
      ...as(collectorA),
      body: { cashReceiptIds: ids, declaredAmount: 750000 },
    });
    expect(remittance.status).toBe(201);
    expect(remittance.body).toMatchObject({
      status: 'SUBMITTED',
      expectedAmount: 750000,
      receiptsCount: 5,
    });
    expect(remittance.body.reference).toMatch(/^REM-\d{6}-\d{5}$/);

    const second = await api(ctx, 'POST', '/cash-remittances', {
      ...as(collectorA),
      body: { cashReceiptIds: [firstReceipt.id], declaredAmount: 110000 },
    });
    expect(second.body.code).toBe('CASH.REMITTANCE_ALREADY_OPEN');

    const verified = await api(ctx, 'POST', `/cash-remittances/${remittance.body.id}/verify`, {
      ...asOwner(),
      body: { countedAmount: 720000, notes: 'Écart constaté au comptage' },
    });
    expect(verified.body).toMatchObject({
      status: 'VERIFIED',
      countedAmount: 720000,
      varianceAmount: -30000,
    });
    const receipts = await ctx.admin.cash_receipts.findMany({ where: { id: { in: ids } } });
    expect(receipts.every((r) => r.status === 'REMITTED')).toBe(true);
    const payments = await ctx.admin.payments.findMany({
      where: { id: { in: receipts.map((r) => r.payment_id as string) } },
    });
    expect(payments.every((p) => p.status === 'CONFIRMED')).toBe(true);
    const entry = await ctx.admin.audit_logs.findFirst({
      where: { entity_id: remittance.body.id, reason: 'REMITTANCE_VERIFIED' },
    });
    expect(entry?.new_state).toMatchObject({
      varianceAmount: -30000,
      collectorUserId: collectorA.userId,
      verifiedByUserId: agency.owner.userId,
    });

    const accountId = uuidv7();
    await ctx.admin.$executeRawUnsafe(
      `INSERT INTO bank_accounts (id, organization_id, holder_type, label, bank_code, bank_name, account_holder_name, account_number)
       VALUES ($1::uuid, $2::uuid, 'ORGANIZATION', 'Compte courant', 'BGFI', 'BGFI Bank Congo', 'Agence Caisse', '30011000000000000042')`,
      accountId,
      agency.organizationId,
    );
    const deposited = await api(ctx, 'POST', `/cash-remittances/${remittance.body.id}/deposit`, {
      ...asOwner(),
      body: { bankAccountId: accountId, depositedAt: new Date().toISOString() },
    });
    expect(deposited.body).toMatchObject({ status: 'DEPOSITED', depositBankAccountId: accountId });
  });

  it('rejet d’une remise : les reçus redeviennent disponibles', async () => {
    const mine = await api(ctx, 'GET', '/cash-receipts?status=ISSUED&limit=3', as(collectorB));
    const ids = mine.body.items.map((r: any) => r.id);
    const remittance = await api(ctx, 'POST', '/cash-remittances', {
      ...as(collectorB),
      body: { cashReceiptIds: ids, declaredAmount: 60000 },
    });
    const rejected = await api(ctx, 'POST', `/cash-remittances/${remittance.body.id}/reject`, {
      ...asOwner(),
      body: { reason: 'Bordereau illisible' },
    });
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Bordereau illisible',
    });
    const again = await api(ctx, 'POST', '/cash-remittances', {
      ...as(collectorB),
      body: { cashReceiptIds: ids, declaredAmount: 60000 },
    });
    expect(again.status).toBe(201);
  });

  it('la contre-passation du paiement annule le reçu de caisse lié', async () => {
    const reversed = await api(ctx, 'POST', `/payments/${firstReceipt.paymentId}/reverse`, {
      ...asOwner(),
      body: { reason: 'Encaissement saisi sur le mauvais locataire' },
    });
    expect(reversed.status).toBe(200);
    const receipt = await api(ctx, 'GET', `/cash-receipts/${firstReceipt.id}`, asOwner());
    expect(receipt.body).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'Encaissement saisi sur le mauvais locataire',
    });
  });

  it('refuse en SQL brut la modification d’un montant et la suppression d’un reçu de caisse', async () => {
    await expect(
      ctx.admin.$executeRawUnsafe(
        `UPDATE cash_receipts SET amount = 1 WHERE id = $1::uuid`,
        firstReceipt.id,
      ),
    ).rejects.toThrow(/verrouill|restrict/i);
    await expect(
      ctx.admin.$executeRawUnsafe(`DELETE FROM cash_receipts WHERE id = $1::uuid`, firstReceipt.id),
    ).rejects.toThrow(/DELETE interdit|restrict/i);
  });
});
