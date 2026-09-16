import { Injectable } from '@nestjs/common';
import { DomainError, notFound } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { TariffBasis } from '../domain/tariff-engine';
import { toUtilityTariffView, type UtilityTariffRow, type UtilityTariffView } from './tariff-views';

export interface UtilityTariffInput {
  propertyId?: string | null;
  meterType: string;
  basis?: TariffBasis;
  label: string;
  unitPriceAmount?: number | string;
  flatAmount?: number | string;
  standingChargeAmount?: number | string;
  minimumAmount?: number | string;
  measurementUnit?: string;
  invoiceLineType?: 'WATER_CHARGE' | 'ELECTRICITY_CHARGE';
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface UtilityTariffUpdateInput {
  label?: string;
  unitPriceAmount?: number | string;
  flatAmount?: number | string;
  standingChargeAmount?: number | string;
  minimumAmount?: number | string;
  effectiveTo?: string | null;
  isActive?: boolean;
}

/** Grilles tarifaires (`utility_tariffs`), versionnées par date d'effet. */
@Injectable()
export class UtilityTariffsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: UtilityTariffInput,
  ): Promise<UtilityTariffView> {
    const effectiveFrom = new Date(input.effectiveFrom);
    const effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new DomainError('UTILITIES.TARIFF_PERIOD_INVALID', {
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
      });
    }
    const id = newId();
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const created = (await tx.utility_tariffs.create({
        data: {
          id,
          organization_id: organizationId,
          property_id: input.propertyId ?? null,
          meter_type: input.meterType as never,
          basis: (input.basis ?? 'PER_UNIT_CONSUMED') as never,
          label: input.label,
          unit_price_amount: toAmount(input.unitPriceAmount ?? 0),
          flat_amount: toAmount(input.flatAmount ?? 0),
          standing_charge_amount: toAmount(input.standingChargeAmount ?? 0),
          minimum_amount: toAmount(input.minimumAmount ?? 0),
          measurement_unit: input.measurementUnit ?? 'kWh',
          invoice_line_type: (input.invoiceLineType ?? 'ELECTRICITY_CHARGE') as never,
          effective_from: effectiveFrom,
          effective_to: effectiveTo,
        },
      })) as unknown as UtilityTariffRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.UTILITY_TARIFF_CREATED,
        entityType: 'utility_tariffs',
        entityId: id,
        newState: toJsonState({ label: input.label, meterType: input.meterType }),
      });
      return toUtilityTariffView(created);
    });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: UtilityTariffUpdateInput,
  ): Promise<UtilityTariffView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = (await tx.utility_tariffs.findFirst({
        where: { id },
      })) as unknown as UtilityTariffRow | null;
      if (!before) throw notFound('utility_tariffs', id);

      const after = (await tx.utility_tariffs.update({
        where: { id },
        data: {
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.unitPriceAmount !== undefined
            ? { unit_price_amount: toAmount(input.unitPriceAmount) }
            : {}),
          ...(input.flatAmount !== undefined ? { flat_amount: toAmount(input.flatAmount) } : {}),
          ...(input.standingChargeAmount !== undefined
            ? { standing_charge_amount: toAmount(input.standingChargeAmount) }
            : {}),
          ...(input.minimumAmount !== undefined
            ? { minimum_amount: toAmount(input.minimumAmount) }
            : {}),
          ...(input.effectiveTo !== undefined
            ? { effective_to: input.effectiveTo ? new Date(input.effectiveTo) : null }
            : {}),
          ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
          updated_at: new Date(),
        },
      })) as unknown as UtilityTariffRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.UTILITY_TARIFF_UPDATED,
        entityType: 'utility_tariffs',
        entityId: id,
        previousState: toJsonState(before),
        newState: toJsonState(after),
      });
      return toUtilityTariffView(after);
    });
  }

  async list(
    organizationId: string,
    userId: string,
    filters: { propertyId?: string; meterType?: string; activeOnly?: boolean },
  ): Promise<{ items: UtilityTariffView[] }> {
    const conditions = ['organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    if (filters.propertyId) {
      params.push(filters.propertyId);
      conditions.push(`(property_id = $${params.length}::uuid OR property_id IS NULL)`);
    }
    if (filters.meterType) {
      params.push(filters.meterType);
      conditions.push(`meter_type = $${params.length}::meter_type`);
    }
    if (filters.activeOnly) conditions.push('is_active = true');

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<UtilityTariffRow[]>(
        `SELECT * FROM utility_tariffs WHERE ${conditions.join(' AND ')}
          ORDER BY effective_from DESC LIMIT 500`,
        ...params,
      ),
    );
    return { items: rows.map(toUtilityTariffView) };
  }

  /**
   * Grille applicable à un relevé : celle du compteur si `tariffId` est fixé,
   * sinon la grille active du bien pour ce type d'énergie à la date donnée,
   * sinon la grille active de l'organisation (`property_id IS NULL`).
   */
  async resolveApplicable(
    tx: TenantClient,
    organizationId: string,
    meterTariffId: string | null,
    propertyId: string,
    meterType: string,
    at: Date,
  ): Promise<UtilityTariffRow | null> {
    if (meterTariffId) {
      const row = (await tx.utility_tariffs.findFirst({
        where: { id: meterTariffId, is_active: true },
      })) as unknown as UtilityTariffRow | null;
      if (row) return row;
    }
    const rows = await tx.$queryRawUnsafe<UtilityTariffRow[]>(
      `SELECT * FROM utility_tariffs
        WHERE organization_id = $1::uuid AND meter_type = $2::meter_type AND is_active = true
          AND effective_from <= $3::date AND (effective_to IS NULL OR effective_to >= $3::date)
          AND (property_id = $4::uuid OR property_id IS NULL)
        ORDER BY property_id NULLS LAST, effective_from DESC LIMIT 1`,
      organizationId,
      meterType,
      at.toISOString().slice(0, 10),
      propertyId,
    );
    return rows[0] ?? null;
  }
}
