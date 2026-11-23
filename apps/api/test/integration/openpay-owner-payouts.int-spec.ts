import { PrismaService } from '../../src/shared/prisma/prisma.service';
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
    portfolio = await seedMandatePortfolio(ctx.admin, agency.organizationId, 24, period, {
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

  /** Marqueur d'ordre d'exécution posé depuis `ageMs` (ordre « envoyé », issue incertaine). */
  const markSent = (momoId: string, ageMs = 300_000, alert: string | null = 'BLOCKED') =>
    ctx.admin.mobile_money_transactions.update({
      where: { id: momoId },
      data: { payout_execute_sent_at: new Date(Date.now() - ageMs), payout_alert_code: alert },
    });
  const reason = 'Constat fait sur le tableau de bord partenaire OpenPay.';
  const deletesOf = (reference: string) =>
    fake.calls.filter((c) => c === `DELETE /scheduled-cashout/${reference}`).length;
  /** Rien n'a bougé : reversement, transaction, relevé, aucun virement, aucun audit de résolution. */
  async function expectUntouched(p: Awaited<ReturnType<typeof startedPayout>>) {
    expect((await payoutOf(p.id)).status).toBe('PROCESSING');
    expect((await momoOf(p.momoId)).status).toBe('PENDING');
    expect((await statementOf(p.statementId)).status).not.toBe('PAID');
    expect(p.cashout.executeCount).toBe(0);
    expect(await auditsOf(p.id, 'OWNER_PAYOUT_MOMO_RESOLVED')).toHaveLength(0);
  }

  it('B : « marquer payé » refusé tant que le retrait n’est pas `completed` (pending, approved) : rien ne change', async () => {
    for (const status of ['pending', 'approved'] as const) {
      const p = await startedPayout();
      p.cashout.status = status;
      await markSent(p.momoId);
      const refused = await resolve(p.id, { resolution: 'MARK_PAID', reason });
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('MOMO.RESOLUTION_REFUSED');
      expect(refused.body.details).toMatchObject({ providerStatus: status });
      await expectUntouched(p);
      // Un callback `approved` ultérieur reste exécutable : l'argent n'a pas été déclaré versé.
      expect((await momoOf(p.momoId)).payout_alert_code).toBe('BLOCKED');
    }
  }, 60_000);

  it('N1 : « marquer payé » accepté seulement si le retrait est relu `completed` ; statut relu consigné à l’audit', async () => {
    const p = await startedPayout();
    p.cashout.status = 'completed';
    await markSent(p.momoId);
    const done = await resolve(p.id, { resolution: 'MARK_PAID', reason });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('PAID');
    expect((await momoOf(p.momoId)).status).toBe('SUCCEEDED');
    expect((await statementOf(p.statementId)).status).toBe('PAID');
    expect(p.cashout.executeCount).toBe(0);
    const audits = await auditsOf(p.id, 'OWNER_PAYOUT_MOMO_RESOLVED');
    expect(audits).toHaveLength(1);
    expect(audits[0]?.new_state).toMatchObject({
      resolution: 'MARK_PAID',
      status: 'PAID',
      providerStatus: 'completed',
    });
  }, 60_000);

  it('A : « marquer échoué » refusé sur un retrait approuvé (non annulable, le virement peut partir) : orienter vers RETRY', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    await markSent(p.momoId);
    const refused = await resolve(p.id, { resolution: 'MARK_FAILED', reason });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('MOMO.RESOLUTION_REFUSED');
    expect(refused.body.details.reason).toContain('RETRY');
    expect(deletesOf(p.cashout.reference)).toBe(0);
    await expectUntouched(p);
    // Retrait déjà exécuté chez OpenPay : « marquer échoué » refusé aussi (c'est un « marquer payé »).
    p.cashout.status = 'completed';
    const late = await resolve(p.id, { resolution: 'MARK_FAILED', reason });
    expect(late.status).toBe(409);
    expect(late.body.details.reason).toContain('MARK_PAID');
    expect((await payoutOf(p.id)).status).toBe('PROCESSING');
  }, 60_000);

  it('A : « relancer » refusé si le retrait est déjà `completed` (le virement est parti)', async () => {
    const p = await startedPayout();
    p.cashout.status = 'completed';
    await markSent(p.momoId);
    const refused = await resolve(p.id, { resolution: 'RETRY', reason });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('MOMO.RESOLUTION_REFUSED');
    expect((await momoOf(p.momoId)).payout_execute_sent_at).not.toBeNull();
  }, 60_000);

  it('A : ordre d’exécution posé depuis moins de 60 s (execute en cours) : toute résolution refusée, le virement aboutit une fois', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    fake.control.executeDelayMs = 5_000;
    try {
      const running = verify(p.momoId);
      await waitFor(async () => (await momoOf(p.momoId)).payout_execute_sent_at !== null);
      for (const resolution of ['MARK_FAILED', 'MARK_PAID', 'RETRY']) {
        const refused = await resolve(p.id, { resolution, reason });
        expect(refused.status).toBe(409);
        expect(refused.body.code).toBe('MOMO.RESOLUTION_REFUSED');
      }
      await running;
    } finally {
      fake.control.executeDelayMs = 0;
    }
    // Le virement a eu lieu une fois, la ligne est conclue par le statut relu : jamais « échouée ».
    await waitFor(async () => (await payoutOf(p.id)).status === 'PAID');
    expect(p.cashout.executeCount).toBe(1);
    expect((await momoOf(p.momoId)).status).toBe('SUCCEEDED');
    expect(deletesOf(p.cashout.reference)).toBe(0);
    expect(await auditsOf(p.id, 'OWNER_PAYOUT_MOMO_RESOLVED')).toHaveLength(0);
  }, 60_000);

  it('B : reversement non bloqué (ni marqueur ni alerte) : les trois résolutions sont refusées', async () => {
    const p = await startedPayout();
    for (const resolution of ['RETRY', 'MARK_PAID', 'MARK_FAILED']) {
      const refused = await resolve(p.id, { resolution, reason });
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('MOMO.RESOLUTION_REFUSED');
    }
    await expectUntouched(p);
    expect(deletesOf(p.cashout.reference)).toBe(0);
  }, 60_000);

  it('A : relecture impossible (retrait au statut non conforme) : aucune résolution, on refuse', async () => {
    const p = await startedPayout();
    await markSent(p.momoId);
    // Montant discordant côté fournisseur : la réponse n'est pas conforme, donc non concluante.
    p.cashout.amount = '1.00';
    for (const resolution of ['RETRY', 'MARK_PAID', 'MARK_FAILED']) {
      const refused = await resolve(p.id, { resolution, reason });
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('MOMO.RESOLUTION_REFUSED');
    }
    await expectUntouched(p);
  }, 60_000);

  it('N1 + N5 : « marquer échoué » sur retrait `pending` : annulé chez OpenPay (DELETE), puis nouveau retrait sous référence suffixée', async () => {
    const p = await startedPayout();
    await markSent(p.momoId);
    const failed = await resolve(p.id, {
      resolution: 'MARK_FAILED',
      reason: 'Retrait en attente, jamais approuvé, abandon.',
    });
    expect(failed.status).toBe(200);
    expect(failed.body.status).toBe('FAILED');
    // Annulé pour de bon chez le fournisseur : plus aucun virement possible sur l'ancien retrait.
    expect(p.cashout.status).toBe('cancelled');
    expect(deletesOf(p.cashout.reference)).toBe(1);
    expect((await momoOf(p.momoId)).status).toBe('FAILED');
    expect((await momoOf(p.momoId)).failure_code).toBe('MANUAL_RESOLUTION');
    expect((await statementOf(p.statementId)).status).not.toBe('PAID');
    const audits = await auditsOf(p.id, 'OWNER_PAYOUT_MOMO_RESOLVED');
    expect(audits[0]?.new_state).toMatchObject({ providerStatus: 'pending', status: 'FAILED' });
    // Relecture « annulé » : la nouvelle tentative est permise, sous une référence suffixée.
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

  it('N1 : « marquer échoué » accepté si OpenPay ne connaît plus le retrait (404) : aucun virement possible', async () => {
    const p = await startedPayout();
    await markSent(p.momoId);
    fake.cashouts.delete(p.cashout.reference);
    const failed = await resolve(p.id, { resolution: 'MARK_FAILED', reason });
    expect(failed.status).toBe(200);
    expect(failed.body.status).toBe('FAILED');
    const audits = await auditsOf(p.id, 'OWNER_PAYOUT_MOMO_RESOLVED');
    expect(audits[0]?.new_state).toMatchObject({ providerStatus: 'not_found' });
  }, 60_000);

  it('A : ancien retrait passé `completed` après un « marquer échoué » : alerte, aucune nouvelle tentative, aucun second virement', async () => {
    const p = await startedPayout();
    p.cashout.status = 'completed';
    // État laissé par l'ancien comportement : transaction FAILED à la main, marqueur posé.
    await ctx.admin.mobile_money_transactions.update({
      where: { id: p.momoId },
      data: {
        status: 'FAILED',
        failure_code: 'MANUAL_RESOLUTION',
        completed_at: new Date(),
        payout_execute_sent_at: new Date(Date.now() - 300_000),
        payout_alert_code: 'BLOCKED',
        status_checked_at: null,
      },
    });
    await ctx.admin.owner_payouts.update({ where: { id: p.id }, data: { status: 'FAILED' } });
    // Le callback d'exécution tardif ne réécrit pas la ligne, mais signale que le virement EST parti.
    await callback(p.cashout.reference);
    await waitFor(async () => (await momoOf(p.momoId)).payout_alert_code === 'LATE_SUCCESS');
    expect((await momoOf(p.momoId)).status).toBe('FAILED');
    expect((await statementOf(p.statementId)).status).not.toBe('PAID');
    // Nouvelle tentative : refusée (la relecture n'est pas « annulé »), aucun second retrait créé.
    const created = () => fake.calls.filter((c) => c === 'POST /scheduled-cashout').length;
    const before = created();
    const retried = await api(ctx, 'POST', `/owner-payouts/${p.id}/execute`, {
      ...asAccountant(),
      body: {},
    });
    expect(retried.status).toBe(409);
    expect(retried.body.code).toBe('MOMO.RESOLUTION_REFUSED');
    expect(created()).toBe(before);
    expect((await payoutOf(p.id)).momo_transaction_id).toBe(p.momoId);
  }, 60_000);

  it('E : deux /execute concurrents après un échec terminal : ni interblocage ni double retrait', async () => {
    const p = await startedPayout();
    await markSent(p.momoId);
    expect((await resolve(p.id, { resolution: 'MARK_FAILED', reason })).status).toBe(200);
    const created = () => fake.calls.filter((c) => c === 'POST /scheduled-cashout').length;
    const before = created();
    const runs = await Promise.all(
      [1, 2, 3].map(() =>
        api(ctx, 'POST', `/owner-payouts/${p.id}/execute`, { ...asAccountant(), body: {} }),
      ),
    );
    for (const r of runs) expect([200, 201]).toContain(r.status);
    expect(created()).toBe(before + 1);
    expect((await payoutOf(p.id)).status).toBe('PROCESSING');
  }, 90_000);

  it('isolation : un OWNER d’une autre organisation ne peut ni lire ni résoudre le décaissement', async () => {
    const p = await startedPayout();
    await markSent(p.momoId);
    p.cashout.status = 'completed';
    const other = await createAgency(ctx, 'OpenPayOther');
    try {
      const body = { resolution: 'MARK_PAID', reason };
      const url = `/owner-payouts/${p.id}/momo-resolution`;
      const otherOwner = { accessToken: other.owner.accessToken };
      // Sa propre organisation : le reversement lui est invisible (RLS), 404.
      const asOther = await api(ctx, 'POST', url, {
        ...otherOwner,
        organizationId: other.organizationId,
        body,
      });
      expect(asOther.status).toBe(404);
      expect(asOther.body.code).toBe('AGENCY.PAYOUT_NOT_FOUND');
      // L'organisation d'origine, dont il n'est pas membre : refus (403, ou 404 anti-énumération).
      const asForeign = await api(ctx, 'POST', url, {
        ...otherOwner,
        organizationId: agency.organizationId,
        body,
      });
      expect([403, 404]).toContain(asForeign.status);
      // La logique de domaine elle-même ne voit rien hors de son organisation (RLS).
      await expect(
        ctx.app
          .get(PrismaService)
          .withTenant(other.organizationId, other.owner.userId, (tx) =>
            payouts().resolveBlockedPayout(tx, p.momoId, 'MARK_PAID'),
          ),
      ).rejects.toMatchObject({ code: 'MOMO.NOT_FOUND' });
      await expectUntouched(p);
      expect(await auditsOf(p.id, 'OWNER_PAYOUT_MOMO_RESOLVED')).toHaveLength(0);
      // Le propriétaire légitime, lui, peut résoudre (retrait `completed`).
      expect((await resolve(p.id, body)).status).toBe(200);
    } finally {
      await dropOrganization(ctx.admin, other.organizationId, [other.owner.userId]);
    }
  }, 90_000);

  it('G : « échec » manuel sur un reversement déjà PAID refusé : le statut PAID n’est jamais écrasé', async () => {
    const p = await startedPayout();
    p.cashout.status = 'approved';
    await callback(p.cashout.reference);
    await waitFor(async () => (await payoutOf(p.id)).status === 'PAID');
    const failed = await api(ctx, 'POST', `/owner-payouts/${p.id}/fail`, {
      ...asAccountant(),
      body: { reason: 'Tentative manuelle trop tardive.' },
    });
    expect(failed.status).toBe(409);
    expect((await payoutOf(p.id)).status).toBe('PAID');
    expect((await statementOf(p.statementId)).status).toBe('PAID');
  }, 60_000);

  it('le faux OpenPay n’a relevé aucune entorse', () => {
    expect(fake.violations).toEqual([]);
  });
});
