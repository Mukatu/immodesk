import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 7 (gestion d'agence), routes conformes à docs/api/phase7-contract.md.
 * Suit le principe de billing-handlers.ts : API_BASE depuis son propre module, helpers
 * et Maps de tiers/patrimoine importés de handlers.ts (lus seulement au moment des requêtes).
 */
import { API_BASE } from './api-base';
import {
  bankAccounts,
  conflict,
  landlordSummaryFor,
  landlords,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  properties,
  unauthorizedOrg,
} from './handlers';
import { invoices } from './billing-seed';
import { payments } from './payments-seed';
import {
  landlordInvitationTokens,
  mandates,
  nextExpenseReference,
  nextMandateReference,
  nextPayoutReference,
  nextStatementNumber,
  expenses,
  commissions,
  ownerStatements,
  payouts,
  type MockCommission,
  type MockExpense,
  type MockMandate,
  type MockOwnerStatement,
  type MockOwnerStatementLine,
  type MockPayout,
} from './agency-seed';

function landlordRef(landlordId: string) {
  const landlord = landlords.get(landlordId);
  if (!landlord) return { id: landlordId, displayName: 'Bailleur inconnu', isDiaspora: false };
  const summary = landlordSummaryFor(landlord);
  return {
    id: summary.id,
    displayName: summary.displayName,
    isDiaspora: landlord.countryCode !== 'CG',
  };
}

function propertyRef(propertyId: string | null) {
  if (!propertyId) return null;
  const property = properties.get(propertyId);
  return { id: propertyId, name: property?.name ?? '—' };
}

function mandateSummary(mandate: MockMandate) {
  return {
    id: mandate.id,
    reference: mandate.reference,
    status: mandate.status,
    landlord: landlordRef(mandate.landlordId),
    propertiesCount: mandate.propertyIds.length,
    commissionRateBps: mandate.commissionRateBps,
    startDate: mandate.startDate,
    endDate: mandate.endDate,
  };
}

function mandateDetail(mandate: MockMandate) {
  const landlord = landlords.get(mandate.landlordId);
  return {
    ...mandate,
    currency: 'XAF' as const,
    landlord: landlord
      ? landlordSummaryFor(landlord)
      : {
          id: mandate.landlordId,
          displayName: 'Bailleur inconnu',
          primaryPhone: '',
          isSelf: false,
        },
    properties: mandate.propertyIds
      .map((id) => properties.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: p.id,
        code: p.code ?? null,
        name: p.name,
        propertyType: p.propertyType,
        district: p.district,
        city: p.city,
        landlord: landlordRef(p.landlordId),
        occupancy: { unitsCount: 0, occupiedCount: 0, occupancyRateBps: 0 },
        coverDocumentId: p.coverDocumentId ?? null,
      })),
    statements: [...ownerStatements.values()]
      .filter((s) => s.mandateId === mandate.id)
      .map(statementSummary),
    landlordPortal: {
      invited: Boolean(mandate.invitedAt),
      invitedAt: mandate.invitedAt,
      activated: Boolean(landlord?.userId),
      userId: landlord?.userId ?? null,
    },
  };
}

