/**
 * Mock MSW — Phase 6 (rapprochement bancaire et chèques), état en mémoire et
 * données de démonstration, conformes à docs/api/phase6-contract.md. Comme
 * payments-handlers.ts, importe directement les Maps/helpers de handlers.ts
 * (bankAccounts, tenants, nextId, serializeTenant) : cycle d'import déjà
 * éprouvé dans ce dépôt pour d'autres domaines (voir le commentaire en tête
 * de handlers.ts sur le cycle avec leases-handlers.ts).
 */
import {
  bankAccounts,
  nextId,
  serializeTenant,
  tenants,
  type MockBankAccount,
  type MockTenant,
} from './handlers';
import { invoices } from './billing-seed';

// ---- Énumérations locales (recopiées du contrat) ----

export type StatementFormatMock = 'CSV' | 'MT940' | 'CAMT053' | 'OFX' | 'XLSX' | 'PDF_OCR';
export type BankStatementStatusMock =
  'UPLOADED' | 'PARSING' | 'PARSED' | 'RECONCILING' | 'RECONCILED' | 'FAILED';
export type StatementLineDirectionMock = 'CREDIT' | 'DEBIT';
export type LineStateMock = 'UNMATCHED' | 'SUGGESTED' | 'PARTIALLY_MATCHED' | 'MATCHED' | 'IGNORED';
export type MatchTypeMock = 'EXACT' | 'SUGGESTED' | 'MANUAL' | 'PARTIAL' | 'SPLIT';
export type MatchStatusMock = 'PROPOSED' | 'CONFIRMED' | 'REJECTED' | 'REVERSED';
export type ReconciliationTargetTypeMock = 'PAYMENT' | 'DECLARATION' | 'CHECK' | 'REMITTANCE';
export type CheckStatusMock =
  'RECEIVED' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED' | 'RETURNED';

// ---- Types Mock (mêmes noms de champs que le contrat + organizationId) ----

export interface MockImportReport {
  statementId: string;
  linesAccepted: number;
  linesIgnored: number;
  linesInError: { lineNumber: number; reason: string }[];
  autoMatched: number;
  suggested: number;
}

export interface MockBankStatement {
  id: string;
  organizationId: string;
  bankAccountId: string;
  format: StatementFormatMock;
  status: BankStatementStatusMock;
  statementReference: string | null;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  documentId: string | null;
  fileChecksumSha256: string | null;
  parsedAt: string | null;
  reconciledAt: string | null;
  parseError: string | null;
  importedAt: string;
  importedByUserId: string | null;
  report: MockImportReport | null;
}

export interface MockStatementLine {
  id: string;
  organizationId: string;
  statementId: string;
  bankAccountId: string;
  lineNumber: number;
  direction: StatementLineDirectionMock;
  operationDate: string;
  valueDate: string | null;
  amount: number;
  label: string;
  normalizedLabel: string | null;
  counterpartyName: string | null;
  bankReference: string | null;
  endToEndReference: string | null;
  isIgnored: boolean;
  ignoreReason: string | null;
  createdAt: string;
}

export interface MockReconciliationMatch {
  id: string;
  organizationId: string;
  statementLineId: string;
  targetType: ReconciliationTargetTypeMock;
  targetId: string;
  matchType: MatchTypeMock;
  status: MatchStatusMock;
  matchedAmount: number;
  confidenceScore: number;
  matchCriteria: Record<string, unknown>;
  matchedByUserId: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalOfId: string | null;
  createdAt: string;
}

export interface MockMatchSuggestion {
  targetType: ReconciliationTargetTypeMock;
  targetId: string;
  label: string;
  amount: number;
  date: string;
  confidenceScore: number;
  criteria: Record<string, unknown>;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
}

export interface MockBankCheck {
  id: string;
  organizationId: string;
  tenantId: string;
  leaseId: string | null;
  invoiceId: string | null;
  checkNumber: string;
  drawerName: string;
  drawerBankCode: string;
  drawerBankName: string;
  drawerAccountNumber: string | null;
  amount: number;
  issueDate: string;
  receivedAt: string;
  imageDocumentId: string | null;
  notes: string | null;
  status: CheckStatusMock;
  paymentId: string | null;
  depositDate: string | null;
  depositBankAccountId: string | null;
  clearingDate: string | null;
  bouncedAt: string | null;
  bounceReason: string | null;
  bounceFeeAmount: number;
  receivedByUserId: string | null;
}

