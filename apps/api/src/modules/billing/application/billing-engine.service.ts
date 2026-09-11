import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import {
  readOperationalSettings,
  type OperationalSettings,
} from '../../../shared/settings/operational-settings';
import { businessToday } from '../../../shared/time/business-date';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { parseIsoDate, startOfMonth, toIsoDate } from '../../leases/domain/calendar';
import type { RentRevisionPoint } from '../../leases/domain/rent-schedule';
import type { RentPeriod } from '../domain/billing-periods';
import { planNextInvoice, type PlannedInvoice } from '../domain/invoice-plan';
import { periodLabel } from '../domain/period-label';
import { BillingPenaltiesService } from './billing-penalties.service';
import { InvoiceWriterService, type NewInvoiceLine } from './invoice-writer.service';

interface CandidateLeaseRow {
  id: string;
  primary_tenant_id: string;
  unit_id: string;
  property_id: string;
  landlord_id: string;
  status: string;
  start_date: Date;
  end_date: Date | null;
  move_out_date: Date | null;
  rent_period: string;
  rent_amount: bigint;
  charges_amount: bigint;
  payment_due_day: number;
  grace_days: number;
  penalty_rule_id: string | null;
  created_at: Date;
  invoiced_starts: string[] | null;
}

interface RevisionRow {
  id: string;
  lease_id: string;
  effective_date: Date;
  previous_rent_amount: bigint;
  new_rent_amount: bigint;
  previous_charges_amount: bigint;
  new_charges_amount: bigint;
}

export interface BillingRunOptions {
  today?: Date;
  /** Campagne ciblée : période contenant cette date (ou débutant dans son mois). */
  target?: Date | null;
  dryRun?: boolean;
  leaseId?: string;
  jobLabel: string;
  actorUserId?: string | null;
}

export interface BillingRunOutcome {
  created: number;
  skipped: number;
  errors: Array<{ leaseId: string | null; reason: string }>;
  overdue: number;
  penalties: number;
  issuedInvoiceIds: string[];
}

/**
 * Moteur de facturation d'UNE organisation (docs/api/phase3-contract.md,
 * § « Moteur de facturation »), partagé par le cron `billing-daily` et la
 * campagne manuelle `POST /v1/billing/runs`.
 *
 * Chaque bail est facturé dans SA transaction : un bail malformé produit une
 * entrée `errors[]` et n'empêche jamais la facturation des autres. La
 * relance est sans effet : l'unicité `(lease_id, period_start)` est tenue
 * par la base, et une violation est comptée comme « déjà traité ».
 */