export const mandateHandlers = [
  http.post(`${API_BASE}/management-mandates`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      landlordId: string;
      propertyIds: string[];
      scope?: MockMandate['scope'];
      startDate: string;
      endDate?: string;
      noticeDays?: number;
      autoRenew?: boolean;
      commissionBasis?: MockMandate['commissionBasis'];
      commissionRateBps?: number;
      commissionFlatAmount?: number;
      lettingFeeRateBps?: number;
      vatRateBps?: number;
      payoutDay?: number;
      payoutBankAccountId?: string;
      notes?: string;
    };
    const alreadyMandated = [...mandates.values()].find(
      (m) =>
        m.organizationId === organizationId &&
        m.status === 'ACTIVE' &&
        m.propertyIds.some((id) => body.propertyIds.includes(id)),
    );
    if (alreadyMandated) {
      return conflict('AGENCY.PROPERTY_ALREADY_MANDATED', 'Bien déjà sous mandat actif.', {
        mandateId: alreadyMandated.id,
      });
    }
    const now = new Date().toISOString();
    const mandate: MockMandate = {
      id: nextId('mandate'),
      organizationId,
      reference: nextMandateReference(now.slice(0, 4)),
      landlordId: body.landlordId,
      propertyIds: body.propertyIds,
      scope: body.scope ?? 'FULL_MANAGEMENT',
      status: 'DRAFT',
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      noticeDays: body.noticeDays ?? 90,
      autoRenew: body.autoRenew ?? true,
      commissionBasis: body.commissionBasis ?? 'RATE_BPS_ON_RENT_COLLECTED',
      commissionRateBps: body.commissionRateBps ?? 1000,
      commissionFlatAmount: body.commissionFlatAmount ?? null,
      lettingFeeRateBps: body.lettingFeeRateBps ?? null,
      vatRateBps: body.vatRateBps ?? 1800,
      payoutDay: body.payoutDay ?? 10,
      payoutBankAccountId: body.payoutBankAccountId ?? null,
      notes: body.notes ?? null,
      signedAt: null,
      terminatedAt: null,
      terminationReason: null,
      invitedAt: null,
      invitationToken: null,
      createdAt: now,
    };
    mandates.set(mandate.id, mandate);
    return HttpResponse.json({ ...mandate, currency: 'XAF' }, { status: 201 });
  }),

  http.get(`${API_BASE}/management-mandates`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const landlordId = url.searchParams.get('landlordId');
    const propertyId = url.searchParams.get('propertyId');
    const items = [...mandates.values()]
      .filter((m) => m.organizationId === organizationId)
      .filter((m) => !status || m.status === status)
      .filter((m) => !landlordId || m.landlordId === landlordId)
      .filter((m) => !propertyId || m.propertyIds.includes(propertyId))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(mandateSummary);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/management-mandates/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const mandate = mandates.get(String(params.id));
    if (!mandate || mandate.organizationId !== organizationId) {
      return notFound('AGENCY.MANDATE_NOT_FOUND');
    }
    return HttpResponse.json(mandateDetail(mandate));
  }),

  http.patch(`${API_BASE}/management-mandates/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const mandate = mandates.get(String(params.id));
    if (!mandate || mandate.organizationId !== organizationId) {
      return notFound('AGENCY.MANDATE_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockMandate>;
    Object.assign(mandate, body);
    return HttpResponse.json({ ...mandate, currency: 'XAF' });
  }),

  http.post(`${API_BASE}/management-mandates/:id/activate`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const mandate = mandates.get(String(params.id));
    if (!mandate || mandate.organizationId !== organizationId) {
      return notFound('AGENCY.MANDATE_NOT_FOUND');
    }
    const conflicting = [...mandates.values()].find(
      (m) =>
        m.id !== mandate.id &&
        m.organizationId === organizationId &&
        m.status === 'ACTIVE' &&
        m.propertyIds.some((id) => mandate.propertyIds.includes(id)),
    );
    if (conflicting) {
      return conflict('AGENCY.PROPERTY_ALREADY_MANDATED', 'Bien déjà sous mandat actif.', {
        mandateId: conflicting.id,
      });
    }
    mandate.status = 'ACTIVE';
    mandate.signedAt = mandate.signedAt ?? new Date().toISOString();
    return HttpResponse.json({ ...mandate, currency: 'XAF' });
  }),

  http.post(`${API_BASE}/management-mandates/:id/suspend`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const mandate = mandates.get(String(params.id));
    if (!mandate || mandate.organizationId !== organizationId) {
      return notFound('AGENCY.MANDATE_NOT_FOUND');
    }
    const body = (await request.json()) as { reason: string };
    mandate.status = 'SUSPENDED';
    mandate.notes = `${mandate.notes ? `${mandate.notes}\n` : ''}Suspension : ${body.reason}`;
    return HttpResponse.json({ ...mandate, currency: 'XAF' });
  }),

  http.post(`${API_BASE}/management-mandates/:id/terminate`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const mandate = mandates.get(String(params.id));
    if (!mandate || mandate.organizationId !== organizationId) {
      return notFound('AGENCY.MANDATE_NOT_FOUND');
    }
    const body = (await request.json()) as { effectiveDate: string; reason: string };
    mandate.status = 'TERMINATED';
    mandate.terminatedAt = body.effectiveDate;
    mandate.terminationReason = body.reason;
    return HttpResponse.json({ ...mandate, currency: 'XAF' });
  }),

  http.post(`${API_BASE}/management-mandates/:id/properties`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const mandate = mandates.get(String(params.id));
    if (!mandate || mandate.organizationId !== organizationId) {
      return notFound('AGENCY.MANDATE_NOT_FOUND');
    }
    const body = (await request.json()) as { propertyIds: string[] };
    const conflicting = [...mandates.values()].find(
      (m) =>
        m.id !== mandate.id &&
        m.organizationId === organizationId &&
        m.status === 'ACTIVE' &&
        m.propertyIds.some((id) => body.propertyIds.includes(id)),
    );
    if (conflicting) {
      return conflict('AGENCY.PROPERTY_ALREADY_MANDATED', 'Bien déjà sous mandat actif.', {
        mandateId: conflicting.id,
      });
    }
    mandate.propertyIds = [...new Set([...mandate.propertyIds, ...body.propertyIds])];
    return HttpResponse.json(mandateDetail(mandate));
  }),

  http.post(`${API_BASE}/management-mandates/:id/landlord-invitation`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const mandate = mandates.get(String(params.id));
    if (!mandate || mandate.organizationId !== organizationId) {
      return notFound('AGENCY.MANDATE_NOT_FOUND');
    }
    // Simplification du mock : le jeton d'activation est l'identifiant du mandat lui-même
    // (jamais exposé par cette route, conforme au contrat : { notificationId, invitationStatus }
    // seulement — le lien part directement au bailleur par WhatsApp, jamais à l'écran agence).
    const token = mandate.id;
    mandate.invitationToken = token;
    mandate.invitedAt = new Date().toISOString();
    landlordInvitationTokens.set(token, {
      mandateId: mandate.id,
      organizationId,
      landlordId: mandate.landlordId,
    });
    return HttpResponse.json(
      { notificationId: nextId('notification'), invitationStatus: 'INVITED' },
      { status: 202 },
    );
  }),
];

function expenseView(expense: MockExpense) {
  return {
    ...expense,
    currency: 'XAF' as const,
    property: expense.propertyId ? propertyRef(expense.propertyId) : null,
    landlord: expense.landlordId ? landlordRef(expense.landlordId) : null,
  };
}

export const expenseHandlers = [
  http.post(`${API_BASE}/expenses`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      propertyId?: string;
      unitId?: string;
      leaseId?: string;
      landlordId?: string;
      category: MockExpense['category'];
      label: string;
      description?: string;
      supplierName?: string;
      supplierPhone?: string;
      supplierNiu?: string;
      amount: number;
      vatRateBps?: number;
      expenseDate: string;
      borneBy?: MockExpense['borneBy'];
      isRebillable?: boolean;
      isDeductibleFromRent?: boolean;
      invoiceDocumentId?: string;
      clientRef?: string;
      notes?: string;
      submit?: boolean;
    };
    const now = new Date().toISOString();
    const vatRateBps = body.vatRateBps ?? 0;
    const vatAmount = Math.round((body.amount * vatRateBps) / 10000);
    const expense: MockExpense = {
      id: nextId('expense'),
      organizationId,
      reference: nextExpenseReference(now.slice(0, 7)),
      propertyId: body.propertyId ?? null,
      unitId: body.unitId ?? null,
      leaseId: body.leaseId ?? null,
      landlordId:
        body.landlordId ??
        (body.propertyId ? (properties.get(body.propertyId)?.landlordId ?? null) : null),
      category: body.category,
      label: body.label,
      description: body.description ?? null,
      supplierName: body.supplierName ?? null,
      supplierPhone: body.supplierPhone ?? null,
      supplierNiu: body.supplierNiu ?? null,
      amount: body.amount,
      vatRateBps,
      vatAmount,
      totalAmount: body.amount + vatAmount,
      expenseDate: body.expenseDate,
      borneBy: body.borneBy ?? 'LANDLORD',
      isRebillable: body.isRebillable ?? false,
      isDeductibleFromRent: body.isDeductibleFromRent ?? true,
      invoiceDocumentId: body.invoiceDocumentId ?? null,
      clientRef: body.clientRef ?? null,
      notes: body.notes ?? null,
      status: body.submit ? 'SUBMITTED' : 'DRAFT',
      ownerStatementId: null,
      approvedByUserId: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: now,
    };
    expenses.set(expense.id, expense);
    return HttpResponse.json(expenseView(expense), { status: 201 });
  }),

  http.get(`${API_BASE}/expenses`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const propertyId = url.searchParams.get('propertyId');
    const landlordId = url.searchParams.get('landlordId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...expenses.values()]
      .filter((e) => e.organizationId === organizationId)
      .filter((e) => !status || e.status === status)
      .filter((e) => !propertyId || e.propertyId === propertyId)
      .filter((e) => !landlordId || e.landlordId === landlordId)
      .filter((e) => !from || e.expenseDate >= from)
      .filter((e) => !to || e.expenseDate <= to)
      .sort((a, b) => (a.expenseDate < b.expenseDate ? 1 : -1))
      .map(expenseView);
    return HttpResponse.json(paginate(items));
  }),

  http.patch(`${API_BASE}/expenses/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const expense = expenses.get(String(params.id));
    if (!expense || expense.organizationId !== organizationId) {
      return notFound('AGENCY.EXPENSE_NOT_FOUND');
    }
    if (expense.ownerStatementId) {
      return conflict('AGENCY.EXPENSE_LOCKED', 'Dépense déjà rattachée à un relevé émis.');
    }
    const body = (await request.json()) as Partial<MockExpense>;
    Object.assign(expense, body);
    return HttpResponse.json(expenseView(expense));
  }),

  http.post(`${API_BASE}/expenses/:id/submit`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const expense = expenses.get(String(params.id));
    if (!expense || expense.organizationId !== organizationId) {
      return notFound('AGENCY.EXPENSE_NOT_FOUND');
    }
    expense.status = 'SUBMITTED';
    return HttpResponse.json(expenseView(expense));
  }),

  http.post(`${API_BASE}/expenses/:id/approve`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const expense = expenses.get(String(params.id));
    if (!expense || expense.organizationId !== organizationId) {
      return notFound('AGENCY.EXPENSE_NOT_FOUND');
    }
    expense.status = 'APPROVED';
    expense.approvedByUserId = 'mock-accountant';
    expense.approvedAt = new Date().toISOString();
    return HttpResponse.json(expenseView(expense));
  }),

  http.post(`${API_BASE}/expenses/:id/reject`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const expense = expenses.get(String(params.id));
    if (!expense || expense.organizationId !== organizationId) {
      return notFound('AGENCY.EXPENSE_NOT_FOUND');
    }
    const body = (await request.json()) as { reason: string };
    expense.status = 'REJECTED';
    expense.rejectionReason = body.reason;
    return HttpResponse.json(expenseView(expense));
  }),
];

