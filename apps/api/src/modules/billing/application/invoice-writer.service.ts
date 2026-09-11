import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { compareDates } from '../../leases/domain/calendar';
import { NumberingService } from '../../numbering/application/numbering.service';
import {
  computeLineAmount,
  computeTotals,
  milliToDecimalString,
  type InvoiceLineType,
} from '../domain/invoice-lines';
import { assertInvoiceTransition, type InvoiceStatus } from '../domain/invoice-status';
import { DRAFT_NUMBER_PREFIX, type InvoiceRow } from './invoice-views';

export interface NewInvoiceLine {
  lineType: InvoiceLineType;
  label: string;
  description?: string | null;
  quantity?: number;
  unitPriceAmount: bigint;
  amount?: bigint | null;
  vatRateBps?: number;
  isCredit?: boolean;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  penaltyRuleId?: string | null;
}

export interface NewInvoiceInput {
  organizationId: string;
  lease: { id: string; tenantId: string; unitId: string; propertyId: string; landlordId: string };
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  graceUntilDate: Date | null;
  lines: readonly NewInvoiceLine[];
  notes?: string | null;
  generatedByJob?: string | null;
  penaltyRuleId?: string | null;
  issue: boolean;
  today: Date;
}

/**
 * Écriture des factures et de leurs lignes, partagée par la saisie manuelle
 * et le moteur de facturation. Toujours dans la transaction de l'appelant.
 */
@Injectable()
export class InvoiceWriterService {
  constructor(
    private readonly numbering: NumberingService,
    private readonly auditService: AuditService,
  ) {}

