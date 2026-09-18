/**
 * Mock MSW — Phase 10, portail locataire, état en mémoire et seed de
 * démonstration, conforme à docs/api/phase10-contract.md section « Portail
 * locataire ». Réutilise les Maps déjà seedées par les phases 3 et 4
 * (`invoices`, `receipts`, `transferDeclarations`) plutôt que de dupliquer un
 * second jeu de données : le contrat ne décrit aucune table propre à ce
 * portail, seulement des routes de lecture/écriture cloisonnées sur les
 * tables existantes (`rent_invoices`, `receipts`, `bank_transfer_declarations`,
 * `mobile_money_transactions`).
 *
 * Arbitrage n°4 du contrat : le locataire n'a aucun rôle stocké, et la
 * session ne s'appuie sur aucun jeton existant — ce Map est donc séparé de
 * `accessTokens` (agence, dans handlers.ts) et de `portalAccessTokens`
 * (bailleur), jamais partagé.
 */
import type { MockDocument, MockTenant } from './handlers';
import type { MockLease } from './leases-seed';
import { computeInvoiceTotals, type MockInvoice } from './billing-seed';
import { transferDeclarations, type MockTransferDeclaration } from './payments-phase4-seed';

/** Jeton du portail locataire -> tenantId. Périmètre : baux ACTIFS de ce tenantId. */
export const tenantPortalTokens = new Map<string, string>();

export interface SeedTenantPortalDeps {
  tenants: Map<string, MockTenant>;
  leases: Map<string, MockLease>;
  invoices: Map<string, MockInvoice>;
  documents: Map<string, MockDocument>;
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
}

/**
 * N'ajoute qu'UNE déclaration de virement « faite depuis le portail », en plus
 * des données déjà seedées par seedPaymentsPhase4DemoData (mêmes baux et
 * factures de démonstration) : les factures et quittances visibles par le
 * locataire de démonstration sont déjà celles seedées en phases 3-4, aucun
 * besoin de les recréer. Idempotent (clé `clientRef` dédiée) — un second appel
 * (hot-reload) ne duplique rien.
 *
 * Point d'appel attendu (non fait ici, hors périmètre — voir compte rendu) :
 * `seedTenantPortalDemoData({ tenants, leases, invoices, documents, DEMO_ORG_ID, nextId })`
 * depuis handlers.ts, après seedPaymentsPhase4DemoData.
 */
export function seedTenantPortalDemoData(deps: SeedTenantPortalDeps): void {
  const { tenants, leases, invoices, documents, DEMO_ORG_ID, nextId } = deps;
  const CLIENT_REF = 'demo-tenant-portal-transfer-1';
  if ([...transferDeclarations.values()].some((d) => d.clientRef === CLIENT_REF)) return;

  const demoLease = [...leases.values()].find(
    (l) => l.organizationId === DEMO_ORG_ID && l.status === 'ACTIVE',
  );
  if (!demoLease) return;
  const tenant = tenants.get(demoLease.primaryTenantId);
  if (!tenant) return;

  const openInvoice = [...invoices.values()].find(
    (i) => i.leaseId === demoLease.id && (i.status === 'ISSUED' || i.status === 'OVERDUE'),
  );

  const now = new Date().toISOString();
  const documentId = nextId('document');
  documents.set(documentId, {
    id: documentId,
    organizationId: DEMO_ORG_ID,
    objectKey: `demo/tenant-portal/${documentId}.jpg`,
    kind: 'TRANSFER_PROOF',
    fileName: 'virement-portail-locataire.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 198_000,
    widthPx: 1080,
    heightPx: 1440,
    pagesCount: null,
    relatedEntityType: null,
    relatedEntityId: null,
    uploadedByUserId: null,
    uploadedAt: now,
    retentionUntil: null,
    deletedAt: null,
  });

  const id = nextId('transfer');
  const declaration: MockTransferDeclaration = {
    id,
    organizationId: DEMO_ORG_ID,
    status: 'SUBMITTED',
    tenantId: tenant.id,
    leaseId: demoLease.id,
    invoiceId: openInvoice?.id ?? null,
    declaredAmount: openInvoice ? computeInvoiceTotals(openInvoice).balanceAmount : 45_000,
    transferDate: now.slice(0, 10),
    transferReference: null,
    payerName: [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || 'Locataire',
    payerBankCode: null,
    payerBankName: null,
    payerAccountNumber: null,
    beneficiaryBankAccountId: 'bank-demo-org',
    proofDocumentId: documentId,
    clientRef: CLIENT_REF,
    notes: 'Déclaré directement depuis le portail locataire.',
    paymentId: null,
    submittedByUserId: null,
    reviewedByUserId: null,
    reviewedAt: null,
    rejectionReason: null,
    matchedStatementLineId: null,
    createdAt: now,
  };
  transferDeclarations.set(id, declaration);
}
