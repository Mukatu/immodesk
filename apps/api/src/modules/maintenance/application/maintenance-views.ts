import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoInstant } from '../../parties/application/party-views';

export interface MaintenanceRequestRow {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  reference: string;
  status: string;
  priority: string;
  reporter_type: string;
  reported_by_user_id: string | null;
  category: string;
  title: string;
  description: string;
  location_detail: string | null;
  reported_at: Date;
  acknowledged_at: Date | null;
  assigned_to_user_id: string | null;
  assigned_at: Date | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  scheduled_at: Date | null;
  started_at: Date | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  sla_due_at: Date | null;
  estimated_amount: bigint;
  actual_amount: bigint;
  currency: string;
  charged_to: string;
  landlord_approved: boolean;
  landlord_approved_at: Date | null;
  rejection_reason: string | null;
  inspection_id: string | null;
  client_ref: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceUpdateRow {
  id: string;
  request_id: string;
  author_user_id: string | null;
  author_label: string | null;
  previous_status: string | null;
  new_status: string | null;
  message: string | null;
  is_visible_to_tenant: boolean;
  amount_delta: bigint;
  photo_document_id: string | null;
  expense_id: string | null;
  occurred_at: Date;
  client_ref: string | null;
}

/** Vue plate d'une demande (contrat § Types, `MaintenanceRequest`), sans son historique. */
export function toMaintenanceRequestView(row: MaintenanceRequestRow): Record<string, unknown> {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    priority: row.priority,
    reporterType: row.reporter_type,
    category: row.category,
    title: row.title,
    description: row.description,
    locationDetail: row.location_detail,
    propertyId: row.property_id,
    unitId: row.unit_id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    estimatedAmount: toJsonAmount(row.estimated_amount),
    actualAmount: toJsonAmount(row.actual_amount),
    chargedTo: row.charged_to,
    inspectionId: row.inspection_id,
    clientRef: row.client_ref,
    reportedAt: row.reported_at.toISOString(),
    slaDueAt: toIsoInstant(row.sla_due_at),
    assignedToUserId: row.assigned_to_user_id,
    rejectionReason: row.rejection_reason,
    landlordApproved: row.landlord_approved,
  };
}

export interface MaintenanceSummaryView {
  id: string;
  reference: string;
  status: string;
  priority: string;
  title: string;
  property: { id: string; name: string };
  unit: { id: string; code: string } | null;
  reportedAt: string;
  slaDueAt: string | null;
  isOverdue: boolean;
  assignedToUserId: string | null;
  ageHours: number;
}

export function toMaintenanceSummary(
  row: MaintenanceRequestRow,
  property: { id: string; name: string },
  unit: { id: string; code: string } | null,
  now: Date = new Date(),
): MaintenanceSummaryView {
  const isOpenStatus = row.status !== 'CLOSED' && row.status !== 'REJECTED';
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    priority: row.priority,
    title: row.title,
    property,
    unit,
    reportedAt: row.reported_at.toISOString(),
    slaDueAt: toIsoInstant(row.sla_due_at),
    isOverdue: Boolean(row.sla_due_at && isOpenStatus && row.sla_due_at.getTime() < now.getTime()),
    assignedToUserId: row.assigned_to_user_id,
    ageHours: Math.max(0, Math.round((now.getTime() - row.reported_at.getTime()) / 3_600_000)),
  };
}

export function toMaintenanceUpdateView(row: MaintenanceUpdateRow): Record<string, unknown> {
  return {
    id: row.id,
    requestId: row.request_id,
    authorUserId: row.author_user_id,
    authorLabel: row.author_label,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    message: row.message,
    isVisibleToTenant: row.is_visible_to_tenant,
    amountDelta: toJsonAmount(row.amount_delta),
    photoDocumentId: row.photo_document_id,
    expenseId: row.expense_id,
    occurredAt: row.occurred_at.toISOString(),
    clientRef: row.client_ref,
  };
}

export function toMaintenanceDetail(
  row: MaintenanceRequestRow,
  summary: MaintenanceSummaryView,
  updates: MaintenanceUpdateRow[],
): Record<string, unknown> {
  return {
    ...summary,
    description: row.description,
    locationDetail: row.location_detail,
    category: row.category,
    reporterType: row.reporter_type,
    estimatedAmount: toJsonAmount(row.estimated_amount),
    actualAmount: toJsonAmount(row.actual_amount),
    chargedTo: row.charged_to,
    landlordApproved: row.landlord_approved,
    inspectionId: row.inspection_id,
    rejectionReason: row.rejection_reason,
    unitId: row.unit_id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    clientRef: row.client_ref,
    updates: updates.map(toMaintenanceUpdateView),
  };
}
