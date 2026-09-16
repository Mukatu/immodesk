import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoDate } from '../../parties/application/party-views';

export interface UtilityTariffRow {
  id: string;
  organization_id: string;
  property_id: string | null;
  meter_type: string;
  basis: string;
  label: string;
  unit_price_amount: bigint;
  flat_amount: bigint;
  standing_charge_amount: bigint;
  minimum_amount: bigint;
  measurement_unit: string;
  invoice_line_type: string;
  effective_from: Date;
  effective_to: Date | null;
  is_active: boolean;
  currency: string;
}

export interface UtilityTariffView {
  id: string;
  propertyId: string | null;
  meterType: string;
  basis: string;
  label: string;
  unitPriceAmount: number;
  flatAmount: number;
  standingChargeAmount: number;
  minimumAmount: number;
  measurementUnit: string;
  invoiceLineType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  currency: 'XAF';
}

export function toUtilityTariffView(row: UtilityTariffRow): UtilityTariffView {
  return {
    id: row.id,
    propertyId: row.property_id,
    meterType: row.meter_type,
    basis: row.basis,
    label: row.label,
    unitPriceAmount: toJsonAmount(row.unit_price_amount),
    flatAmount: toJsonAmount(row.flat_amount),
    standingChargeAmount: toJsonAmount(row.standing_charge_amount),
    minimumAmount: toJsonAmount(row.minimum_amount),
    measurementUnit: row.measurement_unit,
    invoiceLineType: row.invoice_line_type,
    effectiveFrom: toIsoDate(row.effective_from) as string,
    effectiveTo: toIsoDate(row.effective_to),
    isActive: row.is_active,
    currency: 'XAF',
  };
}
