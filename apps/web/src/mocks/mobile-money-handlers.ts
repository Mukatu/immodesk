import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 4, Mobile Money (déclaré et agrégateur), conforme à
 * docs/api/phase4-contract.md. Suit le style de payments-handlers.ts :
 * réutilise `applyAllocations` (règle « facture visée sinon plus ancienne
 * facture ») et `createReceiptForPaidInvoice` plutôt que de dupliquer la
 * logique d'imputation.
 *
 * RÈGLE CENTRALE (arbitrage 1 du contrat) : une déclaration ne crée jamais de
 * payment — seul `.../approve` (déclaré) ou une confirmation agrégateur
 * (`SUCCEEDED` via /refresh, qui simule le webhook + job momo:verify-status)
 * en crée un.
 */
import { API_BASE } from './api-base';
import {
  conflict,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  serializeTenant,
  tenants,
  unauthorizedOrg,
} from './handlers';
import {
  applyAllocations,
  serializePaymentDetail,
  serializePaymentSummary,
} from './payments-handlers';
import { nextPaymentReference, payments, type MockPayment } from './payments-seed';
import { invoices } from './billing-seed';
import {
  getOrInitPaymentMethodsSettings,
  momoTransactions,
  nextMomoAggregatorReference,
  nextMomoDeclaredReference,
  platformFlags,
  type MockMomoTransaction,
  type MomoProviderMock,
} from './payments-phase4-seed';

/** Le contrat réserve les codes 4xx métier Mobile Money à ce statut HTTP. */
function unprocessable(code: string, message: string) {
  return HttpResponse.json({ code, message }, { status: 422 });
}

function tenantRef(tenantId: string) {
  const tenant = tenants.get(tenantId);
  if (!tenant) return { id: tenantId, displayName: 'Locataire inconnu' };
  return { id: tenant.id, displayName: serializeTenant(tenant).displayName };
}

function invoiceRef(invoiceId: string | null) {
  if (!invoiceId) return null;
  const invoice = invoices.get(invoiceId);
  return invoice ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber } : null;
}

function serializeMomoTransaction(tx: MockMomoTransaction) {
  return {
    id: tx.id,
    channel: tx.channel,
    status: tx.status,
    provider: tx.provider,
    aggregator: tx.aggregator,
    merchantReference: tx.merchantReference,
    providerTransactionId: tx.providerTransactionId,
    aggregatorTransactionId: tx.aggregatorTransactionId,
    payerMsisdn: tx.payerMsisdn,
    payeeMsisdn: tx.payeeMsisdn,
    amount: tx.amount,
    feeAmount: tx.feeAmount,
    feeBearer: tx.feeBearer,
    netAmount: tx.amount - tx.feeAmount,
    tenant: tenantRef(tx.tenantId),
    invoice: invoiceRef(tx.invoiceId),
    paymentId: tx.paymentId,
    proofDocumentId: tx.proofDocumentId,
    declaredByUserId: tx.declaredByUserId,
    verifiedByUserId: tx.verifiedByUserId,
    verifiedAt: tx.verifiedAt,
    rejectionReason: tx.rejectionReason,
    failureCode: tx.failureCode,
    failureMessage: tx.failureMessage,
    initiatedAt: tx.initiatedAt,
    completedAt: tx.completedAt,
    expiresAt: tx.expiresAt,
    statusCheckedAt: tx.statusCheckedAt,
    statusCheckCount: tx.statusCheckCount,
  };
}

/**
 * Déduit le suffixe pilotant le simulateur (2 derniers chiffres du numéro
 * payeur) — voir docs/api/phase4-contract.md, section « Mobile Money
 * agrégateur ». 01 succès, 02 échec, 03 pas de réponse (rattrapage puis
 * expiration), tout autre suffixe : succès.
 */
function simulatorSuffix(msisdn: string): string {
  return msisdn.replace(/\D/g, '').slice(-2);
}

/** 06 -> MTN Money, 05 -> Airtel Money (préfixes réels des opérateurs congolais). */
function operatorFromMsisdn(msisdn: string): MomoProviderMock | null {
  const digits = msisdn.replace(/\D/g, '');
  const local = digits.startsWith('242') ? digits.slice(3) : digits;
  const prefix = local.slice(0, 2);
  if (prefix === '06') return 'MTN_MOMO';
  if (prefix === '05') return 'AIRTEL_MONEY';
  return null;
}

