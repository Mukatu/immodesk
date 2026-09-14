/**
 * Mock MSW — Phase 4 (Mobile Money à deux modes, virement déclaré, webhooks),
 * état en mémoire et données de démonstration, conformes à
 * docs/api/phase4-contract.md. Même principe que payments-seed.ts : seed
 * appelé après seedBillingDemoData/seedPaymentsDemoData (dépend des baux et
 * factures déjà seedés pour la Résidence Mpila), Maps exportées pour être
 * consommées par les handlers spécialisés.
 *
 * Écart volontaire au libellé de l'énoncé : une seule Map `momoTransactions`
 * couvre à la fois les « déclarations » et les transactions agrégateur — le
 * contrat ne décrit qu'une seule table `mobile_money_transactions` distinguée
 * par `channel` (DECLARED/AGGREGATOR), et un seul type `MomoTransaction` dans
 * apps/web/src/lib/api/types.ts. Créer une Map « momoDeclarations » séparée
 * aurait dupliqué le même type pour aucun bénéfice.
 */
import type { MockBankAccount, MockDocument } from './handlers';
import type { MockLease } from './leases-seed';
import { computeInvoiceTotals, recalcInvoiceStatus, type MockInvoice } from './billing-seed';
import { createReceiptForPaidInvoice } from './receipts-handlers';
import { nextPaymentReference, payments, type MockPayment } from './payments-seed';

export type MomoChannelMock = 'AGGREGATOR' | 'DECLARED';
export type MomoStatusMock =
  | 'INITIATED'
  | 'PENDING'
  | 'DECLARED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REFUNDED';
export type DeclarationStatusMock =
  'SUBMITTED' | 'UNDER_REVIEW' | 'MATCHED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type WebhookSourceMock =
  'CINETPAY' | 'PAWAPAY' | 'MTN_MOMO' | 'AIRTEL_MONEY' | 'WHATSAPP_CLOUD' | 'SMS_GATEWAY' | 'OTHER';
export type WebhookStatusMock = 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'IGNORED' | 'FAILED';
export type MomoAggregatorProviderMock = 'SIMULATOR' | 'CINETPAY';
export type MomoFeeBearerMock = 'TENANT' | 'ORGANIZATION';
export type MomoProviderMock = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'CINETPAY' | 'PAWAPAY' | 'OTHER';
export type FeeBearerMock = 'TENANT' | 'ORGANIZATION' | 'LANDLORD' | 'SHARED';

export interface MockPaymentMethodsSettings {
  mobileMoneyDeclared: { enabled: boolean };
  mobileMoneyAggregator: {
    enabled: boolean;
    provider: MomoAggregatorProviderMock;
    feeBearer: MomoFeeBearerMock;
    feeRateBps: number;
    minAmount: number;
    maxAmount: number;
  };
  bankTransfer: { enabled: boolean; confirmOnApproval: boolean };
  pendingExpiryMinutes: number;
}

export interface MockMomoTransaction {
  id: string;
  organizationId: string;
  channel: MomoChannelMock;
  status: MomoStatusMock;
  provider: MomoProviderMock;
  aggregator: string | null;
  merchantReference: string;
  providerTransactionId: string | null;
  aggregatorTransactionId: string | null;
  payerMsisdn: string;
  payeeMsisdn: string | null;
  amount: number;
  feeAmount: number;
  feeBearer: FeeBearerMock;
  tenantId: string;
  leaseId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  proofDocumentId: string | null;
  declaredByUserId: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  clientRef: string | null;
  notes: string | null;
  initiatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  statusCheckedAt: string | null;
  statusCheckCount: number;
}

export interface MockTransferDeclaration {
  id: string;
  organizationId: string;
  status: DeclarationStatusMock;
  tenantId: string;
  leaseId: string | null;
  invoiceId: string | null;
  declaredAmount: number;
  transferDate: string;
  transferReference: string | null;
  payerName: string;
  payerBankCode: string | null;
  payerBankName: string | null;
  payerAccountNumber: string | null;
  beneficiaryBankAccountId: string;
  proofDocumentId: string;
  clientRef: string | null;
  notes: string | null;
  paymentId: string | null;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  matchedStatementLineId: string | null;
  createdAt: string;
}

export interface MockWebhookEvent {
  id: string;
  organizationId: string | null;
  source: WebhookSourceMock;
  eventType: string;
  status: WebhookStatusMock;
  externalEventId: string | null;
  signatureValid: boolean | null;
  receivedAt: string;
  processedAt: string | null;
  processingAttempts: number;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  rawPayload: unknown;
}

// ---- État en mémoire ----

