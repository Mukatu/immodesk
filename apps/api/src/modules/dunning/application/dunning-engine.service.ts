import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { newId } from '../../../shared/ids/uuid';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { InvoiceWriterService } from '../../billing/application/invoice-writer.service';
import { toPenaltyTerms } from '../../billing/application/billing-penalties.service';
import { computePenalty } from '../../billing/domain/penalties';
import { toIsoDate } from '../../leases/domain/calendar';
import { NotificationDeliveryService } from '../../notifications/application/notification-delivery.service';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { DUNNABLE_INVOICE_STATUSES, DUNNING_SKIP_REASONS } from '../domain/dunning-types';
import {
  brazzavilleHourOf,
  daysOverdueOf,
  isBelowMinimum,
  isHourReached,
  selectMatchingRule,
} from '../domain/step-selection';
import type { DunningRuleTerms } from '../domain/dunning-types';

const DUNNING_TEMPLATE_CODE = 'DUNNING_REMINDER';

interface RuleRow {
  id: string;
  step_order: number;
  trigger_type: string;
  offset_days: number;
  channel: string;
  fallback_channel: string | null;
  template_id: string | null;
  min_balance_amount: bigint;
  notify_landlord: boolean;
  notify_collector: boolean;
  apply_penalty: boolean;
  penalty_rule_id: string | null;
  escalate_to_legal: boolean;
  send_hour_local: number;
  skip_weekends: boolean;
}

interface InvoiceCandidateRow {
  id: string;
  lease_id: string;
  tenant_id: string;
  status: string;
  issue_date: Date;
  due_date: Date;
  grace_until_date: Date | null;
  balance_amount: bigint;
  rent_amount: bigint;
  charges_amount: bigint;
  penalty_amount: bigint;
  paid_amount: bigint;
  last_penalty_run_date: Date | null;
  tenant_primary_phone: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
}

export interface ScanReport {
  scanned: number;
  created: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
}

export interface ScanOptions {
  /** Instant de référence ; jamais `new Date()` implicite dans les tests (tranche 5). */
  now?: Date;
  dryRun?: boolean;
  /**
   * `true` (déclenchement manuel) : traite les règles sans attendre leur
   * `sendHourLocal`. `false` (cron horaire) : respecte l'heure configurée.
   */
  ignoreHourGate?: boolean;
  actorUserId?: string | null;
}

/**
 * Moteur d'exécution des relances (phase 9, tranches 2 à 4).
 *
 * Une ligne `dunning_runs` par (règle, facture) matchée le jour du scan.
 * L'idempotence est ENTIÈREMENT portée par la contrainte
 * `UNIQUE (organization_id, rule_id, invoice_id, run_date)` : aucune
 * pré-vérification applicative, la violation d'unicité est rattrapée et
 * comptée comme ignorée (contrat, tranche 2).
 */
@Injectable()
export class DunningEngineService {
  private readonly logger = new Logger(DunningEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly invoiceWriter: InvoiceWriterService,
    private readonly delivery: NotificationDeliveryService,
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null,
  ) {}