  async create(tx: TenantClient, input: NewInvoiceInput): Promise<InvoiceRow> {
    if (compareDates(input.periodStart, input.periodEnd) >= 0) {
      throw new DomainError('BILLING.PERIOD_INVALID');
    }
    const id = newId();
    const lines = input.lines.map((line, index) => ({
      line,
      position: index + 1,
      amounts: computeLineAmount({
        quantity: line.quantity,
        unitPriceAmount: line.unitPriceAmount,
        amount: line.amount,
        vatRateBps: line.vatRateBps,
      }),
    }));
    const totals = computeTotals(
      lines.map(({ line, amounts }) => ({
        lineType: line.lineType,
        isCredit: line.isCredit ?? false,
        amount: amounts.amount,
        vatAmount: amounts.vatAmount,
      })),
    );

    // Le numéro n'est réservé qu'à l'émission, et le plus tard possible :
    // un brouillon ne consomme rien de la série LOY.
    const invoiceNumber = input.issue
      ? (
          await this.numbering.nextNumber(
            tx,
            input.organizationId,
            'RENT_INVOICE',
            input.periodStart,
          )
        ).number
      : `${DRAFT_NUMBER_PREFIX}${id}`;

    try {
      await tx.rent_invoices.create({
        data: {
          id,
          organization_id: input.organizationId,
          lease_id: input.lease.id,
          tenant_id: input.lease.tenantId,
          unit_id: input.lease.unitId,
          property_id: input.lease.propertyId,
          landlord_id: input.lease.landlordId,
          invoice_number: invoiceNumber,
          status: input.issue ? 'ISSUED' : 'DRAFT',
          period_start: input.periodStart,
          period_end: input.periodEnd,
          issue_date: input.today,
          due_date: input.dueDate,
          grace_until_date: input.graceUntilDate,
          rent_amount: totals.rentAmount,
          charges_amount: totals.chargesAmount,
          penalty_amount: totals.penaltyAmount,
          other_amount: totals.otherAmount,
          discount_amount: totals.discountAmount,
          total_amount: totals.totalAmount,
          paid_amount: 0n,
          balance_amount: totals.totalAmount,
          penalty_rule_id: input.penaltyRuleId ?? null,
          issued_at: input.issue ? new Date() : null,
          generated_by_job: input.generatedByJob ?? null,
          notes: input.notes ?? null,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error, 'period_start') || isUniqueViolation(error, 'period_uk')) {
        throw new DomainError('BILLING.PERIOD_ALREADY_INVOICED', {
          leaseId: input.lease.id,
          periodStart: input.periodStart.toISOString().slice(0, 10),
        });
      }
      throw error;
    }

    if (lines.length > 0) {
      await tx.invoice_lines.createMany({
        data: lines.map(({ line, position, amounts }) =>
          this.lineData(input.organizationId, id, line, position, amounts),
        ),
      });
    }

    await audit(this.auditService, tx, {
      organizationId: input.organizationId,
      action: 'CREATE',
      operation: input.issue ? AUDIT_OPERATIONS.INVOICE_ISSUED : AUDIT_OPERATIONS.INVOICE_CREATED,
      entityType: 'rent_invoices',
      entityId: id,
      newState: toJsonState({
        invoiceNumber: input.issue ? invoiceNumber : null,
        status: input.issue ? 'ISSUED' : 'DRAFT',
        leaseId: input.lease.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        totalAmount: totals.totalAmount,
        generatedByJob: input.generatedByJob ?? null,
      }),
    });

    return this.reload(tx, id);
  }

  /** DRAFT → ISSUED : numéro LOY-{YYYYMM}-{seq} du mois de la période. */
  async issue(tx: TenantClient, invoice: InvoiceRow, today: Date): Promise<InvoiceRow> {
    assertInvoiceTransition(invoice.status as InvoiceStatus, 'ISSUED');
    const { number } = await this.numbering.nextNumber(
      tx,
      invoice.organization_id,
      'RENT_INVOICE',
      invoice.period_start,
    );
    const rows = await tx.$queryRawUnsafe<InvoiceRow[]>(
      `UPDATE rent_invoices
          SET status = 'ISSUED', invoice_number = $2, issued_at = now(),
              issue_date = $3::date, updated_at = now()
        WHERE id = $1::uuid
        RETURNING *`,
      invoice.id,
      number,
      today.toISOString().slice(0, 10),
    );
    await audit(this.auditService, tx, {
      organizationId: invoice.organization_id,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.INVOICE_ISSUED,
      entityType: 'rent_invoices',
      entityId: invoice.id,
      previousState: toJsonState({ status: invoice.status }),
      newState: toJsonState({ status: 'ISSUED', invoiceNumber: number }),
    });
    return rows[0];
  }

  /** Ajoute une ligne en fin de facture (saisie en brouillon, pénalité du cron). */
  async appendLine(tx: TenantClient, invoice: InvoiceRow, line: NewInvoiceLine): Promise<string> {
    const last = await tx.$queryRawUnsafe<Array<{ max: number | null }>>(
      `SELECT max(position)::int AS max FROM invoice_lines WHERE invoice_id = $1::uuid`,
      invoice.id,
    );
    const amounts = computeLineAmount({
      quantity: line.quantity,
      unitPriceAmount: line.unitPriceAmount,
      amount: line.amount,
      vatRateBps: line.vatRateBps,
    });
    const id = newId();
    await tx.invoice_lines.create({
      data: {
        id,
        ...this.lineData(
          invoice.organization_id,
          invoice.id,
          line,
          (last[0]?.max ?? 0) + 1,
          amounts,
        ),
      },
    });
    return id;
  }

  /** Recalcule les rubriques et le reste dû à partir des lignes. */
  async recomputeTotals(tx: TenantClient, invoiceId: string): Promise<InvoiceRow> {
    const lines = await tx.invoice_lines.findMany({
      where: { invoice_id: invoiceId },
      select: { line_type: true, is_credit: true, amount: true, vat_amount: true },
    });
    const totals = computeTotals(
      lines.map((l) => ({
        lineType: l.line_type as InvoiceLineType,
        isCredit: l.is_credit,
        amount: l.amount,
        vatAmount: l.vat_amount,
      })),
    );
    const rows = await tx.$queryRawUnsafe<InvoiceRow[]>(
      `UPDATE rent_invoices
          SET rent_amount = $2::bigint, charges_amount = $3::bigint, penalty_amount = $4::bigint,
              other_amount = $5::bigint, discount_amount = $6::bigint, total_amount = $7::bigint,
              balance_amount = $7::bigint - paid_amount, updated_at = now()
        WHERE id = $1::uuid
        RETURNING *`,
      invoiceId,
      totals.rentAmount.toString(),
      totals.chargesAmount.toString(),
      totals.penaltyAmount.toString(),
      totals.otherAmount.toString(),
      totals.discountAmount.toString(),
      totals.totalAmount.toString(),
    );
    return rows[0];
  }

  async reload(tx: TenantClient, id: string): Promise<InvoiceRow> {
    const rows = await tx.$queryRawUnsafe<InvoiceRow[]>(
      `SELECT * FROM rent_invoices WHERE id = $1::uuid`,
      id,
    );
    return rows[0];
  }

  private lineData(
    organizationId: string,
    invoiceId: string,
    line: NewInvoiceLine,
    position: number,
    amounts: { quantityMilli: bigint; amount: bigint; vatAmount: bigint },
  ) {
    return {
      organization_id: organizationId,
      invoice_id: invoiceId,
      line_type: line.lineType,
      label: line.label,
      description: line.description ?? null,
      quantity: milliToDecimalString(amounts.quantityMilli),
      unit_price_amount: line.unitPriceAmount,
      amount: amounts.amount,
      vat_rate_bps: line.vatRateBps ?? 0,
      vat_amount: amounts.vatAmount,
      is_credit: line.isCredit ?? false,
      penalty_rule_id: line.penaltyRuleId ?? null,
      period_start: line.periodStart ?? null,
      period_end: line.periodEnd ?? null,
      position,
    };
  }
}
