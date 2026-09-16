/**
 * Mock MSW — Phase 8 (compteurs, relevés, grilles tarifaires), état en
 * mémoire, conformes à docs/api/phase8-contract.md. Suit le principe
 * d'agency-seed.ts : Maps exportées, types `*Mock` locaux indépendants de
 * '@/lib/api/types'.
 */

export type MeterTypeMock =
  'ELECTRICITY_E2C' | 'WATER_LCDE' | 'GAS' | 'PRIVATE_SUBMETER' | 'SOLAR' | 'OTHER';

export type TariffBasisMock =
  'PER_UNIT_CONSUMED' | 'FLAT_MONTHLY' | 'PER_OCCUPANT' | 'PER_SQUARE_METER' | 'SHARED_PRORATA';

export interface MockMeter {
  id: string;
  organizationId: string;
  propertyId: string;
  unitId?: string;
  meterType: MeterTypeMock;
  serialNumber: string;
  subscriberNumber?: string;
  providerName?: string;
  isPrepaid: boolean;
  isShared: boolean;
  sharedRatioBps?: number;
  measurementUnit?: string;
  digitsCount: number;
  initialIndex: number;
  tariffId?: string;
  installedAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MockMeterReading {
  id: string;
  organizationId: string;
  meterId: string;
  unitId: string | null;
  leaseId: string | null;
  readingDate: string;
  currentIndex: number;
  previousIndex: number;
  consumption: number;
  periodStart?: string;
  periodEnd?: string;
  rolloverApplied: boolean;
  isEstimated: boolean;
  photoDocumentId?: string;
  notes?: string;
  clientRef: string;
  tariffId: string | null;
  unitPriceAmount: number;
  computedAmount: number;
  isInvoiced: boolean;
  invoiceLineId: string | null;
  recordedByUserId: string | null;
  createdAt: string;
}

export interface MockUtilityTariff {
  id: string;
  organizationId: string;
  propertyId?: string;
  meterType: MeterTypeMock;
  basis: TariffBasisMock;
  label: string;
  unitPriceAmount: number;
  flatAmount: number;
  standingChargeAmount: number;
  minimumAmount: number;
  measurementUnit?: string;
  invoiceLineType: 'WATER_CHARGE' | 'ELECTRICITY_CHARGE';
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

export const meters = new Map<string, MockMeter>();
export const meterReadings = new Map<string, MockMeterReading>();
export const utilityTariffs = new Map<string, MockUtilityTariff>();

export interface MockUtilityRun {
  id: string;
  organizationId: string;
  status: 'RUNNING' | 'DONE' | 'FAILED';
  created: number;
  skipped: { unitId: string; propertyId: string; reason: string }[];
  errors: { meterId?: string; unitId?: string; reason: string }[];
  createdAt: string;
}

export const utilityRuns = new Map<string, MockUtilityRun>();

/** Détermine le type de ligne de facture produit par un type de compteur (rappel du contrat). */
export function invoiceLineTypeForMeterType(
  meterType: MeterTypeMock,
): 'WATER_CHARGE' | 'ELECTRICITY_CHARGE' {
  return meterType === 'WATER_LCDE' ? 'WATER_CHARGE' : 'ELECTRICITY_CHARGE';
}
