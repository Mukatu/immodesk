import { MomoPayoutService } from '../../src/modules/mobile-money/application/momo-payout.service';
import { OpenPayClient } from '../../src/modules/mobile-money/infrastructure/openpay.client';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { addMember, createAgency, dropOrganization, waitFor, type Agency } from './phase3-fixtures';
import {
  pollStatementRun,
  previousPeriod,
  seedMandatePortfolio,
  type MandatePortfolioRow,
} from './phase7-fixtures';
import { createFakeOpenPay } from './openpay-fake';
import { momoMsisdn } from './phase4-fixtures';

const RUN = Math.random().toString(36).slice(2, 10).toUpperCase();
const SECRET = 'openpay-secret-de-test-0123456789abcdef0123';

/**
 * Reversement Mobile Money via OpenPay, de bout en bout (revue PR #62, N1, N5, N7) : route
 * `POST /owner-payouts/:id/execute`, callback d'approbation, concurrence route/callback, ordre
 * d'exécution refusé (400), issue incertaine, action d'administration `OWNER` auditée.
 * Faux OpenPay strict : aucun appel à la vraie API.
 */
describe('OpenPay : reversements (execute, callback, résolution)', () => {
  const saved = { ...process.env };
  const period = previousPeriod();
  const fake = createFakeOpenPay(RUN);
  let ctx: TestContext;
  let agency: Agency;
  let accountant: { accessToken: string; userId: string };
  let portfolio: MandatePortfolioRow[];
  let next = 0;
  const asOwner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });
  const asAccountant = () => ({
    accessToken: accountant.accessToken,
    organizationId: agency.organizationId,
  });
  const payouts = () => ctx.app.get(MomoPayoutService);

  beforeAll(async () => {
    Object.assign(process.env, {
      MOMO_PROVIDER_DEFAULT: 'OPENPAY',
      OPENPAY_API_KEY: 'cle-api-de-test',
      OPENPAY_CALLBACK_SECRET: SECRET,
      OPENPAY_MIN_CHECK_INTERVAL_SECONDS: '0',
      TRUST_PROXY_HOPS: '1',
    });
    ctx = await startTestApp();
    ctx.app.get(OpenPayClient).fetchFn = fake.fetchFn;
    agency = await createAgency(ctx, 'OpenPayPayouts');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
    await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/payment-methods`, {
      ...asOwner(),
      body: { mobileMoneyAggregator: { enabled: true, provider: 'OPENPAY', feeRateBps: 0 } },
    });
    portfolio = await seedMandatePortfolio(ctx.admin, agency.organizationId, 8, period, {
      rentAmount: 200_000,
      salt: 'o',
    });
    for (const row of portfolio) {
      await ctx.admin.landlords.update({
        where: { id: row.landlordId },
        data: { primary_phone: momoMsisdn('21') },
      });
    }
    const run = await api(ctx, 'POST', '/owner-statements/runs', {
      ...asAccountant(),
      body: { period: period.period },
    });
    expect(run.status).toBe(202);
    const report = await pollStatementRun(ctx, agency, run.body.runId, 30_000);
    expect(report).toMatchObject({ status: 'DONE', errors: [] });
  }, 120_000);

  afterAll(async () => {
    await ctx.admin.webhook_events.deleteMany({ where: { source: 'OPENPAY' } });
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      accountant.userId,
    ]);
    await stopTestApp(ctx);
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  });

  /** Relevé émis, reversement Mobile Money créé, approuvé, puis exécuté (retrait créé chez OpenPay). */
  async function startedPayout() {
    const landlordId = (portfolio[next++] as MandatePortfolioRow).landlordId;
    const statement = await ctx.admin.owner_statements.findFirstOrThrow({
      where: { organization_id: agency.organizationId, landlord_id: landlordId },
    });
    expect(
      (await api(ctx, 'POST', `/owner-statements/${statement.id}/issue`, asOwner())).status,
    ).toBe(201);
    const created = await api(ctx, 'POST', '/owner-payouts', {
      ...asAccountant(),
      body: { statementId: statement.id, method: 'MOBILE_MONEY' },
    });
    expect(created.status).toBe(201);
    const id = created.body.id as string;
    expect((await api(ctx, 'POST', `/owner-payouts/${id}/approve`, asOwner())).status).toBe(201);
    const executed = await api(ctx, 'POST', `/owner-payouts/${id}/execute`, {
      ...asAccountant(),
      body: {},
    });
    expect(executed.status).toBe(201);
    expect(executed.body.status).toBe('PROCESSING');
    const payout = await ctx.admin.owner_payouts.findUniqueOrThrow({ where: { id } });
    const momo = await ctx.admin.mobile_money_transactions.findUniqueOrThrow({
      where: { id: payout.momo_transaction_id as string },
    });
    const cashout = fake.cashouts.get(momo.external_reference as string)!;
    expect(cashout.status).toBe('pending');
    return { id, statementId: statement.id, momoId: momo.id, cashout };
  }

  const payoutOf = (id: string) => ctx.admin.owner_payouts.findUniqueOrThrow({ where: { id } });
  const momoOf = (id: string) =>
    ctx.admin.mobile_money_transactions.findUniqueOrThrow({ where: { id } });
  const statementOf = (id: string) =>
    ctx.admin.owner_statements.findUniqueOrThrow({ where: { id } });
  const verify = (momoId: string) => payouts().verifyPayout(agency.organizationId, momoId);
  const callback = (reference: string) =>
    fetch(`${ctx.baseUrl}/webhooks/mobile-money/openpay/${SECRET}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.7' },
      body: JSON.stringify({ reference, type: 'scheduled_cashout' }),
    });
  const auditsOf = async (id: string, operation: string) =>
    (await ctx.admin.audit_logs.findMany({ where: { entity_id: id, reason: operation } })).filter(
      Boolean,
    );
  const resolve = (id: string, body: unknown, as = asOwner()) =>
    api(ctx, 'POST', `/owner-payouts/${id}/momo-resolution`, { ...as, body });

  it('POST /execute puis callback d’approbation : reversement PAID, relevé PAID, un seul virement', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    expect((await callback(p.cashout.reference)).status).toBe(200);
    await waitFor(async () => (await payoutOf(p.id)).status === 'PAID');
    expect((await momoOf(p.momoId)).status).toBe('SUCCEEDED');
    const statement = await statementOf(p.statementId);
    expect(statement.status).toBe('PAID');
    expect(statement.settled_at).not.toBeNull();
    expect(p.cashout.executeCount).toBe(1);
    // Rejeu de la route après coup : idempotent, ni `paid_at` écrasé ni second audit PAID.
    const paidAt = (await payoutOf(p.id)).paid_at;
    const replay = await api(ctx, 'POST', `/owner-payouts/${p.id}/execute`, {
      ...asAccountant(),
      body: {},
    });
    expect(replay.status).toBe(201);
    expect(replay.body.status).toBe('PAID');
    expect((await payoutOf(p.id)).paid_at).toEqual(paidAt);
    expect(p.cashout.executeCount).toBe(1);
  }, 60_000);

  it('N7 : route d’exécution et callbacks en concurrence : un seul PAID, un seul audit, pas de blocage', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    fake.control.executeDelayMs = 400;
    try {
      const results = await Promise.all([
        callback(p.cashout.reference),
        callback(p.cashout.reference),
        verify(p.momoId),
        api(ctx, 'POST', `/owner-payouts/${p.id}/execute`, { ...asAccountant(), body: {} }),
        api(ctx, 'POST', `/owner-payouts/${p.id}/execute`, { ...asAccountant(), body: {} }),
      ]);
      for (const r of results.slice(3) as Array<{ status: number }>) {
        expect([200, 201]).toContain(r.status);
      }
      await waitFor(async () => (await payoutOf(p.id)).status === 'PAID');
    } finally {
      fake.control.executeDelayMs = 0;
    }
    await new Promise((r) => setTimeout(r, 800));
    expect(p.cashout.executeCount).toBe(1);
    expect((await statementOf(p.statementId)).status).toBe('PAID');
    const paid = (
      await ctx.admin.audit_logs.findMany({
        where: { entity_id: p.id, reason: 'OWNER_PAYOUT_EXECUTED' },
      })
    ).filter((a) => (a.new_state as { status?: string } | null)?.status === 'PAID');
    expect(paid).toHaveLength(1);
  }, 60_000);

  it('N1 : ordre d’exécution refusé (400, solde insuffisant) : aucun virement, marqueur levé, relance espacée, une alerte', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    fake.control.rejectExecute = 1;
    await verify(p.momoId);
    expect(p.cashout.executeCount).toBe(0);
    const refused = await momoOf(p.momoId);
    expect(refused.status).toBe('PENDING');
    expect(refused.payout_execute_sent_at).toBeNull();
    expect(refused.payout_execute_refused_at).not.toBeNull();
    expect(refused.payout_alert_code).toBe('REFUSED');
    // Relance trop tôt : aucun nouvel `execute` (le faux n'en refuse qu'un, un second passerait).
    const callsBefore = fake.calls.filter((c) => c.endsWith('/execute')).length;
    await verify(p.momoId);
    await verify(p.momoId);
    expect(fake.calls.filter((c) => c.endsWith('/execute')).length).toBe(callsBefore);
    expect(p.cashout.executeCount).toBe(0);
    // 31 minutes plus tard : l'ordre repart, UNE fois, le reversement se solde.
    await ctx.admin.mobile_money_transactions.update({
      where: { id: p.momoId },
      data: { payout_execute_refused_at: new Date(Date.now() - 31 * 60_000) },
    });
    await verify(p.momoId);
    expect(p.cashout.executeCount).toBe(1);
    await waitFor(async () => (await payoutOf(p.id)).status === 'PAID');
    expect((await statementOf(p.statementId)).status).toBe('PAID');
  }, 60_000);

  it('issue INCERTAINE (virement émis, réponse perdue) : jamais relancé ; le statut relu solde le reversement, un seul virement', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    fake.control.executeLostAfterTransfer = 1;
    await verify(p.momoId);
    expect(p.cashout.executeCount).toBe(1);
    const unknown = await momoOf(p.momoId);
    expect(unknown.status).toBe('PENDING');
    expect(unknown.payout_execute_sent_at).not.toBeNull();
    expect(unknown.payout_alert_code).toBe('BLOCKED');
    // Le rattrapage relit le statut (`completed`) : SUCCEEDED, sans second `execute`.
    await verify(p.momoId);
    await waitFor(async () => (await payoutOf(p.id)).status === 'PAID');
    expect(p.cashout.executeCount).toBe(1);
    expect((await statementOf(p.statementId)).status).toBe('PAID');
  }, 60_000);

  it('N1 : issue incertaine sans virement : bloqué, UNE alerte, puis action OWNER « relancer » auditée (rôle, motif, état)', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    fake.control.executeLostBeforeTransfer = 1;
    await verify(p.momoId);
    expect(p.cashout.executeCount).toBe(0);
    const blocked = await momoOf(p.momoId);
    expect(blocked.payout_execute_sent_at).not.toBeNull();
    expect(blocked.payout_alert_code).toBe('BLOCKED');
    // Une fois posé depuis plus de 40 s, le blocage est signalé, sans jamais relancer l'ordre.
    await ctx.admin.mobile_money_transactions.update({
      where: { id: p.momoId },
      data: { payout_execute_sent_at: new Date(Date.now() - 120_000), payout_alert_code: null },
    });
    await verify(p.momoId);
    await verify(p.momoId);
    expect(p.cashout.executeCount).toBe(0);
    expect((await momoOf(p.momoId)).payout_alert_code).toBe('BLOCKED');

    const body = {
      resolution: 'RETRY',
      reason: 'Vérifié sur le tableau de bord : retrait approuvé, rien émis.',
    };
    // Rôle à privilèges seulement : un comptable ne peut pas résoudre.
    expect((await resolve(p.id, body, asAccountant())).status).toBe(403);
    // Constat obligatoire.
    expect((await resolve(p.id, { resolution: 'RETRY', reason: 'ok' })).status).toBe(422);
    const done = await resolve(p.id, body);
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('PROCESSING');
    // Aucun virement émis par l'appel lui-même ; les marqueurs sont levés.
    const lifted = await momoOf(p.momoId);
    expect(lifted.payout_execute_sent_at).toBeNull();
    expect(lifted.payout_alert_code).toBeNull();
    const audits = await auditsOf(p.id, 'OWNER_PAYOUT_MOMO_RESOLVED');
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actor_user_id: agency.owner.userId });
    expect(audits[0]?.new_state).toMatchObject({
      resolution: 'RETRY',
      reason: body.reason,
      markerCleared: true,
    });
    // Le retrait n'est exécuté que par la vérification, sur un statut relu `approved` : UNE fois.
    await waitFor(async () => (await payoutOf(p.id)).status === 'PAID', 30_000);
    expect(p.cashout.executeCount).toBe(1);
    // Rien à lever sur un décaissement qui n'est plus bloqué.
    expect((await resolve(p.id, body)).status).toBe(409);
  }, 90_000);

  it('N1 : « marquer payé » (virement vérifié chez OpenPay) : reversement et relevé PAID, aucun virement émis par l’appel', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    await ctx.admin.mobile_money_transactions.update({
      where: { id: p.momoId },
      data: { payout_execute_sent_at: new Date(Date.now() - 300_000) },
    });
    const done = await resolve(p.id, {
      resolution: 'MARK_PAID',
      reason: 'Virement constaté dans les transactions partenaire OpenPay.',
    });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('PAID');
    expect((await momoOf(p.momoId)).status).toBe('SUCCEEDED');
    expect((await statementOf(p.statementId)).status).toBe('PAID');
    expect(p.cashout.executeCount).toBe(0);
    const audits = await auditsOf(p.id, 'OWNER_PAYOUT_MOMO_RESOLVED');
    expect(audits).toHaveLength(1);
    expect(audits[0]?.new_state).toMatchObject({ resolution: 'MARK_PAID', status: 'PAID' });
  }, 60_000);

  it('N1 + N5 : « marquer échoué » puis nouvelle tentative : nouveau retrait sous référence suffixée, PAID au callback', async () => {
    const p = await startedPayout();
    await ctx.admin.mobile_money_transactions.update({
      where: { id: p.momoId },
      data: { payout_execute_sent_at: new Date(Date.now() - 300_000) },
    });
    const failed = await resolve(p.id, {
      resolution: 'MARK_FAILED',
      reason: 'Retrait introuvable chez OpenPay, aucun virement émis.',
    });
    expect(failed.status).toBe(200);
    expect(failed.body.status).toBe('FAILED');
    expect((await momoOf(p.momoId)).status).toBe('FAILED');
    expect((await statementOf(p.statementId)).status).not.toBe('PAID');
    // Reversement FAILED : `momo_merchant_ref_uk` ne bloque plus, un nouveau décaissement est initié.
    const retried = await api(ctx, 'POST', `/owner-payouts/${p.id}/execute`, {
      ...asAccountant(),
      body: {},
    });
    expect(retried.status).toBe(201);
    expect(retried.body.status).toBe('PROCESSING');
    const payout = await payoutOf(p.id);
    expect(payout.momo_transaction_id).not.toBe(p.momoId);
    const second = await momoOf(payout.momo_transaction_id as string);
    expect(second.merchant_reference).toBe(`${payout.reference}-2`);
    const cashout = fake.cashouts.get(second.external_reference as string)!;
    expect(cashout.reference).not.toBe(p.cashout.reference);
    cashout.status = 'approved';
    await callback(cashout.reference);
    await waitFor(async () => (await payoutOf(p.id)).status === 'PAID');
    expect((await statementOf(p.statementId)).status).toBe('PAID');
    expect(cashout.executeCount).toBe(1);
    expect(p.cashout.executeCount).toBe(0);
  }, 90_000);

  it('le faux OpenPay n’a relevé aucune entorse', () => {
    expect(fake.violations).toEqual([]);
  });
});
