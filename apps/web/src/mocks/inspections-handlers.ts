import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 8 (états des lieux), routes conformes à docs/api/phase8-contract.md.
 * Suit le principe d'agency-handlers.ts : API_BASE depuis son propre module,
 * helpers et Maps de tiers/patrimoine/baux importés des autres modules.
 */
import { API_BASE } from './api-base';
import {
  badRequest,
  conflict,
  documents,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  properties,
  serializePropertySummary,
  serializeTenant,
  serializeUnit,
  tenants,
  unauthorizedOrg,
  units,
} from './handlers';
import {
  computeDepositStatus,
  deposits,
  depositMovements,
  leases,
  type MockDepositMovement,
} from './leases-seed';
import { createMaintenanceRequest, maintenanceDetail } from './maintenance-handlers';
import {
  inspectionItems,
  inspectionPhotos,
  inspections,
  nextInspectionReference,
  type ChargedToMock,
  type InspectionConditionMock,
  type InspectionTypeMock,
  type MockInspection,
  type MockInspectionItem,
  type MockInspectionPhoto,
} from './inspections-seed';

function unprocessable(code: string, message: string) {
  return HttpResponse.json({ code, message }, { status: 422 });
}

const CONDITION_RANK: Record<InspectionConditionMock, number> = {
  NEW: 0,
  GOOD: 1,
  FAIR: 2,
  POOR: 3,
  DAMAGED: 4,
  MISSING: 5,
};

function tenantRef(tenantId?: string) {
  if (!tenantId) return null;
  const tenant = tenants.get(tenantId);
  return tenant
    ? { id: tenant.id, displayName: serializeTenant(tenant).displayName }
    : { id: tenantId, displayName: '' };
}

function unitRef(unitId: string) {
  const unit = units.get(unitId);
  return unit ? { id: unit.id, code: unit.code } : { id: unitId, code: '—' };
}

function propertyRef(propertyId: string) {
  const property = properties.get(propertyId);
  return { id: propertyId, name: property?.name ?? '—' };
}

function photoView(photo: MockInspectionPhoto) {
  const { organizationId: _organizationId, inspectionId: _inspectionId, ...rest } = photo;
  return rest;
}

