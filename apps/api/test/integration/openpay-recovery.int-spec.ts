import { newId as uuidv7 } from '../../src/shared/ids/uuid';
import { AppConfigService } from '../../src/shared/config/config.module';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { MomoPayoutService } from '../../src/modules/mobile-money/application/momo-payout.service';
import { MomoReconcileService } from '../../src/modules/mobile-money/application/momo-reconcile.service';
import { WebhookEventsService } from '../../src/modules/webhooks/application/webhook-events.service';
import { OpenPayClient } from '../../src/modules/mobile-money/infrastructure/openpay.client';
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
import { createFakeOpenPay } from './openpay-fake';

const RUN = Math.random().toString(36).slice(2, 10).toUpperCase();
const SECRET = 'openpay-secret-de-test-0123456789abcdef0123';

/**
 * OpenPay : initiation perdue (indice PTXN, rejeu idempotent), polling qui n'épuise rien,
 * reversement (retrait programmé) exécuté UNE fois, annulé à l'expiration. Faux OpenPay strict.
 */
describe('OpenPay : récupération, polling et reversement (revue PR #62)', () => {
  const saved = { ...process.env };
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  const fake = createFakeOpenPay(RUN);
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
    agency = await createAgency(ctx, 'OpenPayRecovery');
    await enableAggregator(ctx, agency);
    await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/payment-methods`, {
      ...owner(),
      body: { mobileMoneyAggregator: { enabled: true, provider: 'OPENPAY', feeRateBps: 0 } },
    });
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 4, {
      startDate: firstOfMonth(0),
    });
    const run = await api(ctx, 'POST', '/billing/runs', {
      ...owner(),
      body: { periodStart: firstOfMonth(0) },
    });
    await pollRun(ctx, agency, run.body.runId, 60_000);
    for (const i of await ctx.admin.rent_invoices.findMany({
      where: { organization_id: agency.organizationId },
    }))
      invoiceOf.set(i.tenant_id, i.id);
  }, 400_000);

  afterAll(async () => {
    await ctx.admin.webhook_events.deleteMany({ where: { source: 'OPENPAY' } });
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    await stopTestApp(ctx);
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  });

  const post = (body: unknown) =>
    fetch(`${ctx.baseUrl}/webhooks/mobile-money/openpay/${SECRET}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const initiateRent = (tenantIndex: number) => {
    const tenantId = portfolio.leases[tenantIndex]?.tenantId as string;
    return api(ctx, 'POST', '/payments/mobile-money/initiate', {
      ...owner(),
      body: {
        tenantId,
        invoiceId: invoiceOf.get(tenantId),
        amount: 50_000,
        payerMsisdn: momoMsisdn('21'),
        clientRef: uuidv7(),
      },
    });
  };

  /** Initiation dont la réponse est perdue : le paiement existe chez OpenPay, pas de référence chez nous. */
  async function lostInitiation(tenantIndex: number) {
    fake.control.losePaymentResponses = 2;
    const res = await initiateRent(tenantIndex);
    expect(res.status).toBeGreaterThanOrEqual(500);
    const tenantId = portfolio.leases[tenantIndex]?.tenantId as string;
    const row = await ctx.admin.mobile_money_transactions.findFirstOrThrow({
      where: { organization_id: agency.organizationId, tenant_id: tenantId, status: 'INITIATED' },
    });
    expect(row.aggregator_transaction_id).toBeNull();
    const entry = [...fake.payments.entries()].find(
      ([, p]) => p.metadata?.external_reference === row.external_reference,
    );
    expect(entry).toBeDefined();
    return { row, reference: entry![0], payment: entry![1] };
  }

  const paymentOf = (id: string | null) =>
    ctx.admin.payments.findUniqueOrThrow({ where: { id: id as string } });

  it('callback AVANT la référence stockée : l’indice PTXN confirme INITIATED -> SUCCEEDED', async () => {
    const { row, reference, payment } = await lostInitiation(0);
    payment.status = 'success';
    await post({
      reference,
      type: 'payment',
      metadata: { external_reference: row.external_reference },
    });
    await waitFor(async () => {
      const t = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
        where: { id: row.id },
      });
      return t.status === 'SUCCEEDED' ? t : null;
    });
    const after = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(after.aggregator_transaction_id).toBe(reference);
    expect((await paymentOf(row.payment_id)).status).toBe('CONFIRMED');
  }, 40_000);

  it('rattrapage : rejeu idempotent (même clé), un seul paiement chez OpenPay, référence retrouvée puis confirmée', async () => {
    const { row, reference, payment } = await lostInitiation(1);
    const created = fake.payments.size;
    await ctx.admin.mobile_money_transactions.update({
      where: { id: row.id },
      data: { initiated_at: new Date(Date.now() - 15 * 60_000) },
    });
    await ctx.app.get(MomoReconcileService).reconcilePending();
    expect(fake.payments.size).toBe(created);
    const recovered = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(recovered.aggregator_transaction_id).toBe(reference);
    payment.status = 'success';
    const refreshed = await api(
      ctx,
      'POST',
      `/payments/mobile-money/transactions/${row.id}/refresh`,
      owner(),
    );
    expect(refreshed.status).toBe(200);
    expect((await paymentOf(row.payment_id)).status).toBe('CONFIRMED');
  }, 40_000);

  it('le polling (refresh toutes les 3 s) n’épuise rien : un succès tardif est confirmé par callback', async () => {
    (
      ctx.app.get(AppConfigService).all as Record<string, unknown>
    ).OPENPAY_MAX_CHECKS_PER_TRANSACTION = 3;
    const res = await initiateRent(2);
    expect(res.status).toBe(202);
    const txId = res.body.transaction.id as string;
    for (let i = 0; i < 8; i += 1) {
      expect(
        (await api(ctx, 'POST', `/payments/mobile-money/transactions/${txId}/refresh`, owner()))
          .status,
      ).toBe(200);
    }
    const row = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
      where: { id: txId },
    });
    expect(row.status_check_count).toBeGreaterThan(3);
    const reference = row.aggregator_transaction_id as string;
    fake.payments.get(reference)!.status = 'success';
    await post({ reference, type: 'payment' });
    await waitFor(async () => {
      const t = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
        where: { id: txId },
      });
      return t.status === 'SUCCEEDED' ? t : null;
    });
  }, 40_000);

  it('persistTrigger : un évènement FAILED faute de mise en file est retraité à la relance (F5)', async () => {
    const events = ctx.app.get(WebhookEventsService);
    const input = {
      source: 'OPENPAY',
      requestPath: '/webhooks/mobile-money/openpay/:secret',
      sourceIp: '203.0.113.9',
      bodySha256: `f5${uuidv7().replace(/-/g, '')}`,
      bodyBytes: 80,
      userAgent: null,
      reference: 'PTXN26091F5RETRY1',
      type: 'payment',
      relatedTransactionId: null,
    };
    const first = await events.persistTrigger(input);
    expect(first.duplicate).toBe(false);
    expect((await events.persistTrigger(input)).duplicate).toBe(true);
    await events.markStatus(first.id, 'FAILED', { errorMessage: 'MOMO.WEBHOOK_ENQUEUE_FAILED' });
    const retried = await events.persistTrigger(input);
    expect(retried).toEqual({ id: first.id, duplicate: false });
    const row = await ctx.admin.webhook_events.findUniqueOrThrow({ where: { id: first.id } });
    expect(row).toMatchObject({ status: 'RECEIVED', error_message: null });
    // Un autre échec (corps invalide, ligne non résolue...) n'est PAS retraité.
    await events.markStatus(first.id, 'FAILED', {
      errorMessage: 'MOMO.WEBHOOK_REFERENCE_UNRESOLVED',
    });
    expect((await events.persistTrigger(input)).duplicate).toBe(true);
  });

  describe('reversement (retrait programmé)', () => {
    const payouts = () => ctx.app.get(MomoPayoutService);
    const prisma = () => ctx.app.get(PrismaService);

    async function newPayout() {
      const result = await prisma().withTenant(agency.organizationId, null, (tx) =>
        payouts().initiatePayout(tx, {
          organizationId: agency.organizationId,
          amount: 50_000n,
          currency: 'XAF',
          payerMsisdn: momoMsisdn('21'),
          externalReference: `REV-${RUN}-${uuidv7().slice(-6)}`,
          description: 'Reversement de test',
        }),
      );
      const row = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
        where: { id: result.momoTransactionId },
      });
      const cashout = fake.cashouts.get(row.external_reference as string);
      expect(cashout).toBeDefined();
      return { row, cashout: cashout! };
    }
    const reload = (id: string) =>
      ctx.admin.mobile_money_transactions.findUniqueOrThrow({ where: { id } });
    const callbackFor = (reference: string) => post({ reference, type: 'scheduled_cashout' });

    it('référence de retrait en UUID v4 distincte de l’identifiant', async () => {
      const { row, cashout } = await newPayout();
      expect(row.external_reference).toBe(cashout.reference);
      expect(row.external_reference).not.toBe(row.id);
      expect(row.external_reference).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab]/);
      expect(row.status).toBe('PENDING');
    });

    it('approuvé : callbacks en rafale + vérifications concurrentes = UN SEUL execute', async () => {
      const { row, cashout } = await newPayout();
      cashout.status = 'approved';
      fake.control.executeDelayMs = 700;
      try {
        await Promise.all([
          ...[1, 2, 3, 4].map(() => callbackFor(cashout.reference)),
          payouts().verifyPayout(agency.organizationId, row.id),
          payouts().verifyPayout(agency.organizationId, row.id),
        ]);
        await waitFor(async () => (await reload(row.id)).status === 'SUCCEEDED');
      } finally {
        fake.control.executeDelayMs = 0;
      }
      await callbackFor(cashout.reference);
      await ctx.app.get(MomoReconcileService).reconcilePending();
      await new Promise((r) => setTimeout(r, 800));
      expect(cashout.executeCount).toBe(1);
      expect((await reload(row.id)).payout_execute_sent_at).not.toBeNull();
    }, 40_000);

    it('marqueur déjà posé : le retrait approuvé n’est jamais exécuté automatiquement', async () => {
      const { row, cashout } = await newPayout();
      cashout.status = 'approved';
      await ctx.admin.mobile_money_transactions.update({
        where: { id: row.id },
        data: { payout_execute_sent_at: new Date() },
      });
      await payouts().verifyPayout(agency.organizationId, row.id);
      await callbackFor(cashout.reference);
      await new Promise((r) => setTimeout(r, 1_200));
      expect(cashout.executeCount).toBe(0);
      expect((await reload(row.id)).status).toBe('PENDING');
    }, 30_000);

    it('non approuvé après 48 h : annulé chez OpenPay (DELETE) puis EXPIRED', async () => {
      const { row, cashout } = await newPayout();
      await ctx.admin.mobile_money_transactions.update({
        where: { id: row.id },
        data: { initiated_at: new Date(Date.now() - 49 * 3_600_000) },
      });
      await ctx.app.get(MomoReconcileService).reconcilePending();
      expect(cashout.status).toBe('cancelled');
      expect((await reload(row.id)).status).toBe('EXPIRED');
      expect(fake.calls).toContain(`DELETE /scheduled-cashout/${cashout.reference}`);
    }, 30_000);

    it('retrait non annulable (approuvé, marqueur posé) : PAS expiré', async () => {
      const { row, cashout } = await newPayout();
      cashout.status = 'approved';
      await ctx.admin.mobile_money_transactions.update({
        where: { id: row.id },
        data: {
          initiated_at: new Date(Date.now() - 49 * 3_600_000),
          payout_execute_sent_at: new Date(),
        },
      });
      await ctx.app.get(MomoReconcileService).reconcilePending();
      expect((await reload(row.id)).status).toBe('PENDING');
      expect(cashout.status).toBe('approved');
      expect(cashout.executeCount).toBe(0);
    }, 30_000);

    it('le faux OpenPay n’a relevé aucune entorse', () => {
      expect(fake.violations).toEqual([]);
    });
  });
});