function commissionView(commission: MockCommission) {
  return { ...commission, landlord: landlordRef(commission.landlordId) };
}

export const commissionHandlers = [
  http.get(`${API_BASE}/commissions`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const mandateId = url.searchParams.get('mandateId');
    const landlordId = url.searchParams.get('landlordId');
    const period = url.searchParams.get('period');
    const status = url.searchParams.get('status');
    const filtered = [...commissions.values()]
      .filter((c) => c.organizationId === organizationId)
      .filter((c) => !mandateId || c.mandateId === mandateId)
      .filter((c) => !landlordId || c.landlordId === landlordId)
      .filter((c) => !period || c.periodStart.slice(0, 7) === period)
      .filter((c) => !status || c.status === status)
      .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));
    const totals = filtered.reduce(
      (acc, c) => ({
        count: acc.count + 1,
        baseAmount: acc.baseAmount + c.baseAmount,
        amount: acc.amount + c.amount,
        vatAmount: acc.vatAmount + c.vatAmount,
        totalAmount: acc.totalAmount + c.totalAmount,
      }),
      { count: 0, baseAmount: 0, amount: 0, vatAmount: 0, totalAmount: 0 },
    );
    const page = paginate(filtered.map(commissionView));
    return HttpResponse.json({ ...page, totals });
  }),
];

