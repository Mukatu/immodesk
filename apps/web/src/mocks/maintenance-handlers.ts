import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 8 (maintenance), routes conformes à docs/api/phase8-contract.md.
 * Suit le principe d'agency-handlers.ts : API_BASE depuis son propre module,
 * helpers et Maps de tiers/patrimoine importés de handlers.ts.
 */
import { API_BASE } from './api-base';
import {
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  properties,
  unauthorizedOrg,
  units,
} from './handlers';
import {
  computeSlaDueAt,
  maintenanceRequests,
  maintenanceUpdates,
  nextMaintenanceReference,
  type MaintenancePriorityMock,
  type MaintenanceReporterMock,
  type MockMaintenanceRequest,
  type MockMaintenanceUpdate,
} from './maintenance-seed';
import type { ExpenseCategoryMock } from './agency-seed';
import type { ChargedToMock } from './inspections-seed';

function propertyRef(propertyId: string) {
  const property = properties.get(propertyId);
  return { id: propertyId, name: property?.name ?? '—' };
}

function unitRef(unitId?: string) {
  if (!unitId) return null;
  const unit = units.get(unitId);
  return unit ? { id: unit.id, code: unit.code } : { id: unitId, code: '—' };
}

function ageHours(request: MockMaintenanceRequest): number {
  return Math.round((Date.now() - new Date(request.reportedAt).getTime()) / 3_600_000);
}

const CLOSED_STATUSES = new Set(['RESOLVED', 'CLOSED', 'REJECTED']);

function isOverdue(request: MockMaintenanceRequest): boolean {
  if (!request.slaDueAt || CLOSED_STATUSES.has(request.status)) return false;
  return new Date(request.slaDueAt).getTime() < Date.now();
}

export function maintenanceSummary(request: MockMaintenanceRequest) {
  return {
    id: request.id,
    reference: request.reference,
    status: request.status,
    priority: request.priority,
    title: request.title,
    property: propertyRef(request.propertyId),
    unit: unitRef(request.unitId),
    reportedAt: request.reportedAt,
    slaDueAt: request.slaDueAt,
    isOverdue: isOverdue(request),
    assignedToUserId: request.assignedToUserId,
    ageHours: ageHours(request),
  };
}

export function maintenanceDetail(request: MockMaintenanceRequest) {
  const updates = [...maintenanceUpdates.values()]
    .filter((u) => u.requestId === request.id)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  return {
    ...maintenanceSummary(request),
    description: request.description,
    locationDetail: request.locationDetail ?? null,
    category: request.category,
    reporterType: request.reporterType,
    estimatedAmount: request.estimatedAmount,
    actualAmount: request.actualAmount,
    chargedTo: request.chargedTo,
    landlordApproved: request.landlordApproved,
    inspectionId: request.inspectionId,
    rejectionReason: request.rejectionReason,
    updates,
  };
}

export interface CreateMaintenanceRequestInput {
  organizationId: string;
  propertyId: string;
  unitId?: string;
  leaseId?: string;
  tenantId?: string;
  priority?: MaintenancePriorityMock;
  reporterType?: MaintenanceReporterMock;
  category?: ExpenseCategoryMock;
  title: string;
  description: string;
  locationDetail?: string;
  estimatedAmount?: number;
  chargedTo?: ChargedToMock;
  inspectionId?: string;
}

export function createMaintenanceRequest(
  input: CreateMaintenanceRequestInput,
): MockMaintenanceRequest {
  const now = new Date();
  const priority = input.priority ?? 'NORMAL';
  const request: MockMaintenanceRequest = {
    id: nextId('maintenance'),
    organizationId: input.organizationId,
    reference: nextMaintenanceReference(now.toISOString().slice(0, 7)),
    status: 'OPEN',
    priority,
    propertyId: input.propertyId,
    unitId: input.unitId,
    leaseId: input.leaseId,
    tenantId: input.tenantId,
    reporterType: input.reporterType ?? 'MANAGER',
    category: input.category ?? 'REPAIR',
    title: input.title,
    description: input.description,
    locationDetail: input.locationDetail,
    estimatedAmount: input.estimatedAmount ?? 0,
    actualAmount: 0,
    chargedTo: input.chargedTo ?? 'LANDLORD',
    landlordApproved: false,
    inspectionId: input.inspectionId ?? null,
    rejectionReason: null,
    assignedToUserId: null,
    reportedAt: now.toISOString(),
    slaDueAt: computeSlaDueAt(priority, now),
    createdAt: now.toISOString(),
  };
  maintenanceRequests.set(request.id, request);
  return request;
}