/** Clé = organizationId (un seul jeu de paramètres par organisation). */
export const paymentMethodsSettings = new Map<string, MockPaymentMethodsSettings>();
export const momoTransactions = new Map<string, MockMomoTransaction>();
export const transferDeclarations = new Map<string, MockTransferDeclaration>();
export const webhookEvents = new Map<string, MockWebhookEvent>();

/**
 * Drapeau plateforme simulé (feature_flags.payments.mobile_money_aggregator),
 * distinct du paramètre d'organisation mobileMoneyAggregator.enabled. Objet
 * mutable (plutôt qu'une constante) pour rester falsifiable depuis un test :
 * `import { platformFlags } from './payments-phase4-seed'` puis mutation
 * directe de `platformFlags.mobileMoneyAggregatorEnabled`.
 */
export const platformFlags = { mobileMoneyAggregatorEnabled: true };

export function defaultPaymentMethodsSettings(): MockPaymentMethodsSettings {
  return {
    mobileMoneyDeclared: { enabled: true },
    mobileMoneyAggregator: {
      enabled: false,
      provider: 'SIMULATOR',
      feeBearer: 'TENANT',
      feeRateBps: 300,
      minAmount: 500,
      maxAmount: 2_000_000,
    },
    bankTransfer: { enabled: true, confirmOnApproval: true },
    pendingExpiryMinutes: 120,
  };
}

export function getOrInitPaymentMethodsSettings(
  organizationId: string,
): MockPaymentMethodsSettings {
  let settings = paymentMethodsSettings.get(organizationId);
  if (!settings) {
    settings = defaultPaymentMethodsSettings();
    paymentMethodsSettings.set(organizationId, settings);
  }
  return settings;
}

let momoDeclaredSeq = 0;
export function nextMomoDeclaredReference(yearMonth: string): string {
  momoDeclaredSeq += 1;
  return `MMD-${yearMonth.replace('-', '')}-${String(momoDeclaredSeq).padStart(5, '0')}`;
}

let momoAggregatorSeq = 0;
export function nextMomoAggregatorReference(yearMonth: string): string {
  momoAggregatorSeq += 1;
  return `MMA-${yearMonth.replace('-', '')}-${String(momoAggregatorSeq).padStart(5, '0')}`;
}

let transferDeclarationSeq = 0;
/** Pas de format imposé par le contrat pour l'id d'une déclaration de virement. */
export function nextTransferDeclarationSeq(): number {
  transferDeclarationSeq += 1;
  return transferDeclarationSeq;
}

// ---- Seed de démonstration ----

export interface SeedPaymentsPhase4Deps {
  invoices: Map<string, MockInvoice>;
  leases: Map<string, MockLease>;
  bankAccounts: Map<string, MockBankAccount>;
  documents: Map<string, MockDocument>;
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
}

function fakeProofDocument(
  deps: SeedPaymentsPhase4Deps,
  fileName: string,
  kind: MockDocument['kind'],
): string {
  const { documents, DEMO_ORG_ID, nextId } = deps;
  const id = nextId('document');
  const now = new Date().toISOString();
  documents.set(id, {
    id,
    organizationId: DEMO_ORG_ID,
    objectKey: `demo/payments/${id}.jpg`,
    kind,
    fileName,
    mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    sizeBytes: 245_000,
    widthPx: fileName.endsWith('.pdf') ? null : 1080,
    heightPx: fileName.endsWith('.pdf') ? null : 1440,
    pagesCount: fileName.endsWith('.pdf') ? 1 : null,
    relatedEntityType: null,
    relatedEntityId: null,
    uploadedByUserId: null,
    uploadedAt: now,
    retentionUntil: null,
    deletedAt: null,
  });
  return id;
}

/**
 * Ajoute les paramètres de paiement par défaut de l'organisation de démo, et
 * quelques déclarations Mobile Money / virement à divers statuts, réutilisant
 * les baux et factures de la Résidence Mpila déjà seedés par
 * seedLeasesDemoData et seedBillingDemoData (aucune organisation recréée).
 */
