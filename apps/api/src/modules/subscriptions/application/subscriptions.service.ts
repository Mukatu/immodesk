import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import { computeTrialEndsAt } from '../domain/subscription-billing-cycle';
import { canRequestCancellation } from '../domain/subscription-lifecycle';
import { computeRecurringAmount } from '../domain/subscription-pricing';
import { SubscriptionPlansService } from './subscription-plans.service';
import { issueSubscriptionInvoice } from './subscription-invoice-writer';
import {
  toSubscriptionView,
  type SubscriptionRow,
  type SubscriptionView,
} from './subscription-views';

export interface SubscribeInput {
  planCode: string;
  momoMsisdn?: string | null;
}

/**
 * Souscription de l'organisation (contrat phase 10, arbitrage 1) : une seule
 * ligne `subscriptions` par organisation, POUR TOUJOURS
 * (`subscriptions_org_uk UNIQUE (organization_id)`). `POST
 * .../subscription` est donc soit une souscription initiale (aucune ligne),
 * soit un changement de plan (INSERT impossible, UPDATE de la ligne
 * existante) — jamais une seconde ligne, jamais d'historique de plans en
 * base : la trace du changement vit dans `audit_logs`.
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly auditService: AuditService,
    private readonly plans: SubscriptionPlansService,
    private readonly config: AppConfigService,
  ) {}

  async get(organizationId: string, userId: string): Promise<SubscriptionView> {
    const row = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.subscriptions.findUnique({ where: { organization_id: organizationId } }),
    );
    if (!row) throw new DomainError('SUBSCRIPTIONS.NOT_FOUND', { organizationId });
    return toSubscriptionView(row as SubscriptionRow);
  }

  /** Nombre de lots gérés par l'organisation, jamais fourni par l'appelant. */
  async currentUnitsCount(tx: TenantClient, organizationId: string): Promise<number> {
    return tx.units.count({ where: { organization_id: organizationId, deleted_at: null } });
  }

  async subscribe(
    organizationId: string,
    userId: string,
    input: SubscribeInput,
  ): Promise<SubscriptionView> {
    const plan = await this.plans.requireActiveByCode(input.planCode);
    const today = businessToday();

    const view = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const existing = await tx.subscriptions.findUnique({
        where: { organization_id: organizationId },
      });
      const unitsCount = await this.currentUnitsCount(tx, organizationId);

      if (!existing) {
        return this.createFirstSubscription(
          tx,
          organizationId,
          userId,
          plan,
          unitsCount,
          input,
          today,
        );
      }
      if (!canRequestCancellation(existing.status)) {
        // Un abonnement CANCELLED n'est jamais réactivé par cette route : la
        // ligne unique de l'organisation resterait sans historique de la
        // reprise. Une reprise éventuelle est un geste d'exploitation.
        throw new DomainError('SUBSCRIPTIONS.ALREADY_CANCELLED', { organizationId });
      }
      return this.changePlan(tx, existing as SubscriptionRow, plan, unitsCount, input);
    });
    return view;
  }

  private async createFirstSubscription(
    tx: TenantClient,
    organizationId: string,
    userId: string,
    plan: {
      id: string;
      billing_interval: string;
      base_price_amount: bigint;
      price_per_unit_amount: bigint;
      included_units: number;
      trial_days: number;
      vat_rate_bps?: number;
    },
    unitsCount: number,
    input: SubscribeInput,
    today: Date,
  ): Promise<SubscriptionView> {
    const trialEndsAt = computeTrialEndsAt(today, plan.trial_days);
    const recurringAmount = computeRecurringAmount({
      basePriceAmount: plan.base_price_amount,
      pricePerUnitAmount: plan.price_per_unit_amount,
      includedUnits: plan.included_units,
      unitsCount,
      discountRateBps: 0,
    });
    const id = newId();
    const created = await tx.subscriptions.create({
      data: {
        id,
        organization_id: organizationId,
        plan_id: plan.id,
        status: 'TRIALING',
        billing_interval: plan.billing_interval as never,
        units_count: unitsCount,
        unit_price_amount: plan.price_per_unit_amount,
        recurring_amount: recurringAmount,
        discount_rate_bps: 0,
        trial_ends_at: trialEndsAt,
        current_period_start: today,
        current_period_end: trialEndsAt,
        next_billing_date: trialEndsAt,
        momo_msisdn: input.momoMsisdn ?? null,
        grace_days: this.config.get('SUBSCRIPTION_DEFAULT_GRACE_DAYS'),
      },
    });
    await audit(this.auditService, tx, {
      organizationId,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.SUBSCRIPTION_CREATED,
      entityType: 'subscriptions',
      entityId: id,
      actorUserId: userId,
      newState: toJsonState({ planCode: plan.id, status: 'TRIALING', trialEndsAt }),
    });

    // Première facture, due à la fin de l'essai : c'est elle que l'OWNER
    // règle pour activer l'abonnement avant, ou dès, l'échéance de l'essai.
    await issueSubscriptionInvoice(tx, this.numbering, this.auditService, {
      organizationId,
      subscriptionId: id,
      periodStart: today,
      periodEnd: trialEndsAt,
      dueDate: trialEndsAt,
      unitsCount,
      pricing: {
        basePriceAmount: plan.base_price_amount,
        pricePerUnitAmount: plan.price_per_unit_amount,
        includedUnits: plan.included_units,
        unitsCount,
        discountRateBps: 0,
        vatRateBps: 1800,
      },
      today,
    });

    return toSubscriptionView(created as SubscriptionRow);
  }

  private async changePlan(
    tx: TenantClient,
    existing: SubscriptionRow,
    plan: {
      id: string;
      billing_interval: string;
      base_price_amount: bigint;
      price_per_unit_amount: bigint;
      included_units: number;
    },
    unitsCount: number,
    input: SubscribeInput,
  ): Promise<SubscriptionView> {
    const recurringAmount = computeRecurringAmount({
      basePriceAmount: plan.base_price_amount,
      pricePerUnitAmount: plan.price_per_unit_amount,
      includedUnits: plan.included_units,
      unitsCount,
      discountRateBps: existing.discount_rate_bps,
    });
    const updated = await tx.subscriptions.update({
      where: { id: existing.id },
      data: {
        plan_id: plan.id,
        billing_interval: plan.billing_interval as never,
        units_count: unitsCount,
        unit_price_amount: plan.price_per_unit_amount,
        recurring_amount: recurringAmount,
        momo_msisdn: input.momoMsisdn === undefined ? undefined : input.momoMsisdn,
      },
    });
    await audit(this.auditService, tx, {
      organizationId: existing.organization_id,
      action: 'UPDATE',
      operation: AUDIT_OPERATIONS.SUBSCRIPTION_PLAN_CHANGED,
      entityType: 'subscriptions',
      entityId: existing.id,
      previousState: toJsonState({
        planId: existing.plan_id,
        recurringAmount: existing.recurring_amount,
      }),
      newState: toJsonState({ planId: plan.id, recurringAmount }),
    });
    return toSubscriptionView(updated as SubscriptionRow);
  }

  async cancel(organizationId: string, userId: string, reason?: string): Promise<SubscriptionView> {
    const view = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const existing = await tx.subscriptions.findUnique({
        where: { organization_id: organizationId },
      });
      if (!existing) throw new DomainError('SUBSCRIPTIONS.NOT_FOUND', { organizationId });
      if (!canRequestCancellation(existing.status)) {
        throw new DomainError('SUBSCRIPTIONS.ALREADY_CANCELLED', { organizationId });
      }
      const updated = await tx.subscriptions.update({
        where: { id: existing.id },
        data: { cancelled_at: new Date(), cancellation_reason: reason ?? null },
      });
      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.SUBSCRIPTION_CANCEL_REQUESTED,
        entityType: 'subscriptions',
        entityId: existing.id,
        actorUserId: userId,
        previousState: toJsonState({ cancelledAt: null }),
        newState: toJsonState({
          cancelledAt: updated.cancelled_at,
          effectiveAt: updated.current_period_end,
        }),
      });
      return toSubscriptionView(updated as SubscriptionRow);
    });
    return view;
  }
}
