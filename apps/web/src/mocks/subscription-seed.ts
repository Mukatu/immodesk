import type {
  BillingInterval,
  SubscriptionInvoiceStatus,
  SubscriptionPlanFeatures,
  SubscriptionStatus,
} from '@/lib/api/types';

/**
 * Mock MSW — Phase 10, état en mémoire de l'abonnement SaaS, conforme à
 * docs/api/phase10-contract.md. Isolé de handlers.ts (comme leases-seed.ts) :
 * aucune valeur n'est importée d'ici, pour éviter tout cycle avec les fichiers
 * *-handlers.ts qui, eux, lisent librement les Maps/helpers de handlers.ts.
 *
 * Arbitrage n°1 : une organisation n'a qu'un seul abonnement pour toujours —
 * la Map `subscriptions` est donc indexée par `organizationId` lui-même,
 * jamais par un id propre, ce qui rend l'upsert trivial et interdit toute
 * seconde ligne par construction.
 * Arbitrage n°2 : une facture d'abonnement ne connaît que ISSUED, PAID,
 * OVERDUE, CANCELLED (jamais DRAFT ni PARTIALLY_PAID) ; `paidAmount` ne vaut
 * jamais que 0 ou le total.
 */

export interface MockSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  billingInterval: BillingInterval;
  basePrice: number;
  includedUnits: number;
  perUnitPrice: number;
  maxUnits: number | null;
  maxMembers: number | null;
  trialDays: number;
  features: SubscriptionPlanFeatures;
  isPublic: boolean;
  isActive: boolean;
}

export interface MockSubscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  unitsCount: number;
  recurringAmount: number;
  discountRateBps: number;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  graceDays: number;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockSubscriptionInvoice {
  id: string;
  subscriptionId: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  paidAmount: number;
  status: SubscriptionInvoiceStatus;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
  /** Compteur interne du simulateur Mobile Money (suffixe ...03), jamais exposé au client. */
  payAttemptCount: number;
}

export const subscriptionPlans = new Map<string, MockSubscriptionPlan>();
/** Indexée par organizationId (arbitrage n°1) : jamais une seconde ligne. */
export const subscriptions = new Map<string, MockSubscription>();
export const subscriptionInvoices = new Map<string, MockSubscriptionInvoice>();

let seq = 0;
export function nextSubscriptionEntityId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function periodEndFor(start: Date, interval: BillingInterval): Date {
  const end = new Date(start);
  if (interval === 'MONTHLY') end.setMonth(end.getMonth() + 1);
  else if (interval === 'QUARTERLY') end.setMonth(end.getMonth() + 3);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
}

/**
 * `recurring_amount` = prix de base + prix unitaire × lots au-delà de
 * l'inclus, diminué de `discount_rate_bps`, arrondi au XAF supérieur
 * (contrat, section « Abonnement SaaS » → « Montant »).
 */
export function computeRecurringAmount(
  plan: MockSubscriptionPlan,
  unitsCount: number,
  discountRateBps: number,
): number {
  const extraUnits = Math.max(0, unitsCount - plan.includedUnits);
  const gross = plan.basePrice + extraUnits * plan.perUnitPrice;
  return Math.ceil(gross * (1 - discountRateBps / 10000));
}

export function serializeSubscriptionPlan(plan: MockSubscriptionPlan) {
  return { ...plan };
}

export function serializeSubscription(sub: MockSubscription) {
  const plan = subscriptionPlans.get(sub.planId);
  const { organizationId: _organizationId, planId: _planId, ...rest } = sub;
  return { ...rest, plan: plan ? serializeSubscriptionPlan(plan) : null };
}

export function serializeSubscriptionInvoice(invoice: MockSubscriptionInvoice) {
  const { organizationId: _organizationId, payAttemptCount: _payAttemptCount, ...rest } = invoice;
  return rest;
}

/** Catalogue de démonstration, réaliste en XAF (marché congolais). */
(function seedSubscriptionPlansDemoData() {
  const defs: Omit<MockSubscriptionPlan, 'id'>[] = [
    {
      code: 'STARTER_M',
      name: 'Starter',
      billingInterval: 'MONTHLY',
      basePrice: 15000,
      includedUnits: 5,
      perUnitPrice: 1500,
      maxUnits: 20,
      maxMembers: 3,
      trialDays: 14,
      features: { support: 'email', exports: false, whatsapp: true },
      isPublic: true,
      isActive: true,
    },
    {
      code: 'STANDARD_M',
      name: 'Standard',
      billingInterval: 'MONTHLY',
      basePrice: 35000,
      includedUnits: 20,
      perUnitPrice: 1200,
      maxUnits: 100,
      maxMembers: 8,
      trialDays: 14,
      features: { support: 'whatsapp', exports: true, whatsapp: true },
      isPublic: true,
      isActive: true,
    },
    {
      code: 'STANDARD_A',
      name: 'Standard annuel',
      billingInterval: 'ANNUAL',
      basePrice: 336000,
      includedUnits: 20,
      perUnitPrice: 1200,
      maxUnits: 100,
      maxMembers: 8,
      trialDays: 14,
      features: { support: 'whatsapp', exports: true, whatsapp: true },
      isPublic: true,
      isActive: true,
    },
    {
      code: 'PRO_M',
      name: 'Pro',
      billingInterval: 'MONTHLY',
      basePrice: 75000,
      includedUnits: 60,
      perUnitPrice: 900,
      maxUnits: null,
      maxMembers: null,
      trialDays: 14,
      features: { support: 'prioritaire', exports: true, whatsapp: true, api: true },
      isPublic: true,
      isActive: true,
    },
  ];
  for (const def of defs) {
    const id = nextSubscriptionEntityId('plan');
    subscriptionPlans.set(id, { id, ...def });
  }
})();
