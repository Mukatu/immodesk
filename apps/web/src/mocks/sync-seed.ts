/**
 * Mock MSW — Phase 5 (synchronisation hors ligne par lots), état en mémoire,
 * conforme à docs/api/phase5-contract.md. Suit le principe des autres modules
 * (Maps exportées, scoping strict par organizationId) avec une particularité :
 * les lots et conflits ne peuvent pas être créés depuis le web (seul le mobile
 * appelle `POST /v1/sync/batches`), donc ce module amorce paresseusement des
 * données de démonstration cohérentes à la première requête reçue pour une
 * organisation donnée (`ensureSyncFixtures`), plutôt qu'au chargement du
 * module comme les phases précédentes — utile aussi bien pour DEMO_ORG_ID que
 * pour une organisation fraîche créée en e2e.
 */
import type { MockInvoice } from './billing-seed';
import type { MockTenant } from './handlers';

export type SyncOperationTypeMock = 'CASH_RECEIPT' | 'DOCUMENT';
export type SyncOperationOutcomeMock =
  'APPLIED' | 'DUPLICATE' | 'REJECTED' | 'CONFLICT' | 'SKIPPED';
export type SyncBatchStatusMock = 'APPLIED' | 'PARTIALLY_APPLIED' | 'REJECTED' | 'FAILED';
export type SyncConflictResolutionMock = 'APPLIED' | 'DISCARDED';

export interface MockSyncOperationResult {
  clientRef: string;
  type: SyncOperationTypeMock;
  outcome: SyncOperationOutcomeMock;
  resourceType?: string;
  resourceId?: string;
  code?: string;
  message?: string;
  retryable?: boolean;
}

export interface MockCollector {
  userId: string;
  fullName: string;
}

export interface MockSyncBatch {
  id: string;
  organizationId: string;
  batchRef: string;
  status: SyncBatchStatusMock;
  deviceId: string;
  devicePlatform: string | null;
  appVersion: string | null;
  collector: MockCollector;
  operationsCount: number;
  appliedCount: number;
  rejectedCount: number;
  conflictsCount: number;
  receivedAt: string;
  appliedAt: string | null;
  clientGeneratedAt: string | null;
  offlineDurationMinutes: number | null;
  results: MockSyncOperationResult[];
}

export interface MockSyncConflict {
  id: string;
  organizationId: string;
  batchId: string;
  clientRef: string;
  type: SyncOperationTypeMock;
  code: string;
  message: string;
  payload: unknown;
  collector: MockCollector;
  deviceId: string;
  clientCreatedAt: string;
  receivedAt: string;
  resolvedAt: string | null;
  resolution: SyncConflictResolutionMock | null;
  resolutionReason: string | null;
  /** Facture visée au moment de l'opération d'origine, si elle a pu être résolue. */
  originalInvoiceId: string | null;
}

export interface MockDeviceStatus {
  deviceId: string;
  organizationId: string;
  devicePlatform: string | null;
  appVersion: string | null;
  collector: MockCollector;
  lastBatchAt: string | null;
  lastBatchStatus: SyncBatchStatusMock | null;
  pendingConflicts: number;
  totalApplied: number;
}

export const syncBatches = new Map<string, MockSyncBatch>();
export const syncConflicts = new Map<string, MockSyncConflict>();
export const syncDevices = new Map<string, MockDeviceStatus>();

