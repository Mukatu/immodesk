import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { audit, AuditService } from '../../audit/application/audit.service';
import { toJsonState } from '../../audit/domain/audit-entry';
import type { DunningTrigger } from '../domain/dunning-types';

export interface DunningRuleInput {
  name: string;
  stepOrder: number;
  triggerType?: DunningTrigger;
  offsetDays?: number;
  channel?: string;
  fallbackChannel?: string | null;
  templateId?: string | null;
  minBalanceAmount?: bigint;
  notifyLandlord?: boolean;
  notifyCollector?: boolean;
  applyPenalty?: boolean;
  penaltyRuleId?: string | null;
  escalateToLegal?: boolean;
  sendHourLocal?: number;
  skipWeekends?: boolean;
  isActive?: boolean;
}

export interface DunningRuleView {
  id: string;
  name: string;
  stepOrder: number;
  triggerType: string;
  offsetDays: number;
  channel: string;
  fallbackChannel: string | null;
  templateId: string | null;
  minBalanceAmount: number;
  currency: 'XAF';
  notifyLandlord: boolean;
  notifyCollector: boolean;
  applyPenalty: boolean;
  penaltyRuleId: string | null;
  escalateToLegal: boolean;
  sendHourLocal: number;
  skipWeekends: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type DunningRuleRecord = Awaited<ReturnType<TenantClient['dunning_rules']['findFirstOrThrow']>>;

export function toDunningRuleView(row: DunningRuleRecord): DunningRuleView {
  return {
    id: row.id,
    name: row.name,
    stepOrder: row.step_order,
    triggerType: row.trigger_type,
    offsetDays: row.offset_days,
    channel: row.channel,
    fallbackChannel: row.fallback_channel,
    templateId: row.template_id,
    minBalanceAmount: toJsonAmount(row.min_balance_amount),
    currency: 'XAF',
    notifyLandlord: row.notify_landlord,
    notifyCollector: row.notify_collector,
    applyPenalty: row.apply_penalty,
    penaltyRuleId: row.penalty_rule_id,
    escalateToLegal: row.escalate_to_legal,
    sendHourLocal: row.send_hour_local,
    skipWeekends: row.skip_weekends,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Règles de relance (`dunning_rules`), phase 9 tranche 1.
 *
 * Arbitrage 3 du contrat : une règle ne se supprime jamais, elle se
 * désactive (`isActive: false`) — voir `setActive()`. Arbitrage 4 : un seul
 * palier par rang, `dunning_rules_step_uk` traduite en
 * 409 `DUNNING.STEP_ORDER_TAKEN`.
 */
@Injectable()
export class DunningRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(organizationId: string, userId: string): Promise<{ items: DunningRuleView[] }> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.dunning_rules.findMany({ orderBy: { step_order: 'asc' } }),
    );
    return { items: rows.map((r) => toDunningRuleView(r as DunningRuleRecord)) };
  }

