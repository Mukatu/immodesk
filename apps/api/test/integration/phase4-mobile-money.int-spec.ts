import { v7 as uuidv7 } from 'uuid';
import { MomoReconcileService } from '../../src/modules/mobile-money/application/momo-reconcile.service';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  addMember,
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

describe('Phase 4 — Mobile Money agrégateur (simulateur)', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  let manager: { accessToken: string; userId: string };
  let accountant: { accessToken: string; userId: string };
  let collector: { accessToken: string; userId: string };
  const invoiceOf = new Map<string, string>();
  const owner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });
  const as = (token: string) => ({ accessToken: token, organizationId: agency.organizationId });

  beforeAll(async () => {
    ctx = await startTestApp();
    pointSimulatorAtTestApp(ctx);
    agency = await createAgency(ctx, 'Momo');
    manager = await addMember(ctx, agency.organizationId, 'MANAGER');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
    collector = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    await enableAggregator(ctx, agency);
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 8, {
      startDate: firstOfMonth(0),
    });
    const run = await api(ctx, 'POST', '/billing/runs', {
      ...owner(),
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
      manager.userId,
      accountant.userId,
      collector.userId,
    ]);
    await stopTestApp(ctx);
  });

  const tenant = (i: number) => portfolio.leases[i].tenantId;

  async function initiate(tenantIndex: number, suffix: string, amount?: number) {
    const invoiceId = invoiceOf.get(tenant(tenantIndex)) as string;
    const invoiceAmount =
      amount ??
      Number(
        (await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } }))
          .total_amount,
      );
    const res = await api(ctx, 'POST', '/payments/mobile-money/initiate', {
      ...as(collector.accessToken),
      body: {
        tenantId: tenant(tenantIndex),
        invoiceId,
        amount: invoiceAmount,
        payerMsisdn: momoMsisdn(suffix),
        clientRef: uuidv7(),
      },
    });
    expect(res.status).toBe(202);
    return res.body as {
      transaction: { id: string; status: string };
      payment: { id: string; status: string };
    };
  }

  async function waitPaymentStatus(paymentId: string, status: string, timeoutMs = 15_000) {
    return waitFor(async () => {
      const p = await ctx.admin.payments.findUnique({ where: { id: paymentId } });
      return p?.status === status ? p : null;
    }, timeoutMs);
  }

  it('…01 : succès — paiement CONFIRMED, transaction SUCCEEDED, imputation', async () => {
    const { transaction, payment } = await initiate(0, '01');
    expect(transaction.status).toBe('PENDING');
    expect(payment.status).toBe('PENDING');

    await waitPaymentStatus(payment.id, 'CONFIRMED');
    const tx = await ctx.admin.mobile_money_transactions.findUnique({
      where: { id: transaction.id },
    });
    expect(tx?.status).toBe('SUCCEEDED');
    const allocations = await ctx.admin.payment_allocations.count({
      where: { payment_id: payment.id },
    });
    expect(allocations).toBeGreaterThan(0);
  }, 20_000);

  it('…02 : échec — paiement REJECTED, transaction FAILED', async () => {
    const { transaction, payment } = await initiate(1, '02');
    await waitPaymentStatus(payment.id, 'REJECTED');
    const tx = await ctx.admin.mobile_money_transactions.findUnique({
      where: { id: transaction.id },
    });
    expect(tx?.status).toBe('FAILED');
  }, 20_000);

  it('…03 : aucune réponse — reste PENDING puis expire au rattrapage', async () => {
    const { transaction, payment } = await initiate(2, '03');
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const still = await ctx.admin.mobile_money_transactions.findUnique({
      where: { id: transaction.id },
    });
    expect(still?.status).toBe('PENDING');

    // Recule l'horodatage d'initiation pour dépasser la fenêtre d'expiration
    // (paramètre par défaut 120 min) sans attendre en temps réel.
    await ctx.admin.mobile_money_transactions.update({
      where: { id: transaction.id },
      data: { initiated_at: new Date(Date.now() - 3 * 60 * 60_000) },
    });
    const reconcile = ctx.app.get(MomoReconcileService);
    await reconcile.reconcilePending();

    const expired = await ctx.admin.mobile_money_transactions.findUnique({
      where: { id: transaction.id },
    });
    expect(expired?.status).toBe('EXPIRED');
    const cancelledPayment = await ctx.admin.payments.findUnique({ where: { id: payment.id } });
    expect(cancelledPayment?.status).toBe('CANCELLED');
  }, 20_000);

  it('…04 : montant divergent — paiement en PENDING_VERIFICATION, transaction inchangée', async () => {
    const { transaction, payment } = await initiate(3, '04');
    await waitPaymentStatus(payment.id, 'PENDING_VERIFICATION');
    const tx = await ctx.admin.mobile_money_transactions.findUnique({
      where: { id: transaction.id },
    });
    expect(tx?.status).toBe('PENDING');
  }, 20_000);

  it('…05 : webhook envoyé deux fois par le fournisseur — un seul paiement confirmé', async () => {
    const { payment } = await initiate(4, '05');
    await waitPaymentStatus(payment.id, 'CONFIRMED');
    await new Promise((resolve) => setTimeout(resolve, 2_000)); // laisse filer le second envoi
    const still = await ctx.admin.payments.findUnique({ where: { id: payment.id } });
    expect(still?.status).toBe('CONFIRMED');
    const receipts = await ctx.admin.receipts.count({ where: { payment_id: payment.id } });
    expect(receipts).toBeLessThanOrEqual(1);
  }, 20_000);

  it('…06 : webhook arrivant avant la réponse d’initiation — confirmé malgré la course', async () => {
    const { payment } = await initiate(5, '06');
    await waitPaymentStatus(payment.id, 'CONFIRMED');
  }, 20_000);

  it('signature de webhook invalide : persistée, ignorée, sans aucun effet', async () => {
    const { transaction } = await initiate(6, '03'); // ne recevra jamais de webhook légitime
    const { body } = signSimulatorWebhook(ctx, {
      eventId: `forged-${transaction.id}`,
      merchantReference: (
        await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
          where: { id: transaction.id },
        })
      ).merchant_reference,
      providerReference: transaction.id,
      status: 'SUCCEEDED',
      amount: '50000',
      currency: 'XAF',
    });
    const res = await postSimulatorWebhook(ctx, body, 'signature-invalide');
    expect(res.status).toBe(200);

    const event = await ctx.admin.webhook_events.findFirst({
      where: { external_event_id: `forged-${transaction.id}` },
    });
    expect(event).toMatchObject({ signature_valid: false, status: 'IGNORED' });

    const still = await ctx.admin.mobile_money_transactions.findUnique({
      where: { id: transaction.id },
    });
    expect(still?.status).toBe('PENDING');
  }, 15_000);

  it('un webhook rejoué cinq fois ne produit qu’un paiement et une quittance', async () => {
    const { transaction, payment } = await initiate(7, '01');
    await waitPaymentStatus(payment.id, 'CONFIRMED');
    const tx = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
      where: { id: transaction.id },
    });

    const { body, signature } = signSimulatorWebhook(ctx, {
      eventId: `${tx.merchant_reference}:SUCCEEDED`,
      merchantReference: tx.merchant_reference,
      providerReference: tx.merchant_reference,
      status: 'SUCCEEDED',
      amount: tx.amount.toString(),
      currency: 'XAF',
    });
    for (let i = 0; i < 5; i += 1) {
      const res = await postSimulatorWebhook(ctx, body, signature);
      expect(res.status).toBe(200);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));

    const payments = await ctx.admin.payments.count({
      where: { id: payment.id, status: 'CONFIRMED' },
    });
    expect(payments).toBe(1);
    const receipts = await ctx.admin.receipts.count({ where: { payment_id: payment.id } });
    expect(receipts).toBe(1);
    const events = await ctx.admin.webhook_events.count({
      where: { external_event_id: `${tx.merchant_reference}:SUCCEEDED` },
    });
    expect(events).toBe(1); // idempotence par external_event_id : un seul événement persisté
  }, 20_000);

  it('opérateur non reconnu : 422 MOMO.OPERATOR_UNKNOWN', async () => {
    const res = await api(ctx, 'POST', '/payments/mobile-money/initiate', {
      ...as(collector.accessToken),
      body: {
        tenantId: tenant(0),
        amount: 50_000,
        payerMsisdn: '+242044000001',
        clientRef: uuidv7(),
      },
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MOMO.OPERATOR_UNKNOWN');
  });

  it('montant hors bornes : 422 MOMO.AMOUNT_OUT_OF_RANGE', async () => {
    const res = await api(ctx, 'POST', '/payments/mobile-money/initiate', {
      ...as(collector.accessToken),
      body: {
        tenantId: tenant(0),
        amount: 100,
        payerMsisdn: momoMsisdn('01'),
        clientRef: uuidv7(),
      },
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MOMO.AMOUNT_OUT_OF_RANGE');
  });
});