function statementSummary(statement: MockOwnerStatement) {
  return {
    id: statement.id,
    statementNumber: statement.statementNumber,
    status: statement.status,
    landlord: landlordRef(statement.landlordId),
    property: propertyRef(statement.propertyId),
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    rentCollectedAmount: statement.rentCollectedAmount,
    commissionAmount: statement.commissionAmount,
    expensesAmount: statement.expensesAmount,
    carryForwardAmount: statement.carryForwardAmount,
    netPayableAmount: statement.netPayableAmount,
    issuedAt: statement.issuedAt,
    sentAt: statement.sentAt,
    settledAt: statement.settledAt,
  };
}

function payoutView(payout: MockPayout) {
  return { ...payout, landlord: landlordRef(payout.landlordId) };
}

function statementDetail(statement: MockOwnerStatement) {
  const payout = [...payouts.values()].find(
    (p) => p.statementId === statement.id && p.status !== 'CANCELLED',
  );
  return {
    ...statementSummary(statement),
    mandateId: statement.mandateId,
    chargesCollectedAmount: statement.chargesCollectedAmount,
    commissionVatAmount: statement.commissionVatAmount,
    depositsHeldAmount: statement.depositsHeldAmount,
    occupancyRateBps: statement.occupancyRateBps,
    collectionRateBps: statement.collectionRateBps,
    documentId: statement.documentId,
    lines: statement.lines,
    payout: payout ? payoutView(payout) : null,
  };
}

interface StatementRun {
  runId: string;
  status: 'RUNNING' | 'DONE' | 'FAILED';
  created: number;
  skipped: number;
  errors: { landlordId?: string; propertyId?: string; reason: string }[];
}

const statementRuns = new Map<string, StatementRun>();

function periodBounds(periodStart: string): { start: string; end: string } {
  const [y, m] = periodStart.slice(0, 7).split('-').map(Number);
  const start = `${periodStart.slice(0, 7)}-01`;
  const end = new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
  return { start, end };
}

