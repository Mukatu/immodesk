import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate } from '../../leases/domain/calendar';

/** Instant → ISO 8601, ou `null`. Miroir de `party-views.ts`, sans dépendance croisée. */
function toIsoInstant(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export interface SubscriptionPlanRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billing_interval: string;
  base_price_amount: bigint;
  price_per_unit_amount: bigint;
  included_units: number;
  max_units: number | null;
  max_members: number | null;
  currency: string;
  trial_days: number;
  features: unknown;
  is_public: boolean;
  is_active: boolean;
  position: number;
}

export interface SubscriptionPlanView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billingInterval: string;
  basePriceAmount: number;
  pricePerUnitAmount: number;
  includedUnits: number;
  maxUnits: number | null;
  maxMembers: number | null;
  currency: string;
  trialDays: number;
  features: unknown;
  isPublic: boolean;
  isActive: boolean;
  position: number;
}

export function toSubscriptionPlanView(row: SubscriptionPlanRow): SubscriptionPlanView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    billingInterval: row.billing_interval,
    basePriceAmount: toJsonAmount(row.base_price_amount),
    pricePerUnitAmount: toJsonAmount(row.price_per_unit_amount),
    includedUnits: row.included_units,
    maxUnits: row.max_units,
    maxMembers: row.max_members,
    currency: row.currency,
    trialDays: row.trial_days,
    features: row.features,
    isPublic: row.is_public,
    isActive: row.is_active,
    position: row.position,
  };
}

export interface SubscriptionRow {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  billing_interval: string;
  units_count: number;
  unit_price_amount: bigint;
  recurring_amount: bigint;
  discount_rate_bps: number;
  currency: string;
  trial_ends_at: Date | null;
  current_period_start: Date;
  current_period_end: Date;
  next_billing_date: Date | null;
  payment_method: string;
  momo_msisdn: string | null;
  auto_renew: boolean;
  grace_days: number;
  suspended_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionView {
  id: string;
  organizationId: string;
  planId: string;
  status: string;
  billingInterval: string;
  unitsCount: number;
  unitPriceAmount: number;
  recurringAmount: number;
  discountRateBps: number;
  currency: string;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string | null;
  paymentMethod: string;
  momoMsisdn: string | null;
  autoRenew: boolean;
  graceDays: number;
  suspendedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toSubscriptionView(row: SubscriptionRow): SubscriptionView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    planId: row.plan_id,
    status: row.status,
    billingInterval: row.billing_interval,
    unitsCount: row.units_count,
    unitPriceAmount: toJsonAmount(row.unit_price_amount),
    recurringAmount: toJsonAmount(row.recurring_amount),
    discountRateBps: row.discount_rate_bps,
    currency: row.currency,
    trialEndsAt: toIsoInstant(row.trial_ends_at),
    currentPeriodStart: toIsoDate(row.current_period_start),
    currentPeriodEnd: toIsoDate(row.current_period_end),
    nextBillingDate: row.next_billing_date ? toIsoDate(row.next_billing_date) : null,
    paymentMethod: row.payment_method,
    momoMsisdn: row.momo_msisdn,
    autoRenew: row.auto_renew,
    graceDays: row.grace_days,
    suspendedAt: toIsoInstant(row.suspended_at),
    cancelledAt: toIsoInstant(row.cancelled_at),
    cancellationReason: row.cancellation_reason,
    createdAt: toIsoInstant(row.created_at) as string,
    updatedAt: toIsoInstant(row.updated_at) as string,
  };
}
