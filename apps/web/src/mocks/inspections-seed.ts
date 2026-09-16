/**
 * Mock MSW — Phase 8 (états des lieux), état en mémoire, conformes à
 * docs/api/phase8-contract.md. Suit le principe d'agency-seed.ts : Maps
 * exportées, types `*Mock` locaux indépendants de '@/lib/api/types'.
 */

export type InspectionTypeMock = 'MOVE_IN' | 'MOVE_OUT' | 'PERIODIC' | 'CONTRADICTORY';
export type InspectionStatusMock =
  'DRAFT' | 'IN_PROGRESS' | 'PENDING_SIGNATURE' | 'SIGNED' | 'DISPUTED' | 'CANCELLED';
export type InspectionConditionMock = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'MISSING';
export type ChargedToMock = 'LANDLORD' | 'TENANT' | 'ORGANIZATION';

export interface MockInspection {
  id: string;
  organizationId: string;
  reference: string;
  status: InspectionStatusMock;
  unitId: string;
  propertyId: string;
  leaseId?: string;
  tenantId?: string;
  inspectionType: InspectionTypeMock;
  scheduledAt?: string;
  tenantPresent?: boolean;
  landlordPresent?: boolean;
  keysHandedCount?: number;
  notes?: string;
  clientRef?: string;
  overallCondition: InspectionConditionMock | null;
  totalDamageAmount: number;
  performedAt: string | null;
  performedByUserId: string | null;
  tenantSignedAt: string | null;
  agentSignedAt: string | null;
  reportDocumentId: string | null;
  disputeReason: string | null;
  absenceReason?: string | null;
  createdAt: string;
}

export interface MockInspectionPhoto {
  id: string;
  organizationId: string;
  inspectionId: string;
  inspectionItemId: string | null;
  documentId: string;
  caption: string | null;
  takenAt: string | null;
  checksumSha256: string | null;
  position: number;
}

export interface MockInspectionItem {
  id: string;
  organizationId: string;
  inspectionId: string;
  roomLabel: string;
  elementLabel: string;
  elementCategory?: string;
  condition: InspectionConditionMock;
  quantity?: number;
  isDamaged?: boolean;
  damageDescription?: string;
  repairAmount?: number;
  chargedTo?: ChargedToMock;
  position?: number;
  /** Une seule retenue par poste (arbitrage 4) et exclusivité avec la maintenance (arbitrage 5). */
  depositMovementId: string | null;
  maintenanceRequestId: string | null;
}

export const inspections = new Map<string, MockInspection>();
export const inspectionItems = new Map<string, MockInspectionItem>();
export const inspectionPhotos = new Map<string, MockInspectionPhoto>();

let inspectionSeq = 0;
export function nextInspectionReference(yearMonth: string): string {
  inspectionSeq += 1;
  return `EDL-${yearMonth.replace('-', '')}-${String(inspectionSeq).padStart(4, '0')}`;
}