const seededOrgs = new Set<string>();

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function tenantDisplayName(tenant: MockTenant): string {
  if (tenant.partyType === 'COMPANY') return tenant.companyName ?? '';
  return [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || tenant.primaryPhone;
}

export interface EnsureSyncFixturesDeps {
  invoices: Map<string, MockInvoice>;
  tenants: Map<string, MockTenant>;
  nextId: (prefix: string) => string;
}

/**
 * Amorce, une seule fois par organisation, un jeu de démonstration cohérent
 * (livrable 6) : un lot entièrement appliqué, un lot partiellement appliqué
 * avec un conflit sur une facture annulée, un appareil silencieux depuis
 * trois jours. Réutilise les vraies factures de l'organisation quand elles
 * existent déjà (portefeuille construit via l'écran Factures) : la première
 * facture non annulée trouvée est basculée à CANCELLED pour rejouer le
 * scénario « l'état du serveur a changé pendant que l'appareil était hors
 * ligne » (contrat, arbitrage « CONFLICT »).
 */
export function ensureSyncFixtures(organizationId: string, deps: EnsureSyncFixturesDeps): void {
  if (seededOrgs.has(organizationId)) return;
  seededOrgs.add(organizationId);

  const collectorA: MockCollector = { userId: deps.nextId('user'), fullName: 'Alphonse Mavoungou' };
  const collectorB: MockCollector = { userId: deps.nextId('user'), fullName: 'Christian Batantou' };
  const deviceA = `android-${deps.nextId('device')}`;
  const deviceB = `android-${deps.nextId('device')}`;
  const deviceC = `android-${deps.nextId('device')}`;

  // La facture visée par le conflit n'est liée qu'après coup, quand le
  // portefeuille de l'organisation en compte une (voir `linkConflictToOrgInvoice`
  // ci-dessous) : une organisation fraîche n'a souvent aucune facture au
  // moment où ce module est amorcé pour la première fois (ex. la tuile du
  // tableau de bord interroge les conflits dès l'atterrissage sur /app).

  // --- Lot 1 : entièrement appliqué (appareil récent, collecteur A) --------
  const batch1Id = deps.nextId('syncbatch');
  const clientRef1a = deps.nextId('clientref');
  const clientRef1b = deps.nextId('clientref');
  syncBatches.set(batch1Id, {
    id: batch1Id,
    organizationId,
    batchRef: deps.nextId('batchref'),
    status: 'APPLIED',
    deviceId: deviceA,
    devicePlatform: 'android',
    appVersion: '1.4.0',
    collector: collectorA,
    operationsCount: 2,
    appliedCount: 2,
    rejectedCount: 0,
    conflictsCount: 0,
    receivedAt: hoursAgoIso(2),
    appliedAt: hoursAgoIso(2),
    clientGeneratedAt: hoursAgoIso(2.2),
    offlineDurationMinutes: 45,
    results: [
      {
        clientRef: clientRef1a,
        type: 'CASH_RECEIPT',
        outcome: 'APPLIED',
        resourceType: 'cash_receipts',
        resourceId: deps.nextId('cash'),
        message: 'Encaissement enregistré.',
        retryable: false,
      },
      {
        clientRef: clientRef1b,
        type: 'DOCUMENT',
        outcome: 'APPLIED',
        resourceType: 'documents',
        resourceId: deps.nextId('document'),
        message: 'Signature enregistrée.',
        retryable: false,
      },
    ],
  });

  // --- Lot 2 : partiellement appliqué, un conflit sur facture annulée ------
  const batch2Id = deps.nextId('syncbatch');
  const clientRef2a = deps.nextId('clientref');
  const conflictClientRef = deps.nextId('clientref');
  const conflictMessage =
    "La facture visée a été annulée pendant que l'appareil était hors ligne : encaissement non appliqué.";
  const conflictAmount = 45000;
  syncBatches.set(batch2Id, {
    id: batch2Id,
    organizationId,
    batchRef: deps.nextId('batchref'),
    status: 'PARTIALLY_APPLIED',
    deviceId: deviceB,
    devicePlatform: 'android',
    appVersion: '1.3.2',
    collector: collectorB,
    operationsCount: 2,
    appliedCount: 1,
    rejectedCount: 0,
    conflictsCount: 1,
    receivedAt: hoursAgoIso(20),
    appliedAt: hoursAgoIso(20),
    clientGeneratedAt: hoursAgoIso(26),
    offlineDurationMinutes: 360,
    results: [
      {
        clientRef: clientRef2a,
        type: 'CASH_RECEIPT',
        outcome: 'APPLIED',
        resourceType: 'cash_receipts',
        resourceId: deps.nextId('cash'),
        message: 'Encaissement enregistré.',
        retryable: false,
      },
      {
        clientRef: conflictClientRef,
        type: 'CASH_RECEIPT',
        outcome: 'CONFLICT',
        code: 'BILLING.INVOICE_NOT_OPEN',
        message: conflictMessage,
        retryable: false,
      },
    ],
  });

  syncConflicts.set(`${batch2Id}:${conflictClientRef}`, {
    id: `${batch2Id}:${conflictClientRef}`,
    organizationId,
    batchId: batch2Id,
    clientRef: conflictClientRef,
    type: 'CASH_RECEIPT',
    code: 'BILLING.INVOICE_NOT_OPEN',
    message: conflictMessage,
    payload: {
      clientRef: conflictClientRef,
      tenantId: null,
      invoiceId: null,
      amount: conflictAmount,
      payerName: 'Locataire à identifier',
      clientCreatedAt: hoursAgoIso(26),
      autoAllocate: true,
    },
    collector: collectorB,
    deviceId: deviceB,
    clientCreatedAt: hoursAgoIso(26),
    receivedAt: hoursAgoIso(20),
    resolvedAt: null,
    resolution: null,
    resolutionReason: null,
    originalInvoiceId: null,
  });

  // --- Appareils : deviceA et deviceB récents, deviceC silencieux 3 jours --
  syncDevices.set(deviceA, {
    deviceId: deviceA,
    organizationId,
    devicePlatform: 'android',
    appVersion: '1.4.0',
    collector: collectorA,
    lastBatchAt: hoursAgoIso(2),
    lastBatchStatus: 'APPLIED',
    pendingConflicts: 0,
    totalApplied: 2,
  });
  syncDevices.set(deviceB, {
    deviceId: deviceB,
    organizationId,
    devicePlatform: 'android',
    appVersion: '1.3.2',
    collector: collectorB,
    lastBatchAt: hoursAgoIso(20),
    lastBatchStatus: 'PARTIALLY_APPLIED',
    pendingConflicts: 1,
    totalApplied: 1,
  });
  syncDevices.set(deviceC, {
    deviceId: deviceC,
    organizationId,
    devicePlatform: 'ios',
    appVersion: '1.2.0',
    collector: { userId: deps.nextId('user'), fullName: 'Prisca Ngouabi' },
    lastBatchAt: hoursAgoIso(72),
    lastBatchStatus: 'APPLIED',
    pendingConflicts: 0,
    totalApplied: 5,
  });
}

/**
 * Rattache paresseusement un conflit encore sans facture (`originalInvoiceId
 * === null`) à la première facture non annulée de l'organisation, dès qu'elle
 * en compte une, en la basculant à CANCELLED pour rejouer le scénario « l'état
 * du serveur a changé pendant que l'appareil était hors ligne » (contrat,
 * arbitrage CONFLICT). Idempotent : sans effet si déjà lié, résolu, ou si
 * l'organisation ne compte encore aucune facture éligible.
 */
export function linkConflictToOrgInvoice(
  organizationId: string,
  deps: EnsureSyncFixturesDeps,
): void {
  const unlinked = [...syncConflicts.values()].filter(
    (c) => c.organizationId === organizationId && !c.resolvedAt && !c.originalInvoiceId,
  );
  if (unlinked.length === 0) return;
  const eligibleInvoice = [...deps.invoices.values()].find(
    (i) => i.organizationId === organizationId && i.status !== 'CANCELLED',
  );
  if (!eligibleInvoice) return;

  eligibleInvoice.status = 'CANCELLED';
  eligibleInvoice.cancelledAt = hoursAgoIso(22);
  eligibleInvoice.cancellationReason =
    'Facture annulée au comptoir pendant la tournée du démarcheur, hors connexion.';
  const tenant = deps.tenants.get(eligibleInvoice.tenantId);

  for (const conflict of unlinked) {
    conflict.originalInvoiceId = eligibleInvoice.id;
    const payload = conflict.payload as Record<string, unknown>;
    payload.invoiceId = eligibleInvoice.id;
    payload.tenantId = eligibleInvoice.tenantId;
    payload.payerName = tenant ? tenantDisplayName(tenant) : 'Locataire inconnu';
  }
}

export function resolveConflictTargetInvoice(
  conflict: MockSyncConflict,
  invoices: Map<string, MockInvoice>,
  tenants: Map<string, MockTenant>,
): {
  id: string;
  invoiceNumber: string | null;
  status: MockInvoice['status'];
  balanceAmount: number;
  tenantDisplayName: string;
} | null {
  if (!conflict.originalInvoiceId) return null;
  const invoice = invoices.get(conflict.originalInvoiceId);
  if (!invoice) return null;
  const totalAmount = invoice.lines.reduce(
    (sum, l) => sum + (l.isCredit ? -l.amount : l.amount),
    0,
  );
  const paidAmount = invoice.allocations.reduce(
    (sum, a) => sum + (a.isReversal ? -a.amount : a.amount),
    0,
  );
  const tenant = tenants.get(invoice.tenantId);
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    balanceAmount: totalAmount - paidAmount,
    tenantDisplayName: tenant ? tenantDisplayName(tenant) : 'Locataire inconnu',
  };
}
