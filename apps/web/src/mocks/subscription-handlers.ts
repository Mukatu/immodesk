import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 10, abonnement SaaS, conforme à docs/api/phase10-contract.md
 * (arbitrages 1, 2, 8). Le paiement d'une facture reproduit exactement le
 * simulateur du mode agrégateur de mobile-money-handlers.ts (2 derniers
 * chiffres du `payerMsisdn`), mais en une seule route `pay` (pas de
 * quote/initiate séparés, appliqué immédiatement, sans timer, pour un
 * scénario e2e rapide et déterministe) : ...01 succès immédiat, ...02 échec,
 * ...03 reste PENDING puis EXPIRED au 3ᵉ appel, tout autre suffixe : succès.
 * Un paiement réussi sur TRIALING/PAST_DUE fait passer l'abonnement à ACTIVE
 * (arbitrage n°8 : jamais le webhook seul ne confirme un paiement).
 */
import { API_BASE } from './api-base';
import { conflict, nextId, notFound, paginate, units } from './handlers';
import {
  computeRecurringAmount,
  periodEndFor,
  serializeSubscription,
  serializeSubscriptionInvoice,
  serializeSubscriptionPlan,
  subscriptionInvoices,
  subscriptionPlans,
  subscriptions,
  type MockSubscription,
  type MockSubscriptionInvoice,
} from './subscription-seed';

const DEFAULT_PLAN_CODE = 'STANDARD_M';

function unitsCountFor(organizationId: string): number {
  return [...units.values()].filter((u) => u.organizationId === organizationId && !u.deletedAt)
    .length;
}

/** Le catalogue est seedé au chargement de subscription-seed.ts : toujours au moins un plan. */
function defaultPlan(): import('./subscription-seed').MockSubscriptionPlan {
  const found =
    [...subscriptionPlans.values()].find((p) => p.code === DEFAULT_PLAN_CODE) ??
    [...subscriptionPlans.values()][0];
  if (!found) throw new Error('Aucun plan d’abonnement seedé (subscription-seed.ts).');
  return found;
}

/**
 * Le contrat ouvre la ligne `subscriptions` (TRIALING) à la création de
 * l'organisation ; ce lot ne touche pas à cette route (hors périmètre), donc
 * l'initialisation se fait ici paresseusement, au premier accès, avec le même
 * résultat observable.
 */
function getOrInitSubscription(organizationId: string): MockSubscription {
  const existing = subscriptions.get(organizationId);
  if (existing) return existing;
  const plan = defaultPlan();
  const now = new Date();
  const nowIso = now.toISOString();
  const trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 3600 * 1000).toISOString();
  const periodEnd = periodEndFor(now, plan.billingInterval).toISOString();
  const unitsCount = unitsCountFor(organizationId);
  const sub: MockSubscription = {
    id: nextId('subscription'),
    organizationId,
    planId: plan.id,
    status: 'TRIALING',
    unitsCount,
    recurringAmount: computeRecurringAmount(plan, unitsCount, 0),
    discountRateBps: 0,
    trialEndsAt,
    currentPeriodStart: nowIso,
    currentPeriodEnd: periodEnd,
    graceDays: 7,
    cancelledAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  subscriptions.set(organizationId, sub);
  return sub;
}

/**
 * `subscription_invoices UNIQUE (subscription_id, period_start)` : une seule
 * facture par période, jamais DRAFT (arbitrage n°2).
 */
function ensureCurrentInvoice(sub: MockSubscription): MockSubscriptionInvoice {
  const existing = [...subscriptionInvoices.values()].find(
    (inv) => inv.subscriptionId === sub.id && inv.periodStart === sub.currentPeriodStart,
  );
  if (existing) return existing;
  const now = new Date().toISOString();
  const invoice: MockSubscriptionInvoice = {
    id: nextId('subinvoice'),
    subscriptionId: sub.id,
    organizationId: sub.organizationId,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
    amount: sub.recurringAmount,
    paidAmount: 0,
    status: 'ISSUED',
    dueDate: sub.currentPeriodEnd,
    issuedAt: now,
    paidAt: null,
    payAttemptCount: 0,
  };
  subscriptionInvoices.set(invoice.id, invoice);
  return invoice;
}

function simulatorSuffix(msisdn: string): string {
  return msisdn.replace(/\D/g, '').slice(-2);
}

