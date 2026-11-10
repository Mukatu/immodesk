import { newId as uuidv7 } from '../../src/shared/ids/uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  createAgency,
  dropOrganization,
  firstOfMonth,
  seedLeases,
  waitFor,
  type Agency,
  type BulkPortfolio,
} from './phase3-fixtures';
import {
  enableAggregator,
  momoMsisdn,
  pointSimulatorAtTestApp,
  postSimulatorWebhook,
  signSimulatorWebhook,
} from './phase4-fixtures';

/**
 * `merchant_reference` (`MMA-AAAAMM-NNNNN`) est numérotée PAR organisation :
 * deux agences neuves obtiennent le même numéro dès leur premier paiement.
 * Le webhook doit pourtant toujours atteindre la bonne organisation, et un
 * webhook dont la clé ne désigne pas une seule transaction est mis de côté.
 */
describe('Phase 4 — Mobile Money : référence partagée entre organisations', () => {
  let ctx: TestContext;
  const agencies: Agency[] = [];
  const portfolios: BulkPortfolio[] = [];
  const eventIds: string[] = [];

  beforeAll(async () => {
    ctx = await startTestApp();
    pointSimulatorAtTestApp(ctx);
    for (const label of ['RefA', 'RefB']) {
      const agency = await createAgency(ctx, label);
      await enableAggregator(ctx, agency);
      agencies.push(agency);
      portfolios.push(
        await seedLeases(ctx.admin, agency.organizationId, 3, { startDate: firstOfMonth(0) }),
      );
    }
  }, 120_000);

  afterAll(async () => {
    await ctx.admin.webhook_events.deleteMany({ where: { external_event_id: { in: eventIds } } });
    for (const agency of agencies) {
      await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    }
    await stopTestApp(ctx);
  });

  async function initiate(org: 0 | 1, tenantIndex: number, suffix: string) {
    const agency = agencies[org] as Agency;
    const res = await api(ctx, 'POST', '/payments/mobile-money/initiate', {
      accessToken: agency.owner.accessToken,
      organizationId: agency.organizationId,
      body: {
        tenantId: (portfolios[org] as BulkPortfolio).leases[tenantIndex]?.tenantId,
        amount: 50_000,
        payerMsisdn: momoMsisdn(suffix),
        clientRef: uuidv7(),
      },
    });
    expect(res.status).toBe(202);
    const body = res.body as { transaction: { id: string }; payment: { id: string } };
    return ctx.admin.mobile_money_transactions.findUniqueOrThrow({
      where: { id: body.transaction.id },
    });
  }

  async function sendWebhook(reference: string, eventId = `${reference}:SUCCEEDED`) {
    eventIds.push(eventId);
    const { body, signature } = signSimulatorWebhook(ctx, {
      eventId,
      merchantReference: reference,
      providerReference: reference,
      status: 'SUCCEEDED',
      amount: '50000',
      currency: 'XAF',
    });
    expect((await postSimulatorWebhook(ctx, body, signature)).status).toBe(200);
    return waitFor(async () => {
      const event = await ctx.admin.webhook_events.findFirst({
        where: { external_event_id: eventId },
      });
      return event && event.status !== 'RECEIVED' && event.status !== 'PROCESSING' ? event : null;
    }, 10_000);
  }

  it('même numéro par organisation, clé fournisseur distincte et attribution exacte', async () => {
    // '03' : le simulateur n'envoie aucun webhook, ceux du test sont les seuls.
    const txA = await initiate(0, 0, '03');
    const txB = await initiate(1, 0, '03');
    expect(txA.merchant_reference).toBe(txB.merchant_reference);
    expect(txA.external_reference).toBe(txA.id);
    expect(txB.external_reference).toBe(txB.id);
    expect(txA.aggregator_transaction_id).toBe(txA.id);

    const eventA = await sendWebhook(txA.external_reference as string);
    const eventB = await sendWebhook(txB.external_reference as string);
    expect(eventA).toMatchObject({
      status: 'PROCESSED',
      organization_id: txA.organization_id,
      related_entity_id: txA.id,
    });
    expect(eventB).toMatchObject({
      status: 'PROCESSED',
      organization_id: txB.organization_id,
      related_entity_id: txB.id,
    });

    // Doublon d'un MÊME évènement : une seule ligne, l'autre organisation intacte.
    await sendWebhook(txA.external_reference as string);
    expect(
      await ctx.admin.webhook_events.count({
        where: { external_event_id: `${txA.external_reference}:SUCCEEDED` },
      }),
    ).toBe(1);
    expect(
      await ctx.admin.webhook_events.count({
        where: { external_event_id: `${txB.external_reference}:SUCCEEDED` },
      }),
    ).toBe(1);
  }, 30_000);

  it('webhook citant le numéro partagé : mis de côté, sans organisation ni effet', async () => {
    const txA = await initiate(0, 1, '03');
    const txB = await initiate(1, 1, '03');
    expect(txA.merchant_reference).toBe(txB.merchant_reference);

    const event = await sendWebhook(txA.merchant_reference, `shared-${txA.id}`);
    expect(event).toMatchObject({
      status: 'FAILED',
      organization_id: null,
      related_entity_id: null,
      error_message: 'MOMO.WEBHOOK_REFERENCE_UNRESOLVED',
    });
    const after = await ctx.admin.mobile_money_transactions.findMany({
      where: { id: { in: [txA.id, txB.id] } },
    });
    expect(after.map((t) => t.status)).toEqual(['PENDING', 'PENDING']);
  }, 30_000);

  it('transaction historique en collision (external_reference NULL) : ambiguë, mise de côté', async () => {
    const txA = await initiate(0, 2, '03');
    const txB = await initiate(1, 2, '03');
    const legacyKey = `LEGACY-${txA.merchant_reference}-${uuidv7()}`;
    // État laissé par la migration 9 pour deux transactions partageant leur clé.
    await ctx.admin.mobile_money_transactions.updateMany({
      where: { id: { in: [txA.id, txB.id] } },
      data: { external_reference: null, aggregator_transaction_id: legacyKey },
    });

    const event = await sendWebhook(legacyKey);
    expect(event).toMatchObject({
      status: 'FAILED',
      organization_id: null,
      error_message: 'MOMO.WEBHOOK_REFERENCE_AMBIGUOUS',
    });
    const after = await ctx.admin.mobile_money_transactions.findMany({
      where: { id: { in: [txA.id, txB.id] } },
    });
    expect(after.every((t) => t.status === 'PENDING')).toBe(true);
  }, 30_000);

  it('bout en bout : le webhook du simulateur confirme la seule organisation concernée', async () => {
    const txA = await initiate(0, 0, '01');
    const pendingB = await ctx.admin.mobile_money_transactions.count({
      where: { organization_id: agencies[1]?.organizationId, status: 'PENDING' },
    });
    const confirmed = await waitFor(async () => {
      const row = await ctx.admin.mobile_money_transactions.findUnique({ where: { id: txA.id } });
      return row?.status === 'SUCCEEDED' ? row : null;
    }, 15_000);
    eventIds.push(`${confirmed.external_reference}:SUCCEEDED`);
    expect(
      await ctx.admin.mobile_money_transactions.count({
        where: { organization_id: agencies[1]?.organizationId, status: 'PENDING' },
      }),
    ).toBe(pendingB);
  }, 30_000);
});
