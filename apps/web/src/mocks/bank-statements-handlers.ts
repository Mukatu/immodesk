import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 6 (import de relevés bancaires), routes conformes à
 * docs/api/phase6-contract.md. Même principe que payments-handlers.ts : Maps
 * importées depuis bank-reconciliation-seed.ts, API_BASE depuis son propre
 * module.
 */
import { API_BASE } from './api-base';
import {
  bankAccounts,
  conflict,
  documents,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  unauthorizedOrg,
} from './handlers';
import {
  bankStatementLines,
  bankStatements,
  lineSuggestions,
  reconciliationMatches,
  serializeStatement,
  serializeStatementLine,
  stateOfLine,
  type MockBankStatement,
  type MockReconciliationMatch,
  type MockStatementLine,
} from './bank-reconciliation-seed';

export { seedBankReconciliationDemoData } from './bank-reconciliation-seed';

const ADAPTERS = [
  { code: 'BGFI', label: 'BGFIBank Congo', format: 'CSV' as const, sampleAvailable: true },
  { code: 'LCB', label: 'LCB Bank', format: 'CSV' as const, sampleAvailable: true },
  { code: 'ECOBANK', label: 'Ecobank Congo', format: 'CSV' as const, sampleAvailable: true },
  { code: 'UBA', label: 'UBA Congo', format: 'CSV' as const, sampleAvailable: true },
  {
    code: 'MT940',
    label: 'Format bancaire MT940',
    format: 'MT940' as const,
    sampleAvailable: true,
  },
];

