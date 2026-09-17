import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

// Doit être importé avant './dunning-handlers' : handlers.ts et dunning-handlers.ts
// s'importent mutuellement (voir le commentaire d'en-tête d'api-base.ts pour le même
// piège avec leases-handlers.ts). Entrer par './dunning-handlers' en premier laisserait
// le seed de démonstration de handlers.ts appeler seedDunningDemoData avant que ce
// module ait fini de s'évaluer (TDZ), ce que l'application évite en entrant toujours
// par './handlers'.
import './handlers';
import { API_BASE } from './api-base';
import { dunningRunHandlers } from './dunning-handlers';
import { DUNNING_REFERENCE_TODAY, dunningRuns, type MockDunningRun } from './dunning-seed';

/**
 * Le simulateur MSW doit honorer le filtre `tenantId` de `GET /dunning-runs`
 * exactement comme le serveur (`dunning-runs-query.service.ts`) : une
 * simulation plus permissive rendrait les tests complaisants. Date figée sur
 * `DUNNING_REFERENCE_TODAY`, jamais l'horloge réelle (voir dunning-seed.ts).
 */

const ORGANIZATION_ID = 'org-dunning-tenant-filter-test';
const RUN_DATE = DUNNING_REFERENCE_TODAY.toISOString().slice(0, 10);
const TIMESTAMP = DUNNING_REFERENCE_TODAY.toISOString();

const server = setupServer(...dunningRunHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  dunningRuns.clear();
});
afterAll(() => server.close());

function makeRun(id: string, tenantId: string, tenantDisplayName: string): MockDunningRun {
  return {
    id,
    organizationId: ORGANIZATION_ID,
    ruleId: 'dunningrule-1',
    ruleName: 'Relance avec pénalité',
    stepOrder: 2,
    status: 'SENT',
    runDate: RUN_DATE,
    scheduledAt: TIMESTAMP,
    executedAt: TIMESTAMP,
    daysOverdue: 5,
    balanceAmount: 45_000,
    channel: 'WHATSAPP',
    invoiceId: null,
    invoiceNumber: null,
    tenantId,
    tenantDisplayName,
    notificationId: null,
    messageLogId: null,
    messageStatus: null,
    guarantorNotified: false,
    penaltyApplied: false,
    penaltyAmount: 0,
    penaltyInvoiceLineId: null,
    skipReason: null,
    errorMessage: null,
    createdAt: TIMESTAMP,
  };
}

describe('GET /dunning-runs — filtre tenantId', () => {
  it('ne renvoie que les exécutions du locataire demandé', async () => {
    dunningRuns.set('run-tenant-a', makeRun('run-tenant-a', 'tenant-a', 'Jean Malonga'));
    dunningRuns.set('run-tenant-b', makeRun('run-tenant-b', 'tenant-b', 'Awa Bemba'));

    const response = await fetch(`${API_BASE}/dunning-runs?tenantId=tenant-a`, {
      headers: { 'X-Organization-Id': ORGANIZATION_ID },
    });
    const body = (await response.json()) as {
      items: Array<{ id: string; tenant: { id: string; displayName: string } }>;
    };

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.id).toBe('run-tenant-a');
    expect(body.items[0]?.tenant).toEqual({ id: 'tenant-a', displayName: 'Jean Malonga' });
  });

  it("renvoie toutes les exécutions de l'organisation quand aucun locataire n'est précisé", async () => {
    dunningRuns.set('run-tenant-a', makeRun('run-tenant-a', 'tenant-a', 'Jean Malonga'));
    dunningRuns.set('run-tenant-b', makeRun('run-tenant-b', 'tenant-b', 'Awa Bemba'));

    const response = await fetch(`${API_BASE}/dunning-runs`, {
      headers: { 'X-Organization-Id': ORGANIZATION_ID },
    });
    const body = (await response.json()) as { items: unknown[] };

    expect(body.items).toHaveLength(2);
  });

  it('combine le filtre locataire avec le filtre statut déjà honoré', async () => {
    dunningRuns.set('run-sent', makeRun('run-sent', 'tenant-a', 'Jean Malonga'));
    const skipped = makeRun('run-skipped', 'tenant-a', 'Jean Malonga');
    skipped.status = 'SKIPPED';
    dunningRuns.set('run-skipped', skipped);
    dunningRuns.set('run-other-tenant', makeRun('run-other-tenant', 'tenant-b', 'Awa Bemba'));

    const response = await fetch(`${API_BASE}/dunning-runs?tenantId=tenant-a&status=SKIPPED`, {
      headers: { 'X-Organization-Id': ORGANIZATION_ID },
    });
    const body = (await response.json()) as { items: Array<{ id: string }> };

    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.id).toBe('run-skipped');
  });
});
