import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { addDays, parseIsoDate } from '../../leases/domain/calendar';
import { dueDateOf } from '../domain/billing-periods';
import {
  assertInvoiceCancellable,
  assertInvoiceEditable,
  type InvoiceStatus,
} from '../domain/invoice-status';
import { InvoiceNoticeService } from './invoice-notice.service';
import type { InvoiceRow } from './invoice-views';
import { InvoiceWriterService, type NewInvoiceLine } from './invoice-writer.service';
import { InvoicesQueryService, type InvoiceReader } from './invoices-query.service';
import type { InvoiceDetailView } from './invoice-views';

export interface ManualInvoiceInput {
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  lines: NewInvoiceLine[];
  notes?: string;
  issue?: boolean;
}

interface BillableLeaseRow {
  id: string;
  status: string;
  primary_tenant_id: string;
  unit_id: string;
  property_id: string;
  landlord_id: string;
  payment_due_day: number;
  grace_days: number;
  penalty_rule_id: string | null;
}

/** Cas d'usage d'écriture des factures : saisie manuelle et cycle de vie. */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly writer: InvoiceWriterService,
    private readonly queries: InvoicesQueryService,
    private readonly notices: InvoiceNoticeService,
  ) {}

  async create(
    organizationId: string,
    reader: InvoiceReader,
    input: ManualInvoiceInput,
  ): Promise<InvoiceDetailView> {
    const today = businessToday();
    const periodStart = parseIsoDate(input.periodStart);
    const periodEnd = parseIsoDate(input.periodEnd);

    const detail = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const lease = await this.requireBillableLease(tx, input.leaseId);
      const existing = await tx.rent_invoices.findFirst({
        where: { lease_id: lease.id, period_start: periodStart },
        select: { id: true },
      });
      if (existing) {
        throw new DomainError('BILLING.PERIOD_ALREADY_INVOICED', {
          leaseId: lease.id,
          invoiceId: existing.id,
        });
      }
      const due = input.dueDate
        ? {
            dueDate: parseIsoDate(input.dueDate),
            graceUntilDate: addDays(parseIsoDate(input.dueDate), lease.grace_days),
          }
        : dueDateOf(periodStart, lease.payment_due_day, lease.grace_days);

      const created = await this.writer.create(tx, {
        organizationId,
        lease: {
          id: lease.id,
          tenantId: lease.primary_tenant_id,
          unitId: lease.unit_id,
          propertyId: lease.property_id,
          landlordId: lease.landlord_id,
        },
        periodStart,
        periodEnd,
        dueDate: due.dueDate,
        graceUntilDate: due.graceUntilDate,
        lines: input.lines,
        notes: input.notes ?? null,
        penaltyRuleId: lease.penalty_rule_id,
        issue: input.issue ?? false,
        today,
      });
      return this.queries.detailIn(tx, created.id);
    });

    if (detail.status === 'ISSUED') {
      await this.notices.notifyIssued(organizationId, [detail.id], reader.userId);
    }
    return detail;
  }

  async addLine(
    organizationId: string,
    reader: InvoiceReader,
    invoiceId: string,
    line: NewInvoiceLine,
  ): Promise<InvoiceDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const invoice = await this.lock(tx, invoiceId);
      assertInvoiceEditable(invoice.status as InvoiceStatus);
      const lineId = await this.writer.appendLine(tx, invoice, line);
      await this.writer.recomputeTotals(tx, invoice.id);
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.INVOICE_LINE_ADDED,
        entityType: 'rent_invoices',
        entityId: invoice.id,
        newState: toJsonState({ lineId, lineType: line.lineType, label: line.label }),
      });
      return this.queries.detailIn(tx, invoice.id);
    });
  }

  async removeLine(
    organizationId: string,
    reader: InvoiceReader,
    invoiceId: string,
    lineId: string,
  ): Promise<InvoiceDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const invoice = await this.lock(tx, invoiceId);
      assertInvoiceEditable(invoice.status as InvoiceStatus);
      const line = await tx.invoice_lines.findFirst({
        where: { id: lineId, invoice_id: invoice.id },
      });
      if (!line) throw new DomainError('BILLING.LINE_NOT_FOUND', { invoiceId, lineId });
      await tx.invoice_lines.delete({ where: { id: lineId } });
      await this.writer.recomputeTotals(tx, invoice.id);
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.INVOICE_LINE_REMOVED,
        entityType: 'rent_invoices',
        entityId: invoice.id,
        previousState: toJsonState({ lineId, lineType: line.line_type, amount: line.amount }),
      });
      return this.queries.detailIn(tx, invoice.id);
    });
  }

  async issue(
    organizationId: string,
    reader: InvoiceReader,
    invoiceId: string,
  ): Promise<InvoiceDetailView> {
    const detail = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const invoice = await this.lock(tx, invoiceId);
      await this.writer.issue(tx, invoice, businessToday());
      return this.queries.detailIn(tx, invoice.id);
    });
    await this.notices.notifyIssued(organizationId, [detail.id], reader.userId);
    return detail;
  }

  async cancel(
    organizationId: string,
    reader: InvoiceReader,
    invoiceId: string,
    reason: string,
  ): Promise<InvoiceDetailView> {
    return this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const invoice = await this.lock(tx, invoiceId);
      assertInvoiceCancellable(invoice.status as InvoiceStatus, invoice.paid_amount);
      await tx.$executeRawUnsafe(
        `UPDATE rent_invoices
            SET status = 'CANCELLED', cancelled_at = now(), cancellation_reason = $2, updated_at = now()
          WHERE id = $1::uuid`,
        invoice.id,
        reason,
      );
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.INVOICE_CANCELLED,
        entityType: 'rent_invoices',
        entityId: invoice.id,
        previousState: toJsonState({ status: invoice.status }),
        newState: toJsonState({ status: 'CANCELLED', reason }),
      });
      return this.queries.detailIn(tx, invoice.id);
    });
  }

  private async lock(tx: TenantClient, invoiceId: string): Promise<InvoiceRow> {
    const rows = await tx.$queryRawUnsafe<InvoiceRow[]>(
      `SELECT * FROM rent_invoices WHERE id = $1::uuid FOR UPDATE`,
      invoiceId,
    );
    if (!rows[0]) throw new DomainError('BILLING.INVOICE_NOT_FOUND', { invoiceId });
    return rows[0];
  }

  private async requireBillableLease(tx: TenantClient, leaseId: string): Promise<BillableLeaseRow> {
    const rows = await tx.$queryRawUnsafe<BillableLeaseRow[]>(
      `SELECT id, status::text AS status, primary_tenant_id, unit_id, property_id, landlord_id,
              payment_due_day, grace_days, penalty_rule_id
         FROM leases WHERE id = $1::uuid AND deleted_at IS NULL`,
      leaseId,
    );
    const lease = rows[0];
    if (!lease) throw new DomainError('LEASES.NOT_FOUND', { leaseId });
    if (lease.status !== 'ACTIVE' && lease.status !== 'NOTICE_GIVEN') {
      throw new DomainError('BILLING.LEASE_NOT_BILLABLE', { leaseId, status: lease.status });
    }
    return lease;
  }
}
