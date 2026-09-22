import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { formatXaf } from '../../../shared/money/amount';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { frenchLongDate } from '../../billing/domain/period-label';
import { NumberingService } from '../../numbering/application/numbering.service';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
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
 * Émis quand un abonnement vient de passer ACTIVE→PAST_DUE (contrat, §
 * « Avertissement préalable ») : porte tout ce qu'il faut pour composer le
 * message d'avertissement, sans rouvrir de transaction sur `subscriptions`.
 */
interface PastDueWarningEvent {
  organizationId: string;
  subscriptionId: string;
  invoiceId: string;
  dueDate: Date;
  graceDays: number;
  amount: bigint;
}

interface SubscriptionOwnerRow {
  phone: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  organization_name: string;
}

function ownerDisplayName(owner: SubscriptionOwnerRow): string {
  return (
    owner.display_name ||
    [owner.first_name, owner.last_name].filter(Boolean).join(' ') ||
    'Propriétaire'
  );
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
 *
 * Avertissement préalable (contrat, § « Avertissement préalable ») : envoyé
 * au passage ACTIVE→PAST_DUE, donc dès l'échéance dépassée et AVANT
 * l'expiration du délai de grâce — pas à la suspension elle-même, qui serait
 * une restriction sans préavis. Envoyé APRÈS le commit de la transaction par
 * abonnement (jamais depuis l'intérieur, même principe que
 * `ReferralQualificationService` : `NotificationPipelineService.enqueue`
 * ouvre sa propre transaction). Best-effort : un échec d'envoi ne remet
 * jamais en cause la transition d'état déjà actée.
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
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null = null,
  ) {}

  async runDaily(today: Date = businessToday()): Promise<{ processed: number }> {
    const candidates = await this.loadCandidates();
    let processed = 0;
    for (const row of candidates) {
      try {
        const pastDueEvent = await this.processOne(row.organization_id, row.id, today);
        processed += 1;
        if (pastDueEvent) await this.sendPastDueWarning(pastDueEvent);
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
  ): Promise<PastDueWarningEvent | null> {
    return this.prisma.withTenant(organizationId, null, async (tx) => {
      let current = await tx.subscriptions.findUnique({ where: { id: subscriptionId } });
      if (!current) return null;

      if (shouldExpireTrial(current.status, current.trial_ends_at, today)) {
        await this.transitionStatus(tx, organizationId, current, 'EXPIRED');
        return null; // EXPIRED : terminal, plus rien à facturer.
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
      let pastDueEvent: PastDueWarningEvent | null = null;
      if (overdue.length > 0 && shouldMarkPastDue(current.status)) {
        const graceDaysBefore = current.grace_days;
        current = await this.transitionStatus(tx, organizationId, current, 'PAST_DUE');
        const earliestOverdue = overdue.reduce((earliest, invoice) =>
          invoice.due_date < earliest.due_date ? invoice : earliest,
        );
        pastDueEvent = {
          organizationId,
          subscriptionId: current.id,
          invoiceId: earliestOverdue.id,
          dueDate: earliestOverdue.due_date,
          graceDays: graceDaysBefore,
          amount: earliestOverdue.total_amount,
        };
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
      return pastDueEvent;
    });
  }

  /**
   * Envoi best-effort de l'avertissement préalable à l'OWNER (contrat, §
   * « Avertissement préalable »). Réutilise le pipeline de notification
   * existant (`NOTIFICATION_ENQUEUER`) : WhatsApp d'abord, SMS de repli,
   * exactement comme `DunningEngineService`. Silencieux si le pipeline n'est
   * pas branché ou si l'organisation n'a aucun OWNER actif — un échec ici ne
   * doit jamais faire échouer le cycle de facturation.
   */
  private async sendPastDueWarning(event: PastDueWarningEvent): Promise<void> {
    if (!this.enqueuer) return;
    try {
      const owners = await this.prisma.withTenant(event.organizationId, null, (tx) =>
        tx.$queryRawUnsafe<SubscriptionOwnerRow[]>(
          `SELECT u.phone_e164 AS phone, u.first_name, u.last_name, u.display_name,
                  coalesce(o.trade_name, o.legal_name) AS organization_name
             FROM organization_members om
             JOIN users u ON u.id = om.user_id
             JOIN organizations o ON o.id = om.organization_id
            WHERE om.organization_id = $1::uuid AND om.role = 'OWNER' AND om.status = 'ACTIVE'
            ORDER BY om.joined_at ASC LIMIT 1`,
          event.organizationId,
        ),
      );
      const owner = owners[0];
      if (!owner) return;
      const phone = normalizePhoneE164(owner.phone);
      const ownerName = ownerDisplayName(owner);
      const deadline = new Date(event.dueDate.getTime() + event.graceDays * 86_400_000);
      await this.enqueuer.enqueue({
        organizationId: event.organizationId,
        templateCode: MESSAGE_TEMPLATE_CODES.SUBSCRIPTION_PAST_DUE_WARNING,
        channelOrder: ['WHATSAPP', 'SMS'],
        recipient: { phone, name: ownerName, userId: null },
        variables: {
          ownerName,
          organizationName: owner.organization_name,
          amount: formatXaf(event.amount),
          deadline: frenchLongDate(deadline),
          link: `${this.config.get('PUBLIC_WEB_BASE_URL')}/app/abonnement`,
        },
        relatedEntity: { type: 'subscriptions', id: event.subscriptionId },
        dedupeKey: `subscription-past-due-warning:${event.invoiceId}`,
        actorUserId: null,
      });
    } catch (error) {
      this.logger.warn(
        `Avertissement avant restriction non envoyé (abonnement ${event.subscriptionId}) : ${(error as Error).message}`,
      );
    }
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
