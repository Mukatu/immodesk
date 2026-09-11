import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toJsonAmountOrNull } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { PenaltyBasis } from '../domain/penalties';

export interface PenaltyRuleInput {
  name: string;
  basis: PenaltyBasis;
  rateBps?: number | null;
  flatAmount?: bigint | null;
  graceDays?: number;
  capAmount?: bigint | null;
  capRateBps?: number | null;
  maxPeriods?: number | null;
  appliesToCharges?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface PenaltyRuleView {
  id: string;
  name: string;
  basis: string;
  rateBps: number | null;
  flatAmount: number | null;
  graceDays: number;
  capAmount: number | null;
  capRateBps: number | null;
  maxPeriods: number | null;
  appliesToCharges: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

type PenaltyRuleRecord = Awaited<ReturnType<TenantClient['penalty_rules']['findFirstOrThrow']>>;

function toView(row: PenaltyRuleRecord): PenaltyRuleView {
  return {
    id: row.id,
    name: row.name,
    basis: row.basis,
    rateBps: row.rate_bps,
    flatAmount: toJsonAmountOrNull(row.flat_amount),
    graceDays: row.grace_days,
    capAmount: toJsonAmountOrNull(row.cap_amount),
    capRateBps: row.cap_rate_bps,
    maxPeriods: row.max_periods,
    appliesToCharges: row.applies_to_charges,
    isActive: row.is_active,
    isDefault: row.is_default,
    createdAt: row.created_at.toISOString(),
  };
}

/** Une règle à taux exige `rateBps`, une règle forfaitaire `flatAmount`. */
function assertCoherent(basis: string, rateBps: number | null, flatAmount: bigint | null): void {
  const needsRate = basis === 'RATE_BPS_PER_DAY' || basis === 'RATE_BPS_PER_MONTH';
  if ((needsRate && rateBps === null) || (!needsRate && flatAmount === null)) {
    throw new DomainError('BILLING.PENALTY_RULE_INVALID', { basis });
  }
}

@Injectable()
export class PenaltyRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(organizationId: string, userId: string): Promise<{ items: PenaltyRuleView[] }> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.penalty_rules.findMany({ orderBy: [{ is_default: 'desc' }, { name: 'asc' }] }),
    );
    return { items: rows.map(toView) };
  }

  async create(
    organizationId: string,
    userId: string,
    input: PenaltyRuleInput,
  ): Promise<PenaltyRuleView> {
    assertCoherent(input.basis, input.rateBps ?? null, input.flatAmount ?? null);
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      if (input.isDefault) await this.clearDefault(tx);
      const row = await this.guardName(() =>
        tx.penalty_rules.create({
          data: {
            id: newId(),
            organization_id: organizationId,
            name: input.name.trim(),
            basis: input.basis,
            rate_bps: input.rateBps ?? null,
            flat_amount: input.flatAmount ?? null,
            grace_days: input.graceDays ?? 5,
            cap_amount: input.capAmount ?? null,
            cap_rate_bps: input.capRateBps ?? null,
            max_periods: input.maxPeriods ?? null,
            applies_to_charges: input.appliesToCharges ?? false,
            is_active: input.isActive ?? true,
            is_default: input.isDefault ?? false,
          },
        }),
      );
      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.PENALTY_RULE_CREATED,
        entityType: 'penalty_rules',
        entityId: row.id,
        newState: toJsonState(toView(row)),
      });
      return toView(row);
    });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: Partial<PenaltyRuleInput>,
  ): Promise<PenaltyRuleView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await tx.penalty_rules.findFirst({ where: { id } });
      if (!before) throw new DomainError('BILLING.PENALTY_RULE_NOT_FOUND', { id });
      const basis = input.basis ?? before.basis;
      const rateBps = input.rateBps !== undefined ? input.rateBps : before.rate_bps;
      const flatAmount = input.flatAmount !== undefined ? input.flatAmount : before.flat_amount;
      assertCoherent(basis, rateBps, flatAmount);
      if (input.isDefault) await this.clearDefault(tx, id);

      const after = await this.guardName(() =>
        tx.penalty_rules.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            basis,
            rate_bps: rateBps,
            flat_amount: flatAmount,
            ...(input.graceDays !== undefined ? { grace_days: input.graceDays } : {}),
            ...(input.capAmount !== undefined ? { cap_amount: input.capAmount } : {}),
            ...(input.capRateBps !== undefined ? { cap_rate_bps: input.capRateBps } : {}),
            ...(input.maxPeriods !== undefined ? { max_periods: input.maxPeriods } : {}),
            ...(input.appliesToCharges !== undefined
              ? { applies_to_charges: input.appliesToCharges }
              : {}),
            ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
            ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
            updated_at: new Date(),
          },
        }),
      );
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.PENALTY_RULE_UPDATED,
        entityType: 'penalty_rules',
        entityId: id,
        previousState: toJsonState(toView(before)),
        newState: toJsonState(toView(after)),
      });
      return toView(after);
    });
  }

  /** Une seule règle par défaut active (`penalty_rules_default_uk`). */
  private async clearDefault(tx: TenantClient, exceptId?: string): Promise<void> {
    await tx.penalty_rules.updateMany({
      where: { is_default: true, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      data: { is_default: false, updated_at: new Date() },
    });
  }

  private async guardName<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (isUniqueViolation(error, 'name'))
        throw new DomainError('BILLING.PENALTY_RULE_NAME_TAKEN');
      throw error;
    }
  }
}
