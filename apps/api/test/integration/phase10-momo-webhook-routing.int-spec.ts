import { newId as uuidv7 } from '../../src/shared/ids/uuid';
import { AppConfigService } from '../../src/shared/config/config.module';
import { signHmac } from '../../src/modules/mobile-money/domain/webhook-signature';
import { MomoWebhookIngestService } from '../../src/modules/webhooks/application/momo-webhook-ingest.service';
import { MomoReconcileService } from '../../src/modules/mobile-money/application/momo-reconcile.service';
import { SimulatedMobileMoneyProvider } from '../../src/modules/mobile-money/infrastructure/simulated-mobile-money.provider';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  createAgency,
  dropOrganization,
  firstOfMonth,
  pollRun,
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
 * Ingestion unique des webhooks Mobile Money : le traitement est choisi par
 * `mobile_money_transactions.purpose`, jamais par la route appelée.
 */
describe('Phase 10 — routage des webhooks Mobile Money par purpose', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  let subscriptionId: string;
  let dayOffset = 1;
  const invoiceOf = new Map<string, string>();
  const owner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    pointSimulatorAtTestApp(ctx);
    agency = await createAgency(ctx, 'Route');
    await enableAggregator(ctx, agency);
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 3, {
      startDate: firstOfMonth(0),
    });
    const run = await api(ctx, 'POST', '/billing/runs', {
      ...owner(),
      body: { periodStart: firstOfMonth(0) },
    });
    await pollRun(ctx, agency, run.body.runId);
    for (const i of await ctx.admin.rent_invoices.findMany({
      where: { organization_id: agency.organizationId },
    }))
      invoiceOf.set(i.tenant_id, i.id);
    const plan = await ctx.admin.subscription_plans.upsert({
      where: { code: 'TEST-PLAN' },
      update: {},
      create: { id: uuidv7(), code: 'TEST-PLAN', name: 'Plan de test' },
    });
    subscriptionId = (
      await ctx.admin.subscriptions.create({
        data: {
          id: uuidv7(),
          organization_id: agency.organizationId,
          plan_id: plan.id,
          status: 'ACTIVE',
          momo_msisdn: momoMsisdn('01'),
          current_period_end: new Date(Date.now() + 30 * 86_400_000),
        },
      })
    ).id;
  }, 120_000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await ctx.admin.webhook_events.deleteMany({
      where: { organization_id: agency.organizationId },
    });
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    await stopTestApp(ctx);
  });

  async function newInvoice(): Promise<string> {
    const start = new Date(Date.now() + dayOffset * 40 * 86_400_000);
    dayOffset += 1;
    const end = new Date(start.getTime() + 30 * 86_400_000);
    const invoice = await ctx.admin.subscription_invoices.create({
      data: {
        id: uuidv7(),
        organization_id: agency.organizationId,
        subscription_id: subscriptionId,
        invoice_number: `SUB-RT-${uuidv7().slice(-8)}`,
        status: 'ISSUED',
        period_start: start,
        period_end: end,
        due_date: end,
        subtotal_amount: 20_000n,
        total_amount: 20_000n,
      },
    });
    return invoice.id;
  }

  async function paySubscription(invoiceId: string, suffix: string) {
    const res = await api(ctx, 'POST', `/subscription-invoices/${invoiceId}/pay`, {
      ...owner(),
      body: { payerMsisdn: momoMsisdn(suffix) },
    });
    expect(res.status).toBeLessThan(300);
    return res.body.transactionId as string;
  }

  async function initiateRent(tenantIndex: number, suffix: string) {
    const tenantId = portfolio.leases[tenantIndex]?.tenantId as string;
    const res = await api(ctx, 'POST', '/payments/mobile-money/initiate', {
      ...owner(),
      body: {
        tenantId,
        invoiceId: invoiceOf.get(tenantId),
        amount: 50_000,
        payerMsisdn: momoMsisdn(suffix),
        clientRef: uuidv7(),
      },
    });
    expect(res.status).toBe(202);
    return res.body as { transaction: { id: string }; payment: { id: string } };
  }

  const refOf = async (id: string) =>
    (await ctx.admin.mobile_money_transactions.findUniqueOrThrow({ where: { id } }))
      .external_reference as string;

  /** `getStatus` du simulateur : succès au montant exact (les suffixes '03' restent PENDING). */
  function providerSucceeds() {
    const provider = ctx.app.get(SimulatedMobileMoneyProvider);
    return jest.spyOn(provider, 'getStatus').mockImplementation(async (ref) => {
      const row = await ctx.admin.mobile_money_transactions.findFirstOrThrow({
        where: { external_reference: ref },
      });
      return {
        state: 'SUCCEEDED',
        providerReference: ref,
        amount: row.amount,
        currency: 'XAF',
        feeAmount: 0n,
        rawPayload: null,
      };
    });
  }

  const signed = (ref: string, amount: string, eventId = `${ref}:SUCCEEDED`) =>
    signSimulatorWebhook(ctx, {
      eventId,
      merchantReference: ref,
      providerReference: ref,
      status: 'SUCCEEDED',
      amount,
      currency: 'XAF',
    });

  it("webhook d'abonnement reçu sur la route générique : facture PAID", async () => {
    const invoiceId = await newInvoice();
    const txId = await paySubscription(invoiceId, '01');
    const ref = await refOf(txId);
    const { body, signature } = signed(ref, '20000', `${ref}:explicit`);
    expect((await postSimulatorWebhook(ctx, body, signature, 'simulator')).status).toBe(200);
    const invoice = await waitFor(async () => {
      const row = await ctx.admin.subscription_invoices.findUnique({ where: { id: invoiceId } });
      return row?.status === 'PAID' ? row : null;
    });
    expect(invoice.paid_amount).toBe(20_000n);
    const tx = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({ where: { id: txId } });
    expect(tx).toMatchObject({ status: 'SUCCEEDED', purpose: 'SUBSCRIPTION' });
  }, 30_000);

  it('webhook de loyer reçu sur /subscription : paiement alloué, aucune facture touchée', async () => {
    const untouched = await newInvoice();
    const spy = providerSucceeds();
    try {
      const { transaction, payment } = await initiateRent(0, '03');
      const ref = await refOf(transaction.id);
      const { body, signature } = signed(ref, '50000');
      expect((await postSimulatorWebhook(ctx, body, signature, 'subscription')).status).toBe(200);
      await waitFor(async () => {
        const p = await ctx.admin.payments.findUnique({ where: { id: payment.id } });
        return p?.status === 'CONFIRMED' ? p : null;
      });
      expect(
        (await ctx.admin.subscription_invoices.findUniqueOrThrow({ where: { id: untouched } }))
          .status,
      ).toBe('ISSUED');
    } finally {
      spy.mockRestore();
    }
  }, 30_000);

  it('webhook non signé : aucune organisation, aucun corps, aucun effet', async () => {
    const { transaction } = await initiateRent(1, '03');
    const ref = await refOf(transaction.id);
    const { body } = signed(ref, '50000', `forged-${ref}`);
    expect((await postSimulatorWebhook(ctx, body, 'mauvaise', 'simulator')).status).toBe(200);
    const events = await ctx.admin.webhook_events.findMany({
      where: { signature_valid: false, request_path: { contains: 'simulator' } },
    });
    const mine = events.filter((e) => JSON.stringify(e).includes(ref));
    expect(mine).toHaveLength(0);
    expect(events.some((e) => e.organization_id !== null)).toBe(false);
    const list = await api(ctx, 'GET', '/webhook-events', owner());
    expect(JSON.stringify(list.body)).not.toContain(ref);
    expect(
      (
        await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
          where: { id: transaction.id },
        })
      ).status,
    ).toBe('PENDING');
  }, 30_000);

  it('rejeu d’un événement non signé historique : 409 WEBHOOKS.REPLAY_NOT_ALLOWED', async () => {
    const id = uuidv7();
    await ctx.admin.webhook_events.create({
      data: {
        id,
        organization_id: agency.organizationId,
        source: 'OTHER',
        event_type: 'momo.succeeded',
        status: 'IGNORED',
        external_event_id: `legacy-${id}`,
        signature_valid: false,
        raw_payload: { merchantReference: 'x' },
      },
    });
    const res = await api(ctx, 'POST', `/webhook-events/${id}/replay`, owner());
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('WEBHOOKS.REPLAY_NOT_ALLOWED');
    expect((await ctx.admin.webhook_events.findUniqueOrThrow({ where: { id } })).status).toBe(
      'IGNORED',
    );
  });

  it('corps null ou tableau : jamais de 500, quelle que soit la route', async () => {
    // Tableau : accepté par l'analyseur JSON, 200 sur toutes les routes.
    for (const [path, signature] of [
      ['cinetpay', 'abc'],
      ['simulator', 'abc'],
      ['subscription', null],
    ] as const) {
      expect((await postSimulatorWebhook(ctx, '[]', signature, path)).status).toBe(200);
    }
    // `null` littéral : refusé en 400 par l'analyseur JSON (jamais 500) ; les
    // fournisseurs sont donc aussi exercés directement, sans HTTP.
    expect((await postSimulatorWebhook(ctx, 'null', 'abc', 'simulator')).status).toBeLessThan(500);
    const ingest = ctx.app.get(MomoWebhookIngestService);
    const secret = ctx.app.get(AppConfigService).get('MOMO_SIMULATOR_SECRET');
    const nullBody = Buffer.from('null');
    await expect(
      ingest.ingest('cinetpay', nullBody, { 'x-token': 'abc' }, null, '/x'),
    ).resolves.toBeUndefined();
    await expect(
      ingest.ingest('simulator', nullBody, { 'x-simulator-signature': 'abc' }, null, '/x'),
    ).resolves.toBeUndefined();
    // Signé (HMAC valide) mais corps `null` : FAILED PAYLOAD_INVALID.
    await ingest.ingest(
      'simulator',
      nullBody,
      { 'x-simulator-signature': signHmac('null', secret) },
      null,
      '/x',
    );
    const failed = await ctx.admin.webhook_events.findFirst({
      where: { error_message: 'MOMO.WEBHOOK_PAYLOAD_INVALID' },
    });
    expect(failed).toMatchObject({ status: 'FAILED', organization_id: null });
  });

  it("rattrapage d'un abonnement PENDING : facture PAID", async () => {
    const invoiceId = await newInvoice();
    const txId = await paySubscription(invoiceId, '03');
    await ctx.admin.mobile_money_transactions.update({
      where: { id: txId },
      data: { initiated_at: new Date(Date.now() - 6 * 60_000) },
    });
    const spy = providerSucceeds();
    try {
      await ctx.app.get(MomoReconcileService).reconcilePending();
    } finally {
      spy.mockRestore();
    }
    expect(
      (await ctx.admin.subscription_invoices.findUniqueOrThrow({ where: { id: invoiceId } }))
        .status,
    ).toBe('PAID');
  }, 30_000);

  it('reprise conservée : une ligne non signée historique cède sa place à la version signée', async () => {
    const { transaction } = await initiateRent(2, '03');
    const ref = await refOf(transaction.id);
    const eventId = `reprise-${ref}`;
    const legacyId = uuidv7();
    await ctx.admin.webhook_events.create({
      data: {
        id: legacyId,
        organization_id: null,
        source: 'OTHER',
        event_type: 'momo.succeeded',
        status: 'IGNORED',
        external_event_id: eventId,
        signature_valid: false,
        raw_payload: {},
      },
    });
    const { body, signature } = signed(ref, '50000', eventId);
    expect((await postSimulatorWebhook(ctx, body, signature, 'simulator')).status).toBe(200);
    const event = await waitFor(async () => {
      const row = await ctx.admin.webhook_events.findUnique({ where: { id: legacyId } });
      return row?.status === 'PROCESSED' ? row : null;
    });
    expect(event.signature_valid).toBe(true);
  }, 30_000);

  it('contraintes de la migration 10 : un reversement ne peut pas être entrant', async () => {
    await expect(
      ctx.admin.mobile_money_transactions.create({
        data: {
          id: uuidv7(),
          organization_id: agency.organizationId,
          provider: 'MTN_MOMO',
          aggregator: 'SIMULATOR',
          channel: 'AGGREGATOR',
          purpose: 'OWNER_PAYOUT',
          direction: 'INBOUND',
          merchant_reference: `CK-${uuidv7().slice(0, 8)}`,
          payer_msisdn: momoMsisdn('01'),
          amount: 1000n,
        },
      }),
    ).rejects.toThrow();
  });
});
