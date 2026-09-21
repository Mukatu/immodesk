import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import {
  computePeriodEnd,
  nextPeriodStart,
  type BillingInterval,
} from '../domain/subscription-billing-cycle';
import {
  isBillable,
  shouldExpireTrial,
  shouldFinalizeCancellation,
  shouldMarkPastDue,
  shouldSuspend,
  type SubscriptionStatus,
} from '../domain/subscription-lifecycle';
import { computeRecurringAmount } from '../domain/subscription-pricing';
import { issueSubscriptionInvoice } from './subscription-invoice-writer';
import { SubscriptionPlansService } from './subscription-plans.service';

interface SubscriptionCandidateRow {
  id: string;
  organization_id: string;
}

/**
 * Cycle quotidien de l'abonnement (contrat phase 10, livrable 7) : émission
 * de la facture périodique, puis TRIALING→ACTIVE|EXPIRED, ACTIVE→PAST_DUE,
 * PAST_DUE→SUSPENDED après `grace_days`, et finalisation d'une résiliation
 * demandée à la fin de la période courante. Même mécanique de balayage que
 * `BillingRunsService.runAllOrganizations` : liste des candidats par
 * connexion d'administration (une tâche de fond n'a pas d'organisation
 * courante), puis une transaction `withTenant` PAR abonnement pour toute
 * écriture — donc toujours sous RLS.
 */
@Injectable()
export class SubscriptionBillingRunService {
  private readonly logger = new Logger(SubscriptionBillingRunService.name);
  private admin: PrismaClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly numbering: NumberingService,
    private readonly auditService: AuditService,
    private readonly plans: SubscriptionPlansService,
  ) {}

  async runDaily(today: Date = businessToday()): Promise<{ processed: number }> {
    const candidates = await this.loadCandidates();
    let processed = 0;
    for (const row of candidates) {
      try {
        await this.processOne(row.organization_id, row.id, today);
        processed += 1;
      } catch (error) {
        this.logger.error(`Cycle abonnement ${row.id} en échec : ${(error as Error).message}`);
      }
    }
    return { processed };
  }

  private async loadCandidates(): Promise<SubscriptionCandidateRow[]> {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl) {
      this.logger.warn('DATABASE_ADMIN_URL absent : cron abonnement désactivé.');
      return [];
    }
    this.admin ??= new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
    return this.admin.$queryRawUnsafe<SubscriptionCandidateRow[]>(
      `SELECT id, organization_id FROM subscriptions WHERE status NOT IN ('CANCELLED', 'EXPIRED')`,
    );
  }

  private async processOne(
    organizationId: string,
    subscriptionId: string,
    today: Date,
  ): Promise<void> {
    await this.prisma.withTenant(organizationId, null, async (tx) => {
      let current = await tx.subscriptions.findUnique({ where: { id: subscriptionId } });
      if (!current) return;

      if (shouldExpireTrial(current.status, current.trial_ends_at, today)) {
        await this.transitionStatus(tx, organizationId, current, 'EXPIRED');
        return; // EXPIRED : terminal, plus rien à facturer.
      }

      if (
        isBillable(current.status) &&
        current.next_billing_date &&
        current.next_billing_date <= today
      ) {
        current = await this.issueNextInvoice(tx, current, today);
      }

      const overdue = await tx.subscription_invoices.findMany({
        where: { subscription_id: current.id, status: 'ISSUED', due_date: { lt: today } },
      });
      for (const invoice of overdue) {
        await tx.subscription_invoices.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' },
        });
      }
      if (overdue.length > 0 && shouldMarkPastDue(current.status)) {
        current = await this.transitionStatus(tx, organizationId, current, 'PAST_DUE');
      }

      const earliestUnpaid = await tx.subscription_invoices.findFirst({
        where: { subscription_id: current.id, status: { in: ['ISSUED', 'OVERDUE'] } },
        orderBy: { due_date: 'asc' },
      });
      if (
        shouldSuspend(current.status, earliestUnpaid?.due_date ?? null, current.grace_days, today)
      ) {
        current = await this.transitionStatus(tx, organizationId, current, 'SUSPENDED', {
          suspended_at: today,
        });
      }

      if (
        shouldFinalizeCancellation(
          current.status,
          current.cancelled_at,
          current.current_period_end,
          today,
        )
      ) {
        await this.transitionStatus(tx, organizationId, current, 'CANCELLED');
      }
    });
  }

  private async issueNextInvoice(
    tx: TenantClient,
    subscription: Awaited<ReturnType<TenantClient['subscriptions']['findUniqueOrThrow']>>,
    today: Date,
  ) {
    const plan = await this.plans.requireById(subscription.plan_id);
    const unitsCount = await tx.units.count({
      where: { organization_id: subscription.organization_id, deleted_at: null },
    });
    const periodStart = subscription.next_billing_date as Date;
    const interval = subscription.billing_interval as BillingInterval;
    const periodEnd = computePeriodEnd(periodStart, interval);
    const recurringAmount = computeRecurringAmount({
      basePriceAmount: plan.base_price_amount,
      pricePerUnitAmount: plan.price_per_unit_amount,
      includedUnits: plan.included_units,
      unitsCount,
      discountRateBps: subscription.discount_rate_bps,
    });
    await issueSubscriptionInvoice(tx, this.numbering, this.auditService, {
      organizationId: subscription.organization_id,
      subscriptionId: subscription.id,
      periodStart,
      periodEnd,
      dueDate: periodStart,
      unitsCount,
      pricing: {
        basePriceAmount: plan.base_price_amount,
        pricePerUnitAmount: plan.price_per_unit_amount,
        includedUnits: plan.included_units,
        unitsCount,
        discountRateBps: subscription.discount_rate_bps,
        vatRateBps: 1800,
      },
      today,
    });
    return tx.subscriptions.update({
      where: { id: subscription.id },
      data: {
        units_count: unitsCount,
        unit_price_amount: plan.price_per_unit_amount,
        recurring_amount: recurringAmount,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        next_billing_date: nextPeriodStart(periodEnd),
      },
    });
  }

  private async transitionStatus(
    tx: TenantClient,
    organizationId: string,
    subscription: { id: string; status: SubscriptionStatus },
    newStatus: SubscriptionStatus,
    extra: Record<string, unknown> = {},
  ) {
    const updated = await tx.subscriptions.update({
      where: { id: subscription.id },
      data: { status: newStatus, ...extra },
    });
    await audit(this.auditService, tx, {
      organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.SUBSCRIPTION_STATUS_CHANGED,
      entityType: 'subscriptions',
      entityId: subscription.id,
      previousState: toJsonState({ status: subscription.status }),
      newState: toJsonState({ status: newStatus }),
    });
    return updated;
  }
}