  async scanOrganization(organizationId: string, options: ScanOptions = {}): Promise<ScanReport> {
    const now = options.now ?? new Date();
    const today = businessToday(now);
    const currentHour = brazzavilleHourOf(now);
    const dryRun = options.dryRun ?? false;
    const actor = options.actorUserId ?? null;
    const report: ScanReport = { scanned: 0, created: 0, skipped: 0, failed: 0, dryRun };

    if (!dryRun) await this.cancelSettledPending(organizationId, actor);

    const rules = await this.prisma.withTenant(organizationId, actor, (tx) =>
      tx.$queryRawUnsafe<RuleRow[]>(
        `SELECT id, step_order, trigger_type::text AS trigger_type, offset_days, channel::text AS channel,
                fallback_channel::text AS fallback_channel, template_id, min_balance_amount,
                notify_landlord, notify_collector, apply_penalty, penalty_rule_id,
                escalate_to_legal, send_hour_local, skip_weekends
           FROM dunning_rules WHERE organization_id = $1::uuid AND is_active`,
        organizationId,
      ),
    );
    if (rules.length === 0) return report;

    const eligibleRules = rules.filter(
      (r) => options.ignoreHourGate || isHourReached(toTerms(r), currentHour),
    );
    if (eligibleRules.length === 0) return report;

    const invoices = await this.prisma.withTenant(organizationId, actor, (tx) =>
      tx.$queryRawUnsafe<InvoiceCandidateRow[]>(
        `SELECT ri.id, ri.lease_id, ri.tenant_id, ri.status::text AS status, ri.issue_date,
                ri.due_date, ri.grace_until_date, ri.balance_amount, ri.rent_amount,
                ri.charges_amount, ri.penalty_amount, ri.paid_amount, ri.last_penalty_run_date,
                t.primary_phone AS tenant_primary_phone, t.first_name AS tenant_first_name,
                t.last_name AS tenant_last_name, t.company_name AS tenant_company_name
           FROM rent_invoices ri
           JOIN tenants t ON t.id = ri.tenant_id
          WHERE ri.organization_id = $1::uuid
            AND ri.status::text = ANY($2::text[])
            AND ri.balance_amount > 0`,
        organizationId,
        [...DUNNABLE_INVOICE_STATUSES],
      ),
    );

    for (const invoice of invoices) {
      report.scanned += 1;
      const invoiceState = {
        dueDate: invoice.due_date,
        issueDate: invoice.issue_date,
        graceUntilDate: invoice.grace_until_date,
        balanceAmount: invoice.balance_amount,
      };
      const rule = selectMatchingRule(eligibleRules.map(toTerms), invoiceState, today);
      if (!rule) continue;
      const ruleRow = rules.find((r) => r.id === rule.id);
      if (!ruleRow) continue;

      if (dryRun) {
        if (isBelowMinimum(rule, invoiceState)) report.skipped += 1;
        else report.created += 1;
        continue;
      }

      const outcome = await this.processMatch(organizationId, actor, ruleRow, invoice, today);
      if (outcome === 'IGNORED') continue; // violation d'unicité : déjà traité aujourd'hui
      report.created += 1;
      if (outcome === 'SKIPPED') report.skipped += 1;
      else if (outcome === 'FAILED') report.failed += 1;
    }

    return report;
  }