/**
 * Campagne mensuelle (arbitrages n°1, 3, 4, 5 du contrat) : un relevé par
 * (bailleur, bien-ou-null, période), commission sur l'encaissé, TVA en ligne
 * distincte, report du solde négatif. Simplification du mock : pas de
 * distinction loyer/charges dans un paiement, pas de taux d'occupation calculé.
 */
function runCampaignForOrg(organizationId: string, periodStart: string, run: StatementRun): void {
  const { start, end } = periodBounds(periodStart);
  const yearMonth = start.slice(0, 7);

  const orgMandates = [...mandates.values()].filter(
    (m) =>
      m.organizationId === organizationId &&
      (m.status === 'ACTIVE' ||
        (m.status === 'TERMINATED' &&
          Boolean(m.terminatedAt) &&
          m.terminatedAt! >= start &&
          m.terminatedAt! <= end)),
  );

  for (const mandate of orgMandates) {
    const propertyId = mandate.propertyIds.length === 1 ? mandate.propertyIds[0]! : null;
    const alreadyGenerated = [...ownerStatements.values()].some(
      (s) =>
        s.organizationId === organizationId &&
        s.landlordId === mandate.landlordId &&
        s.propertyId === propertyId &&
        s.periodStart === start &&
        s.status !== 'CANCELLED',
    );
    if (alreadyGenerated) {
      run.skipped += 1;
      run.errors.push({
        landlordId: mandate.landlordId,
        propertyId: propertyId ?? undefined,
        reason:
          'Relevé déjà généré pour cette période (AGENCY.STATEMENT_PERIOD_ALREADY_GENERATED).',
      });
      continue;
    }

    // Un paiement de caisse n'est jamais rattaché à un bail directement (`payment.leaseId`
    // reste null pour les encaissements au comptoir : l'imputation passe par les allocations
    // vers des factures). On retrouve donc le bien via `invoice.propertyId` de chaque
    // allocation non-reversal d'un paiement CONFIRMED de la période.
    const periodPayments = [...payments.values()].filter(
      (p) =>
        p.organizationId === organizationId &&
        p.status === 'CONFIRMED' &&
        p.paymentDate >= start &&
        p.paymentDate <= end,
    );
    const matchedAllocations = periodPayments.flatMap((payment) =>
      payment.allocations
        .filter((allocation) => !allocation.isReversal && allocation.invoiceId)
        .map((allocation) => ({
          payment,
          allocation,
          invoice: invoices.get(allocation.invoiceId!),
        }))
        .filter(
          (entry): entry is typeof entry & { invoice: NonNullable<(typeof entry)['invoice']> } =>
            Boolean(entry.invoice) &&
            entry.invoice!.organizationId === organizationId &&
            mandate.propertyIds.includes(entry.invoice!.propertyId),
        ),
    );
    const eligibleExpenses = [...expenses.values()].filter(
      (e) =>
        e.organizationId === organizationId &&
        !e.ownerStatementId &&
        (e.status === 'APPROVED' || e.status === 'PAID') &&
        e.borneBy === 'LANDLORD' &&
        e.isDeductibleFromRent &&
        e.expenseDate >= start &&
        e.expenseDate <= end &&
        Boolean(e.propertyId) &&
        mandate.propertyIds.includes(e.propertyId!),
    );

    if (matchedAllocations.length === 0 && eligibleExpenses.length === 0) {
      run.skipped += 1;
      continue;
    }

    const lines: MockOwnerStatementLine[] = [];
    let position = 0;
    let rentCollectedAmount = 0;
    for (const { payment, allocation, invoice } of matchedAllocations) {
      rentCollectedAmount += allocation.amount;
      lines.push({
        id: nextId('stline'),
        lineType: 'RENT_COLLECTED',
        label: `Loyer encaissé — ${payment.reference}`,
        amount: allocation.amount,
        isDebit: false,
        position: position++,
        propertyId: invoice.propertyId,
        unitId: invoice.unitId,
        leaseId: invoice.leaseId,
        tenantId: payment.tenantId,
        invoiceId: invoice.id,
        paymentId: payment.id,
        expenseId: null,
        commissionId: null,
        periodStart: start,
        periodEnd: end,
      });
    }

    let commissionAmount = 0;
    let commissionVatAmount = 0;
    for (const { payment, allocation, invoice } of matchedAllocations) {
      const rateBps = mandate.commissionRateBps ?? 0;
      const amount = Math.round((allocation.amount * rateBps) / 10000);
      const vatAmount = Math.round((amount * mandate.vatRateBps) / 10000);
      commissionAmount += amount;
      commissionVatAmount += vatAmount;
      const commission: MockCommission = {
        id: nextId('commission'),
        organizationId,
        mandateId: mandate.id,
        landlordId: mandate.landlordId,
        leaseId: invoice.leaseId,
        paymentId: payment.id,
        status: 'ACCRUED',
        basis: mandate.commissionBasis,
        periodStart: start,
        periodEnd: end,
        baseAmount: allocation.amount,
        rateBps,
        amount,
        vatAmount,
        totalAmount: amount + vatAmount,
        ownerStatementId: null,
        reversalOfId: null,
        createdAt: new Date().toISOString(),
      };
      commissions.set(commission.id, commission);
    }
    if (commissionAmount > 0) {
      lines.push({
        id: nextId('stline'),
        lineType: 'COMMISSION',
        label: 'Commission de gestion',
        amount: commissionAmount,
        isDebit: true,
        position: position++,
        propertyId,
        unitId: null,
        leaseId: null,
        tenantId: null,
        invoiceId: null,
        paymentId: null,
        expenseId: null,
        commissionId: null,
        periodStart: start,
        periodEnd: end,
      });
      lines.push({
        id: nextId('stline'),
        lineType: 'VAT',
        label: 'TVA sur commission',
        amount: commissionVatAmount,
        isDebit: true,
        position: position++,
        propertyId,
        unitId: null,
        leaseId: null,
        tenantId: null,
        invoiceId: null,
        paymentId: null,
        expenseId: null,
        commissionId: null,
        periodStart: start,
        periodEnd: end,
      });
    }

    let expensesAmount = 0;
    for (const expense of eligibleExpenses) {
      expensesAmount += expense.totalAmount;
      lines.push({
        id: nextId('stline'),
        lineType: 'EXPENSE',
        label: expense.label,
        amount: expense.totalAmount,
        isDebit: true,
        position: position++,
        propertyId: expense.propertyId,
        unitId: expense.unitId,
        leaseId: expense.leaseId,
        tenantId: null,
        invoiceId: null,
        paymentId: null,
        expenseId: expense.id,
        commissionId: null,
        periodStart: start,
        periodEnd: end,
      });
    }

    const previousStatement = [...ownerStatements.values()]
      .filter(
        (s) =>
          s.organizationId === organizationId &&
          s.landlordId === mandate.landlordId &&
          s.propertyId === propertyId &&
          s.status !== 'CANCELLED' &&
          s.periodStart < start,
      )
      .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))[0];
    const carryForwardAmount =
      previousStatement && previousStatement.netPayableAmount < 0
        ? -previousStatement.netPayableAmount
        : 0;
    if (carryForwardAmount > 0) {
      lines.push({
        id: nextId('stline'),
        lineType: 'CARRY_FORWARD',
        label: 'Report du solde précédent',
        amount: carryForwardAmount,
        isDebit: true,
        position: position++,
        propertyId,
        unitId: null,
        leaseId: null,
        tenantId: null,
        invoiceId: null,
        paymentId: null,
        expenseId: null,
        commissionId: null,
        periodStart: start,
        periodEnd: end,
      });
    }

    const netPayableAmount =
      rentCollectedAmount -
      commissionAmount -
      commissionVatAmount -
      expensesAmount -
      carryForwardAmount;

    const statement: MockOwnerStatement = {
      id: nextId('statement'),
      organizationId,
      statementNumber: nextStatementNumber(yearMonth),
      status: 'DRAFT',
      landlordId: mandate.landlordId,
      propertyId,
      mandateId: mandate.id,
      periodStart: start,
      periodEnd: end,
      rentCollectedAmount,
      chargesCollectedAmount: 0,
      commissionAmount,
      commissionVatAmount,
      expensesAmount,
      depositsHeldAmount: 0,
      carryForwardAmount,
      netPayableAmount,
      occupancyRateBps: null,
      collectionRateBps: null,
      documentId: null,
      lines,
      issuedAt: null,
      sentAt: null,
      settledAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date().toISOString(),
    };
    ownerStatements.set(statement.id, statement);
    for (const commission of commissions.values()) {
      if (
        commission.mandateId === mandate.id &&
        commission.periodStart === start &&
        !commission.ownerStatementId
      ) {
        commission.ownerStatementId = statement.id;
      }
    }
    for (const expense of eligibleExpenses) {
      expense.ownerStatementId = statement.id;
    }
    run.created += 1;
  }
}

