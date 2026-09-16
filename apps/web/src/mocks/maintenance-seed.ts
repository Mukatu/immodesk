/**
 * Mock MSW — Phase 8 (maintenance), état en mémoire, conformes à
 * docs/api/phase8-contract.md. Suit le principe d'agency-seed.ts : Maps
 * exportées, types `*Mock` locaux indépendants de '@/lib/api/types'.
 */
import type { ExpenseCategoryMock } from './agency-seed';
import type { ChargedToMock } from './inspections-seed';

export type MaintenanceStatusMock =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED';
export type MaintenancePriorityMock = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type MaintenanceReporterMock =
  'TENANT' | 'LANDLORD' | 'COLLECTOR' | 'MANAGER' | 'INSPECTION';

export interface MockMaintenanceUpdate {
  id: string;
  organizationId: string;
  requestId: string;
  newStatus?: MaintenanceStatusMock;
  message?: string;
  photoDocumentId?: string;
  amountDelta?: number;
  isVisibleToTenant?: boolean;
  expenseId?: string;
  clientRef?: string;
  authorUserId: string | null;
  authorLabel: string | null;
  previousStatus: MaintenanceStatusMock | null;
  occurredAt: string;
}

export interface MockMaintenanceRequest {
  id: string;
  organizationId: string;
  reference: string;
  status: MaintenanceStatusMock;
  priority: MaintenancePriorityMock;
  propertyId: string;
  unitId?: string;
  leaseId?: string;
  tenantId?: string;
  reporterType: MaintenanceReporterMock;
  category: ExpenseCategoryMock;
  title: string;
  description: string;
  locationDetail?: string;
  estimatedAmount: number;
  actualAmount: number;
  chargedTo: ChargedToMock;
  landlordApproved: boolean;
  inspectionId: string | null;
  rejectionReason: string | null;
  assignedToUserId: string | null;
  reportedAt: string;
  slaDueAt: string | null;
  createdAt: string;
}

export const maintenanceRequests = new Map<string, MockMaintenanceRequest>();
export const maintenanceUpdates = new Map<string, MockMaintenanceUpdate>();

let maintenanceSeq = 0;
export function nextMaintenanceReference(yearMonth: string): string {
  maintenanceSeq += 1;
  return `MNT-${yearMonth.replace('-', '')}-${String(maintenanceSeq).padStart(4, '0')}`;
}

/** SLA par défaut du contrat : URGENT 4h, HIGH 24h, NORMAL 5j ouvrés, LOW 15j. */
const DEFAULT_SLA_HOURS: Record<MaintenancePriorityMock, number> = {
  URGENT: 4,
  HIGH: 24,
  NORMAL: 5 * 24,
  LOW: 15 * 24,
};

export function computeSlaDueAt(priority: MaintenancePriorityMock, from: Date): string {
  const hours = DEFAULT_SLA_HOURS[priority];
  return new Date(from.getTime() + hours * 3600 * 1000).toISOString();
}
