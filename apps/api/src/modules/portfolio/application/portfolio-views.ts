import { toJsonAmount } from '../../../shared/money/amount';
import { toLandlordSummary, type LandlordSummaryView } from '../../parties/application/party-views';
import type { Occupancy } from '../domain/occupancy';

export interface PropertyRow {
  id: string;
  landlord_id: string;
  code: string | null;
  name: string;
  property_type: string;
  address_line: string;
  district: string;
  arrondissement: string | null;
  landmark: string | null;
  city: string;
  country_code: string;
  latitude: unknown;
  longitude: unknown;
  land_title_reference: string | null;
  parcel_number: string | null;
  built_year: number | null;
  total_area_sqm: unknown;
  floors_count: number | null;
  units_count: number;
  has_water: boolean;
  has_electricity: boolean;
  has_borehole: boolean;
  caretaker_name: string | null;
  caretaker_phone: string | null;
  cover_document_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PropertyView {
  id: string;
  landlordId: string;
  code: string | null;
  name: string;
  propertyType: string;
  addressLine: string;
  district: string;
  arrondissement: string | null;
  landmark: string | null;
  city: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  landTitleReference: string | null;
  parcelNumber: string | null;
  builtYear: number | null;
  totalAreaSqm: number | null;
  floorsCount: number | null;
  unitsCount: number;
  hasWater: boolean;
  hasElectricity: boolean;
  hasBorehole: boolean;
  caretakerName: string | null;
  caretakerPhone: string | null;
  coverDocumentId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** `NUMERIC` PostgreSQL → nombre JSON. Jamais utilisé pour un montant. */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value.toString());
}

export function toPropertyView(row: PropertyRow): PropertyView {
  return {
    id: row.id,
    landlordId: row.landlord_id,
    code: row.code,
    name: row.name,
    propertyType: row.property_type,
    addressLine: row.address_line,
    district: row.district,
    arrondissement: row.arrondissement,
    landmark: row.landmark,
    city: row.city,
    countryCode: row.country_code,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    landTitleReference: row.land_title_reference,
    parcelNumber: row.parcel_number,
    builtYear: row.built_year,
    totalAreaSqm: toNumberOrNull(row.total_area_sqm),
    floorsCount: row.floors_count,
    unitsCount: row.units_count,
    hasWater: row.has_water,
    hasElectricity: row.has_electricity,
    hasBorehole: row.has_borehole,
    caretakerName: row.caretaker_name,
    caretakerPhone: row.caretaker_phone,
    coverDocumentId: row.cover_document_id,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}

export interface PropertySummaryView {
  id: string;
  code: string | null;
  name: string;
  propertyType: string;
  district: string;
  city: string;
  landlord: LandlordSummaryView;
  occupancy: Occupancy;
  coverDocumentId: string | null;
}

export function toPropertySummary(
  row: PropertyRow & {
    landlord_party_type: string;
    landlord_first_name: string | null;
    landlord_last_name: string | null;
    landlord_company_name: string | null;
    landlord_primary_phone: string;
    landlord_is_self: boolean;
  },
  occupancy: Occupancy,
): PropertySummaryView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    propertyType: row.property_type,
    district: row.district,
    city: row.city,
    landlord: toLandlordSummary({
      id: row.landlord_id,
      party_type: row.landlord_party_type,
      first_name: row.landlord_first_name,
      last_name: row.landlord_last_name,
      company_name: row.landlord_company_name,
      primary_phone: row.landlord_primary_phone,
      is_self: row.landlord_is_self,
    }),
    occupancy,
    coverDocumentId: row.cover_document_id,
  };
}

export interface UnitRow {
  id: string;
  property_id: string;
  code: string;
  label: string | null;
  unit_type: string;
  status: string;
  floor_number: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  area_sqm: unknown;
  is_furnished: boolean;
  has_private_meter: boolean;
  base_rent_amount: bigint;
  base_charges_amount: bigint;
  deposit_months: number;
  currency: string;
  amenities: unknown;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UnitView {
  id: string;
  propertyId: string;
  code: string;
  label: string | null;
  unitType: string;
  status: string;
  floorNumber: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  bathroomsCount: number | null;
  areaSqm: number | null;
  isFurnished: boolean;
  hasPrivateMeter: boolean;
  baseRentAmount: number;
  baseChargesAmount: number;
  depositMonths: number;
  currency: string;
  amenities: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toUnitView(row: UnitRow): UnitView {
  return {
    id: row.id,
    propertyId: row.property_id,
    code: row.code,
    label: row.label,
    unitType: row.unit_type,
    status: row.status,
    floorNumber: row.floor_number,
    roomsCount: row.rooms_count,
    bedroomsCount: row.bedrooms_count,
    bathroomsCount: row.bathrooms_count,
    areaSqm: toNumberOrNull(row.area_sqm),
    isFurnished: row.is_furnished,
    hasPrivateMeter: row.has_private_meter,
    // Montants XAF : BigInt en base, entier JSON en sortie. La garde refuse
    // toute valeur qui ne tiendrait pas exactement dans un nombre JavaScript.
    baseRentAmount: toJsonAmount(row.base_rent_amount),
    baseChargesAmount: toJsonAmount(row.base_charges_amount),
    depositMonths: row.deposit_months,
    currency: row.currency,
    amenities: (row.amenities as Record<string, unknown>) ?? {},
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}
