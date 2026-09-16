import { Injectable, Logger } from '@nestjs/common';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { InvoiceWriterService } from '../../billing/application/invoice-writer.service';
import { OPEN_INVOICE_STATUSES } from '../../billing/domain/invoice-status';
import { MeterReadingsService } from '../../meters/application/meter-readings.service';
import type { MeterReadingRow, MeterRow } from '../../meters/application/meter-views';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { valorize, type TariffTerms } from '../domain/tariff-engine';
import { UtilityTariffsService } from './utility-tariffs.service';

export interface UtilityRunInput {
  periodStart?: string;
  periodEnd?: string;
  propertyId?: string;
}

export interface SkippedLot {
  meterId: string;
  unitId: string | null;
  reason: 'NO_READING' | 'NO_UNIT' | 'NO_TARIFF' | 'NO_LEASE' | 'ESTIMATED_UNCONFIRMED' | 'PREPAID';
}

export interface UtilityRunReport {
  runId: string;
  status: 'DONE';
  created: number;
  skipped: SkippedLot[];
  errors: Array<{ meterId: string; message: string }>;
  periodStart: string;
  periodEnd: string;
}

/**
 * Campagne de refacturation des charges (`POST /v1/billing/utility-runs`).
 *
 * DÉCISION — pas de table dédiée : le DDL de la phase 8 ne porte aucune table
 * `utility_runs` (liste fermée du contrat § « Tables »). Le rapport est donc
 * conservé dans `audit_logs` (entityType `utility_runs`, entityId `runId`),
 * exactement comme `sync_batches.result` porte les conflits de la phase 5 —
 * même principe : réutiliser une colonne JSONB existante plutôt qu'ajouter
 * une table. La campagne s'exécute intégralement dans l'appel HTTP (borné :
 * un lot par compteur actif), ce qui reste largement sous les délais d'une
 * requête même à l'échelle de 200 lots ; `GET .../{runId}` relit l'écriture
 * d'audit.
 *
 * Idempotence : chaque compteur est traité par SA PROPRE transaction, qui ne
 * sélectionne que les relevés `is_invoiced = false AND is_estimated = false`
 * de la période — relancer la campagne ne traite donc plus les relevés déjà
 * facturés (contrat, arbitrage 2).
 */
@Injectable()
export class UtilityRunService {
  private readonly logger = new Logger(UtilityRunService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly tariffs: UtilityTariffsService,
    private readonly readings: MeterReadingsService,
    private readonly invoiceWriter: InvoiceWriterService,
  ) {}

  async run(
    organizationId: string,
    userId: string,
    input: UtilityRunInput,
  ): Promise<{ runId: string }> {
    const runId = newId();
    const today = new Date();
    const periodStart =
      input.periodStart ??
      new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const periodEnd =
      input.periodEnd ??
      new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const settings = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.organization_settings.findUnique({ where: { organization_id: organizationId } }),
    );
    const facilities = readOperationalSettings(settings?.settings_json ?? null).facilities;