function applyMomoApprovalAllocations(params: {
  organizationId: string;
  tx: MockMomoTransaction;
  amount: number;
  paymentId: string;
  paymentReference: string;
}) {
  const { organizationId, tx, amount, paymentId, paymentReference } = params;
  return applyAllocations({
    organizationId,
    tenantId: tx.tenantId,
    budget: amount,
    explicit: tx.invoiceId ? [{ invoiceId: tx.invoiceId, amount }] : undefined,
    autoAllocate: !tx.invoiceId,
    paymentId,
    paymentReference,
    method: 'MOBILE_MONEY',
  });
}

export const mobileMoneyHandlers = [
  // --- Déclaré ---------------------------------------------------------
  http.post(`${API_BASE}/payments/mobile-money/declarations`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      tenantId: string;
      leaseId?: string;
      invoiceId?: string;
      provider: 'MTN_MOMO' | 'AIRTEL_MONEY';
      operatorReference: string;
      payerMsisdn: string;
      payeeMsisdn: string;
      amount: number;
      paidAt?: string;
      proofDocumentId?: string;
      clientRef: string;
      notes?: string;
    };

    const existingByClientRef = [...momoTransactions.values()].find(
      (tx) => tx.organizationId === organizationId && tx.clientRef === body.clientRef,
    );
    if (existingByClientRef) {
      return HttpResponse.json(serializeMomoTransaction(existingByClientRef), { status: 200 });
    }

    const normalizedRef = body.operatorReference.toUpperCase().replace(/\s+/g, '');
    const duplicate = [...momoTransactions.values()].some(
      (tx) =>
        tx.organizationId === organizationId &&
        tx.channel === 'DECLARED' &&
        tx.provider === body.provider &&
        tx.providerTransactionId === normalizedRef,
    );
    if (duplicate) {
      return conflict(
        'MOMO.REFERENCE_ALREADY_USED',
        'Cette référence opérateur a déjà été utilisée pour une déclaration.',
      );
    }

    const now = new Date().toISOString();
    const yearMonth = now.slice(0, 7);
    const id = nextId('momo');
    const tx: MockMomoTransaction = {
      id,
      organizationId,
      channel: 'DECLARED',
      status: 'DECLARED',
      provider: body.provider,
      aggregator: null,
      merchantReference: nextMomoDeclaredReference(yearMonth),
      providerTransactionId: normalizedRef,
      aggregatorTransactionId: null,
      payerMsisdn: body.payerMsisdn,
      payeeMsisdn: body.payeeMsisdn,
      amount: body.amount,
      feeAmount: 0,
      feeBearer: 'TENANT',
      tenantId: body.tenantId,
      leaseId: body.leaseId ?? null,
      invoiceId: body.invoiceId ?? null,
      paymentId: null,
      proofDocumentId: body.proofDocumentId ?? null,
      declaredByUserId: null,
      verifiedByUserId: null,
      verifiedAt: null,
      rejectionReason: null,
      failureCode: null,
      failureMessage: null,
      clientRef: body.clientRef,
      notes: body.notes ?? null,
      initiatedAt: body.paidAt ?? now,
      completedAt: null,
      expiresAt: null,
      statusCheckedAt: null,
      statusCheckCount: 0,
    };
    momoTransactions.set(id, tx);
    return HttpResponse.json(serializeMomoTransaction(tx), { status: 201 });
  }),

  http.get(`${API_BASE}/payments/mobile-money/declarations`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...momoTransactions.values()]
      .filter((tx) => tx.organizationId === organizationId && tx.channel === 'DECLARED')
      .filter((tx) => !status || tx.status === status)
      .filter((tx) => !from || tx.initiatedAt.slice(0, 10) >= from)
      .filter((tx) => !to || tx.initiatedAt.slice(0, 10) <= to)
      .sort((a, b) => (a.initiatedAt < b.initiatedAt ? 1 : -1))
      .map(serializeMomoTransaction);
    return HttpResponse.json(paginate(items));
  }),

  http.post(
    `${API_BASE}/payments/mobile-money/declarations/:id/approve`,
    async ({ params, request }) => {
      const organizationId = orgIdFromRequest(request);
      if (!organizationId) return unauthorizedOrg();
      const tx = momoTransactions.get(String(params.id));
      if (!tx || tx.organizationId !== organizationId || tx.channel !== 'DECLARED') {
        return notFound('MOMO.NOT_FOUND');
      }
      if (tx.status !== 'DECLARED') {
        return conflict('MOMO.INVALID_STATUS', 'Cette déclaration a déjà été instruite.');
      }
      const body = (await request.json().catch(() => ({}))) as {
        approvedAmount?: number;
        reason?: string;
        allocations?: { invoiceId: string; amount: number }[];
      };
      if (
        body.approvedAmount !== undefined &&
        body.approvedAmount !== tx.amount &&
        !body.reason?.trim()
      ) {
        return unprocessable(
          'MOMO.APPROVED_AMOUNT_REASON_REQUIRED',
          'Un motif est requis lorsque le montant validé diffère du montant déclaré.',
        );
      }
      const amount = body.approvedAmount ?? tx.amount;
      const now = new Date().toISOString();
      const paymentId = nextId('payment');
      const reference = nextPaymentReference(now.slice(0, 7));
      const allocations =
        body.allocations && body.allocations.length > 0
          ? applyAllocations({
              organizationId,
              tenantId: tx.tenantId,
              budget: amount,
              explicit: body.allocations,
              paymentId,
              paymentReference: reference,
              method: 'MOBILE_MONEY',
            })
          : applyMomoApprovalAllocations({
              organizationId,
              tx,
              amount,
              paymentId,
              paymentReference: reference,
            });

      const payment: MockPayment = {
        id: paymentId,
        organizationId,
        reference,
        method: 'MOBILE_MONEY',
        status: 'CONFIRMED',
        direction: 'INBOUND',
        amount,
        tenantId: tx.tenantId,
        leaseId: tx.leaseId,
        paymentDate: now.slice(0, 10),
        externalReference: tx.providerTransactionId,
        feeAmount: 0,
        confirmedAt: now,
        rejectedAt: null,
        rejectionReason: null,
        reversedAt: null,
        reversalReason: null,
        reversalOfId: null,
        receivedByUserId: null,
        clientRef: tx.clientRef,
        notes: body.reason ?? null,
        createdAt: now,
        allocations,
      };
      payments.set(paymentId, payment);

      tx.status = 'SUCCEEDED';
      tx.amount = amount;
      tx.paymentId = paymentId;
      tx.verifiedAt = now;
      tx.completedAt = now;

      return HttpResponse.json({
        transaction: serializeMomoTransaction(tx),
        payment: serializePaymentDetail(payment),
      });
    },
  ),

  http.post(
    `${API_BASE}/payments/mobile-money/declarations/:id/reject`,
    async ({ params, request }) => {
      const organizationId = orgIdFromRequest(request);
      if (!organizationId) return unauthorizedOrg();
      const tx = momoTransactions.get(String(params.id));
      if (!tx || tx.organizationId !== organizationId || tx.channel !== 'DECLARED') {
        return notFound('MOMO.NOT_FOUND');
      }
      if (tx.status !== 'DECLARED') {
        return conflict('MOMO.INVALID_STATUS', 'Cette déclaration a déjà été instruite.');
      }
      const body = (await request.json()) as { reason: string };
      tx.status = 'REJECTED';
      tx.rejectionReason = body.reason;
      tx.completedAt = new Date().toISOString();
      return HttpResponse.json(serializeMomoTransaction(tx));
    },
  ),

  http.post(
    `${API_BASE}/payments/mobile-money/declarations/:id/cancel`,
    async ({ params, request }) => {
      const organizationId = orgIdFromRequest(request);
      if (!organizationId) return unauthorizedOrg();
      const tx = momoTransactions.get(String(params.id));
      if (!tx || tx.organizationId !== organizationId || tx.channel !== 'DECLARED') {
        return notFound('MOMO.NOT_FOUND');
      }
      if (tx.status !== 'DECLARED') {
        return conflict(
          'MOMO.INVALID_STATUS',
          'Seule une déclaration en attente peut être retirée.',
        );
      }
      const body = (await request.json().catch(() => ({}))) as { reason?: string };
      tx.status = 'CANCELLED';
      tx.notes = body.reason ? `Retirée : ${body.reason}` : tx.notes;
      tx.completedAt = new Date().toISOString();
      return HttpResponse.json(serializeMomoTransaction(tx));
    },
  ),

  // --- Agrégateur --------------------------------------------------------
  http.post(`${API_BASE}/payments/mobile-money/quote`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as { invoiceId?: string; amount: number };
    const settings = getOrInitPaymentMethodsSettings(organizationId);
    const { feeRateBps, feeBearer } = settings.mobileMoneyAggregator;
    const feeAmount = Math.round((body.amount * feeRateBps) / 10000);
    const totalDebited = feeBearer === 'TENANT' ? body.amount + feeAmount : body.amount;
    const netReceived = feeBearer === 'TENANT' ? body.amount : body.amount - feeAmount;
    return HttpResponse.json({
      amount: body.amount,
      feeAmount,
      totalDebited,
      netReceived,
      feeBearer,
    });
  }),

  http.post(`${API_BASE}/payments/mobile-money/initiate`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const settings = getOrInitPaymentMethodsSettings(organizationId);
    if (!platformFlags.mobileMoneyAggregatorEnabled || !settings.mobileMoneyAggregator.enabled) {
      return conflict(
        'MOMO.AGGREGATOR_DISABLED',
        "Le mode agrégateur n'est pas actif pour cette organisation.",
      );
    }
    const body = (await request.json()) as {
      invoiceId?: string;
      tenantId: string;
      amount: number;
      payerMsisdn: string;
      clientRef: string;
    };
    const provider = operatorFromMsisdn(body.payerMsisdn);
    if (!provider) {
      return unprocessable(
        'MOMO.OPERATOR_UNKNOWN',
        'Numéro payeur ne correspondant à aucun opérateur connu.',
      );
    }
    const { minAmount, maxAmount } = settings.mobileMoneyAggregator;
    if (body.amount < minAmount || body.amount > maxAmount) {
      return unprocessable(
        'MOMO.AMOUNT_OUT_OF_RANGE',
        `Le montant doit être compris entre ${minAmount} et ${maxAmount} XAF.`,
      );
    }

    const existingByClientRef = [...momoTransactions.values()].find(
      (tx) => tx.organizationId === organizationId && tx.clientRef === body.clientRef,
    );
    if (existingByClientRef) {
      const existingPayment = existingByClientRef.paymentId
        ? payments.get(existingByClientRef.paymentId)
        : undefined;
      return HttpResponse.json(
        {
          transaction: serializeMomoTransaction(existingByClientRef),
          payment: existingPayment ? serializePaymentSummary(existingPayment) : null,
        },
        { status: 200 },
      );
    }

    const now = new Date().toISOString();
    const yearMonth = now.slice(0, 7);
    const merchantReference = nextMomoAggregatorReference(yearMonth);
    const paymentId = nextId('payment');
    const paymentReference = nextPaymentReference(yearMonth);
    const txId = nextId('momo');

    const payment: MockPayment = {
      id: paymentId,
      organizationId,
      reference: paymentReference,
      method: 'MOBILE_MONEY',
      status: 'PENDING',
      direction: 'INBOUND',
      amount: body.amount,
      tenantId: body.tenantId,
      leaseId: null,
      paymentDate: now.slice(0, 10),
      externalReference: merchantReference,
      feeAmount: 0,
      confirmedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      reversedAt: null,
      reversalReason: null,
      reversalOfId: null,
      receivedByUserId: null,
      clientRef: body.clientRef,
      notes: null,
      createdAt: now,
      allocations: [],
    };
    payments.set(paymentId, payment);

    const tx: MockMomoTransaction = {
      id: txId,
      organizationId,
      channel: 'AGGREGATOR',
      status: 'PENDING',
      provider,
      aggregator: settings.mobileMoneyAggregator.provider,
      merchantReference,
      providerTransactionId: null,
      aggregatorTransactionId: `SIM-${txId}`,
      payerMsisdn: body.payerMsisdn,
      payeeMsisdn: null,
      amount: body.amount,
      feeAmount: 0,
      feeBearer: settings.mobileMoneyAggregator.feeBearer,
      tenantId: body.tenantId,
      leaseId: null,
      invoiceId: body.invoiceId ?? null,
      paymentId,
      proofDocumentId: null,
      declaredByUserId: null,
      verifiedByUserId: null,
      verifiedAt: null,
      rejectionReason: null,
      failureCode: null,
      failureMessage: null,
      clientRef: body.clientRef,
      notes: null,
      initiatedAt: now,
      completedAt: null,
      expiresAt: null,
      statusCheckedAt: null,
      statusCheckCount: 0,
    };
    momoTransactions.set(txId, tx);

    return HttpResponse.json(
      { transaction: serializeMomoTransaction(tx), payment: serializePaymentSummary(payment) },
      { status: 202 },
    );
  }),

  http.get(`${API_BASE}/payments/mobile-money/transactions`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const channel = url.searchParams.get('channel');
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...momoTransactions.values()]
      .filter((tx) => tx.organizationId === organizationId)
      .filter((tx) => !channel || tx.channel === channel)
      .filter((tx) => !status || tx.status === status)
      .filter((tx) => !from || tx.initiatedAt.slice(0, 10) >= from)
      .filter((tx) => !to || tx.initiatedAt.slice(0, 10) <= to)
      .sort((a, b) => (a.initiatedAt < b.initiatedAt ? 1 : -1))
      .map(serializeMomoTransaction);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/payments/mobile-money/transactions/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tx = momoTransactions.get(String(params.id));
    if (!tx || tx.organizationId !== organizationId) return notFound('MOMO.NOT_FOUND');
    return HttpResponse.json(serializeMomoTransaction(tx));
  }),

  /**
   * Force `getStatus` (contrat). Simulateur piloté par le suffixe du numéro
   * payeur, appliqué immédiatement (sans timer) pour un scénario Playwright
   * rapide et déterministe : ...01 → SUCCEEDED, ...02 → FAILED,
   * ...03 → reste PENDING, puis EXPIRED au 3e appel (statusCheckCount).
   * Tout autre suffixe : succès, comme le simulateur réel.
   */
  http.post(`${API_BASE}/payments/mobile-money/transactions/:id/refresh`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tx = momoTransactions.get(String(params.id));
    if (!tx || tx.organizationId !== organizationId) return notFound('MOMO.NOT_FOUND');
    if (tx.status !== 'INITIATED' && tx.status !== 'PENDING') {
      return conflict('MOMO.INVALID_STATUS', 'Cette transaction ne peut plus être actualisée.');
    }

    const now = new Date().toISOString();
    tx.statusCheckCount += 1;
    tx.statusCheckedAt = now;
    const suffix = simulatorSuffix(tx.payerMsisdn);

    if (suffix === '02') {
      tx.status = 'FAILED';
      tx.failureCode = 'MOMO.PROVIDER_DECLINED';
      tx.failureMessage = "Paiement refusé par l'opérateur (simulateur).";
      tx.completedAt = now;
      if (tx.paymentId) {
        const payment = payments.get(tx.paymentId);
        if (payment) {
          payment.status = 'REJECTED';
          payment.rejectedAt = now;
          payment.rejectionReason = 'Transaction Mobile Money refusée par le simulateur.';
        }
      }
    } else if (suffix === '03') {
      if (tx.statusCheckCount >= 3) {
        tx.status = 'EXPIRED';
        tx.completedAt = now;
        if (tx.paymentId) {
          const payment = payments.get(tx.paymentId);
          if (payment) payment.status = 'CANCELLED';
        }
      }
      // Sinon : reste PENDING, aucune réponse du simulateur (rattrapage à rejouer).
    } else {
      tx.status = 'SUCCEEDED';
      tx.completedAt = now;
      tx.verifiedAt = now;
      const settings = getOrInitPaymentMethodsSettings(organizationId);
      tx.feeAmount = Math.round((tx.amount * settings.mobileMoneyAggregator.feeRateBps) / 10000);
      if (tx.paymentId) {
        const payment = payments.get(tx.paymentId);
        if (payment && payment.status !== 'CONFIRMED') {
          payment.status = 'CONFIRMED';
          payment.confirmedAt = now;
          payment.feeAmount = tx.feeAmount;
          const allocations = applyMomoApprovalAllocations({
            organizationId,
            tx,
            amount: tx.amount,
            paymentId: payment.id,
            paymentReference: payment.reference,
          });
          payment.allocations.push(...allocations);
        }
      }
    }

    return HttpResponse.json(serializeMomoTransaction(tx));
  }),
];
