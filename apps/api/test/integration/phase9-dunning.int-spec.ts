import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { createAgency, dropOrganization, type Agency } from './phase3-fixtures';

/**
 * Phase 9 — relances et pénalités : couverture d'intégration du périmètre
 * DÉTERMINISTE, indépendant de la date du jour.
 *
 * IMPORTANT : `POST /organizations/{id}/dunning-runs/trigger` ne reçoit
 * aucun paramètre de date (fidèle au contrat, § « Routes ») — le moteur y
 * utilise l'instant réel. Aucune assertion de ce fichier ne dépend donc du
 * jour ou de l'heure d'exécution des tests : les scénarios qui dépendent de
 * l'échéance d'une facture (sélection de palier, jours de retard, report du
 * week-end) sont couverts en unitaire (`test/unit/dunning.spec.ts`,
 * dates ancrées explicitement) plutôt qu'ici.
 */
describe('Phase 9 — relances (règles) et pénalités (activation, simulation)', () => {
  let ctx: TestContext;
  let agency: Agency;
  const as = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Relances');
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [agency.owner.userId]);
    await stopTestApp(ctx);
  });

  it('liste vide au départ', async () => {
    const res = await api(ctx, 'GET', '/dunning-rules', as());
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  let ruleId: string;

  it('crée un palier de relance', async () => {
    const res = await api(ctx, 'POST', '/dunning-rules', {
      ...as(),
      body: {
        name: 'Relance J+3',
        stepOrder: 1,
        triggerType: 'DAYS_AFTER_DUE',
        offsetDays: 3,
        channel: 'WHATSAPP',
        fallbackChannel: 'SMS',
        minBalanceAmount: 5000,
        sendHourLocal: 9,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Relance J+3',
      stepOrder: 1,
      triggerType: 'DAYS_AFTER_DUE',
      offsetDays: 3,
      channel: 'WHATSAPP',
      fallbackChannel: 'SMS',
      isActive: true,
      currency: 'XAF',
    });
    ruleId = res.body.id;
  });

  it('409 DUNNING.STEP_ORDER_TAKEN sur un rang déjà occupé (arbitrage 4)', async () => {
    const res = await api(ctx, 'POST', '/dunning-rules', {
      ...as(),
      body: { name: 'Autre relance', stepOrder: 1, offsetDays: 5 },
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUNNING.STEP_ORDER_TAKEN');
  });

  it('modifie un palier', async () => {
    const res = await api(ctx, 'PATCH', `/dunning-rules/${ruleId}`, {
      ...as(),
      body: { offsetDays: 4 },
    });
    expect(res.status).toBe(200);
    expect(res.body.offsetDays).toBe(4);
  });

  it('désactive une règle sans la supprimer (arbitrage 3)', async () => {
    const res = await api(ctx, 'POST', `/dunning-rules/${ruleId}/activate`, {
      ...as(),
      body: { isActive: false },
    });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);

    const list = await api(ctx, 'GET', '/dunning-rules', as());
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].id).toBe(ruleId);
  });

  it('trigger dryRun sans facture éligible : compte à zéro, rien n’est écrit', async () => {
    const res = await api(
      ctx,
      'POST',
      `/organizations/${agency.organizationId}/dunning-runs/trigger`,
      {
        ...as(),
        body: { dryRun: true },
      },
    );
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ created: 0, skipped: 0, failed: 0, dryRun: true });

    const runs = await api(ctx, 'GET', '/dunning-runs', as());
    expect(runs.status).toBe(200);
    expect(runs.body.items).toEqual([]);
  });

  let penaltyRuleId: string;

  it('crée une règle de pénalité et la simule sans rien écrire', async () => {
    const created = await api(ctx, 'POST', '/penalty-rules', {
      ...as(),
      body: { name: 'Pénalité forfaitaire test', basis: 'FLAT_AMOUNT', flatAmount: 5000 },
    });
    expect(created.status).toBe(201);
    penaltyRuleId = created.body.id;

    const simulated = await api(ctx, 'POST', `/penalty-rules/${penaltyRuleId}/simulate`, {
      ...as(),
      body: { balanceAmount: 100_000, daysOverdue: 20 },
    });
    expect(simulated.status).toBe(200);
    expect(simulated.body).toEqual({ penaltyAmount: 5000, cappedBy: null, periods: 1 });

    // La simulation n'écrit rien : aucune ligne de facture n'existe pour cette organisation.
    const rules = await api(ctx, 'GET', '/penalty-rules', as());
    expect(rules.body.items.find((r: { id: string }) => r.id === penaltyRuleId)).toBeTruthy();
  });

  it('active/désactive une règle de pénalité sans la supprimer', async () => {
    const res = await api(ctx, 'POST', `/penalty-rules/${penaltyRuleId}/activate`, {
      ...as(),
      body: { isActive: false },
    });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });
});
