import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { OperationalSettings } from '../../../shared/settings/operational-settings';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { toIsoDate } from '../../leases/domain/calendar';
import { computePenalty, type PenaltyBasis, type PenaltyRuleTerms } from '../domain/penalties';
import type { InvoiceRow } from './invoice-views';
import { InvoiceWriterService } from './invoice-writer.service';

interface PenaltyRuleRow {
  id: string;
  basis: string;
  rate_bps: number | null;
  flat_amount: bigint | null;
  grace_days: number;
  cap_amount: bigint | null;
  cap_rate_bps: number | null;
  max_periods: number | null;
  applies_to_charges: boolean;
  is_default: boolean;
}

export function toPenaltyTerms(row: PenaltyRuleRow): PenaltyRuleTerms {
  return {
    basis: row.basis as PenaltyBasis,
    rateBps: row.rate_bps,
    flatAmount: row.flat_amount,
    graceDays: row.grace_days,
    capAmount: row.cap_amount,
    capRateBps: row.cap_rate_bps,
    maxPeriods: row.max_periods,
    appliesToCharges: row.applies_to_charges,
  };
}

/**
 * Passage en retard et pénalités, volet quotidien du moteur de facturation.
 * Idempotent : un passage ne sélectionne que ce qui n'est pas déjà dans
 * l'état voulu, et `last_penalty_run_date` empêche toute double pénalité le
 * même jour.
 */
@Injectable()
export class BillingPenaltiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: InvoiceWriterService,
    private readonly auditService: AuditService,
  ) {}

  /** ISSUED / PARTIALLY_PAID → OVERDUE quand `graceUntilDate < today`. */
  async markOverdue(organizationId: string, today: Date, actor: string | null): Promise<number> {
    return this.prisma.withTenant(organizationId, actor, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string; previous_status: string }>>(
        `WITH target AS (
           SELECT id, status::text AS previous_status FROM rent_invoices
            WHERE status IN ('ISSUED', 'PARTIALLY_PAID')
              AND grace_until_date < $1::date AND balance_amount > 0
            FOR UPDATE
         )
         UPDATE rent_invoices ri SET status = 'OVERDUE', updated_at = now()
           FROM target WHERE ri.id = target.id
         RETURNING ri.id, target.previous_status`,
        toIsoDate(today),
      );
      for (const row of rows) {
        await this.auditService.record(tx, {
          organizationId,
          actorUserId: actor,
          actorLabel: 'billing.daily',
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.INVOICE_OVERDUE,
          entityType: 'rent_invoices',
          entityId: row.id,
          previousState: toJsonState({ status: row.previous_status }),
          newState: toJsonState({ status: 'OVERDUE', date: toIsoDate(today) }),
        });
      }
      return rows.length;
    });
  }

  /**
   * Une ligne PENALTY par facture et par exécution éligible, selon la règle
   * du bail, à défaut celle des paramètres, à défaut la règle par défaut.
   */
  async applyPenalties(
    organizationId: string,
    today: Date,
    settings: OperationalSettings,
    actor: string | null,
  ): Promise<number> {
    return this.prisma.withTenant(organizationId, actor, async (tx) => {
      const rules = await tx.$queryRawUnsafe<PenaltyRuleRow[]>(
        `SELECT id, basis::text AS basis, rate_bps, flat_amount, grace_days, cap_amount,
                cap_rate_bps, max_periods, applies_to_charges, is_default
           FROM penalty_rules WHERE is_active`,
      );
      if (rules.length === 0) return 0;
      const byId = new Map(rules.map((r) => [r.id, r]));
      const fallback =
        (settings.billing.defaultPenaltyRuleId &&
          byId.get(settings.billing.defaultPenaltyRuleId)) ||
        rules.find((r) => r.is_default) ||
        null;

      const invoices = await tx.$queryRawUnsafe<Array<InvoiceRow & { periods_applied: number }>>(
        `SELECT ri.*,
                coalesce((SELECT sum(il.quantity) FROM invoice_lines il
                           WHERE il.invoice_id = ri.id AND il.line_type = 'PENALTY'), 0)::int
                  AS periods_applied
           FROM rent_invoices ri
          WHERE ri.status = 'OVERDUE' AND ri.balance_amount > 0
            AND (ri.last_penalty_run_date IS NULL OR ri.last_penalty_run_date < $1::date)
          ORDER BY ri.id
          FOR UPDATE OF ri`,
        toIsoDate(today),
      );

      let applied = 0;
      for (const invoice of invoices) {
        const rule = (invoice.penalty_rule_id && byId.get(invoice.penalty_rule_id)) || fallback;
        if (!rule) continue;
        const penalty = computePenalty(
          toPenaltyTerms(rule),
          {
            dueDate: invoice.due_date,
            graceUntilDate: invoice.grace_until_date,
            rentAmount: invoice.rent_amount,
            chargesAmount: invoice.charges_amount,
            penaltyAmount: invoice.penalty_amount,
            paidAmount: invoice.paid_amount,
            balanceAmount: invoice.balance_amount,
            periodsApplied: invoice.periods_applied,
            lastPenaltyRunDate: invoice.last_penalty_run_date,
          },
          today,
        );
        if (!penalty) continue;

        await this.writer.appendLine(tx, invoice, {
          lineType: 'PENALTY',
          label: penalty.label,
          quantity: penalty.units,
          unitPriceAmount: penalty.unitAmount,
          amount: penalty.amount,
          penaltyRuleId: rule.id,
        });
        await this.writer.recomputeTotals(tx, invoice.id);
        await tx.$executeRawUnsafe(
          `UPDATE rent_invoices SET last_penalty_run_date = $2::date WHERE id = $1::uuid`,
          invoice.id,
          toIsoDate(today),
        );
        await this.auditService.record(tx, {
          organizationId,
          actorUserId: actor,
          actorLabel: 'billing.daily',
          action: 'UPDATE',
          operation: AUDIT_OPERATIONS.INVOICE_PENALTY_APPLIED,
          entityType: 'rent_invoices',
          entityId: invoice.id,
          newState: toJsonState({
            ruleId: rule.id,
            amount: penalty.amount,
            units: penalty.units,
            date: toIsoDate(today),
          }),
        });
        applied += 1;
      }
      return applied;
    });
  }
}