export function addMaintenanceUpdate(
  request: MockMaintenanceRequest,
  organizationId: string,
  patch: Partial<
    Omit<
      MockMaintenanceUpdate,
      | 'id'
      | 'organizationId'
      | 'requestId'
      | 'authorUserId'
      | 'authorLabel'
      | 'previousStatus'
      | 'occurredAt'
    >
  >,
): MockMaintenanceUpdate {
  const previousStatus = request.status;
  if (patch.newStatus) request.status = patch.newStatus;
  if (patch.amountDelta) request.actualAmount += patch.amountDelta;
  const update: MockMaintenanceUpdate = {
    id: nextId('mntupd'),
    organizationId,
    requestId: request.id,
    previousStatus,
    authorUserId: null,
    authorLabel: null,
    occurredAt: new Date().toISOString(),
    ...patch,
  };
  maintenanceUpdates.set(update.id, update);
  return update;
}

export const maintenanceHandlers = [
  http.post(`${API_BASE}/maintenance-requests`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as Omit<CreateMaintenanceRequestInput, 'organizationId'>;
    const created = createMaintenanceRequest({ organizationId, ...body });
    return HttpResponse.json(maintenanceDetail(created), { status: 201 });
  }),

  http.get(`${API_BASE}/maintenance-requests`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const propertyId = url.searchParams.get('propertyId');
    const assignedToUserId = url.searchParams.get('assignedToUserId');
    const overdueOnly = url.searchParams.get('overdueOnly') === 'true';
    const items = [...maintenanceRequests.values()]
      .filter((r) => r.organizationId === organizationId)
      .filter((r) => !status || r.status === status)
      .filter((r) => !priority || r.priority === priority)
      .filter((r) => !propertyId || r.propertyId === propertyId)
      .filter((r) => !assignedToUserId || r.assignedToUserId === assignedToUserId)
      .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
      .map(maintenanceSummary)
      .filter((r) => !overdueOnly || r.isOverdue);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/maintenance-requests/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const found = maintenanceRequests.get(String(params.id));
    if (!found || found.organizationId !== organizationId) {
      return notFound('MAINTENANCE.NOT_FOUND');
    }
    return HttpResponse.json(maintenanceDetail(found));
  }),

  http.post(`${API_BASE}/maintenance-requests/:id/acknowledge`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const found = maintenanceRequests.get(String(params.id));
    if (!found || found.organizationId !== organizationId) {
      return notFound('MAINTENANCE.NOT_FOUND');
    }
    addMaintenanceUpdate(found, organizationId, { newStatus: 'ACKNOWLEDGED' });
    return HttpResponse.json(maintenanceDetail(found));
  }),

  http.post(`${API_BASE}/maintenance-requests/:id/assign`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const found = maintenanceRequests.get(String(params.id));
    if (!found || found.organizationId !== organizationId) {
      return notFound('MAINTENANCE.NOT_FOUND');
    }
    const body = (await request.json()) as { assignedToUserId: string; message?: string };
    found.assignedToUserId = body.assignedToUserId;
    addMaintenanceUpdate(found, organizationId, { newStatus: 'ASSIGNED', message: body.message });
    return HttpResponse.json(maintenanceDetail(found));
  }),

  http.post(`${API_BASE}/maintenance-requests/:id/updates`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const found = maintenanceRequests.get(String(params.id));
    if (!found || found.organizationId !== organizationId) {
      return notFound('MAINTENANCE.NOT_FOUND');
    }
    const body = (await request.json()) as Partial<
      Omit<
        MockMaintenanceUpdate,
        | 'id'
        | 'organizationId'
        | 'requestId'
        | 'authorUserId'
        | 'authorLabel'
        | 'previousStatus'
        | 'occurredAt'
      >
    >;
    const update = addMaintenanceUpdate(found, organizationId, body);
    return HttpResponse.json(update, { status: 201 });
  }),

  http.post(`${API_BASE}/maintenance-requests/:id/resolve`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const found = maintenanceRequests.get(String(params.id));
    if (!found || found.organizationId !== organizationId) {
      return notFound('MAINTENANCE.NOT_FOUND');
    }
    const body = (await request.json()) as {
      message?: string;
      actualAmount?: number;
      photoDocumentId?: string;
    };
    if (body.actualAmount !== undefined) found.actualAmount = body.actualAmount;
    addMaintenanceUpdate(found, organizationId, {
      newStatus: 'RESOLVED',
      message: body.message,
      photoDocumentId: body.photoDocumentId,
    });
    return HttpResponse.json(maintenanceDetail(found));
  }),

  http.post(`${API_BASE}/maintenance-requests/:id/close`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const found = maintenanceRequests.get(String(params.id));
    if (!found || found.organizationId !== organizationId) {
      return notFound('MAINTENANCE.NOT_FOUND');
    }
    addMaintenanceUpdate(found, organizationId, { newStatus: 'CLOSED' });
    return HttpResponse.json(maintenanceDetail(found));
  }),

  http.post(`${API_BASE}/maintenance-requests/:id/reject`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const found = maintenanceRequests.get(String(params.id));
    if (!found || found.organizationId !== organizationId) {
      return notFound('MAINTENANCE.NOT_FOUND');
    }
    const body = (await request.json()) as { reason: string };
    found.rejectionReason = body.reason;
    addMaintenanceUpdate(found, organizationId, { newStatus: 'REJECTED', message: body.reason });
    return HttpResponse.json(maintenanceDetail(found));
  }),
];