function itemsFor(inspectionId: string): MockInspectionItem[] {
  return [...inspectionItems.values()]
    .filter((i) => i.inspectionId === inspectionId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function photosFor(itemId: string) {
  return [...inspectionPhotos.values()]
    .filter((p) => p.inspectionItemId === itemId)
    .sort((a, b) => a.position - b.position)
    .map(photoView);
}

function itemView(item: MockInspectionItem) {
  const {
    organizationId: _organizationId,
    inspectionId: _inspectionId,
    depositMovementId,
    maintenanceRequestId,
    ...rest
  } = item;
  return {
    ...rest,
    photos: photosFor(item.id),
    hasDepositDeduction: Boolean(depositMovementId),
    hasMaintenanceRequest: Boolean(maintenanceRequestId),
  };
}

function inspectionView(inspection: MockInspection) {
  const { organizationId: _organizationId, ...rest } = inspection;
  return rest;
}

function inspectionSummary(inspection: MockInspection) {
  return {
    id: inspection.id,
    reference: inspection.reference,
    status: inspection.status,
    inspectionType: inspection.inspectionType,
    unit: unitRef(inspection.unitId),
    property: propertyRef(inspection.propertyId),
    tenant: tenantRef(inspection.tenantId),
    scheduledAt: inspection.scheduledAt ?? null,
    performedAt: inspection.performedAt,
    overallCondition: inspection.overallCondition,
    totalDamageAmount: inspection.totalDamageAmount,
  };
}

function inspectionDetail(inspection: MockInspection) {
  const unit = units.get(inspection.unitId);
  const property = properties.get(inspection.propertyId);
  return {
    ...inspectionView(inspection),
    unit: unit ? serializeUnit(unit) : null,
    property: property ? serializePropertySummary(property) : null,
    tenant: tenantRef(inspection.tenantId),
    items: itemsFor(inspection.id).map(itemView),
  };
}

function computeOverallCondition(items: MockInspectionItem[]): InspectionConditionMock | null {
  if (items.length === 0) return null;
  const worst = items.reduce((max, item) => Math.max(max, CONDITION_RANK[item.condition]), 0);
  return (Object.keys(CONDITION_RANK) as InspectionConditionMock[]).find(
    (c) => CONDITION_RANK[c] === worst,
  )!;
}

function computeTotalDamageAmount(items: MockInspectionItem[]): number {
  return items.reduce((sum, item) => sum + (item.isDamaged ? (item.repairAmount ?? 0) : 0), 0);
}

const PHOTO_REQUIRED_FROM: InspectionConditionMock[] = ['POOR', 'DAMAGED', 'MISSING'];

export const inspectionHandlers = [
  http.post(`${API_BASE}/inspections`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      unitId: string;
      leaseId?: string;
      tenantId?: string;
      inspectionType: InspectionTypeMock;
      scheduledAt?: string;
      tenantPresent?: boolean;
      landlordPresent?: boolean;
      keysHandedCount?: number;
      notes?: string;
      clientRef?: string;
    };
    const unit = units.get(body.unitId);
    if (!unit || unit.organizationId !== organizationId)
      return notFound('PORTFOLIO.UNIT_NOT_FOUND');
    const now = new Date().toISOString();
    const inspection: MockInspection = {
      id: nextId('inspection'),
      organizationId,
      reference: nextInspectionReference(now.slice(0, 7)),
      status: 'DRAFT',
      unitId: body.unitId,
      propertyId: unit.propertyId,
      leaseId: body.leaseId,
      tenantId: body.tenantId,
      inspectionType: body.inspectionType,
      scheduledAt: body.scheduledAt,
      tenantPresent: body.tenantPresent,
      landlordPresent: body.landlordPresent,
      keysHandedCount: body.keysHandedCount,
      notes: body.notes,
      clientRef: body.clientRef,
      overallCondition: null,
      totalDamageAmount: 0,
      performedAt: null,
      performedByUserId: null,
      tenantSignedAt: null,
      agentSignedAt: null,
      reportDocumentId: null,
      disputeReason: null,
      createdAt: now,
    };
    inspections.set(inspection.id, inspection);
    return HttpResponse.json(inspectionView(inspection), { status: 201 });
  }),

  http.get(`${API_BASE}/inspections`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const unitId = url.searchParams.get('unitId');
    const leaseId = url.searchParams.get('leaseId');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const items = [...inspections.values()]
      .filter((i) => i.organizationId === organizationId)
      .filter((i) => !unitId || i.unitId === unitId)
      .filter((i) => !leaseId || i.leaseId === leaseId)
      .filter((i) => !type || i.inspectionType === type)
      .filter((i) => !status || i.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(inspectionSummary);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/inspections/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    return HttpResponse.json(inspectionDetail(inspection));
  }),

  http.patch(`${API_BASE}/inspections/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    if (inspection.status === 'SIGNED') {
      return conflict('INSPECTIONS.LOCKED', 'État des lieux signé : plus modifiable.');
    }
    const body = (await request.json()) as Partial<
      Pick<
        MockInspection,
        | 'leaseId'
        | 'tenantId'
        | 'scheduledAt'
        | 'tenantPresent'
        | 'landlordPresent'
        | 'keysHandedCount'
        | 'notes'
      >
    >;
    Object.assign(inspection, body);
    return HttpResponse.json(inspectionView(inspection));
  }),

  http.post(`${API_BASE}/inspections/:id/items`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    if (inspection.status === 'SIGNED') {
      return conflict('INSPECTIONS.LOCKED', 'État des lieux signé : plus modifiable.');
    }
    const body = (await request.json()) as {
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
    };
    const item: MockInspectionItem = {
      id: nextId('inspitem'),
      organizationId,
      inspectionId: inspection.id,
      roomLabel: body.roomLabel,
      elementLabel: body.elementLabel,
      elementCategory: body.elementCategory,
      condition: body.condition,
      quantity: body.quantity,
      isDamaged: body.isDamaged,
      damageDescription: body.damageDescription,
      repairAmount: body.repairAmount,
      chargedTo: body.chargedTo,
      position: body.position ?? itemsFor(inspection.id).length,
      depositMovementId: null,
      maintenanceRequestId: null,
    };
    inspectionItems.set(item.id, item);
    if (inspection.status === 'DRAFT') inspection.status = 'IN_PROGRESS';
    return HttpResponse.json(itemView(item), { status: 201 });
  }),

  http.patch(`${API_BASE}/inspections/:id/items/:itemId`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    if (inspection.status === 'SIGNED') {
      return conflict('INSPECTIONS.LOCKED', 'État des lieux signé : plus modifiable.');
    }
    const item = inspectionItems.get(String(params.itemId));
    if (!item || item.inspectionId !== inspection.id) return notFound('INSPECTIONS.ITEM_NOT_FOUND');
    const body = (await request.json()) as Partial<
      Omit<MockInspectionItem, 'id' | 'organizationId' | 'inspectionId'>
    >;
    Object.assign(item, body);
    return HttpResponse.json(itemView(item));
  }),

  http.delete(`${API_BASE}/inspections/:id/items/:itemId`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    if (inspection.status === 'SIGNED') {
      return conflict('INSPECTIONS.LOCKED', 'État des lieux signé : plus modifiable.');
    }
    const item = inspectionItems.get(String(params.itemId));
    if (!item || item.inspectionId !== inspection.id) return notFound('INSPECTIONS.ITEM_NOT_FOUND');
    for (const photo of photosFor(item.id)) inspectionPhotos.delete(photo.id);
    inspectionItems.delete(item.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/inspections/:id/items/:itemId/photos`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    if (inspection.status === 'SIGNED') {
      return conflict('INSPECTIONS.LOCKED', 'État des lieux signé : plus modifiable.');
    }
    const item = inspectionItems.get(String(params.itemId));
    if (!item || item.inspectionId !== inspection.id) return notFound('INSPECTIONS.ITEM_NOT_FOUND');
    const body = (await request.json()) as {
      documentId: string;
      caption?: string;
      takenAt?: string;
      checksumSha256?: string;
      position?: number;
    };
    const document = documents.get(body.documentId);
    const photo: MockInspectionPhoto = {
      id: nextId('inspphoto'),
      organizationId,
      inspectionId: inspection.id,
      inspectionItemId: item.id,
      documentId: body.documentId,
      caption: body.caption ?? document?.fileName ?? null,
      takenAt: body.takenAt ?? null,
      checksumSha256: body.checksumSha256 ?? null,
      position: body.position ?? photosFor(item.id).length,
    };
    inspectionPhotos.set(photo.id, photo);
    return HttpResponse.json(photoView(photo), { status: 201 });
  }),

  http.post(`${API_BASE}/inspections/:id/sign`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    if (inspection.status === 'SIGNED') {
      return conflict('INSPECTIONS.LOCKED', 'État des lieux déjà signé.');
    }
    const body = (await request.json()) as {
      tenantSignatureDocumentId?: string;
      agentSignatureDocumentId?: string;
      tenantPresent?: boolean;
      absenceReason?: string;
    };
    const items = itemsFor(inspection.id);
    const missingPhoto = items.some(
      (item) => PHOTO_REQUIRED_FROM.includes(item.condition) && photosFor(item.id).length === 0,
    );
    if (missingPhoto) {
      return unprocessable(
        'INSPECTIONS.PHOTO_REQUIRED',
        'Une photo est obligatoire pour chaque poste en mauvais état, dégradé ou manquant.',
      );
    }
    const now = new Date().toISOString();
    inspection.overallCondition = computeOverallCondition(items);
    inspection.totalDamageAmount = computeTotalDamageAmount(items);
    inspection.performedAt = inspection.performedAt ?? now;
    inspection.agentSignedAt = now;
    inspection.tenantPresent = body.tenantPresent ?? inspection.tenantPresent ?? true;
    if (inspection.tenantPresent === false) {
      if (!body.absenceReason) {
        return badRequest(
          'INSPECTIONS.ABSENCE_REASON_REQUIRED',
          'Motif obligatoire en l’absence du locataire.',
        );
      }
      inspection.absenceReason = body.absenceReason;
      inspection.status = 'PENDING_SIGNATURE';
    } else {
      inspection.tenantSignedAt = now;
      inspection.status = 'SIGNED';
      inspection.reportDocumentId = nextId('document');
    }
    return HttpResponse.json(inspectionDetail(inspection));
  }),

  http.post(`${API_BASE}/inspections/:id/dispute`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    const body = (await request.json()) as { reason: string };
    inspection.status = 'DISPUTED';
    inspection.disputeReason = body.reason;
    return HttpResponse.json(inspectionView(inspection));
  }),

  http.post(`${API_BASE}/inspections/:id/cancel`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    inspection.status = 'CANCELLED';
    return HttpResponse.json(inspectionView(inspection));
  }),

  http.get(`${API_BASE}/inspections/:id/pdf`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const inspection = inspections.get(String(params.id));
    if (!inspection || inspection.organizationId !== organizationId) {
      return notFound('INSPECTIONS.NOT_FOUND');
    }
    if (!inspection.reportDocumentId) return notFound('INSPECTIONS.REPORT_NOT_READY');
    return HttpResponse.json({
      downloadUrl: `https://mock.immodesk.internal/documents/${inspection.reportDocumentId}`,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  }),

  http.get(`${API_BASE}/units/:id/inspections/compare`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const unitId = String(params.id);
    const bySignedDate = (a: MockInspection, b: MockInspection) =>
      (b.tenantSignedAt ?? '').localeCompare(a.tenantSignedAt ?? '');
    const moveIn = [...inspections.values()]
      .filter(
        (i) =>
          i.organizationId === organizationId &&
          i.unitId === unitId &&
          i.inspectionType === 'MOVE_IN' &&
          i.status === 'SIGNED',
      )
      .sort(bySignedDate)[0];
    const moveOut = [...inspections.values()]
      .filter(
        (i) =>
          i.organizationId === organizationId &&
          i.unitId === unitId &&
          i.inspectionType === 'MOVE_OUT' &&
          i.status === 'SIGNED',
      )
      .sort(bySignedDate)[0];
    const entryItems = moveIn ? itemsFor(moveIn.id) : [];
    const exitItems = moveOut ? itemsFor(moveOut.id) : [];
    const key = (i: MockInspectionItem) =>
      `${i.roomLabel.trim().toLowerCase()}::${i.elementLabel.trim().toLowerCase()}`;
    const entryByKey = new Map(entryItems.map((i) => [key(i), i]));
    const exitByKey = new Map(exitItems.map((i) => [key(i), i]));
    const allKeys = new Set([...entryByKey.keys(), ...exitByKey.keys()]);
    const rows = [...allKeys].map((k) => {
      const entry = entryByKey.get(k);
      const exit = exitByKey.get(k);
      const degradationLevels =
        entry && exit ? CONDITION_RANK[exit.condition] - CONDITION_RANK[entry.condition] : 0;
      const status = !entry
        ? ('ADDED' as const)
        : !exit
          ? ('MISSING' as const)
          : degradationLevels > 0
            ? ('DEGRADED' as const)
            : degradationLevels < 0
              ? ('IMPROVED' as const)
              : ('UNCHANGED' as const);
      return {
        roomLabel: (exit ?? entry)!.roomLabel,
        elementLabel: (exit ?? entry)!.elementLabel,
        entryCondition: entry?.condition ?? null,
        exitCondition: exit?.condition ?? null,
        degradationLevels,
        suggestedDeductionAmount: status === 'DEGRADED' ? (exit?.repairAmount ?? 0) : 0,
        entryPhotos: entry ? photosFor(entry.id).map((p) => p.documentId) : [],
        exitPhotos: exit ? photosFor(exit.id).map((p) => p.documentId) : [],
        status,
      };
    });
    return HttpResponse.json({
      unitId,
      moveIn: moveIn ? inspectionSummary(moveIn) : null,
      moveOut: moveOut ? inspectionSummary(moveOut) : null,
      rows,
      totalSuggestedDeduction: rows.reduce((sum, row) => sum + row.suggestedDeductionAmount, 0),
    });
  }),

  http.post(
    `${API_BASE}/inspections/:id/items/:itemId/deposit-deduction`,
    async ({ params, request }) => {
      const organizationId = orgIdFromRequest(request);
      if (!organizationId) return unauthorizedOrg();
      const inspection = inspections.get(String(params.id));
      if (!inspection || inspection.organizationId !== organizationId) {
        return notFound('INSPECTIONS.NOT_FOUND');
      }
      const item = inspectionItems.get(String(params.itemId));
      if (!item || item.inspectionId !== inspection.id) {
        return notFound('INSPECTIONS.ITEM_NOT_FOUND');
      }
      const body = (await request.json()) as {
        amount: number;
        reason?: string;
        managerOverrideReason?: string;
      };
      if (item.depositMovementId) {
        return conflict(
          'INSPECTIONS.DEDUCTION_ALREADY_APPLIED',
          'Une retenue existe déjà pour ce poste.',
        );
      }
      if (item.maintenanceRequestId && !body.managerOverrideReason) {
        return conflict(
          'INSPECTIONS.MAINTENANCE_ALREADY_LINKED',
          'Ce poste est déjà converti en demande de maintenance : retenue et intervention sont exclusives sauf motif MANAGER.',
        );
      }
      const leaseId = inspection.leaseId;
      const lease = leaseId ? leases.get(leaseId) : undefined;
      if (!lease) return notFound('DEPOSITS.NOT_FOUND', "Le bail n'a pas de dépôt de garantie.");
      const deposit = deposits.get(lease.id);
      if (!deposit) return notFound('DEPOSITS.NOT_FOUND');
      if (body.amount > deposit.heldAmount) {
        return conflict(
          'DEPOSITS.INSUFFICIENT_BALANCE',
          'Le montant dépasse le solde actuellement détenu.',
        );
      }
      const now = new Date().toISOString();
      const movement: MockDepositMovement = {
        id: nextId('depmvt'),
        organizationId,
        depositId: deposit.id,
        leaseId: lease.id,
        movementType: 'DEDUCTION',
        amount: body.amount,
        movementDate: now.slice(0, 10),
        reason: body.reason ?? `Retenue — ${item.roomLabel} / ${item.elementLabel}`,
        inspectionId: inspection.id,
        currency: 'XAF',
        createdByUserId: null,
        createdAt: now,
      };
      depositMovements.set(movement.id, movement);
      deposit.deductedAmount += body.amount;
      deposit.heldAmount =
        deposit.collectedAmount - deposit.deductedAmount - deposit.refundedAmount;
      deposit.status = computeDepositStatus(deposit);
      item.depositMovementId = movement.id;
      return HttpResponse.json(movement, { status: 201 });
    },
  ),

  http.post(
    `${API_BASE}/inspections/:id/items/:itemId/maintenance-request`,
    async ({ params, request }) => {
      const organizationId = orgIdFromRequest(request);
      if (!organizationId) return unauthorizedOrg();
      const inspection = inspections.get(String(params.id));
      if (!inspection || inspection.organizationId !== organizationId) {
        return notFound('INSPECTIONS.NOT_FOUND');
      }
      const item = inspectionItems.get(String(params.itemId));
      if (!item || item.inspectionId !== inspection.id) {
        return notFound('INSPECTIONS.ITEM_NOT_FOUND');
      }
      const body = (await request.json()) as {
        priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
        estimatedAmount?: number;
        chargedTo?: ChargedToMock;
        managerOverrideReason?: string;
      };
      if (item.maintenanceRequestId) {
        return conflict(
          'INSPECTIONS.MAINTENANCE_ALREADY_LINKED',
          'Ce poste a déjà été converti en demande de maintenance.',
        );
      }
      if (item.depositMovementId && !body.managerOverrideReason) {
        return conflict(
          'INSPECTIONS.DEDUCTION_ALREADY_APPLIED',
          'Une retenue existe déjà pour ce poste : retenue et intervention sont exclusives sauf motif MANAGER.',
        );
      }
      const created = createMaintenanceRequest({
        organizationId,
        propertyId: inspection.propertyId,
        unitId: inspection.unitId,
        leaseId: inspection.leaseId,
        tenantId: inspection.tenantId,
        priority: body.priority,
        reporterType: 'INSPECTION',
        title: `${item.roomLabel} — ${item.elementLabel}`,
        description: item.damageDescription ?? `Dégradation constatée : ${item.elementLabel}.`,
        estimatedAmount: body.estimatedAmount ?? item.repairAmount,
        chargedTo: body.chargedTo ?? item.chargedTo,
        inspectionId: inspection.id,
      });
      item.maintenanceRequestId = created.id;
      return HttpResponse.json(maintenanceDetail(created), { status: 201 });
    },
  ),
];
