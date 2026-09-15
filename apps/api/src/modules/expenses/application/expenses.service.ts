import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import {
  assertApprovable,
  assertExpenseEditable,
  assertRejectable,
  assertSubmittable,
  computeAmounts,
  type ExpenseBearer,
  type ExpenseCategory,
  type ExpenseStatus,
} from '../domain/expense-rules';
import type { ExpenseForStatement, ExpenseReader } from '../domain/ports';
import { toExpenseView, type ExpenseRow, type ExpenseView } from './expense-views';

export interface ExpenseInput {
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  landlordId?: string;
  category: ExpenseCategory;
  label: string;
  description?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierNiu?: string;
  amount: number | string;
  vatRateBps?: number;
  expenseDate: string;
  borneBy?: ExpenseBearer;
  isRebillable?: boolean;
  isDeductibleFromRent?: boolean;
  invoiceDocumentId?: string;
  clientRef?: string;
  notes?: string;
}

export type ExpenseUpdateInput = Partial<Omit<ExpenseInput, 'clientRef'>>;

function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/**
 * Module `expenses` : dépenses engagées sur un bien, un lot ou un bail,
 * propriétaire exclusif de la table `expenses`.
 *
 * Implémente aussi le port `EXPENSE_READER` (`domain/ports.ts`), consommé
 * par `owner-statements` (pas encore construit) pour la campagne mensuelle :
 * cette classe est donc le SEUL point d'entrée en lecture ET en écriture sur
 * `expenses` depuis un autre module.
 */
