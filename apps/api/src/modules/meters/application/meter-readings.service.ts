import { Injectable } from '@nestjs/common';
import { DomainError, notFound } from '../../../shared/errors/domain-error';
import { AppConfigService } from '../../../shared/config/config.module';
import { newId } from '../../../shared/ids/uuid';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { computeReading, decimalToMilli, milliToDecimal, toMilli } from '../domain/meter-rules';
import { toMeterReadingView, type MeterReadingRow } from './meter-views';

export interface MeterReadingInput {
  readingDate: string;
  currentIndex: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  rolloverApplied?: boolean;
  isEstimated?: boolean;
  photoDocumentId?: string | null;
  notes?: string | null;
  clientRef: string;
}

export interface ReadingHistoryFilters {
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Relevés de compteur (`meter_readings`) : l'index précédent et la
 * consommation sont TOUJOURS calculés par le serveur (contrat, § « Compteurs,
 * relevés et charges »), jamais fournis par l'appelant.
 */
@Injectable()
export class MeterReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    organizationId: string,
    userId: string | null,
    meterId: string,
    input: MeterReadingInput,
  ): Promise<{ reading: MeterReadingRow; replayed: boolean }> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      if (input.clientRef) {
        const existing = (await tx.meter_readings.findFirst({
          where: { client_ref: input.clientRef },
        })) as unknown as MeterReadingRow | null;
        if (existing) return { reading: existing, replayed: true };
      }

      const meter = await tx.meters.findFirst({ where: { id: meterId, is_active: true } });
      if (!meter) throw notFound('meters', meterId);

      const readingDate = new Date(input.readingDate);
      const duplicate = await tx.meter_readings.findFirst({
        where: { meter_id: meterId, reading_date: readingDate },
      });
      if (duplicate) {
        throw new DomainError('METERS.READING_DUPLICATE_DATE', {
          meterId,
          readingDate: input.readingDate,
        });
      }

      const previous = await tx.$queryRawUnsafe<Array<{ current_index: unknown }>>(
        `SELECT current_index FROM meter_readings
          WHERE meter_id = $1::uuid AND reading_date < $2::date
          ORDER BY reading_date DESC, created_at DESC LIMIT 1`,
        meterId,
        input.readingDate,
      );
      const previousIndexMilli = previous[0]
        ? decimalToMilli(previous[0].current_index)
        : decimalToMilli(meter.initial_index);
      const currentIndexMilli = toMilli(input.currentIndex);

      const { consumptionMilli, rolloverApplied } = computeReading({
        previousIndexMilli,
        currentIndexMilli,
        digitsCount: meter.digits_count,
        rolloverApplied: input.rolloverApplied,
      });

      let leaseId: string | null = null;
      if (meter.unit_id) {
        const leases = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM leases WHERE unit_id = $1::uuid AND status IN ('ACTIVE', 'NOTICE_GIVEN')
            ORDER BY start_date DESC LIMIT 1`,
          meter.unit_id,
        );
        leaseId = leases[0]?.id ?? null;
      }

      const id = newId();
      try {
        const created = (await tx.meter_readings.create({
          data: {
            id,
            organization_id: organizationId,
            meter_id: meterId,
            unit_id: meter.unit_id,
            lease_id: leaseId,
            reading_date: readingDate,
            period_start: input.periodStart ? new Date(input.periodStart) : null,
            period_end: input.periodEnd ? new Date(input.periodEnd) : null,
            previous_index: milliToDecimal(previousIndexMilli),
            current_index: milliToDecimal(currentIndexMilli),
            consumption: milliToDecimal(consumptionMilli),
            rollover_applied: rolloverApplied,
            is_estimated: input.isEstimated ?? false,
            photo_document_id: input.photoDocumentId ?? null,
            recorded_by_user_id: userId,
            client_ref: input.clientRef ?? null,
            notes: input.notes ?? null,
          },
        })) as unknown as MeterReadingRow;

        await audit(this.auditService, tx, {
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.METER_READING_RECORDED,
          entityType: 'meter_readings',
          entityId: id,
          newState: toJsonState({
            meterId,
            readingDate: input.readingDate,
            consumption: milliToDecimal(consumptionMilli),
            rolloverApplied,
            isEstimated: input.isEstimated ?? false,
          }),
        });
        return { reading: created, replayed: false };
      } catch (error) {
        if (isUniqueViolation(error, 'client_ref_uk')) {
          const existing = (await tx.meter_readings.findFirst({
            where: { client_ref: input.clientRef },
          })) as unknown as MeterReadingRow;
          return { reading: existing, replayed: true };
        }
        throw error;
      }
    });
  }

  /** `PATCH /v1/meter-readings/{id}` : confirme un relevé estimé, avant facturation. */
  async confirm(organizationId: string, userId: string, id: string): Promise<MeterReadingRow> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = (await tx.meter_readings.findFirst({
        where: { id },
      })) as unknown as MeterReadingRow | null;
      if (!before) throw notFound('meter_readings', id);
      if (before.is_invoiced) {
        throw new DomainError('METERS.READING_ALREADY_INVOICED', { readingId: id });
      }
      if (!before.is_estimated) {
        throw new DomainError('METERS.READING_ALREADY_CONFIRMED', { readingId: id });
      }
      const after = (await tx.meter_readings.update({
        where: { id },
        data: { is_estimated: false, updated_at: new Date() },
      })) as unknown as MeterReadingRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.METER_READING_CONFIRMED,
        entityType: 'meter_readings',
        entityId: id,
        previousState: toJsonState({ isEstimated: true }),
        newState: toJsonState({ isEstimated: false }),
      });
      return after;
    });
  }

  async history(
    organizationId: string,
    userId: string,
    meterId: string,
    filters: ReadingHistoryFilters,
  ): Promise<Page<ReturnType<typeof toMeterReadingView>> & { consumptionSeries: number[] }> {
    const conditions = ['r.organization_id = $1::uuid', 'r.meter_id = $2::uuid'];
    const params: unknown[] = [organizationId, meterId];
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`r.reading_date >= $${params.length}::date`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`r.reading_date <= $${params.length}::date`);
    }
    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'r');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<MeterReadingRow[]>(
        `SELECT r.* FROM meter_readings r WHERE ${conditions.join(' AND ')} ${keysetOrderBy('r')} LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    const items = page.items.map(toMeterReadingView);
    return {
      items,
      pageInfo: page.pageInfo,
      consumptionSeries: [...items].reverse().map((r) => r.consumption),
    };
  }

  /** Lu par `utilities` : relevés non facturés d'une période, dans SA transaction. */
  async unbilledForMeter(
    tx: TenantClient,
    meterId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<MeterReadingRow | null> {
    const rows = await tx.$queryRawUnsafe<MeterReadingRow[]>(
      `SELECT * FROM meter_readings
        WHERE meter_id = $1::uuid AND is_invoiced = false
          AND reading_date >= $2::date AND reading_date <= $3::date
        ORDER BY reading_date DESC LIMIT 1`,
      meterId,
      periodStart,
      periodEnd,
    );
    return rows[0] ?? null;
  }

  /** Marque un relevé facturé, dans la transaction de la campagne (`utilities`). */
  async markInvoiced(
    tx: TenantClient,
    readingId: string,
    input: {
      tariffId: string | null;
      unitPriceAmount: bigint;
      computedAmount: bigint;
      invoiceLineId: string;
    },
  ): Promise<void> {
    await tx.$executeRawUnsafe(
      `UPDATE meter_readings
          SET tariff_id = $2::uuid, unit_price_amount = $3::bigint, computed_amount = $4::bigint,
              is_invoiced = true, invoice_line_id = $5::uuid, updated_at = now()
        WHERE id = $1::uuid`,
      readingId,
      input.tariffId,
      input.unitPriceAmount.toString(),
      input.computedAmount.toString(),
      input.invoiceLineId,
    );
  }
}
