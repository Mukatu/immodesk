import { newId as uuidv7 } from '../../src/shared/ids/uuid';
import { AppConfigService } from '../../src/shared/config/config.module';
import { OpenPayClient } from '../../src/modules/mobile-money/infrastructure/openpay.client';
import { createFakeOpenPay } from './openpay-fake';
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
import { enableAggregator, momoMsisdn } from './phase4-fixtures';

const RUN = Math.random().toString(36).slice(2, 10).toUpperCase();
const SECRET = 'openpay-secret-de-test-0123456789abcdef0123';

/**
 * Callback OpenPay NON signé : le corps ne prouve rien, seule la réponse
 * authentifiée de l'API (simulée ici d'après les exemples de la doc) confirme.
 * Aucun appel à la vraie API : `OpenPayClient.fetchFn` est remplacé.
 */
describe('OpenPay : callback non signé, vérification de statut', () => {
  const saved = { ...process.env };
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  let subscriptionId: string;
  const fake = createFakeOpenPay(RUN);
  const apiCalls = fake.calls;
  const invoiceOf = new Map<string, string>();
  const owner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    Object.assign(process.env, {
      MOMO_PROVIDER_DEFAULT: 'OPENPAY',
      OPENPAY_API_KEY: 'cle-api-de-test',
      OPENPAY_CALLBACK_SECRET: SECRET,
      OPENPAY_MIN_CHECK_INTERVAL_SECONDS: '0',
    });
    ctx = await startTestApp();
    ctx.app.get(OpenPayClient).fetchFn = fake.fetchFn;

    agency = await createAgency(ctx, 'OpenPay');
    await enableAggregator(ctx, agency);
    await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/payment-methods`, {
      ...owner(),
      body: { mobileMoneyAggregator: { enabled: true, provider: 'OPENPAY', feeRateBps: 0 } },
    });
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
  }, 400_000);

  afterAll(async () => {
    await ctx.admin.webhook_events.deleteMany({ where: { source: 'OPENPAY' } });
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    await stopTestApp(ctx);
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  });

  const post = (body: unknown, secret = SECRET) =>
    fetch(`${ctx.baseUrl}/webhooks/mobile-money/openpay/${secret}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  const callback = (reference: string, extra: Record<string, unknown> = {}) => ({
    reference,
    type: 'payment',
    status: 'success',
    amount: '999999',
    ...extra,
  });

  async function initiateRent(tenantIndex: number) {
    const tenantId = portfolio.leases[tenantIndex]?.tenantId as string;
    const res = await api(ctx, 'POST', '/payments/mobile-money/initiate', {
      ...owner(),
      body: {
        tenantId,
        invoiceId: invoiceOf.get(tenantId),
        amount: 50_000,
        payerMsisdn: momoMsisdn('21'),
        clientRef: uuidv7(),
      },
    });
    expect(res.status).toBe(202);
    const txId = res.body.transaction.id as string;
    const row = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
      where: { id: txId },
    });
    return {
      txId,
      paymentId: res.body.payment.id as string,
      reference: row.aggregator_transaction_id as string,
    };
  }

  const statusCalls = (reference: string) =>
    apiCalls.filter((c) => c === `GET /transaction/status/${reference}`).length;

  /**
   * La vérification initiale est différée de 4 s : on l'attend (puis son job se termine) avant de
   * poster un callback, sinon elle pourrait être prise pour le déclenchement qu'on veut prouver,
   * ou absorber le job du callback (même jobId tant qu'un job est en attente ou actif).
   */
  async function settleInitialCheck(reference: string): Promise<void> {
    await waitFor(async () => statusCalls(reference) >= 1);
    await new Promise((r) => setTimeout(r, 600));
  }

  const eventsFor = (reference: string) =>
    ctx.admin.webhook_events.findMany({
      where: { source: 'OPENPAY', raw_payload: { path: ['reference'], equals: reference } },
    });

  it('callback inconnu : 200 {} sans effet, corps non stocké', async () => {
    const before = apiCalls.length;
    const res = await post(callback('PTXN26091UNKNOWN01', { customer: { phone: '242066203420' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
    const [event] = await eventsFor('PTXN26091UNKNOWN01');
    expect(event).toMatchObject({
      status: 'IGNORED',
      organization_id: null,
      signature_valid: false,
    });
    expect(Object.keys(event?.raw_payload as object).sort()).toEqual([
      'bodyBytes',
      'bodySha256',
      'reference',
      'type',
    ]);
    expect(apiCalls).toHaveLength(before);
  });

  it('formats rejetés, corps trop gros, JSON invalide : toujours 200, aucun appel OpenPay', async () => {
    const before = apiCalls.length;
    for (const body of [
      { reference: 'x', type: 'payment' },
      { type: 'payment' },
      'pas du json',
      JSON.stringify({ reference: 'PTXN1234ABCD', type: 'payment', pad: 'x'.repeat(5000) }),
    ]) {
      expect((await post(body)).status).toBe(200);
    }
    expect(apiCalls).toHaveLength(before);
  });

  it('loyer : callback valide -> vérification -> confirmé, organisation rattachée après correspondance', async () => {
    const { txId, paymentId, reference } = await initiateRent(0);
    expect(reference).toMatch(/^PTXN/);
    expect(fake.payments.get(reference)?.metadata).toEqual({
      external_reference: expect.any(String),
    });
    fake.payments.get(reference)!.status = 'success';
    expect((await post(callback(reference))).status).toBe(200);
    await waitFor(async () => {
      const p = await ctx.admin.payments.findUnique({ where: { id: paymentId } });
      return p?.status === 'CONFIRMED' ? p : null;
    });
    expect(
      (await ctx.admin.mobile_money_transactions.findUniqueOrThrow({ where: { id: txId } })).status,
    ).toBe('SUCCEEDED');
    const [event] = await eventsFor(reference);
    expect(event?.organization_id).toBe(agency.organizationId);
  }, 30_000);

  it('abonnement : facture PAID', async () => {
    const invoice = await ctx.admin.subscription_invoices.create({
      data: {
        id: uuidv7(),
        organization_id: agency.organizationId,
        subscription_id: subscriptionId,
        invoice_number: `SUB-OP-${uuidv7().slice(-8)}`,
        status: 'ISSUED',
        period_start: new Date(Date.now() + 90 * 86_400_000),
        period_end: new Date(Date.now() + 120 * 86_400_000),
        due_date: new Date(Date.now() + 120 * 86_400_000),
        subtotal_amount: 20_000n,
        total_amount: 20_000n,
      },
    });
    const res = await api(ctx, 'POST', `/subscription-invoices/${invoice.id}/pay`, {
      ...owner(),
      body: { payerMsisdn: momoMsisdn('21') },
    });
    const tx = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
      where: { id: res.body.transactionId },
    });
    const reference = tx.aggregator_transaction_id as string;
    fake.payments.get(reference)!.status = 'success';
    expect((await post(callback(reference))).status).toBe(200);
    await waitFor(
      async () =>
        (await ctx.admin.subscription_invoices.findUnique({ where: { id: invoice.id } }))
          ?.status === 'PAID',
    );
  }, 30_000);

  it('mauvais segment secret : même 200, aucun effet, aucun appel OpenPay', async () => {
    const { txId, reference } = await initiateRent(1);
    await settleInitialCheck(reference);
    fake.payments.get(reference)!.status = 'success';
    const before = apiCalls.length;
    expect((await post(callback(reference), 'mauvais-segment')).status).toBe(200);
    expect(
      (
        await fetch(`${ctx.baseUrl}/webhooks/mobile-money/openpay`, {
          method: 'POST',
          body: '{}',
          headers: { 'content-type': 'application/json' },
        })
      ).status,
    ).toBe(200);
    await new Promise((r) => setTimeout(r, 1200));
    expect(apiCalls).toHaveLength(before);
    expect(
      (await ctx.admin.mobile_money_transactions.findUniqueOrThrow({ where: { id: txId } })).status,
    ).toBe('PENDING');
    expect(await eventsFor(reference)).toHaveLength(0);
  }, 30_000);

  it('doublons : callbacks répétés fusionnés (un évènement), un seul appel de statut', async () => {
    const { txId, reference } = await initiateRent(2);
    const statusCalls = () => apiCalls.filter((c) => c.endsWith(reference)).length;
    const before = statusCalls();
    // Même transaction : l'état reste « pending » côté fournisseur, aucune confirmation.
    await Promise.all([1, 2, 3, 4].map(() => post(callback(reference))));
    expect(await eventsFor(reference)).toHaveLength(1);
    await waitFor(async () => statusCalls() > before);
    await new Promise((r) => setTimeout(r, 800));
    expect(statusCalls() - before).toBeLessThanOrEqual(1);
    expect(
      (await ctx.admin.mobile_money_transactions.findUniqueOrThrow({ where: { id: txId } })).status,
    ).toBe('PENDING');
  }, 30_000);

  it.each([
    ['montant', { amount: '1' }],
    ['devise', { currency: 'EUR' }],
    ['metadata', { metadata: { external_reference: '00000000-0000-7000-8000-000000000000' } }],
    ['metadata null (GET /status sans metadata)', { metadata: null }],
    ['type', { type: 'scheduled_cashout' }],
  ])(
    'réponse non conforme (%s) : pas de confirmation, organisation de l’évènement NULL',
    async (_l, tamper) => {
      const { txId, paymentId, reference } = await initiateRent(1);
      await settleInitialCheck(reference);
      fake.payments.get(reference)!.status = 'success';
      fake.payments.get(reference)!.tamper = tamper;
      const before = statusCalls(reference);
      await post(callback(reference));
      // Preuve que c'est BIEN le callback qui a déclenché une nouvelle interrogation.
      await waitFor(async () => statusCalls(reference) > before);
      await new Promise((r) => setTimeout(r, 400));
      const tx = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
        where: { id: txId },
      });
      expect(tx.status).not.toBe('SUCCEEDED');
      expect(
        (await ctx.admin.payments.findUniqueOrThrow({ where: { id: paymentId } })).status,
      ).not.toBe('CONFIRMED');
      expect((await eventsFor(reference))[0]?.organization_id).toBeNull();
    },
    30_000,
  );

  it('allowlist d’IP : IP hors liste ignorée, liste vide = pas de filtrage', async () => {
    const cfg = ctx.app.get(AppConfigService).all as Record<string, unknown>;
    cfg.OPENPAY_CALLBACK_IP_ALLOWLIST = ['203.0.113.9'];
    try {
      expect((await post(callback('PTXN26091IPDENIED1'))).status).toBe(200);
      expect(await eventsFor('PTXN26091IPDENIED1')).toHaveLength(0);
    } finally {
      cfg.OPENPAY_CALLBACK_IP_ALLOWLIST = undefined;
    }
    await post(callback('PTXN26091IPALLOWD1'));
    expect(await eventsFor('PTXN26091IPALLOWD1')).toHaveLength(1);
  });

  it('le faux OpenPay n’a relevé aucune entorse (clé API, chemin exact, formats)', () => {
    expect(fake.violations).toEqual([]);
    expect(apiCalls.some((c) => /^GET \/transaction\/status\/PTXN[0-9A-Za-z]+$/.test(c))).toBe(
      true,
    );
  });
});