function previousMonthPeriodStart(): string {
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return prev.toISOString().slice(0, 10);
}

export const ownerStatementHandlers = [
  // Lancement de la campagne : cron `agency-monthly` en production, déclenchable ici à
  // la demande (période explicite ou mois civil précédent par défaut). Simulé en RUNNING
  // puis DONE après un court délai, consultable par polling (voir useOwnerStatementRun).
  http.post(`${API_BASE}/owner-statements/runs`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json().catch(() => ({}))) as { periodStart?: string };
    const runId = nextId('statementrun');
    statementRuns.set(runId, { runId, status: 'RUNNING', created: 0, skipped: 0, errors: [] });
    const periodStart = body.periodStart ?? previousMonthPeriodStart();
    setTimeout(() => {
      const run = statementRuns.get(runId);
      if (!run) return;
      try {
        runCampaignForOrg(organizationId, periodStart, run);
        run.status = 'DONE';
      } catch (error) {
        run.status = 'FAILED';
        run.errors.push({ reason: error instanceof Error ? error.message : 'Erreur inconnue.' });
      }
    }, 900);
    return HttpResponse.json({ runId }, { status: 202 });
  }),

  http.get(`${API_BASE}/owner-statements/runs/:runId`, ({ params }) => {
    const run = statementRuns.get(String(params.runId));
    if (!run) return notFound('AGENCY.STATEMENT_RUN_NOT_FOUND');
    return HttpResponse.json(run);
  }),

  http.get(`${API_BASE}/owner-statements`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const landlordId = url.searchParams.get('landlordId');
    const mandateId = url.searchParams.get('mandateId');
    const period = url.searchParams.get('period');
    const status = url.searchParams.get('status');
    const items = [...ownerStatements.values()]
      .filter((s) => s.organizationId === organizationId)
      .filter((s) => !landlordId || s.landlordId === landlordId)
      .filter((s) => !mandateId || s.mandateId === mandateId)
      .filter((s) => !period || s.periodStart.slice(0, 7) === period)
      .filter((s) => !status || s.status === status)
      .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))
      .map(statementSummary);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/owner-statements/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const statement = ownerStatements.get(String(params.id));
    if (!statement || statement.organizationId !== organizationId) {
      return notFound('AGENCY.STATEMENT_NOT_FOUND');
    }
    return HttpResponse.json(statementDetail(statement));
  }),

  http.post(`${API_BASE}/owner-statements/:id/issue`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const statement = ownerStatements.get(String(params.id));
    if (!statement || statement.organizationId !== organizationId) {
      return notFound('AGENCY.STATEMENT_NOT_FOUND');
    }
    statement.status = 'ISSUED';
    statement.issuedAt = new Date().toISOString();
    statement.documentId = nextId('document');
    return HttpResponse.json(statementDetail(statement));
  }),

  http.post(`${API_BASE}/owner-statements/:id/cancel`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const statement = ownerStatements.get(String(params.id));
    if (!statement || statement.organizationId !== organizationId) {
      return notFound('AGENCY.STATEMENT_NOT_FOUND');
    }
    if (statement.status !== 'DRAFT' && statement.status !== 'ISSUED') {
      return conflict(
        'AGENCY.STATEMENT_NOT_CANCELLABLE',
        'Un relevé envoyé ou reversé ne s’annule pas.',
      );
    }
    const body = (await request.json()) as { reason: string };
    statement.status = 'CANCELLED';
    statement.cancelledAt = new Date().toISOString();
    statement.cancellationReason = body.reason;
    for (const commission of commissions.values()) {
      if (commission.ownerStatementId === statement.id) commission.ownerStatementId = null;
    }
    for (const expense of expenses.values()) {
      if (expense.ownerStatementId === statement.id) expense.ownerStatementId = null;
    }
    return HttpResponse.json(statementDetail(statement));
  }),

  http.get(`${API_BASE}/owner-statements/:id/pdf`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const statement = ownerStatements.get(String(params.id));
    if (!statement || statement.organizationId !== organizationId) {
      return notFound('AGENCY.STATEMENT_NOT_FOUND');
    }
    return HttpResponse.json({
      downloadUrl: `https://mock-storage.immodesk.internal/owner-statements/${statement.id}.pdf`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }),
];