@Injectable()
export class ExpensesService implements ExpenseReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
  ) {}

  /**
   * `POST /v1/expenses`. Idempotent par `clientRef`
   * (`expenses_client_ref_uk UNIQUE (organization_id, client_ref)`) : un
   * second appel avec le même `clientRef` rend la dépense initiale
   * (`replayed: true`) plutôt que d'échouer — même schéma que
   * `PaymentsService.create`.
   */
  async create(
    organizationId: string,
    userId: string,
    input: ExpenseInput,
  ): Promise<{ expense: ExpenseView; replayed: boolean }> {
    if (input.clientRef) {
      const existing = await this.findByClientRef(organizationId, userId, input.clientRef);
      if (existing) return { expense: existing, replayed: true };
    }
    try {
      const expense = await this.prisma.withTenant(organizationId, userId, (tx) =>
        this.createInTx(tx, organizationId, userId, input),
      );
      return { expense, replayed: false };
    } catch (error) {
      if (input.clientRef && isUniqueViolation(error, 'client_ref')) {
        const existing = await this.findByClientRef(organizationId, userId, input.clientRef);
        if (existing) return { expense: existing, replayed: true };
      }
      throw error;
    }
  }

  private async createInTx(
    tx: TenantClient,
    organizationId: string,
    userId: string,
    input: ExpenseInput,
  ): Promise<ExpenseView> {
    const amount = toAmount(input.amount);
    const vatRateBps = input.vatRateBps ?? 0;
    const { vatAmount, totalAmount } = computeAmounts(amount, vatRateBps);
    const id = newId();
    const { number } = await this.numbering.nextNumber(tx, organizationId, 'EXPENSE', new Date());

    const created = (await tx.expenses.create({
      data: {
        id,
        organization_id: organizationId,
        property_id: input.propertyId ?? null,
        unit_id: input.unitId ?? null,
        lease_id: input.leaseId ?? null,
        landlord_id: input.landlordId ?? null,
        reference: number,
        category: input.category,
        status: 'DRAFT',
        borne_by: input.borneBy ?? 'LANDLORD',
        label: input.label.trim(),
        description: input.description?.trim() || null,
        supplier_name: input.supplierName?.trim() || null,
        supplier_phone: input.supplierPhone?.trim() || null,
        supplier_niu: input.supplierNiu?.trim() || null,
        amount,
        vat_rate_bps: vatRateBps,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        expense_date: toDateOnly(input.expenseDate),
        is_rebillable: input.isRebillable ?? false,
        is_deductible_from_rent: input.isDeductibleFromRent ?? true,
        invoice_document_id: input.invoiceDocumentId ?? null,
        created_by_user_id: userId,
        client_ref: input.clientRef ?? null,
        notes: input.notes?.trim() || null,
      },
    })) as unknown as ExpenseRow;

    await audit(this.auditService, tx, {
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.EXPENSE_CREATED,
      entityType: 'expenses',
      entityId: id,
      newState: toJsonState(toExpenseView(created)),
    });
    return toExpenseView(created);
  }

  private async findByClientRef(
    organizationId: string,
    userId: string,
    clientRef: string,
  ): Promise<ExpenseView | null> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = (await tx.expenses.findFirst({
        where: { client_ref: clientRef },
      })) as unknown as ExpenseRow | null;
      return row ? toExpenseView(row) : null;
    });
  }

  /**
   * `PATCH /{id}` (contrat, règle 5). Recalcule `vatAmount`/`totalAmount`
   * dès que `amount` ou `vatRateBps` change, jamais autrement — modifier le
   * libellé d'une dépense ne doit pas silencieusement altérer ses montants.
   */
  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: ExpenseUpdateInput,
  ): Promise<ExpenseView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertExpenseEditable(before.status as ExpenseStatus, before.owner_statement_id);

      const recompute = input.amount !== undefined || input.vatRateBps !== undefined;
      const amount = input.amount !== undefined ? toAmount(input.amount) : before.amount;
      const vatRateBps = input.vatRateBps ?? before.vat_rate_bps;
      const amounts = recompute ? computeAmounts(amount, vatRateBps) : null;

      const after = (await tx.expenses.update({
        where: { id },
        data: {
          ...(input.propertyId !== undefined ? { property_id: input.propertyId ?? null } : {}),
          ...(input.unitId !== undefined ? { unit_id: input.unitId ?? null } : {}),
          ...(input.leaseId !== undefined ? { lease_id: input.leaseId ?? null } : {}),
          ...(input.landlordId !== undefined ? { landlord_id: input.landlordId ?? null } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.label !== undefined ? { label: input.label.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.supplierName !== undefined
            ? { supplier_name: input.supplierName?.trim() || null }
            : {}),
          ...(input.supplierPhone !== undefined
            ? { supplier_phone: input.supplierPhone?.trim() || null }
            : {}),
          ...(input.supplierNiu !== undefined
            ? { supplier_niu: input.supplierNiu?.trim() || null }
            : {}),
          ...(amounts
            ? {
                amount: amounts.amount,
                vat_rate_bps: vatRateBps,
                vat_amount: amounts.vatAmount,
                total_amount: amounts.totalAmount,
              }
            : {}),
          ...(input.expenseDate !== undefined
            ? { expense_date: toDateOnly(input.expenseDate) }
            : {}),
          ...(input.borneBy !== undefined ? { borne_by: input.borneBy } : {}),
          ...(input.isRebillable !== undefined ? { is_rebillable: input.isRebillable } : {}),
          ...(input.isDeductibleFromRent !== undefined
            ? { is_deductible_from_rent: input.isDeductibleFromRent }
            : {}),
          ...(input.invoiceDocumentId !== undefined
            ? { invoice_document_id: input.invoiceDocumentId ?? null }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
          updated_at: new Date(),
        },
      })) as unknown as ExpenseRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.EXPENSE_UPDATED,
        entityType: 'expenses',
        entityId: id,
        previousState: toJsonState(toExpenseView(before)),
        newState: toJsonState(toExpenseView(after)),
      });
      return toExpenseView(after);
    });
  }

  async submit(organizationId: string, userId: string, id: string): Promise<ExpenseView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertSubmittable(before.status as ExpenseStatus);
      const after = (await tx.expenses.update({
        where: { id },
        data: { status: 'SUBMITTED', updated_at: new Date() },
      })) as unknown as ExpenseRow;
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.EXPENSE_SUBMITTED,
        entityType: 'expenses',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: after.status }),
      });
      return toExpenseView(after);
    });
  }

  async approve(organizationId: string, userId: string, id: string): Promise<ExpenseView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertApprovable(before.status as ExpenseStatus);
      const after = (await tx.expenses.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approved_by_user_id: userId,
          approved_at: new Date(),
          updated_at: new Date(),
        },
      })) as unknown as ExpenseRow;
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.EXPENSE_APPROVED,
        entityType: 'expenses',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: after.status, approvedByUserId: userId }),
      });
      return toExpenseView(after);
    });
  }

  /**
   * Motif de rejet : comme pour la suspension d'un mandat, aucune colonne
   * dédiée en base — `notes` reste une annotation libre du gestionnaire,
   * pas le journal des rejets. Le motif est donc uniquement tracé dans
   * `audit_logs.new_state`.
   */
  async reject(
    organizationId: string,
    userId: string,
    id: string,
    reason: string,
  ): Promise<ExpenseView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertRejectable(before.status as ExpenseStatus, reason);
      const after = (await tx.expenses.update({
        where: { id },
        data: { status: 'REJECTED', updated_at: new Date() },
      })) as unknown as ExpenseRow;
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.EXPENSE_REJECTED,
        entityType: 'expenses',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: after.status, reason: reason.trim() }),
      });
      return toExpenseView(after);
    });
  }

  /** Lit une dépense vivante, ou lève le 404 du contrat. */
  async require(tx: TenantClient, id: string): Promise<ExpenseRow> {
    const row = (await tx.expenses.findFirst({ where: { id } })) as unknown as ExpenseRow | null;
    if (!row) throw new DomainError('AGENCY.EXPENSE_NOT_FOUND', { expenseId: id });
    return row;
  }

  // --- Port EXPENSE_READER, consommé par `owner-statements` -------------

  async findEligibleForStatement(
    tx: TenantClient,
    organizationId: string,
    landlordId: string,
    propertyId: string | null,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ExpenseForStatement[]> {
    const rows = await tx.expenses.findMany({
      where: {
        organization_id: organizationId,
        landlord_id: landlordId,
        borne_by: 'LANDLORD',
        is_deductible_from_rent: true,
        is_rebillable: false,
        status: { in: ['APPROVED', 'PAID'] },
        owner_statement_id: null,
        expense_date: { gte: periodStart, lte: periodEnd },
        ...(propertyId ? { property_id: propertyId } : {}),
      },
      orderBy: [{ expense_date: 'asc' }, { created_at: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      category: row.category,
      label: row.label,
      amount: row.amount,
      vatAmount: row.vat_amount,
      totalAmount: row.total_amount,
      expenseDate: row.expense_date,
    }));
  }

  async attachToStatement(
    tx: TenantClient,
    expenseIds: string[],
    statementId: string,
  ): Promise<void> {
    if (!expenseIds.length) return;
    await tx.expenses.updateMany({
      where: { id: { in: expenseIds } },
      data: { owner_statement_id: statementId, updated_at: new Date() },
    });
  }

  async detachFromStatement(tx: TenantClient, statementId: string): Promise<void> {
    await tx.expenses.updateMany({
      where: { owner_statement_id: statementId },
      data: { owner_statement_id: null, updated_at: new Date() },
    });
  }
}