// ---- État en mémoire ----

export const bankStatements = new Map<string, MockBankStatement>();
export const bankStatementLines = new Map<string, MockStatementLine>();
export const reconciliationMatches = new Map<string, MockReconciliationMatch>();
export const bankChecks = new Map<string, MockBankCheck>();
export const lineSuggestions = new Map<string, MockMatchSuggestion[]>();

// ---- Calculs dérivés (aucune colonne de statut stockée, cf. contrat) ----

export function computeAgeDays(dateIso: string): number {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

/** Historique complet (y compris rejetés/annulés) pour l'affichage. */
export function matchesForLine(lineId: string): MockReconciliationMatch[] {
  return [...reconciliationMatches.values()]
    .filter((m) => m.statementLineId === lineId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export function matchedAmountOf(lineId: string): number {
  return matchesForLine(lineId)
    .filter((m) => m.status === 'CONFIRMED')
    .reduce((sum, m) => sum + m.matchedAmount, 0);
}

export function stateOfLine(line: MockStatementLine): LineStateMock {
  if (line.isIgnored) return 'IGNORED';
  const matched = matchedAmountOf(line.id);
  if (matched > 0 && matched >= line.amount) return 'MATCHED';
  if (matched > 0) return 'PARTIALLY_MATCHED';
  if (matchesForLine(line.id).some((m) => m.status === 'PROPOSED')) return 'SUGGESTED';
  return 'UNMATCHED';
}

export function serializeMatch(match: MockReconciliationMatch) {
  const { organizationId: _organizationId, ...rest } = match;
  return rest;
}

export function serializeStatementLine(line: MockStatementLine) {
  const { organizationId: _organizationId, ...rest } = line;
  return {
    ...rest,
    matchedAmount: matchedAmountOf(line.id),
    state: stateOfLine(line),
    matches: matchesForLine(line.id).map(serializeMatch),
    ageDays: computeAgeDays(line.operationDate),
  };
}

export function serializeStatement(statement: MockBankStatement) {
  const { organizationId: _organizationId, ...rest } = statement;
  const lines = [...bankStatementLines.values()].filter((l) => l.statementId === statement.id);
  const linesCount = lines.length;
  const matchedLinesCount = lines.filter((l) => stateOfLine(l) === 'MATCHED').length;
  const totalCreditAmount = lines
    .filter((l) => l.direction === 'CREDIT')
    .reduce((sum, l) => sum + l.amount, 0);
  const totalDebitAmount = lines
    .filter((l) => l.direction === 'DEBIT')
    .reduce((sum, l) => sum + l.amount, 0);
  const isDiscarded = linesCount > 0 && lines.every((l) => l.isIgnored);
  return {
    ...rest,
    linesCount,
    matchedLinesCount,
    totalCreditAmount,
    totalDebitAmount,
    isDiscarded,
  };
}

export function serializeCheck(check: MockBankCheck) {
  const { organizationId: _organizationId, ...rest } = check;
  const referenceDate = check.depositDate ?? check.receivedAt ?? check.issueDate;
  return { ...rest, ageDays: computeAgeDays(referenceDate) };
}

export function checkDetail(check: MockBankCheck) {
  const tenant = tenants.get(check.tenantId);
  const invoice = check.invoiceId ? invoices.get(check.invoiceId) : undefined;
  const matches = [...reconciliationMatches.values()]
    .filter((m) => m.targetType === 'CHECK' && m.targetId === check.id)
    .map(serializeMatch);
  return {
    ...serializeCheck(check),
    tenant: tenant ? { id: tenant.id, displayName: serializeTenant(tenant).displayName } : null,
    invoice: invoice ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber } : null,
    matches,
  };
}

// ---- Données de démonstration ----

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function monthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** Réutilise le compte ORGANIZATION déjà seedé en phase 1 (voir bankAccountDefs
 * de handlers.ts) ; en crée un minimal sinon, pour ne jamais dépendre de
 * l'ordre d'exécution des seeds. */
function resolveOrgBankAccount(organizationId: string): MockBankAccount {
  const existing = [...bankAccounts.values()].find(
    (a) => a.organizationId === organizationId && a.holderType === 'ORGANIZATION',
  );
  if (existing) return existing;
  const now = new Date().toISOString();
  const created: MockBankAccount = {
    id: nextId('bank'),
    organizationId,
    holderType: 'ORGANIZATION',
    label: 'Compte BGFI',
    bankCode: 'BGFI',
    bankName: 'BGFIBank Congo',
    accountHolderName: 'Agence Immodesk Demo',
    isDefault: true,
    currency: 'XAF',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  bankAccounts.set(created.id, created);
  return created;
}

interface LineSeed {
  amount: number;
  daysAgoValue: number;
  label: string;
  counterpartyName: string;
  bankReference: string | null;
}

/**
 * Ajoute les données de démonstration phase 6 : un relevé du mois en cours,
 * déjà en cours de rapprochement (6 lignes auto-rapprochées, 3 suggérées,
 * 3 en file manuelle), plus deux chèques (un déposé, un fraîchement saisi).
 * Appelé une fois par handlers.ts, après tous les autres seeds de démo.
 */
export function seedBankReconciliationDemoData(organizationId: string): void {
  const account = resolveOrgBankAccount(organizationId);
  const demoTenants = [...tenants.values()].filter(
    (t) => t.organizationId === organizationId && !t.deletedAt,
  );
  const tenant1: MockTenant | undefined = demoTenants[0];
  const tenant2: MockTenant | undefined = demoTenants[1];
  const tenant1Name = tenant1 ? serializeTenant(tenant1).displayName : 'Serge Loubassou';
  const tenant2Name = tenant2 ? serializeTenant(tenant2).displayName : 'Grace Ondongo';
  const now = new Date().toISOString();
  const { start: periodStart, end: periodEnd } = monthBounds();
  const yearMonth = periodStart.slice(0, 7).replace('-', '');
  const statementId = nextId('statement');

  const matchedDefs: LineSeed[] = [
    {
      amount: 150000,
      daysAgoValue: 3,
      label: `VIR SEPA LOY-${yearMonth}-00006 ${tenant1Name.toUpperCase()}`,
      counterpartyName: tenant1Name,
      bankReference: `LOY-${yearMonth}-00006`,
    },
    {
      amount: 175000,
      daysAgoValue: 5,
      label: `VIREMENT LOY-${yearMonth}-00007 ${tenant2Name.toUpperCase()}`,
      counterpartyName: tenant2Name,
      bankReference: `LOY-${yearMonth}-00007`,
    },
    {
      amount: 95000,
      daysAgoValue: 7,
      label: `VIR LOY-${yearMonth}-00008 ${tenant1Name.toUpperCase()}`,
      counterpartyName: tenant1Name,
      bankReference: `LOY-${yearMonth}-00008`,
    },
    {
      amount: 210000,
      daysAgoValue: 9,
      label: `VIREMENT LOYER LOY-${yearMonth}-00009 ${tenant2Name.toUpperCase()}`,
      counterpartyName: tenant2Name,
      bankReference: `LOY-${yearMonth}-00009`,
    },
    {
      amount: 130000,
      daysAgoValue: 11,
      label: `VIR SEPA LOY-${yearMonth}-00010 ${tenant1Name.toUpperCase()}`,
      counterpartyName: tenant1Name,
      bankReference: `LOY-${yearMonth}-00010`,
    },
    {
      amount: 185000,
      daysAgoValue: 13,
      label: `VIREMENT LOY-${yearMonth}-00011 ${tenant2Name.toUpperCase()}`,
      counterpartyName: tenant2Name,
      bankReference: `LOY-${yearMonth}-00011`,
    },
  ];

  const suggestedDefs: Array<
    LineSeed & { confidenceScore: number; criteria: Record<string, unknown> }
  > = [
    {
      amount: 142000,
      daysAgoValue: 2,
      label: `VIR RECU MOBILE ${tenant1Name.toUpperCase()}`,
      counterpartyName: tenant1Name,
      bankReference: null,
      confidenceScore: 88,
      criteria: {
        amountScore: 50,
        dateScore: 20,
        nameSimilarityScore: 18,
        declarationPendingScore: 0,
      },
    },
    {
      amount: 168000,
      daysAgoValue: 2,
      label: `VIR RECU ${tenant2Name.toUpperCase()} LOYER`,
      counterpartyName: tenant2Name,
      bankReference: null,
      confidenceScore: 79,
      criteria: {
        amountScore: 35,
        dateScore: 20,
        nameSimilarityScore: 14,
        declarationPendingScore: 10,
      },
    },
    {
      amount: 121000,
      daysAgoValue: 6,
      label: `VIR ${tenant1Name.toUpperCase()} REGLEMENT LOYER`,
      counterpartyName: tenant1Name,
      bankReference: null,
      confidenceScore: 76,
      criteria: {
        amountScore: 50,
        dateScore: 10,
        nameSimilarityScore: 16,
        declarationPendingScore: 0,
      },
    },
  ];

  const unmatchedDefs: LineSeed[] = [
    {
      amount: 67000,
      daysAgoValue: 5,
      label: 'VERSEMENT ESPECES AGENCE',
      counterpartyName: 'Inconnu',
      bankReference: null,
    },
    {
      amount: 205000,
      daysAgoValue: 18,
      label: 'VIR RECU SANS REFERENCE',
      counterpartyName: 'Inconnu',
      bankReference: null,
    },
    {
      amount: 118000,
      daysAgoValue: 40,
      label: 'VIR RECU ANCIEN NON LETTRE',
      counterpartyName: 'Inconnu',
      bankReference: null,
    },
  ];

  let lineNumber = 0;
  let autoMatched = 0;
  let suggestedCount = 0;

  for (const def of matchedDefs) {
    lineNumber += 1;
    const line: MockStatementLine = {
      id: nextId('stline'),
      organizationId,
      statementId,
      bankAccountId: account.id,
      lineNumber,
      direction: 'CREDIT',
      operationDate: daysAgo(def.daysAgoValue).toISOString().slice(0, 10),
      valueDate: null,
      amount: def.amount,
      label: def.label,
      normalizedLabel: def.label.toUpperCase(),
      counterpartyName: def.counterpartyName,
      bankReference: def.bankReference,
      endToEndReference: null,
      isIgnored: false,
      ignoreReason: null,
      createdAt: now,
    };
    bankStatementLines.set(line.id, line);
    const match: MockReconciliationMatch = {
      id: nextId('match'),
      organizationId,
      statementLineId: line.id,
      targetType: 'PAYMENT',
      targetId: nextId('payment'),
      matchType: 'EXACT',
      status: 'CONFIRMED',
      matchedAmount: def.amount,
      confidenceScore: 100,
      matchCriteria: { amountMatch: 'EXACT', referenceFound: true, dateWindowDays: 0 },
      matchedByUserId: null,
      confirmedAt: now,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalOfId: null,
      createdAt: now,
    };
    reconciliationMatches.set(match.id, match);
    autoMatched += 1;
  }

  for (const def of suggestedDefs) {
    lineNumber += 1;
    const line: MockStatementLine = {
      id: nextId('stline'),
      organizationId,
      statementId,
      bankAccountId: account.id,
      lineNumber,
      direction: 'CREDIT',
      operationDate: daysAgo(def.daysAgoValue).toISOString().slice(0, 10),
      valueDate: null,
      amount: def.amount,
      label: def.label,
      normalizedLabel: def.label.toUpperCase(),
      counterpartyName: def.counterpartyName,
      bankReference: null,
      endToEndReference: null,
      isIgnored: false,
      ignoreReason: null,
      createdAt: now,
    };
    bankStatementLines.set(line.id, line);
    const targetId = nextId('payment');
    const match: MockReconciliationMatch = {
      id: nextId('match'),
      organizationId,
      statementLineId: line.id,
      targetType: 'PAYMENT',
      targetId,
      matchType: 'SUGGESTED',
      status: 'PROPOSED',
      matchedAmount: def.amount,
      confidenceScore: def.confidenceScore,
      matchCriteria: def.criteria,
      matchedByUserId: null,
      confirmedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalOfId: null,
      createdAt: now,
    };
    reconciliationMatches.set(match.id, match);
    const tenantRef =
      def.counterpartyName === tenant1Name && tenant1
        ? { id: tenant1.id, displayName: tenant1Name }
        : def.counterpartyName === tenant2Name && tenant2
          ? { id: tenant2.id, displayName: tenant2Name }
          : null;
    const suggestion: MockMatchSuggestion = {
      targetType: 'PAYMENT',
      targetId,
      label: `Loyer ${def.counterpartyName}`,
      amount: def.amount,
      date: line.operationDate,
      confidenceScore: def.confidenceScore,
      criteria: def.criteria,
      tenant: tenantRef,
      invoice: { id: nextId('invoice'), invoiceNumber: `LOY-${yearMonth}-00099` },
    };
    lineSuggestions.set(line.id, [suggestion]);
    suggestedCount += 1;
  }

  for (const def of unmatchedDefs) {
    lineNumber += 1;
    const line: MockStatementLine = {
      id: nextId('stline'),
      organizationId,
      statementId,
      bankAccountId: account.id,
      lineNumber,
      direction: 'CREDIT',
      operationDate: daysAgo(def.daysAgoValue).toISOString().slice(0, 10),
      valueDate: null,
      amount: def.amount,
      label: def.label,
      normalizedLabel: def.label.toUpperCase(),
      counterpartyName: def.counterpartyName,
      bankReference: null,
      endToEndReference: null,
      isIgnored: false,
      ignoreReason: null,
      createdAt: now,
    };
    bankStatementLines.set(line.id, line);
  }

  const totalCredit = [...matchedDefs, ...suggestedDefs, ...unmatchedDefs].reduce(
    (sum, d) => sum + d.amount,
    0,
  );
  const openingBalance = 500000;

  const statement: MockBankStatement = {
    id: statementId,
    organizationId,
    bankAccountId: account.id,
    format: 'CSV',
    status: 'RECONCILING',
    statementReference: `RELEVE-${yearMonth}-001.csv`,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance: openingBalance + totalCredit,
    documentId: null,
    fileChecksumSha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    parsedAt: now,
    reconciledAt: null,
    parseError: null,
    importedAt: now,
    importedByUserId: null,
    report: {
      statementId,
      linesAccepted: 12,
      linesIgnored: 0,
      linesInError: [],
      autoMatched,
      suggested: suggestedCount,
    },
  };
  bankStatements.set(statement.id, statement);

  // ---- Chèques ----
  const check1: MockBankCheck = {
    id: nextId('check'),
    organizationId,
    tenantId: tenant1?.id ?? nextId('tenant'),
    leaseId: null,
    invoiceId: null,
    checkNumber: '000123',
    drawerName: tenant1Name,
    drawerBankCode: 'BGFI',
    drawerBankName: 'BGFIBank Congo',
    drawerAccountNumber: null,
    amount: 175000,
    issueDate: daysAgo(25).toISOString().slice(0, 10),
    receivedAt: daysAgo(23).toISOString(),
    imageDocumentId: null,
    notes: null,
    status: 'DEPOSITED',
    paymentId: nextId('payment'),
    depositDate: daysAgo(20).toISOString().slice(0, 10),
    depositBankAccountId: account.id,
    clearingDate: null,
    bouncedAt: null,
    bounceReason: null,
    bounceFeeAmount: 0,
    receivedByUserId: null,
  };
  bankChecks.set(check1.id, check1);

  const check2: MockBankCheck = {
    id: nextId('check'),
    organizationId,
    tenantId: tenant2?.id ?? nextId('tenant'),
    leaseId: null,
    invoiceId: null,
    checkNumber: '000124',
    drawerName: tenant2Name,
    drawerBankCode: 'LCB',
    drawerBankName: 'LCB Bank',
    drawerAccountNumber: null,
    amount: 95000,
    issueDate: daysAgo(1).toISOString().slice(0, 10),
    receivedAt: now,
    imageDocumentId: null,
    notes: null,
    status: 'RECEIVED',
    paymentId: nextId('payment'),
    depositDate: null,
    depositBankAccountId: null,
    clearingDate: null,
    bouncedAt: null,
    bounceReason: null,
    bounceFeeAmount: 0,
    receivedByUserId: null,
  };
  bankChecks.set(check2.id, check2);
}