export const subscriptionHandlers = [
  http.get(`${API_BASE}/subscription-plans`, () => {
    const items = [...subscriptionPlans.values()]
      .filter((p) => p.isPublic && p.isActive)
      .map(serializeSubscriptionPlan);
    return HttpResponse.json({ items });
  }),

  http.get(`${API_BASE}/organizations/:id/subscription`, ({ params }) => {
    const sub = getOrInitSubscription(String(params.id));
    ensureCurrentInvoice(sub);
    return HttpResponse.json(serializeSubscription(sub));
  }),

  // Souscription ou changement de plan selon qu'une ligne existe déjà (arbitrage n°1) : upsert.
  http.post(`${API_BASE}/organizations/:id/subscription`, async ({ params, request }) => {
    const organizationId = String(params.id);
    const body = (await request.json()) as { planId: string };
    const plan = subscriptionPlans.get(body.planId);
    if (!plan) return notFound('SUBSCRIPTIONS.PLAN_NOT_FOUND');
    const sub = getOrInitSubscription(organizationId);
    sub.planId = plan.id;
    sub.unitsCount = unitsCountFor(organizationId);
    sub.recurringAmount = computeRecurringAmount(plan, sub.unitsCount, sub.discountRateBps);
    sub.updatedAt = new Date().toISOString();
    ensureCurrentInvoice(sub);
    return HttpResponse.json(serializeSubscription(sub));
  }),

  http.post(`${API_BASE}/organizations/:id/subscription/cancel`, ({ params }) => {
    const sub = getOrInitSubscription(String(params.id));
    if (sub.status === 'CANCELLED') {
      return conflict('SUBSCRIPTIONS.ALREADY_CANCELLED', 'Cet abonnement est déjà résilié.');
    }
    const now = new Date().toISOString();
    sub.cancelledAt = now;
    // Simplification assumée du mock : le contrat prévoit un passage à CANCELLED
    // seulement en fin de période courante ; ici, immédiat, car un scénario e2e
    // ne simule pas l'écoulement du temps.
    sub.status = 'CANCELLED';
    sub.updatedAt = now;
    return HttpResponse.json(serializeSubscription(sub));
  }),

  http.get(`${API_BASE}/organizations/:id/subscription-invoices`, ({ params }) => {
    const sub = getOrInitSubscription(String(params.id));
    ensureCurrentInvoice(sub);
    const items = [...subscriptionInvoices.values()]
      .filter((inv) => inv.subscriptionId === sub.id)
      .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))
      .map(serializeSubscriptionInvoice);
    return HttpResponse.json(paginate(items));
  }),

  http.post(`${API_BASE}/subscription-invoices/:id/pay`, async ({ params, request }) => {
    const invoice = subscriptionInvoices.get(String(params.id));
    if (!invoice) return notFound('SUBSCRIPTIONS.INVOICE_NOT_FOUND');
    if (invoice.status === 'PAID') {
      return conflict('SUBSCRIPTIONS.ALREADY_PAID', 'Cette facture est déjà réglée.');
    }
    const body = (await request.json()) as { payerMsisdn: string; clientRef?: string };
    const suffix = simulatorSuffix(body.payerMsisdn);
    const transactionId = nextId('subpay');
    const now = new Date().toISOString();

    if (suffix === '02') {
      invoice.payAttemptCount += 1;
      return HttpResponse.json({ transactionId, status: 'FAILED' }, { status: 202 });
    }
    if (suffix === '03') {
      invoice.payAttemptCount += 1;
      if (invoice.payAttemptCount >= 3) {
        return HttpResponse.json({ transactionId, status: 'EXPIRED' }, { status: 202 });
      }
      return HttpResponse.json({ transactionId, status: 'PENDING' }, { status: 202 });
    }

    invoice.status = 'PAID';
    invoice.paidAmount = invoice.amount;
    invoice.paidAt = now;
    const sub = subscriptions.get(invoice.organizationId);
    if (sub && (sub.status === 'TRIALING' || sub.status === 'PAST_DUE')) {
      sub.status = 'ACTIVE';
      sub.updatedAt = now;
    }
    return HttpResponse.json({ transactionId, status: 'SUCCEEDED' }, { status: 202 });
  }),
];