@Injectable()
export class BillingEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: InvoiceWriterService,
    private readonly penalties: BillingPenaltiesService,
    private readonly auditService: AuditService,
  ) {}

  async runForOrganization(
    organizationId: string,
    options: BillingRunOptions,
  ): Promise<BillingRunOutcome> {
    const today = options.today ?? businessToday();
    const actor = options.actorUserId ?? null;
    const outcome: BillingRunOutcome = {
      created: 0,
      skipped: 0,
      errors: [],
      overdue: 0,
      penalties: 0,
      issuedInvoiceIds: [],
    };

    const { settings, leases, revisions } = await this.prisma.withTenant(
      organizationId,
      actor,
      async (tx) => {
        const row = await tx.organization_settings.findUnique({
          where: { organization_id: organizationId },
          select: { settings_json: true, default_penalty_rule_id: true },
        });
        const candidates = await tx.$queryRawUnsafe<CandidateLeaseRow[]>(
          `SELECT l.id, l.primary_tenant_id, l.unit_id, l.property_id, l.landlord_id,
                l.status::text AS status, l.start_date, l.end_date, l.move_out_date,
                l.rent_period::text AS rent_period, l.rent_amount, l.charges_amount,
                l.payment_due_day, l.grace_days, l.penalty_rule_id, l.created_at,
                (SELECT array_agg(to_char(ri.period_start, 'YYYY-MM-DD'))
                   FROM rent_invoices ri WHERE ri.lease_id = l.id) AS invoiced_starts
           FROM leases l
          WHERE l.status IN ('ACTIVE', 'NOTICE_GIVEN') AND l.deleted_at IS NULL
            ${options.leaseId ? 'AND l.id = $1::uuid' : ''}
          ORDER BY l.created_at, l.id`,
          ...(options.leaseId ? [options.leaseId] : []),
        );
        const revisionRows = await tx.$queryRawUnsafe<RevisionRow[]>(
          `SELECT r.id, r.lease_id, r.effective_date, r.previous_rent_amount, r.new_rent_amount,
                r.previous_charges_amount, r.new_charges_amount
           FROM lease_rent_revisions r
           JOIN leases l ON l.id = r.lease_id
          WHERE l.status IN ('ACTIVE', 'NOTICE_GIVEN') AND l.deleted_at IS NULL
          ORDER BY r.lease_id, r.effective_date`,
        );
        return {
          settings: readOperationalSettings(
            row?.settings_json,
            row?.default_penalty_rule_id ?? null,
          ),
          leases: candidates,
          revisions: groupBy(revisionRows, (r) => r.lease_id),
        };
      },
    );

    for (const lease of leases) {
      try {
        const plan = this.plan(
          lease,
          revisions.get(lease.id) ?? [],
          settings,
          today,
          options.target ?? null,
        );
        if (!plan) {
          outcome.skipped += 1;
          continue;
        }
        if (options.dryRun) {
          outcome.created += 1;
          continue;
        }
        const created = await this.prisma.withTenant(organizationId, actor, (tx) =>
          this.writer.create(tx, {
            organizationId,
            lease: {
              id: lease.id,
              tenantId: lease.primary_tenant_id,
              unitId: lease.unit_id,
              propertyId: lease.property_id,
              landlordId: lease.landlord_id,
            },
            periodStart: plan.period.periodStart,
            periodEnd: plan.period.periodEnd,
            dueDate: plan.period.dueDate,
            graceUntilDate: plan.period.graceUntilDate,
            lines: linesOf(plan),
            generatedByJob: options.jobLabel,
            penaltyRuleId: lease.penalty_rule_id ?? settings.billing.defaultPenaltyRuleId,
            issue: settings.billing.autoIssue,
            today,
          }),
        );
        outcome.created += 1;
        if (created.status === 'ISSUED') outcome.issuedInvoiceIds.push(created.id);
      } catch (error) {
        if (
          isUniqueViolation(error) ||
          (error as { code?: string }).code === 'BILLING.PERIOD_ALREADY_INVOICED'
        ) {
          outcome.skipped += 1;
        } else {
          outcome.errors.push({
            leaseId: lease.id,
            reason: (error as Error).message.slice(0, 300),
          });
        }
      }
    }

    if (!options.dryRun) {
      outcome.overdue = await this.penalties.markOverdue(organizationId, today, actor);
      if (settings.billing.applyPenalties) {
        outcome.penalties = await this.penalties.applyPenalties(
          organizationId,
          today,
          settings,
          actor,
        );
      }
      await this.prisma.withTenant(organizationId, actor, (tx) =>
        this.auditService.record(tx, {
          organizationId,
          actorUserId: actor,
          actorLabel: options.jobLabel,
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.BILLING_RUN,
          entityType: 'rent_invoices',
          entityId: organizationId,
          newState: toJsonState({
            date: toIsoDate(today),
            target: options.target ? toIsoDate(options.target) : null,
            created: outcome.created,
            skipped: outcome.skipped,
            errors: outcome.errors.length,
            overdue: outcome.overdue,
            penalties: outcome.penalties,
          }),
        }),
      );
    }
    return outcome;
  }

  private plan(
    lease: CandidateLeaseRow,
    revisions: RevisionRow[],
    settings: OperationalSettings,
    today: Date,
    target: Date | null,
  ): PlannedInvoice | null {
    const first = revisions[0];
    const points: RentRevisionPoint[] = revisions.map((r) => ({
      id: r.id,
      effectiveDate: r.effective_date,
      newRentAmount: r.new_rent_amount,
      newChargesAmount: r.new_charges_amount,
    }));
    return planNextInvoice({
      terms: {
        startDate: lease.start_date,
        endDate: lease.end_date,
        terminationDate: lease.status === 'NOTICE_GIVEN' ? lease.move_out_date : null,
        rentPeriod: lease.rent_period as RentPeriod,
        paymentDueDay: lease.payment_due_day,
        graceDays: lease.grace_days,
      },
      initial: first
        ? { rentAmount: first.previous_rent_amount, chargesAmount: first.previous_charges_amount }
        : { rentAmount: lease.rent_amount, chargesAmount: lease.charges_amount },
      revisions: points,
      invoicedStarts: (lease.invoiced_starts ?? []).map(parseIsoDate),
      floor: startOfMonth(businessToday(lease.created_at)),
      today,
      generateDaysBefore: settings.billing.generateDaysBefore,
      target,
    });
  }
}

function linesOf(plan: PlannedInvoice): NewInvoiceLine[] {
  const label = periodLabel(plan.period.periodStart, plan.period.periodEnd);
  const lines: NewInvoiceLine[] = [
    {
      lineType: 'RENT',
      label: `Loyer ${label}`,
      unitPriceAmount: plan.rentAmount,
      amount: plan.rentAmount,
      periodStart: plan.period.periodStart,
      periodEnd: plan.period.periodEnd,
    },
  ];
  if (plan.chargesAmount > 0n) {
    lines.push({
      lineType: 'SERVICE_CHARGE',
      label: `Charges ${label}`,
      unitPriceAmount: plan.chargesAmount,
      amount: plan.chargesAmount,
      periodStart: plan.period.periodStart,
      periodEnd: plan.period.periodEnd,
    });
  }
  return lines;
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = map.get(k);
    if (bucket) bucket.push(row);
    else map.set(k, [row]);
  }
  return map;
}