    const meters = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<MeterRow[]>(
        `SELECT * FROM meters WHERE organization_id = $1::uuid AND is_active = true
           ${input.propertyId ? 'AND property_id = $2::uuid' : ''}
         ORDER BY created_at ASC`,
        ...(input.propertyId ? [organizationId, input.propertyId] : [organizationId]),
      ),
    );

    let created = 0;
    const skipped: SkippedLot[] = [];
    const errors: Array<{ meterId: string; message: string }> = [];

    for (const meter of meters) {
      try {
        const outcome = await this.processMeter(
          organizationId,
          userId,
          meter,
          periodStart,
          periodEnd,
          facilities.utilityFallbackFlat,
        );
        if (outcome.kind === 'created') created += 1;
        else skipped.push(outcome.skip);
      } catch (error) {
        this.logger.error(`Compteur ${meter.id} en échec : ${(error as Error).message}`);
        errors.push({ meterId: meter.id, message: (error as Error).message });
      }
    }

    const report: UtilityRunReport = {
      runId,
      status: 'DONE',
      created,
      skipped,
      errors,
      periodStart,
      periodEnd,
    };
    await this.prisma.withTenant(organizationId, userId, (tx) =>
      audit(this.auditService, tx, {
        action: 'EXPORT',
        operation: AUDIT_OPERATIONS.UTILITY_RUN_EXECUTED,
        entityType: 'utility_runs',
        entityId: runId,
        newState: toJsonState(report as unknown as Record<string, unknown>),
      }),
    );
    return { runId };
  }

  async status(
    organizationId: string,
    userId: string,
    runId: string,
  ): Promise<UtilityRunReport | null> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.audit_logs.findMany({
        where: { organization_id: organizationId, entity_type: 'utility_runs', entity_id: runId },
        orderBy: { created_at: 'desc' },
        take: 1,
      }),
    );
    const row = rows[0];
    if (!row) return null;
    return row.new_state as unknown as UtilityRunReport;
  }

  private async processMeter(
    organizationId: string,
    userId: string,
    meter: MeterRow,
    periodStart: string,
    periodEnd: string,
    utilityFallbackFlat: boolean,
  ): Promise<{ kind: 'created' } | { kind: 'skipped'; skip: SkippedLot }> {
    if (meter.is_prepaid)
      return {
        kind: 'skipped',
        skip: { meterId: meter.id, unitId: meter.unit_id, reason: 'PREPAID' },
      };
    if (!meter.unit_id)
      return { kind: 'skipped', skip: { meterId: meter.id, unitId: null, reason: 'NO_UNIT' } };

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const reading = (await this.readings.unbilledForMeter(
        tx,
        meter.id,
        periodStart,
        periodEnd,
      )) as MeterReadingRow | null;

      if (reading?.is_estimated) {
        return {
          kind: 'skipped',
          skip: {
            meterId: meter.id,
            unitId: meter.unit_id,
            reason: 'ESTIMATED_UNCONFIRMED' as const,
          },
        };
      }

      const leases = await tx.$queryRawUnsafe<
        Array<{ id: string; tenant_id: string; property_id: string; landlord_id: string }>
      >(
        `SELECT id, primary_tenant_id AS tenant_id, property_id, landlord_id FROM leases
          WHERE unit_id = $1::uuid AND status IN ('ACTIVE', 'NOTICE_GIVEN')
          ORDER BY start_date DESC LIMIT 1`,
        meter.unit_id,
      );
      const lease = leases[0];
      if (!lease) {
        return {
          kind: 'skipped',
          skip: { meterId: meter.id, unitId: meter.unit_id, reason: 'NO_LEASE' as const },
        };
      }

      const at = reading ? reading.reading_date : new Date(periodEnd);
      const tariffRow = await this.tariffs.resolveApplicable(
        tx,
        organizationId,
        meter.tariff_id,
        meter.property_id,
        meter.meter_type,
        at,
      );
      if (!tariffRow) {
        return {
          kind: 'skipped',
          skip: { meterId: meter.id, unitId: meter.unit_id, reason: 'NO_TARIFF' as const },
        };
      }
      const terms: TariffTerms = {
        basis: tariffRow.basis as TariffTerms['basis'],
        unitPriceAmount: tariffRow.unit_price_amount,
        flatAmount: tariffRow.flat_amount,
        standingChargeAmount: tariffRow.standing_charge_amount,
        minimumAmount: tariffRow.minimum_amount,
      };

      if (!reading) {
        if (!utilityFallbackFlat) {
          return {
            kind: 'skipped',
            skip: { meterId: meter.id, unitId: meter.unit_id, reason: 'NO_READING' as const },
          };
        }
        const { amount } = valorize(terms, {});
        const invoice = await this.findTargetInvoice(tx, lease.id, periodStart);
        if (!invoice) {
          return {
            kind: 'skipped',
            skip: { meterId: meter.id, unitId: meter.unit_id, reason: 'NO_LEASE' as const },
          };
        }
        await this.invoiceWriter.appendLine(tx, invoice, {
          lineType: tariffRow.invoice_line_type as 'WATER_CHARGE' | 'ELECTRICITY_CHARGE',
          label: `${tariffRow.label} — forfait (aucun relevé sur la période)`,
          unitPriceAmount: 0n,
          amount,
        });
        await this.invoiceWriter.recomputeTotals(tx, invoice.id);
        return { kind: 'created' };
      }

      const consumptionMilli = BigInt(Math.round(Number(reading.consumption) * 1000) || 0);
      const { amount } = valorize(terms, {
        consumptionMilli,
        sharedRatioBps: meter.shared_ratio_bps ?? undefined,
      });

      const invoice = await this.findTargetInvoice(tx, lease.id, periodStart);
      if (!invoice) {
        return {
          kind: 'skipped',
          skip: { meterId: meter.id, unitId: meter.unit_id, reason: 'NO_LEASE' as const },
        };
      }
      const lineId = await this.invoiceWriter.appendLine(tx, invoice, {
        lineType: tariffRow.invoice_line_type as 'WATER_CHARGE' | 'ELECTRICITY_CHARGE',
        label: `${tariffRow.label} — consommation du ${reading.reading_date.toISOString().slice(0, 10)}`,
        unitPriceAmount: tariffRow.unit_price_amount,
        amount,
        meterReadingId: reading.id,
      });
      await this.invoiceWriter.recomputeTotals(tx, invoice.id);
      await this.readings.markInvoiced(tx, reading.id, {
        tariffId: tariffRow.id,
        unitPriceAmount: tariffRow.unit_price_amount,
        computedAmount: amount,
        invoiceLineId: lineId,
      });
      return { kind: 'created' };
    });
  }

  private async findTargetInvoice(
    tx: { $queryRawUnsafe: <T>(sql: string, ...params: unknown[]) => Promise<T> },
    leaseId: string,
    periodStart: string,
  ): Promise<{ id: string; organization_id: string } | null> {
    const open = await tx.$queryRawUnsafe<Array<{ id: string; organization_id: string }>>(
      `SELECT id, organization_id FROM rent_invoices
        WHERE lease_id = $1::uuid AND status::text = ANY($2::text[])
        ORDER BY period_start DESC LIMIT 1`,
      leaseId,
      [...OPEN_INVOICE_STATUSES],
    );
    if (open[0]) return open[0];
    const draft = await tx.$queryRawUnsafe<Array<{ id: string; organization_id: string }>>(
      `SELECT id, organization_id FROM rent_invoices
        WHERE lease_id = $1::uuid AND status = 'DRAFT' AND period_start >= $2::date
        ORDER BY period_start ASC LIMIT 1`,
      leaseId,
      periodStart,
    );
    return draft[0] ?? null;
  }
}