function monthBoundsFromNow(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Simule un import réussi : même répartition que le seed initial (6 lignes
 * auto-rapprochées EXACT/CONFIRMED, 3 suggérées PROPOSED avec des scores
 * différents, 3 non rapprochées dont une de plus de 30 jours).
 */
function buildImportedLines(
  organizationId: string,
  statementId: string,
  bankAccountId: string,
): { autoMatched: number; suggested: number } {
  const now = new Date().toISOString();
  const amounts = [
    140000, 165000, 88000, 200000, 112000, 175000, 96000, 152000, 71000, 63000, 190000, 108000,
  ];
  const suggestionScores = [88, 79, 76];
  let autoMatched = 0;
  let suggested = 0;

  for (let i = 0; i < amounts.length; i += 1) {
    const lineNumber = i + 1;
    const bucket: 'MATCHED' | 'SUGGESTED' | 'UNMATCHED' =
      i < 6 ? 'MATCHED' : i < 9 ? 'SUGGESTED' : 'UNMATCHED';
    const daysAgoValue = bucket === 'UNMATCHED' && i === amounts.length - 1 ? 35 : 2 + i;
    const opDate = new Date();
    opDate.setDate(opDate.getDate() - daysAgoValue);

    const line: MockStatementLine = {
      id: nextId('stline'),
      organizationId,
      statementId,
      bankAccountId,
      lineNumber,
      direction: 'CREDIT',
      operationDate: opDate.toISOString().slice(0, 10),
      valueDate: null,
      amount: amounts[i] ?? 100000,
      label: `VIREMENT IMPORT LIGNE ${lineNumber}`,
      normalizedLabel: `VIREMENT IMPORT LIGNE ${lineNumber}`,
      counterpartyName: null,
      bankReference: null,
      endToEndReference: null,
      isIgnored: false,
      ignoreReason: null,
      createdAt: now,
    };
    bankStatementLines.set(line.id, line);

    if (bucket === 'MATCHED') {
      const match: MockReconciliationMatch = {
        id: nextId('match'),
        organizationId,
        statementLineId: line.id,
        targetType: 'PAYMENT',
        targetId: nextId('payment'),
        matchType: 'EXACT',
        status: 'CONFIRMED',
        matchedAmount: line.amount,
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
    } else if (bucket === 'SUGGESTED') {
      const score = suggestionScores[i - 6] ?? 75;
      const targetId = nextId('payment');
      const criteria = { amountScore: 50, dateScore: 20, nameSimilarityScore: score - 70 };
      const match: MockReconciliationMatch = {
        id: nextId('match'),
        organizationId,
        statementLineId: line.id,
        targetType: 'PAYMENT',
        targetId,
        matchType: 'SUGGESTED',
        status: 'PROPOSED',
        matchedAmount: line.amount,
        confidenceScore: score,
        matchCriteria: criteria,
        matchedByUserId: null,
        confirmedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        reversedAt: null,
        reversalOfId: null,
        createdAt: now,
      };
      reconciliationMatches.set(match.id, match);
      lineSuggestions.set(line.id, [
        {
          targetType: 'PAYMENT',
          targetId,
          label: `Loyer ligne ${lineNumber}`,
          amount: line.amount,
          date: line.operationDate,
          confidenceScore: score,
          criteria,
          tenant: null,
          invoice: null,
        },
      ]);
      suggested += 1;
    }
  }
  return { autoMatched, suggested };
}

export const bankStatementsHandlers = [
  http.post(`${API_BASE}/bank-accounts/:id/statements/import`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const bankAccountId = String(params.id);
    const account = bankAccounts.get(bankAccountId);
    if (!account || account.organizationId !== organizationId) {
      return notFound('BANK.ACCOUNT_NOT_FOUND', 'Compte bancaire introuvable.');
    }
    const body = (await request.json()) as { documentId?: string; format?: string };
    const document = body.documentId ? documents.get(body.documentId) : undefined;
    if (!document) {
      return notFound('DOCUMENTS.NOT_FOUND', 'Document introuvable.');
    }
    const format = body.format;
    const fileName = document.fileName;

    const duplicate = [...bankStatements.values()].some(
      (s) => s.bankAccountId === bankAccountId && s.statementReference === fileName,
    );
    if (duplicate) {
      return conflict(
        'BANK.STATEMENT_ALREADY_IMPORTED',
        'Ce relevé a déjà été importé pour ce compte.',
      );
    }

    const statementId = nextId('statement');
    const { autoMatched, suggested } = buildImportedLines(
      organizationId,
      statementId,
      bankAccountId,
    );
    const { start, end } = monthBoundsFromNow();
    const now = new Date().toISOString();
    const statement: MockBankStatement = {
      id: statementId,
      organizationId,
      bankAccountId,
      format: typeof format === 'string' ? (format as MockBankStatement['format']) : 'CSV',
      status: 'RECONCILING',
      statementReference: fileName,
      periodStart: start,
      periodEnd: end,
      openingBalance: 0,
      closingBalance: 0,
      documentId: document.id,
      fileChecksumSha256: null,
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
        suggested,
      },
    };
    bankStatements.set(statementId, statement);
    return HttpResponse.json(statement.report, { status: 201 });
  }),

  http.get(`${API_BASE}/bank-accounts/:id/statements`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const bankAccountId = String(params.id);
    const items = [...bankStatements.values()]
      .filter((s) => s.organizationId === organizationId && s.bankAccountId === bankAccountId)
      .sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1))
      .map(serializeStatement);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/bank-statements/:id`, ({ params }) => {
    const statement = bankStatements.get(String(params.id));
    if (!statement) return notFound('BANK.STATEMENT_NOT_FOUND', 'Relevé introuvable.');
    return HttpResponse.json(serializeStatement(statement));
  }),

  http.post(`${API_BASE}/bank-statements/:id/discard`, ({ params }) => {
    const statement = bankStatements.get(String(params.id));
    if (!statement) return notFound('BANK.STATEMENT_NOT_FOUND', 'Relevé introuvable.');
    const lines = [...bankStatementLines.values()].filter((l) => l.statementId === statement.id);
    const hasConfirmed = lines.some((l) => stateOfLine(l) === 'MATCHED');
    if (hasConfirmed) {
      return conflict(
        'BANK.STATEMENT_HAS_MATCHES',
        'Ce relevé a des lignes déjà rapprochées, il ne peut pas être abandonné.',
      );
    }
    lines.forEach((l) => {
      l.isIgnored = true;
      l.ignoreReason = l.ignoreReason ?? 'Import abandonné.';
    });
    return HttpResponse.json(serializeStatement(statement));
  }),

  http.post(`${API_BASE}/bank-statements/:id/reconcile`, ({ params }) => {
    const statement = bankStatements.get(String(params.id));
    if (!statement) return notFound('BANK.STATEMENT_NOT_FOUND', 'Relevé introuvable.');
    const lines = [...bankStatementLines.values()].filter((l) => l.statementId === statement.id);
    const unmatched = lines.filter((l) => stateOfLine(l) === 'UNMATCHED').length;
    return HttpResponse.json({ matched: 0, suggested: 0, unmatched }, { status: 202 });
  }),

  http.get(`${API_BASE}/bank-statements/:id/lines`, ({ params, request }) => {
    const statement = bankStatements.get(String(params.id));
    if (!statement) return notFound('BANK.STATEMENT_NOT_FOUND', 'Relevé introuvable.');
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    const items = [...bankStatementLines.values()]
      .filter((l) => l.statementId === statement.id)
      .filter((l) => !state || stateOfLine(l) === state)
      .sort((a, b) => a.lineNumber - b.lineNumber)
      .map(serializeStatementLine);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/bank-statement-adapters`, () => HttpResponse.json({ items: ADAPTERS })),
];
