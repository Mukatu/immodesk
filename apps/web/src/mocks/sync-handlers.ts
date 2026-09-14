import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 5, synchronisation hors ligne par lots, conforme à
 * docs/api/phase5-contract.md. Cycle d'import statique avec handlers.ts
 * (comme leases-handlers.ts, cf. le commentaire en tête de ce dernier) :
 * ce fichier importe `tenants`/`nextId`/helpers depuis handlers.ts, qui
 * importe en retour `syncHandlers` pour le spread final — lu seulement au
 * moment des requêtes, jamais à l'évaluation du module.
 */
import { API_BASE } from './api-base';
import {
  badRequest,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  tenants,
  unauthorizedOrg,
} from './handlers';
import { invoices as billingInvoices, recalcInvoiceStatus } from './billing-seed';
import {
  ensureSyncFixtures,
  linkConflictToOrgInvoice,
  resolveConflictTargetInvoice,
  syncBatches,
  syncConflicts,
  syncDevices,
  type MockSyncBatch,
  type MockSyncConflict,
  type MockDeviceStatus,
} from './sync-seed';

/** Amorce les données de démonstration et retente le rattachement à une facture réelle (idempotents). */
function primeSyncFixtures(organizationId: string): void {
  const deps = { invoices: billingInvoices, tenants, nextId };
  ensureSyncFixtures(organizationId, deps);
  linkConflictToOrgInvoice(organizationId, deps);
}

function serializeBatchSummary(batch: MockSyncBatch) {
  const { organizationId: _organizationId, results: _results, ...rest } = batch;
  return rest;
}

function serializeBatchDetail(batch: MockSyncBatch) {
  const { organizationId: _organizationId, ...rest } = batch;
  return rest;
}

function serializeConflict(conflict: MockSyncConflict) {
  const {
    organizationId: _organizationId,
    originalInvoiceId: _originalInvoiceId,
    ...rest
  } = conflict;
  return {
    ...rest,
    targetInvoice: resolveConflictTargetInvoice(conflict, billingInvoices, tenants),
  };
}

function serializeDevice(device: MockDeviceStatus) {
  const { organizationId: _organizationId, ...rest } = device;
  return rest;
}

const MOBILE_CONFIG = {
  maxPhotoBytes: 1_500_000,
  photoMaxDimension: 1600,
  photoQuality: 80,
  maxSignatureBytes: 200_000,
  retentionHours: 72,
  syncIntervalSeconds: 300,
  maxOperationsPerBatch: 50,
  offlineWritesEnabled: true,
} as const;

