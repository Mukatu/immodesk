import { toJsonAmount } from '../../../shared/money/amount';
import { toIsoInstant } from '../../parties/application/party-views';

export interface InspectionRow {
  id: string;
  organization_id: string;
  lease_id: string | null;
  unit_id: string;
  property_id: string;
  tenant_id: string | null;
  reference: string;
  inspection_type: string;
  status: string;
  scheduled_at: Date | null;
  performed_at: Date | null;
  performed_by_user_id: string | null;
  tenant_present: boolean;
  landlord_present: boolean;
  overall_condition: string | null;
  keys_handed_count: number | null;
  total_damage_amount: bigint;
  tenant_signed_at: Date | null;
  agent_signed_at: Date | null;
  signature_document_id: string | null;
  signature_hash: string | null;
  report_document_id: string | null;
  dispute_reason: string | null;
  client_ref: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InspectionItemRow {
  id: string;
  organization_id: string;
  inspection_id: string;
  room_label: string;
  element_label: string;
  element_category: string | null;
  condition: string;
  quantity: number;
  is_damaged: boolean;
  damage_description: string | null;
  repair_amount: bigint;
  charged_to: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface InspectionPhotoRow {
  id: string;
  organization_id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  document_id: string;
  caption: string | null;
  taken_at: Date | null;
  checksum_sha256: string | null;
  position: number;
  client_ref: string | null;
  created_at: Date;
}

export function toInspectionView(row: InspectionRow): Record<string, unknown> {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    leaseId: row.lease_id,
    unitId: row.unit_id,
    propertyId: row.property_id,
    tenantId: row.tenant_id,
    inspectionType: row.inspection_type,
    scheduledAt: toIsoInstant(row.scheduled_at),
    tenantPresent: row.tenant_present,
    landlordPresent: row.landlord_present,
    overallCondition: row.overall_condition,
    keysHandedCount: row.keys_handed_count,
    totalDamageAmount: toJsonAmount(row.total_damage_amount),
    performedAt: toIsoInstant(row.performed_at),
    performedByUserId: row.performed_by_user_id,
    tenantSignedAt: toIsoInstant(row.tenant_signed_at),
    agentSignedAt: toIsoInstant(row.agent_signed_at),
    reportDocumentId: row.report_document_id,
    disputeReason: row.dispute_reason,
    notes: row.notes,
    clientRef: row.client_ref,
  };
}

export function toInspectionItemView(
  row: InspectionItemRow,
  photos: InspectionPhotoRow[] = [],
): Record<string, unknown> {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    roomLabel: row.room_label,
    elementLabel: row.element_label,
    elementCategory: row.element_category,
    condition: row.condition,
    quantity: row.quantity,
    isDamaged: row.is_damaged,
    damageDescription: row.damage_description,
    repairAmount: toJsonAmount(row.repair_amount),
    chargedTo: row.charged_to,
    position: row.position,
    photos: photos.map(toInspectionPhotoView),
  };
}

export function toInspectionPhotoView(row: InspectionPhotoRow): Record<string, unknown> {
  return {
    id: row.id,
    inspectionItemId: row.inspection_item_id,
    documentId: row.document_id,
    caption: row.caption,
    takenAt: toIsoInstant(row.taken_at),
    checksumSha256: row.checksum_sha256,
    position: row.position,
  };
}
