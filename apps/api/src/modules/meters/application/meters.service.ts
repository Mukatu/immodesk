import { Injectable } from '@nestjs/common';
import { DomainError, notFound } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { AppConfigService } from '../../../shared/config/config.module';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { milliToDecimal, toMilli, type MeterType } from '../domain/meter-rules';
import { toMeterView, type MeterReadingRow, type MeterRow, type MeterView } from './meter-views';

export interface MeterInput {
  propertyId: string;
  unitId?: string | null;
  meterType: MeterType;
  serialNumber: string;
  subscriberNumber?: string | null;
  providerName?: string | null;
  isPrepaid?: boolean;
  isShared?: boolean;
  sharedRatioBps?: number | null;
  measurementUnit?: string;
  digitsCount?: number;
  initialIndex?: number;
  tariffId?: string | null;
  installedAt?: string | null;
}

export interface MeterUpdateInput {
  unitId?: string | null;
  subscriberNumber?: string | null;
  providerName?: string | null;
  isPrepaid?: boolean;
  isShared?: boolean;
  sharedRatioBps?: number | null;
  tariffId?: string | null;
  isActive?: boolean;
}

export interface MeterListFilters {
  propertyId?: string;
  unitId?: string;
  meterType?: string;
  limit?: number;
  cursor?: string;
}

/** CRUD des compteurs (`meters`), propriétaire exclusif de la table. */
@Injectable()
export class MetersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
  ) {}

  async create(organizationId: string, userId: string, input: MeterInput): Promise<MeterView> {
    const id = newId();
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      try {
        const created = (await tx.meters.create({
          data: {
            id,
            organization_id: organizationId,
            property_id: input.propertyId,
            unit_id: input.unitId ?? null,
            meter_type: input.meterType,
            serial_number: input.serialNumber,
            subscriber_number: input.subscriberNumber ?? null,
            provider_name: input.providerName ?? null,
            is_prepaid: input.isPrepaid ?? false,
            is_shared: input.isShared ?? false,
            shared_ratio_bps: input.sharedRatioBps ?? null,
            measurement_unit: input.measurementUnit ?? 'kWh',
            digits_count: input.digitsCount ?? 6,
            initial_index: milliToDecimal(toMilli(input.initialIndex ?? 0)),
            tariff_id: input.tariffId ?? null,
            installed_at: input.installedAt ? new Date(input.installedAt) : null,
          },
        })) as unknown as MeterRow;

        await audit(this.auditService, tx, {
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.METER_CREATED,
          entityType: 'meters',
          entityId: id,
          newState: toJsonState({ serialNumber: input.serialNumber, meterType: input.meterType }),
        });
        return toMeterView(created);
      } catch (error) {
        if (isUniqueViolation(error, 'serial_uk')) {
          throw new DomainError('METERS.SERIAL_TAKEN', { serialNumber: input.serialNumber });
        }
        throw error;
      }
    });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: MeterUpdateInput,
  ): Promise<MeterView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = (await tx.meters.findFirst({ where: { id } })) as unknown as MeterRow | null;
      if (!before) throw notFound('meters', id);

      const after = (await tx.meters.update({
        where: { id },
        data: {
          ...(input.unitId !== undefined ? { unit_id: input.unitId } : {}),
          ...(input.subscriberNumber !== undefined
            ? { subscriber_number: input.subscriberNumber }
            : {}),
          ...(input.providerName !== undefined ? { provider_name: input.providerName } : {}),
          ...(input.isPrepaid !== undefined ? { is_prepaid: input.isPrepaid } : {}),
          ...(input.isShared !== undefined ? { is_shared: input.isShared } : {}),
          ...(input.sharedRatioBps !== undefined ? { shared_ratio_bps: input.sharedRatioBps } : {}),
          ...(input.tariffId !== undefined ? { tariff_id: input.tariffId } : {}),
          ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
          updated_at: new Date(),
        },
      })) as unknown as MeterRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.METER_UPDATED,
        entityType: 'meters',
        entityId: id,
        previousState: toJsonState(before),
        newState: toJsonState(after),
      });
      return toMeterView(after);
    });
  }

  async findById(organizationId: string, userId: string, id: string): Promise<MeterView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = (await tx.meters.findFirst({ where: { id } })) as unknown as MeterRow | null;
      if (!row) throw notFound('meters', id);
      const last = await this.lastReading(tx as never, id);
      return toMeterView(row, last);
    });
  }

  /** Dernier relevé, pour `Meter.lastReading` — utilisé aussi par `MeterReadingsService`. */
  async lastReading(
    tx: { $queryRawUnsafe: <T>(sql: string, ...params: unknown[]) => Promise<T> },
    meterId: string,
  ): Promise<{ reading_date: Date; current_index: unknown } | null> {
    const rows = await tx.$queryRawUnsafe<Array<{ reading_date: Date; current_index: unknown }>>(
      `SELECT reading_date, current_index FROM meter_readings
        WHERE meter_id = $1::uuid ORDER BY reading_date DESC, created_at DESC LIMIT 1`,
      meterId,
    );
    return rows[0] ?? null;
  }

  async list(
    organizationId: string,
    userId: string,
    filters: MeterListFilters,
  ): Promise<Page<MeterView>> {
    const conditions = ['m.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    if (filters.propertyId) {
      params.push(filters.propertyId);
      conditions.push(`m.property_id = $${params.length}::uuid`);
    }
    if (filters.unitId) {
      params.push(filters.unitId);
      conditions.push(`m.unit_id = $${params.length}::uuid`);
    }
    if (filters.meterType) {
      params.push(filters.meterType);
      conditions.push(`m.meter_type = $${params.length}::meter_type`);
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'm');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<MeterRow[]>(
        `SELECT m.* FROM meters m WHERE ${conditions.join(' AND ')} ${keysetOrderBy('m')} LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map((r) => toMeterView(r)), pageInfo: page.pageInfo };
  }

  /** Lu par `utilities` : le compteur brut, sans mise en forme, dans la transaction de l'appelant. */
  async loadRaw(
    tx: { meters: { findFirst: (args: unknown) => Promise<unknown> } },
    id: string,
  ): Promise<MeterRow | null> {
    return (await tx.meters.findFirst({ where: { id, is_active: true } })) as MeterRow | null;
  }
}

export type { MeterReadingRow };
