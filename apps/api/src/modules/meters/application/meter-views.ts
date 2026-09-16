import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate, toIsoInstant } from '../../parties/application/party-views';
import { milliToDecimal, decimalToMilli } from '../domain/meter-rules';

export interface MeterRow {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string | null;
  meter_type: string;
  serial_number: string;
  subscriber_number: string | null;
  provider_name: string | null;
  is_prepaid: boolean;
  is_shared: boolean;
  shared_ratio_bps: number | null;
  measurement_unit: string;
  digits_count: number;
  initial_index: unknown;
  tariff_id: string | null;
  installed_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MeterView {
  id: string;
  propertyId: string;
  unitId: string | null;
  meterType: string;
  serialNumber: string;
  subscriberNumber: string | null;
  providerName: string | null;
  isPrepaid: boolean;
  isShared: boolean;
  sharedRatioBps: number | null;
  measurementUnit: string;
  digitsCount: number;
  initialIndex: number;
  tariffId: string | null;
  installedAt: string | null;
  isActive: boolean;
  lastReading: { readingDate: string; currentIndex: number } | null;
}

export function toMeterView(
  row: MeterRow,
  lastReading?: { reading_date: Date; current_index: unknown } | null,
): MeterView {
  return {
    id: row.id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    meterType: row.meter_type,
    serialNumber: row.serial_number,
    subscriberNumber: row.subscriber_number,
    providerName: row.provider_name,
    isPrepaid: row.is_prepaid,
    isShared: row.is_shared,
    sharedRatioBps: row.shared_ratio_bps,
    measurementUnit: row.measurement_unit,
    digitsCount: row.digits_count,
    initialIndex: Number(milliToDecimal(decimalToMilli(row.initial_index))),
    tariffId: row.tariff_id,
    installedAt: toIsoDate(row.installed_at),
    isActive: row.is_active,
    lastReading: lastReading
      ? {
          readingDate: toIsoDate(lastReading.reading_date) as string,
          currentIndex: Number(milliToDecimal(decimalToMilli(lastReading.current_index))),
        }
      : null,
  };
}

export interface MeterReadingRow {
  id: string;
  organization_id: string;
  meter_id: string;
  unit_id: string | null;
  lease_id: string | null;
  reading_date: Date;
  period_start: Date | null;
  period_end: Date | null;
  previous_index: unknown;
  current_index: unknown;
  consumption: unknown;
  rollover_applied: boolean;
  tariff_id: string | null;
  unit_price_amount: bigint;
  computed_amount: bigint;
  currency: string;
  is_estimated: boolean;
  is_invoiced: boolean;
  invoice_line_id: string | null;
  photo_document_id: string | null;
  recorded_by_user_id: string | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MeterReadingView {
  id: string;
  meterId: string;
  unitId: string | null;
  leaseId: string | null;
  readingDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  previousIndex: number;
  currentIndex: number;
  consumption: number;
  rolloverApplied: boolean;
  isEstimated: boolean;
  photoDocumentId: string | null;
  notes: string | null;
  clientRef: string | null;
  tariffId: string | null;
  unitPriceAmount: number;
  computedAmount: number;
  isInvoiced: boolean;
  invoiceLineId: string | null;
  recordedByUserId: string | null;
}

export function toMeterReadingView(row: MeterReadingRow): MeterReadingView {
  return {
    id: row.id,
    meterId: row.meter_id,
    unitId: row.unit_id,
    leaseId: row.lease_id,
    readingDate: toIsoDate(row.reading_date) as string,
    periodStart: toIsoDate(row.period_start),
    periodEnd: toIsoDate(row.period_end),
    previousIndex: Number(milliToDecimal(decimalToMilli(row.previous_index))),
    currentIndex: Number(milliToDecimal(decimalToMilli(row.current_index))),
    consumption: Number(milliToDecimal(decimalToMilli(row.consumption))),
    rolloverApplied: row.rollover_applied,
    isEstimated: row.is_estimated,
    photoDocumentId: row.photo_document_id,
    notes: row.notes,
    clientRef: row.client_ref,
    tariffId: row.tariff_id,
    unitPriceAmount: toJsonAmount(row.unit_price_amount),
    computedAmount: toJsonAmount(row.computed_amount),
    isInvoiced: row.is_invoiced,
    invoiceLineId: row.invoice_line_id,
    recordedByUserId: row.recorded_by_user_id,
  };
}

export { toIsoInstant };