export const ownerPayoutHandlers = [
  http.post(`${API_BASE}/owner-payouts`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as { statementId: string };
    const statement = ownerStatements.get(body.statementId);
    if (!statement || statement.organizationId !== organizationId) {
      return notFound('AGENCY.STATEMENT_NOT_FOUND');
    }
    if (statement.status !== 'ISSUED' && statement.status !== 'SENT') {
      return conflict(
        'AGENCY.STATEMENT_NOT_CANCELLABLE',
        'Le relevé doit être émis avant tout reversement.',
      );
    }
    if (statement.netPayableAmount <= 0) {
      return conflict(
        'AGENCY.STATEMENT_BALANCE_NOT_POSITIVE',
        'Le solde du relevé n’est pas positif.',
      );
    }
    const existing = [...payouts.values()].find(
      (p) => p.statementId === statement.id && p.status !== 'CANCELLED',
    );
    if (existing) {
      return conflict('AGENCY.PAYOUT_ALREADY_EXISTS', 'Ce relevé porte déjà un reversement.');
    }
    const landlord = landlords.get(statement.landlordId);
    const method = landlord?.payoutMethod ?? 'BANK_TRANSFER';
    // defaultBankAccountId n'est jamais renseigné par le mock phase 1 (aucun écran ne le
    // permet) : on regarde donc si le bailleur dispose d'au moins un compte actif.
    const landlordBankAccount = [...bankAccounts.values()].find(
      (a) => a.holderType === 'LANDLORD' && a.landlordId === statement.landlordId && a.isActive,
    );
    if (method === 'BANK_TRANSFER' && !landlordBankAccount) {
      return conflict(
        'AGENCY.PAYOUT_MISSING_BANK_DETAILS',
        'Le bailleur ne dispose d’aucune coordonnée bancaire exploitable.',
      );
    }
    const now = new Date().toISOString();
    const payout: MockPayout = {
      id: nextId('payout'),
      organizationId,
      reference: nextPayoutReference(now.slice(0, 7)),
      statementId: statement.id,
      landlordId: statement.landlordId,
      status: 'PENDING',
      method,
      amount: statement.netPayableAmount,
      feeAmount: 0,
      feeBearer: 'ORGANIZATION',
      netAmount: statement.netPayableAmount,
      bankAccountId: landlordBankAccount?.id ?? null,
      momoTransactionId: null,
      scheduledDate: null,
      approvedByUserId: null,
      approvedAt: null,
      paidAt: null,
      failureReason: null,
      proofDocumentId: null,
      createdAt: now,
    };
    payouts.set(payout.id, payout);
    return HttpResponse.json(payoutView(payout), { status: 201 });
  }),

  http.get(`${API_BASE}/owner-payouts`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const landlordId = url.searchParams.get('landlordId');
    const items = [...payouts.values()]
      .filter((p) => p.organizationId === organizationId)
      .filter((p) => !status || p.status === status)
      .filter((p) => !landlordId || p.landlordId === landlordId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(payoutView);
    return HttpResponse.json(paginate(items));
  }),

  http.post(`${API_BASE}/owner-payouts/:id/approve`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const payout = payouts.get(String(params.id));
    if (!payout || payout.organizationId !== organizationId)
      return notFound('AGENCY.PAYOUT_NOT_FOUND');
    payout.status = 'APPROVED';
    payout.approvedByUserId = 'mock-owner';
    payout.approvedAt = new Date().toISOString();
    return HttpResponse.json(payoutView(payout));
  }),

  // Exécution : simplification du mock, PROCESSING puis PAID sont fusionnés (pas d'étape
  // asynchrone séparée à observer côté écran) ; preuve obligatoire, statut du relevé mis à jour.
  http.post(`${API_BASE}/owner-payouts/:id/execute`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const payout = payouts.get(String(params.id));
    if (!payout || payout.organizationId !== organizationId)
      return notFound('AGENCY.PAYOUT_NOT_FOUND');
    const body = (await request.json()) as {
      proofDocumentId: string;
      externalReference?: string;
      momoTransactionId?: string;
    };
    const now = new Date().toISOString();
    payout.status = 'PAID';
    payout.proofDocumentId = body.proofDocumentId;
    payout.momoTransactionId = body.momoTransactionId ?? payout.momoTransactionId;
    payout.paidAt = now;
    payout.failureReason = null;
    if (payout.statementId) {
      const statement = ownerStatements.get(payout.statementId);
      if (statement) {
        statement.status = 'PAID';
        statement.settledAt = now;
      }
    }
    return HttpResponse.json(payoutView(payout));
  }),

  http.post(`${API_BASE}/owner-payouts/:id/fail`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const payout = payouts.get(String(params.id));
    if (!payout || payout.organizationId !== organizationId)
      return notFound('AGENCY.PAYOUT_NOT_FOUND');
    const body = (await request.json()) as { reason: string };
    payout.status = 'FAILED';
    payout.failureReason = body.reason;
    return HttpResponse.json(payoutView(payout));
  }),
];

export const agencyHandlers = [
  ...mandateHandlers,
  ...expenseHandlers,
  ...commissionHandlers,
  ...ownerStatementHandlers,
  ...ownerPayoutHandlers,
];