export function seedPaymentsPhase4DemoData(deps: SeedPaymentsPhase4Deps): void {
  const { invoices, leases, DEMO_ORG_ID, nextId } = deps;
  getOrInitPaymentMethodsSettings(DEMO_ORG_ID);

  const now = new Date().toISOString();
  const yearMonth = now.slice(0, 7);
  const demoInvoices = [...invoices.values()].filter((i) => i.organizationId === DEMO_ORG_ID);
  const demoLeases = [...leases.values()].filter(
    (l) => l.organizationId === DEMO_ORG_ID && l.status === 'ACTIVE',
  );
  const leaseA = demoLeases[0];
  const leaseB = demoLeases[1] ?? demoLeases[0];
  if (!leaseA || !leaseB) return;

  const issuedInvoice = demoInvoices.find((i) => i.leaseId === leaseA.id && i.status === 'ISSUED');
  const partiallyPaidInvoice = demoInvoices.find(
    (i) => i.leaseId === leaseB.id && i.status === 'PARTIALLY_PAID',
  );
  const overdueInvoice = demoInvoices.find(
    (i) => i.leaseId === leaseA.id && i.status === 'OVERDUE',
  );

  // ---- Mobile Money déclaré (1) : en attente de validation, récente ----
  const momo1Id = nextId('momo');
  momoTransactions.set(momo1Id, {
    id: momo1Id,
    organizationId: DEMO_ORG_ID,
    channel: 'DECLARED',
    status: 'DECLARED',
    provider: 'MTN_MOMO',
    aggregator: null,
    merchantReference: nextMomoDeclaredReference(yearMonth),
    providerTransactionId: 'MP240911.1234.A56789',
    aggregatorTransactionId: null,
    payerMsisdn: '+242066000101',
    payeeMsisdn: '+242066123456',
    amount: issuedInvoice ? computeInvoiceTotals(issuedInvoice).balanceAmount : 120000,
    feeAmount: 0,
    feeBearer: 'TENANT',
    tenantId: leaseA.primaryTenantId,
    leaseId: leaseA.id,
    invoiceId: issuedInvoice?.id ?? null,
    paymentId: null,
    proofDocumentId: fakeProofDocument(deps, 'momo-declaration-1.jpg', 'OTHER'),
    declaredByUserId: null,
    verifiedByUserId: null,
    verifiedAt: null,
    rejectionReason: null,
    failureCode: null,
    failureMessage: null,
    clientRef: 'demo-momo-declared-1',
    notes: "Capture d'écran transmise par le locataire via WhatsApp.",
    initiatedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    completedAt: null,
    expiresAt: null,
    statusCheckedAt: null,
    statusCheckCount: 0,
  });

  // ---- Mobile Money déclaré (2) : validée -> payment CONFIRMED + quittance ----
  // Illustre la RÈGLE CENTRALE : le payment et l'allocation ne sont créés
  // qu'à l'approbation, jamais à la déclaration.
  const momo2Id = nextId('momo');
  const momo2PaymentId = nextId('payment');
  const momo2Reference = nextPaymentReference(yearMonth);
  const momo2Now = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  const momo2Amount = overdueInvoice ? computeInvoiceTotals(overdueInvoice).balanceAmount : 120000;
  if (overdueInvoice) {
    overdueInvoice.allocations.push({
      id: nextId('allocation'),
      invoiceId: overdueInvoice.id,
      paymentId: momo2PaymentId,
      paymentReference: momo2Reference,
      method: 'MOBILE_MONEY',
      amount: momo2Amount,
      allocationDate: momo2Now.slice(0, 10),
      isReversal: false,
    });
    recalcInvoiceStatus(overdueInvoice);
    if (overdueInvoice.status === 'PAID') createReceiptForPaidInvoice(overdueInvoice);
  }
  const momo2Payment: MockPayment = {
    id: momo2PaymentId,
    organizationId: DEMO_ORG_ID,
    reference: momo2Reference,
    method: 'MOBILE_MONEY',
    status: 'CONFIRMED',
    direction: 'INBOUND',
    amount: momo2Amount,
    tenantId: leaseA.primaryTenantId,
    leaseId: leaseA.id,
    paymentDate: momo2Now.slice(0, 10),
    externalReference: 'MP240905.0912.C11223',
    feeAmount: 0,
    confirmedAt: momo2Now,
    rejectedAt: null,
    rejectionReason: null,
    reversedAt: null,
    reversalReason: null,
    reversalOfId: null,
    receivedByUserId: null,
    clientRef: 'demo-momo-declared-2',
    notes: 'Mobile Money déclaré, validé par la comptabilité.',
    createdAt: momo2Now,
    allocations: overdueInvoice
      ? [
          {
            id: nextId('allocation'),
            invoiceId: overdueInvoice.id,
            invoiceNumber: overdueInvoice.invoiceNumber,
            tenantCreditId: null,
            amount: momo2Amount,
            isReversal: false,
          },
        ]
      : [],
  };
  payments.set(momo2PaymentId, momo2Payment);

  momoTransactions.set(momo2Id, {
    id: momo2Id,
    organizationId: DEMO_ORG_ID,
    channel: 'DECLARED',
    status: 'SUCCEEDED',
    provider: 'AIRTEL_MONEY',
    aggregator: null,
    merchantReference: nextMomoDeclaredReference(yearMonth),
    providerTransactionId: 'MP240905.0912.C11223',
    aggregatorTransactionId: null,
    payerMsisdn: '+242055000102',
    payeeMsisdn: '+242066123456',
    amount: momo2Amount,
    feeAmount: 0,
    feeBearer: 'TENANT',
    tenantId: leaseA.primaryTenantId,
    leaseId: leaseA.id,
    invoiceId: overdueInvoice?.id ?? null,
    paymentId: momo2PaymentId,
    proofDocumentId: fakeProofDocument(deps, 'momo-declaration-2.jpg', 'OTHER'),
    declaredByUserId: null,
    verifiedByUserId: null,
    verifiedAt: momo2Now,
    rejectionReason: null,
    failureCode: null,
    failureMessage: null,
    clientRef: 'demo-momo-declared-2',
    notes: null,
    initiatedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    completedAt: momo2Now,
    expiresAt: null,
    statusCheckedAt: null,
    statusCheckCount: 0,
  });

  // ---- Mobile Money déclaré (3) : rejetée, aucun payment créé ----
  const momo3Id = nextId('momo');
  momoTransactions.set(momo3Id, {
    id: momo3Id,
    organizationId: DEMO_ORG_ID,
    channel: 'DECLARED',
    status: 'REJECTED',
    provider: 'MTN_MOMO',
    aggregator: null,
    merchantReference: nextMomoDeclaredReference(yearMonth),
    providerTransactionId: 'MP240908.1755.D99001',
    aggregatorTransactionId: null,
    payerMsisdn: '+242066000103',
    payeeMsisdn: '+242066123456',
    amount: partiallyPaidInvoice ? computeInvoiceTotals(partiallyPaidInvoice).balanceAmount : 60000,
    feeAmount: 0,
    feeBearer: 'TENANT',
    tenantId: leaseB.primaryTenantId,
    leaseId: leaseB.id,
    invoiceId: partiallyPaidInvoice?.id ?? null,
    paymentId: null,
    proofDocumentId: fakeProofDocument(deps, 'momo-declaration-3.jpg', 'OTHER'),
    declaredByUserId: null,
    verifiedByUserId: null,
    verifiedAt: null,
    rejectionReason: 'Référence opérateur introuvable dans le relevé MTN.',
    failureCode: null,
    failureMessage: null,
    clientRef: 'demo-momo-declared-3',
    notes: null,
    initiatedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    expiresAt: null,
    statusCheckedAt: null,
    statusCheckCount: 0,
  });

  const orgBankAccount = [...deps.bankAccounts.values()].find(
    (a) => a.organizationId === DEMO_ORG_ID && a.holderType === 'ORGANIZATION',
  );
  const beneficiaryAccountId = orgBankAccount?.id ?? 'bank-demo-org';

  // ---- Virement (1) : SUBMITTED depuis plus de 72h -> indicateur d'ancienneté ----
  const transfer1Id = nextId('transfer');
  const transfer1CreatedAt = new Date(Date.now() - 96 * 3600 * 1000).toISOString();
  transferDeclarations.set(transfer1Id, {
    id: transfer1Id,
    organizationId: DEMO_ORG_ID,
    status: 'SUBMITTED',
    tenantId: leaseB.primaryTenantId,
    leaseId: leaseB.id,
    invoiceId: partiallyPaidInvoice?.id ?? null,
    declaredAmount: partiallyPaidInvoice
      ? computeInvoiceTotals(partiallyPaidInvoice).balanceAmount
      : 60000,
    transferDate: transfer1CreatedAt.slice(0, 10),
    transferReference: partiallyPaidInvoice?.invoiceNumber ?? null,
    payerName: 'Grace Ondongo',
    payerBankCode: 'ECOBANK',
    payerBankName: 'Ecobank Congo',
    payerAccountNumber: '04123456789',
    beneficiaryBankAccountId: beneficiaryAccountId,
    proofDocumentId: fakeProofDocument(deps, 'virement-preuve-1.pdf', 'TRANSFER_PROOF'),
    clientRef: 'demo-transfer-1',
    notes: 'Virement annoncé par le locataire, pièce jointe transmise par WhatsApp.',
    paymentId: null,
    submittedByUserId: null,
    reviewedByUserId: null,
    reviewedAt: null,
    rejectionReason: null,
    matchedStatementLineId: null,
    createdAt: transfer1CreatedAt,
  });

  // ---- Virement (2) : APPROVED -> payment CONFIRMED (confirmOnApproval=true) ----
  const transfer2Id = nextId('transfer');
  const transfer2PaymentId = nextId('payment');
  const transfer2Reference = nextPaymentReference(yearMonth);
  const transfer2Now = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  const transfer2Amount = issuedInvoice
    ? computeInvoiceTotals(issuedInvoice).balanceAmount
    : 120000;
  if (issuedInvoice) {
    issuedInvoice.allocations.push({
      id: nextId('allocation'),
      invoiceId: issuedInvoice.id,
      paymentId: transfer2PaymentId,
      paymentReference: transfer2Reference,
      method: 'BANK_TRANSFER',
      amount: transfer2Amount,
      allocationDate: transfer2Now.slice(0, 10),
      isReversal: false,
    });
    recalcInvoiceStatus(issuedInvoice);
    if (issuedInvoice.status === 'PAID') createReceiptForPaidInvoice(issuedInvoice);
  }
  payments.set(transfer2PaymentId, {
    id: transfer2PaymentId,
    organizationId: DEMO_ORG_ID,
    reference: transfer2Reference,
    method: 'BANK_TRANSFER',
    status: 'CONFIRMED',
    direction: 'INBOUND',
    amount: transfer2Amount,
    tenantId: leaseA.primaryTenantId,
    leaseId: leaseA.id,
    paymentDate: transfer2Now.slice(0, 10),
    externalReference: issuedInvoice?.invoiceNumber ?? null,
    feeAmount: 0,
    confirmedAt: transfer2Now,
    rejectedAt: null,
    rejectionReason: null,
    reversedAt: null,
    reversalReason: null,
    reversalOfId: null,
    receivedByUserId: null,
    clientRef: 'demo-transfer-2',
    notes: 'Virement déclaré, validé par la comptabilité (politique confirmOnApproval).',
    createdAt: transfer2Now,
    allocations: issuedInvoice
      ? [
          {
            id: nextId('allocation'),
            invoiceId: issuedInvoice.id,
            invoiceNumber: issuedInvoice.invoiceNumber,
            tenantCreditId: null,
            amount: transfer2Amount,
            isReversal: false,
          },
        ]
      : [],
  });
  transferDeclarations.set(transfer2Id, {
    id: transfer2Id,
    organizationId: DEMO_ORG_ID,
    status: 'APPROVED',
    tenantId: leaseA.primaryTenantId,
    leaseId: leaseA.id,
    invoiceId: issuedInvoice?.id ?? null,
    declaredAmount: transfer2Amount,
    transferDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10),
    transferReference: issuedInvoice?.invoiceNumber ?? null,
    payerName: 'Serge Loubassou',
    payerBankCode: 'BGFI',
    payerBankName: 'BGFIBank Congo',
    payerAccountNumber: '01987654321',
    beneficiaryBankAccountId: beneficiaryAccountId,
    proofDocumentId: fakeProofDocument(deps, 'virement-preuve-2.pdf', 'TRANSFER_PROOF'),
    clientRef: 'demo-transfer-2',
    notes: null,
    paymentId: transfer2PaymentId,
    submittedByUserId: null,
    reviewedByUserId: null,
    reviewedAt: transfer2Now,
    rejectionReason: null,
    matchedStatementLineId: null,
    createdAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
  });

  // ---- Webhooks de démonstration ----
  const w1Id = nextId('webhook');
  webhookEvents.set(w1Id, {
    id: w1Id,
    organizationId: DEMO_ORG_ID,
    source: 'AIRTEL_MONEY',
    eventType: 'payment.succeeded',
    status: 'PROCESSED',
    externalEventId: 'evt-demo-0001',
    signatureValid: true,
    receivedAt: momo2Now,
    processedAt: momo2Now,
    processingAttempts: 1,
    errorMessage: null,
    relatedEntityType: 'mobile_money_transaction',
    relatedEntityId: momo2Id,
    rawPayload: { status: 'SUCCESS', amount: momo2Amount, transactionId: 'MP240905.0912.C11223' },
  });

  const w2Id = nextId('webhook');
  webhookEvents.set(w2Id, {
    id: w2Id,
    organizationId: DEMO_ORG_ID,
    source: 'CINETPAY',
    eventType: 'payment.notify',
    status: 'IGNORED',
    externalEventId: 'evt-demo-0002',
    signatureValid: false,
    receivedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    processedAt: null,
    processingAttempts: 0,
    errorMessage: 'MOMO.WEBHOOK_SIGNATURE_INVALID',
    relatedEntityType: null,
    relatedEntityId: null,
    rawPayload: { cpm_trans_id: 'CTP-DEMO-0002' },
  });
}