  async create(
    organizationId: string,
    userId: string,
    input: DunningRuleInput,
  ): Promise<DunningRuleView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = await this.guardStepOrder(() =>
        tx.dunning_rules.create({
          data: {
            id: newId(),
            organization_id: organizationId,
            name: input.name.trim(),
            step_order: input.stepOrder,
            trigger_type: input.triggerType ?? 'DAYS_AFTER_DUE',
            offset_days: input.offsetDays ?? 0,
            channel: (input.channel ?? 'WHATSAPP') as never,
            fallback_channel: (input.fallbackChannel ?? null) as never,
            template_id: input.templateId ?? null,
            min_balance_amount: input.minBalanceAmount ?? 0n,
            notify_landlord: input.notifyLandlord ?? false,
            notify_collector: input.notifyCollector ?? false,
            apply_penalty: input.applyPenalty ?? false,
            penalty_rule_id: input.penaltyRuleId ?? null,
            escalate_to_legal: input.escalateToLegal ?? false,
            send_hour_local: input.sendHourLocal ?? 9,
            skip_weekends: input.skipWeekends ?? false,
            is_active: input.isActive ?? true,
          },
        }),
      );
      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: 'DUNNING_RULE_CREATED',
        entityType: 'dunning_rules',
        entityId: row.id,
        newState: toJsonState(toDunningRuleView(row as DunningRuleRecord)),
      });
      return toDunningRuleView(row as DunningRuleRecord);
    });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: Partial<DunningRuleInput>,
  ): Promise<DunningRuleView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await tx.dunning_rules.findFirst({ where: { id } });
      if (!before) throw new DomainError('DUNNING.RULE_NOT_FOUND', { id });

      const after = await this.guardStepOrder(() =>
        tx.dunning_rules.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            ...(input.stepOrder !== undefined ? { step_order: input.stepOrder } : {}),
            ...(input.triggerType !== undefined ? { trigger_type: input.triggerType } : {}),
            ...(input.offsetDays !== undefined ? { offset_days: input.offsetDays } : {}),
            ...(input.channel !== undefined ? { channel: input.channel as never } : {}),
            ...(input.fallbackChannel !== undefined
              ? { fallback_channel: input.fallbackChannel as never }
              : {}),
            ...(input.templateId !== undefined ? { template_id: input.templateId } : {}),
            ...(input.minBalanceAmount !== undefined
              ? { min_balance_amount: input.minBalanceAmount }
              : {}),
            ...(input.notifyLandlord !== undefined
              ? { notify_landlord: input.notifyLandlord }
              : {}),
            ...(input.notifyCollector !== undefined
              ? { notify_collector: input.notifyCollector }
              : {}),
            ...(input.applyPenalty !== undefined ? { apply_penalty: input.applyPenalty } : {}),
            ...(input.penaltyRuleId !== undefined ? { penalty_rule_id: input.penaltyRuleId } : {}),
            ...(input.escalateToLegal !== undefined
              ? { escalate_to_legal: input.escalateToLegal }
              : {}),
            ...(input.sendHourLocal !== undefined ? { send_hour_local: input.sendHourLocal } : {}),
            ...(input.skipWeekends !== undefined ? { skip_weekends: input.skipWeekends } : {}),
            ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
            updated_at: new Date(),
          },
        }),
      );
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: 'DUNNING_RULE_UPDATED',
        entityType: 'dunning_rules',
        entityId: id,
        previousState: toJsonState(toDunningRuleView(before as DunningRuleRecord)),
        newState: toJsonState(toDunningRuleView(after as DunningRuleRecord)),
      });
      return toDunningRuleView(after as DunningRuleRecord);
    });
  }

  /**
   * Active/désactive une règle (arbitrage 3 : jamais de suppression).
   * N'affecte ni les relances déjà envoyées ni les pénalités déjà émises.
   */
  async setActive(
    organizationId: string,
    userId: string,
    id: string,
    isActive: boolean,
  ): Promise<DunningRuleView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await tx.dunning_rules.findFirst({ where: { id } });
      if (!before) throw new DomainError('DUNNING.RULE_NOT_FOUND', { id });
      const after = await tx.dunning_rules.update({
        where: { id },
        data: { is_active: isActive, updated_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: 'DUNNING_RULE_ACTIVATION_CHANGED',
        entityType: 'dunning_rules',
        entityId: id,
        previousState: { isActive: before.is_active },
        newState: { isActive: after.is_active },
      });
      return toDunningRuleView(after as DunningRuleRecord);
    });
  }

  private async guardStepOrder<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      // Aucun indice : `dunning_rules` ne porte qu'une seule contrainte
      // d'unicité, `dunning_rules_step_uk (organization_id, step_order)`.
      // Restreindre sur le texte de l'erreur échouait, Prisma ne renseignant
      // pas toujours la cible d'une contrainte absente de son schéma, et le
      // conflit ressortait alors en 500 au lieu du 409 attendu.
      if (isUniqueViolation(error)) throw new DomainError('DUNNING.STEP_ORDER_TAKEN');
      throw error;
    }
  }
}
