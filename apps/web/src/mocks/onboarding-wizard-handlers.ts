import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 10, onboarding guidé (distinct du handler inline existant
 * `organizations/independent-manager/onboarding`, propre à la phase 7, auquel
 * ce fichier ne touche pas). Trois étapes idempotentes et reprenables —
 * premier bien, premier bail, première invitation — chacune réutilisant les
 * mêmes règles de création que les routes unitaires des phases 1, 2 et 0,
 * sans dupliquer leur validation. L'état (`GET .../state`) est entièrement
 * dérivé : aucune colonne de progression n'est stockée (contrat, section
 * « Onboarding guidé ») — une étape est faite si l'entité correspondante
 * existe déjà pour l'organisation.
 */
import { API_BASE } from './api-base';
import { invitations, nextId, notFound, properties, units } from './handlers';
import type { MockInvitation, MockProperty, MockUnit } from './handlers';
import { leases } from './leases-seed';
import type { MockLease } from './leases-seed';

function serializeOnboardingProperty(property: MockProperty) {
  const { organizationId: _organizationId, ...rest } = property;
  const unitsCount = [...units.values()].filter(
    (u) => u.propertyId === property.id && !u.deletedAt,
  ).length;
  return { ...rest, unitsCount };
}

function serializeOnboardingLease(lease: MockLease) {
  const { organizationId: _organizationId, ...rest } = lease;
  return rest;
}

export const onboardingWizardHandlers = [
  // Étape « premier bien » : mêmes champs/défauts que POST /properties (phase 1).
  http.post(`${API_BASE}/onboarding/:orgId/first-property`, async ({ params, request }) => {
    const organizationId = String(params.orgId);
    const body = (await request.json()) as Partial<MockProperty> & {
      landlordId: string;
      name: string;
      addressLine: string;
      district: string;
    };
    const now = new Date().toISOString();
    const property: MockProperty = {
      ...(body as MockProperty),
      id: nextId('property'),
      organizationId,
      propertyType: body.propertyType ?? 'OTHER',
      city: body.city ?? '',
      countryCode: body.countryCode ?? 'CG',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    properties.set(property.id, property);
    return HttpResponse.json(serializeOnboardingProperty(property), { status: 201 });
  }),

  // Étape « premier bail » : mêmes champs/défauts que POST /leases (phase 2).
  http.post(`${API_BASE}/onboarding/:orgId/first-lease`, async ({ params, request }) => {
    const organizationId = String(params.orgId);
    const body = (await request.json()) as Partial<MockLease> & {
      unitId: string;
      primaryTenantId: string;
      startDate: string;
      rentAmount: number;
    };
    const unit: MockUnit | undefined = units.get(body.unitId);
    if (!unit) return notFound('PORTFOLIO.UNIT_NOT_FOUND');
    const property = properties.get(unit.propertyId);
    const now = new Date().toISOString();
    const lease: MockLease = {
      ...(body as MockLease),
      id: nextId('lease'),
      organizationId,
      unitId: unit.id,
      propertyId: unit.propertyId,
      landlordId: property?.landlordId ?? '',
      rentPeriod: body.rentPeriod ?? 'MONTHLY',
      chargesAmount: body.chargesAmount ?? 0,
      chargesAreProvisional: body.chargesAreProvisional ?? false,
      paymentDueDay: body.paymentDueDay ?? 5,
      graceDays: body.graceDays ?? 3,
      noticeDays: body.noticeDays ?? 90,
      autoRenew: body.autoRenew ?? false,
      endDate: body.endDate ?? null,
      reference: null,
      status: 'DRAFT',
      moveOutDate: null,
      currency: 'XAF',
      signedAt: null,
      terminatedAt: null,
      terminationReason: null,
      balanceAmount: 0,
      contractDocumentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    leases.set(lease.id, lease);
    return HttpResponse.json(serializeOnboardingLease(lease), { status: 201 });
  }),

  // Étape « première invitation » : mêmes champs que POST /organizations/:id/invitations (phase 0).
  http.post(`${API_BASE}/onboarding/:orgId/invite`, async ({ params, request }) => {
    const organizationId = String(params.orgId);
    const body = (await request.json()) as { phone: string; role: MockInvitation['role'] };
    const invitation: MockInvitation = {
      id: nextId('invitation'),
      organizationId,
      phone: body.phone,
      role: body.role,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    invitations.set(invitation.id, invitation);
    return HttpResponse.json(invitation, { status: 201 });
  }),

  http.get(`${API_BASE}/onboarding/:orgId/state`, ({ params }) => {
    const organizationId = String(params.orgId);
    const firstProperty = [...properties.values()].find(
      (p) => p.organizationId === organizationId && !p.deletedAt,
    );
    const firstLease = [...leases.values()].find(
      (l) => l.organizationId === organizationId && !l.deletedAt,
    );
    const firstInvitation = [...invitations.values()].find(
      (i) => i.organizationId === organizationId,
    );
    return HttpResponse.json({
      firstPropertyDone: !!firstProperty,
      firstPropertyId: firstProperty?.id ?? null,
      firstLeaseDone: !!firstLease,
      firstLeaseId: firstLease?.id ?? null,
      inviteDone: !!firstInvitation,
      invitationId: firstInvitation?.id ?? null,
    });
  }),
];