  /**
   * Filet de sécurité : le traitement normal ne laisse jamais une ligne à
   * `RUNNING` (elle se termine toujours en `SENT`/`SKIPPED`/`FAILED` dans le
   * même appel). Une ligne restée `RUNNING` au-delà de 10 minutes signale un
   * scan interrompu (crash, redémarrage) ; elle est basculée en `FAILED`
   * plutôt que de bloquer indéfiniment une future sélection de palier.
   * Appelée en best-effort avant toute lecture (`DunningRunsQueryService`).
   */
  async reconcileRunning(organizationId: string, actor: string | null): Promise<number> {
    const rows = await this.prisma.withTenant(organizationId, actor, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `UPDATE dunning_runs SET status = 'FAILED', error_message = 'Exécution interrompue.',
                updated_at = now()
          WHERE organization_id = $1::uuid AND status = 'RUNNING'
            AND updated_at < now() - interval '10 minutes'
          RETURNING id`,
        organizationId,
      ),
    );
    return rows.length;
  }

  /**
   * Arrêt automatique : une facture soldée (ou annulée) annule ses lignes
   * `PENDING` restantes. Filet de sécurité pour un scan interrompu, le
   * traitement normal ne laissant jamais de ligne à `PENDING`.
   */
  private async cancelSettledPending(organizationId: string, actor: string | null): Promise<void> {
    await this.prisma.withTenant(organizationId, actor, (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE dunning_runs SET status = 'CANCELLED', updated_at = now()
          WHERE organization_id = $1::uuid AND status = 'PENDING'
            AND invoice_id IN (
              SELECT id FROM rent_invoices
               WHERE organization_id = $1::uuid AND (balance_amount <= 0 OR status IN ('PAID', 'CANCELLED'))
            )`,
        organizationId,
      ),
    );
  }

  private async processMatch(
    organizationId: string,
    actor: string | null,
    rule: RuleRow,
    invoice: InvoiceCandidateRow,
    today: Date,
  ): Promise<'SENT' | 'SKIPPED' | 'FAILED' | 'IGNORED'> {
    const daysOverdue = daysOverdueOf(invoice.due_date, today);
    const runId = newId();

    const inserted = await this.prisma
      .withTenant(organizationId, actor, (tx) =>
        tx.dunning_runs.create({
          data: {
            id: runId,
            organization_id: organizationId,
            rule_id: rule.id,
            invoice_id: invoice.id,
            lease_id: invoice.lease_id,
            tenant_id: invoice.tenant_id,
            step_order: rule.step_order,
            status: 'RUNNING',
            run_date: today,
            days_overdue: daysOverdue,
            balance_amount: invoice.balance_amount,
            channel: rule.channel as never,
          },
        }),
      )
      .catch((error: unknown) => {
        if (isUniqueViolation(error, 'dunning_runs_uk')) return null;
        throw error;
      });
    if (!inserted) return 'IGNORED';

    if (invoice.balance_amount <= 0) {
      await this.finish(organizationId, actor, runId, {
        status: 'SKIPPED',
        skipReason: DUNNING_SKIP_REASONS.INVOICE_SETTLED,
      });
      return 'SKIPPED';
    }
    if (invoice.balance_amount < rule.min_balance_amount) {
      await this.finish(organizationId, actor, runId, {
        status: 'SKIPPED',
        skipReason: DUNNING_SKIP_REASONS.BELOW_MINIMUM,
      });
      return 'SKIPPED';
    }

    let phone: string;
    try {
      phone = normalizePhoneE164(invoice.tenant_primary_phone);
    } catch {
      await this.finish(organizationId, actor, runId, {
        status: 'SKIPPED',
        skipReason: DUNNING_SKIP_REASONS.NO_CONTACT_CHANNEL,
      });
      return 'SKIPPED';
    }
    if (!this.enqueuer) {
      await this.finish(organizationId, actor, runId, {
        status: 'FAILED',
        errorMessage: 'Pipeline de notification indisponible.',
      });
      return 'FAILED';
    }

    const tenantName = displayNameOf(invoice);
    const channelOrder = [rule.channel, rule.fallback_channel].filter(
      (c): c is string => c !== null,
    );
    const { notificationId } = await this.enqueuer.enqueue({
      organizationId,
      templateCode:
        (rule.template_id
          ? await this.templateCodeOf(organizationId, actor, rule.template_id)
          : null) ?? DUNNING_TEMPLATE_CODE,
      channelOrder: channelOrder as never,
      recipient: { phone, name: tenantName, tenantId: invoice.tenant_id },
      variables: {
        tenantName,
        daysOverdue: String(daysOverdue),
        balanceAmount: invoice.balance_amount.toString(10),
      },
      relatedEntity: { type: 'rent_invoice', id: invoice.id },
      dedupeKey: `dunning:${runId}`,
      actorUserId: actor,
    });
    const status = await this.delivery.deliver(organizationId, notificationId);
    const sent = status === 'SENT';

    if (rule.escalate_to_legal) {
      await this.escalateToGuarantor(organizationId, actor, runId, invoice, rule, daysOverdue);
    }

    let penaltyApplied = false;
    let penaltyAmount = 0n;
    let penaltyInvoiceLineId: string | null = null;
    if (rule.apply_penalty && rule.penalty_rule_id) {
      const result = await this.applyPenaltyIfDue(organizationId, actor, invoice, rule, today);
      if (result) {
        penaltyApplied = true;
        penaltyAmount = result.amount;
        penaltyInvoiceLineId = result.lineId;
      }
    }

    await this.finish(organizationId, actor, runId, {
      status: sent ? 'SENT' : 'FAILED',
      notificationId,
      errorMessage: sent ? null : 'Échec sur le canal principal et le canal de repli.',
      penaltyApplied,
      penaltyAmount,
      penaltyInvoiceLineId,
    });
    return sent ? 'SENT' : 'FAILED';
  }

  private async templateCodeOf(
    organizationId: string,
    actor: string | null,
    templateId: string,
  ): Promise<string | null> {
    const row = await this.prisma.withTenant(organizationId, actor, (tx) =>
      tx.notification_templates.findFirst({ where: { id: templateId }, select: { code: true } }),
    );
    return row?.code ?? null;
  }

  /** Arbitrage 1 : escalade applicative, envoi doublé vers le garant actif du bail. */
  private async escalateToGuarantor(
    organizationId: string,
    actor: string | null,
    runId: string,
    invoice: InvoiceCandidateRow,
    rule: RuleRow,
    daysOverdue: number,
  ): Promise<void> {
    if (!this.enqueuer) return;
    try {
      const guarantor = await this.prisma.withTenant(organizationId, actor, (tx) =>
        tx.$queryRawUnsafe<
          Array<{
            id: string;
            primary_phone: string;
            first_name: string | null;
            last_name: string | null;
            company_name: string | null;
          }>
        >(
          `SELECT g.id, g.primary_phone, g.first_name, g.last_name, g.company_name
             FROM lease_parties lp JOIN guarantors g ON g.id = lp.guarantor_id
            WHERE lp.lease_id = $1::uuid AND lp.role = 'GUARANTOR' AND g.deleted_at IS NULL
            ORDER BY lp.created_at ASC LIMIT 1`,
          invoice.lease_id,
        ),
      );
      const row = guarantor[0];
      if (!row) return;
      const phone = normalizePhoneE164(row.primary_phone);
      const name =
        [row.first_name, row.last_name].filter(Boolean).join(' ') || row.company_name || 'Garant';
      const channelOrder = [rule.channel, rule.fallback_channel].filter(
        (c): c is string => c !== null,
      );
      const { notificationId } = await this.enqueuer.enqueue({
        organizationId,
        templateCode: DUNNING_TEMPLATE_CODE,
        channelOrder: channelOrder as never,
        recipient: { phone, name },
        variables: {
          tenantName: name,
          daysOverdue: String(daysOverdue),
          balanceAmount: invoice.balance_amount.toString(10),
        },
        relatedEntity: { type: 'guarantor', id: row.id },
        dedupeKey: `dunning-guarantor:${runId}`,
        actorUserId: actor,
      });
      await this.delivery.deliver(organizationId, notificationId);
    } catch (error) {
      this.logger.warn(
        `Escalade garant non envoyée (relance ${runId}) : ${(error as Error).message}`,
      );
    }
  }

  /**
   * Arbitrage 6 : aucune pénalité deux fois pour le même couple
   * (facture, règle). Réutilise `computePenalty` et `InvoiceWriterService`
   * tels quels (mécanisme de la phase 3).
   */
  private async applyPenaltyIfDue(
    organizationId: string,
    actor: string | null,
    invoice: InvoiceCandidateRow,
    rule: RuleRow,
    today: Date,
  ): Promise<{ amount: bigint; lineId: string } | null> {
    return this.prisma.withTenant(organizationId, actor, async (tx) => {
      const already = await tx.invoice_lines.findFirst({
        where: {
          invoice_id: invoice.id,
          line_type: 'PENALTY',
          penalty_rule_id: rule.penalty_rule_id,
        },
        select: { id: true },
      });
      if (already) return null;

      const penaltyRuleRow = await tx.penalty_rules.findFirst({
        where: { id: rule.penalty_rule_id! },
      });
      if (!penaltyRuleRow || !penaltyRuleRow.is_active) return null;

      const periodsApplied = await tx.invoice_lines.aggregate({
        where: { invoice_id: invoice.id, line_type: 'PENALTY' },
        _sum: { quantity: true },
      });
      const penalty = computePenalty(
        toPenaltyTerms({
          id: penaltyRuleRow.id,
          basis: penaltyRuleRow.basis,
          rate_bps: penaltyRuleRow.rate_bps,
          flat_amount: penaltyRuleRow.flat_amount,
          grace_days: penaltyRuleRow.grace_days,
          cap_amount: penaltyRuleRow.cap_amount,
          cap_rate_bps: penaltyRuleRow.cap_rate_bps,
          max_periods: penaltyRuleRow.max_periods,
          applies_to_charges: penaltyRuleRow.applies_to_charges,
          is_default: penaltyRuleRow.is_default,
        }),
        {
          dueDate: invoice.due_date,
          graceUntilDate: invoice.grace_until_date,
          rentAmount: invoice.rent_amount,
          chargesAmount: invoice.charges_amount,
          penaltyAmount: invoice.penalty_amount,
          paidAmount: invoice.paid_amount,
          balanceAmount: invoice.balance_amount,
          periodsApplied: Number(periodsApplied._sum.quantity ?? 0),
          lastPenaltyRunDate: invoice.last_penalty_run_date,
        },
        today,
      );
      if (!penalty) return null;

      const lineId = await this.invoiceWriter.appendLine(
        tx,
        { id: invoice.id, organization_id: organizationId },
        {
          lineType: 'PENALTY',
          label: penalty.label,
          quantity: penalty.units,
          unitPriceAmount: penalty.unitAmount,
          amount: penalty.amount,
          penaltyRuleId: rule.penalty_rule_id,
        },
      );
      await this.invoiceWriter.recomputeTotals(tx, invoice.id);
      await tx.$executeRawUnsafe(
        `UPDATE rent_invoices SET last_penalty_run_date = $2::date WHERE id = $1::uuid`,
        invoice.id,
        toIsoDate(today),
      );
      return { amount: penalty.amount, lineId };
    });
  }

  private async finish(
    organizationId: string,
    actor: string | null,
    runId: string,
    fields: {
      status: 'SENT' | 'SKIPPED' | 'FAILED';
      skipReason?: string;
      errorMessage?: string | null;
      notificationId?: string;
      penaltyApplied?: boolean;
      penaltyAmount?: bigint;
      penaltyInvoiceLineId?: string | null;
    },
  ): Promise<void> {
    await this.prisma.withTenant(organizationId, actor, async (tx) => {
      const row = await tx.dunning_runs.update({
        where: { id: runId },
        data: {
          status: fields.status,
          executed_at: new Date(),
          skip_reason: fields.skipReason ?? null,
          error_message: fields.errorMessage ?? null,
          notification_id: fields.notificationId ?? null,
          penalty_applied: fields.penaltyApplied ?? false,
          penalty_amount: fields.penaltyAmount ?? 0n,
          penalty_invoice_line_id: fields.penaltyInvoiceLineId ?? null,
          updated_at: new Date(),
        },
      });
      // `message_log_id` n'est connu qu'après l'envoi effectif : relu ici
      // plutôt que porté par `NotificationDeliveryService.deliver()`, qui ne
      // renvoie qu'un statut (le pipeline de notification n'est pas réécrit).
      if (fields.notificationId) {
        const log = await tx.message_logs.findFirst({
          where: { notification_id: fields.notificationId },
          orderBy: { created_at: 'desc' },
          select: { id: true },
        });
        if (log) {
          await tx.dunning_runs.update({ where: { id: runId }, data: { message_log_id: log.id } });
        }
      }
      await audit(this.auditService, tx, {
        organizationId,
        actorUserId: actor,
        actorLabel: 'dunning.engine',
        action: 'STATE_TRANSITION',
        operation: 'DUNNING_RUN_EXECUTED',
        entityType: 'dunning_runs',
        entityId: runId,
        newState: { status: row.status, skipReason: row.skip_reason },
      });
    });
  }
}

function toTerms(row: RuleRow): DunningRuleTerms {
  return {
    id: row.id,
    stepOrder: row.step_order,
    triggerType: row.trigger_type as DunningRuleTerms['triggerType'],
    offsetDays: row.offset_days,
    minBalanceAmount: row.min_balance_amount,
    sendHourLocal: row.send_hour_local,
    skipWeekends: row.skip_weekends,
  };
}

function displayNameOf(invoice: InvoiceCandidateRow): string {
  if (invoice.tenant_company_name) return invoice.tenant_company_name;
  return (
    [invoice.tenant_first_name, invoice.tenant_last_name].filter(Boolean).join(' ') || 'Locataire'
  );
}