export const syncHandlers = [
  http.get(`${API_BASE}/sync/batches`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    primeSyncFixtures(organizationId);
    const url = new URL(request.url);
    const collectorUserId = url.searchParams.get('collectorUserId');
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...syncBatches.values()]
      .filter((b) => b.organizationId === organizationId)
      .filter((b) => !collectorUserId || b.collector.userId === collectorUserId)
      .filter((b) => !status || b.status === status)
      .filter((b) => !from || b.receivedAt.slice(0, 10) >= from)
      .filter((b) => !to || b.receivedAt.slice(0, 10) <= to)
      .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
      .map(serializeBatchSummary);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/sync/batches/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    primeSyncFixtures(organizationId);
    const batch = syncBatches.get(String(params.id));
    if (!batch || batch.organizationId !== organizationId) {
      return notFound('SYNC.BATCH_NOT_FOUND');
    }
    return HttpResponse.json(serializeBatchDetail(batch));
  }),

  http.get(`${API_BASE}/sync/conflicts`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    primeSyncFixtures(organizationId);
    const url = new URL(request.url);
    const resolved = url.searchParams.get('resolved');
    const collectorUserId = url.searchParams.get('collectorUserId');
    const items = [...syncConflicts.values()]
      .filter((c) => c.organizationId === organizationId)
      .filter((c) => !collectorUserId || c.collector.userId === collectorUserId)
      .filter((c) => {
        if (resolved === null) return true;
        const isResolved = c.resolvedAt !== null;
        return resolved === 'true' ? isResolved : !isResolved;
      })
      .sort((a, b) => (a.clientCreatedAt < b.clientCreatedAt ? -1 : 1))
      .map(serializeConflict);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/mobile/config`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    return HttpResponse.json(MOBILE_CONFIG);
  }),

  http.get(`${API_BASE}/sync/devices`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    primeSyncFixtures(organizationId);
    const items = [...syncDevices.values()]
      .filter((d) => d.organizationId === organizationId)
      .sort((a, b) => (a.lastBatchAt ?? '').localeCompare(b.lastBatchAt ?? ''))
      .map(serializeDevice);
    return HttpResponse.json({ items });
  }),

  /**
   * Résolution d'un conflit (contrat, réservé MANAGER — non vérifié ici par
   * cohérence avec le reste du mock, cf. le commentaire de
   * webhook-events-handlers.ts). APPLY rejoue l'opération avec le même
   * `clientRef` (jamais régénéré) : aucun doublon n'est créé. DISCARD exige
   * un motif.
   */
  http.post(`${API_BASE}/sync/conflicts/:id/resolve`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    primeSyncFixtures(organizationId);
    const conflict = syncConflicts.get(String(params.id));
    if (!conflict || conflict.organizationId !== organizationId) {
      return notFound('SYNC.CONFLICT_NOT_FOUND');
    }
    if (conflict.resolvedAt) {
      return notFound('SYNC.CONFLICT_ALREADY_RESOLVED', 'Ce conflit a déjà été résolu.');
    }
    const body = (await request.json()) as {
      decision: 'APPLY' | 'DISCARD';
      overrides?: { invoiceId?: string; autoAllocate?: boolean };
      reason?: string;
    };
    const batch = syncBatches.get(conflict.batchId);
    const result = batch?.results.find((r) => r.clientRef === conflict.clientRef);
    const now = new Date().toISOString();

    if (body.decision === 'APPLY') {
      const targetInvoiceId = body.overrides?.invoiceId || conflict.originalInvoiceId;
      const invoice = targetInvoiceId ? billingInvoices.get(targetInvoiceId) : undefined;
      if (invoice && body.overrides?.invoiceId && invoice.status !== 'CANCELLED') {
        const payload = conflict.payload as { amount?: number } | null;
        invoice.allocations.push({
          id: nextId('allocation'),
          invoiceId: invoice.id,
          paymentId: nextId('payment'),
          paymentReference: `SYNC-${conflict.clientRef}`,
          method: 'CASH',
          amount: payload?.amount ?? 0,
          allocationDate: now.slice(0, 10),
          isReversal: false,
        });
        recalcInvoiceStatus(invoice, new Date());
      }
      conflict.resolvedAt = now;
      conflict.resolution = 'APPLIED';
      conflict.originalInvoiceId = targetInvoiceId ?? conflict.originalInvoiceId;
      if (result) {
        result.outcome = 'APPLIED';
        result.resourceType = 'cash_receipts';
        result.resourceId = nextId('cash');
        result.code = undefined;
        result.message = 'Appliquée après résolution du conflit, sans créer de doublon.';
        result.retryable = false;
      }
      if (batch) {
        batch.conflictsCount = Math.max(0, batch.conflictsCount - 1);
        batch.appliedCount += 1;
        batch.status =
          batch.conflictsCount === 0 && batch.rejectedCount === 0 ? 'APPLIED' : 'PARTIALLY_APPLIED';
      }
    } else {
      if (!body.reason?.trim()) {
        return badRequest('SYNC.DISCARD_REASON_REQUIRED', "Le motif d'abandon est obligatoire.");
      }
      conflict.resolvedAt = now;
      conflict.resolution = 'DISCARDED';
      conflict.resolutionReason = body.reason.trim();
      if (result) {
        result.outcome = 'REJECTED';
        result.message = `Abandonné par un gestionnaire : ${body.reason.trim()}`;
        result.retryable = false;
      }
      if (batch) {
        batch.conflictsCount = Math.max(0, batch.conflictsCount - 1);
        batch.rejectedCount += 1;
        batch.status = batch.appliedCount > 0 ? 'PARTIALLY_APPLIED' : 'REJECTED';
      }
    }

    return HttpResponse.json({
      conflict: serializeConflict(conflict),
      result: result ?? null,
    });
  }),
];
