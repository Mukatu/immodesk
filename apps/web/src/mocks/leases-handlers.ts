import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 2 (baux et dépôts de garantie), routes conformes à
 * docs/api/phase2-contract.md. Réutilise l'état et les helpers de handlers.ts
 * (import de valeurs : cycle statique avec handlers.ts qui importe `leaseHandlers`
 * d'ici, sûr car aucune valeur n'est lue au niveau top-level avant la fin de
 * l'évaluation des deux modules — voir le commentaire dans handlers.ts).
 * API_BASE vient en revanche de son propre module (api-base.ts, sans dépendance) :
 * les routes ci-dessous l'utilisent dans leurs URL au chargement du tableau
 * `leaseHandlers`, donc au moment même où ce cycle est en cours de résolution —
 * le lire depuis handlers.ts y déclencherait une TDZ en build de production.
 */
import { API_BASE } from './api-base';
import {
  conflict,
  landlords,
  landlordSummaryFor,
  matchesQuery,
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
import type { MockTenant, MockUnit } from './handlers';
import {
  computeDepositStatus,
  contractJobs,
  contractTemplates,
  DEFAULT_CONTRACT_TEMPLATE,
  depositMovements,
  deposits,
  leaseDocuments,
  leaseParties,
  leases,
  rentRevisions,
  seedLeasesDemoData,
} from './leases-seed';
import type {
  MockContractJob,
  MockContractTemplate,
  MockDeposit,
  MockDepositMovement,
  MockLease,
  MockLeaseDocument,
  MockLeaseParty,
  MockRentRevision,
} from './leases-seed';

export { seedLeasesDemoData };

// ---- Sérialisation ----

function serializeLease(lease: MockLease) {
  const { organizationId: _organizationId, ...rest } = lease;
  return rest;
}

function serializeLeaseParty(party: MockLeaseParty) {
  const { organizationId: _organizationId, ...rest } = party;
  return rest;
}

function serializeRentRevision(revision: MockRentRevision) {
  const { organizationId: _organizationId, ...rest } = revision;
  return rest;
}

function serializeLeaseDocument(doc: MockLeaseDocument) {
  const { organizationId: _organizationId, ...rest } = doc;
  return rest;
}

function movementsForDeposit(depositId: string) {
  return [...depositMovements.values()]
    .filter((m) => m.depositId === depositId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((m) => {
      const { organizationId: _organizationId, ...rest } = m;
      return rest;
    });
}

function serializeDepositDetail(deposit: MockDeposit) {
  const { organizationId: _organizationId, ...rest } = deposit;
  return { ...rest, movements: movementsForDeposit(deposit.id) };
}

function serializeDepositSummary(deposit: MockDeposit) {
  const lease = leases.get(deposit.leaseId);
  const unit = lease ? units.get(lease.unitId) : undefined;
  const tenant = tenants.get(deposit.tenantId);
  return {
    id: deposit.id,
    leaseId: deposit.leaseId,
    leaseReference: lease?.reference ?? null,
    tenant: tenant
      ? { id: tenant.id, displayName: serializeTenant(tenant).displayName }
      : { id: deposit.tenantId, displayName: '' },
    unit: unit ? { id: unit.id, code: unit.code } : { id: '', code: '' },
    status: deposit.status,
    requiredAmount: deposit.requiredAmount,
    heldAmount: deposit.heldAmount,
    refundDueDate: deposit.refundDueDate,
  };
}

function partiesForLease(leaseId: string) {
  return [...leaseParties.values()].filter((p) => p.leaseId === leaseId);
}

function rentRevisionsForLease(leaseId: string) {
  return [...rentRevisions.values()]
    .filter((r) => r.leaseId === leaseId)
    .sort((a, b) => (a.effectiveDate < b.effectiveDate ? -1 : 1));
}

function documentsForLease(leaseId: string) {
  return [...leaseDocuments.values()].filter((d) => d.leaseId === leaseId);
}

function serializeLeaseSummary(lease: MockLease) {
  const unit = units.get(lease.unitId);
  const property = properties.get(lease.propertyId);
  const tenant = tenants.get(lease.primaryTenantId);
  return {
    id: lease.id,
    reference: lease.reference,
    status: lease.status,
    unit: unit
      ? { id: unit.id, code: unit.code, label: unit.label ?? null }
      : { id: lease.unitId, code: '', label: null },
    property: property
      ? { id: property.id, name: property.name }
      : { id: lease.propertyId, name: '' },
    tenant: tenant
      ? {
          id: tenant.id,
          displayName: serializeTenant(tenant).displayName,
          primaryPhone: tenant.primaryPhone,
        }
      : { id: lease.primaryTenantId, displayName: '', primaryPhone: '' },
    startDate: lease.startDate,
    endDate: lease.endDate,
    rentAmount: lease.rentAmount,
    chargesAmount: lease.chargesAmount,
    paymentDueDay: lease.paymentDueDay,
  };
}

function serializeLeaseDetail(lease: MockLease) {
  const unit = units.get(lease.unitId);
  const property = properties.get(lease.propertyId);
  const landlord = landlords.get(lease.landlordId);
  const tenant = tenants.get(lease.primaryTenantId);
  const deposit = deposits.get(lease.id);
  return {
    ...serializeLease(lease),
    unit: unit ? serializeUnit(unit) : null,
    property: property ? serializePropertySummary(property) : null,
    landlord: landlord ? landlordSummaryFor(landlord) : null,
    primaryTenant: tenant ? serializeTenant(tenant) : null,
    parties: partiesForLease(lease.id).map(serializeLeaseParty),
    rentRevisions: rentRevisionsForLease(lease.id).map(serializeRentRevision),
    deposit: deposit ? serializeDepositDetail(deposit) : null,
    documents: documentsForLease(lease.id).map(serializeLeaseDocument),
  };
}

const EDITABLE_AFTER_ACTIVATION = [
  'notes',
  'collectorUserId',
  'preferredPaymentMethod',
  'noticeDays',
  'autoRenew',
  'endDate',
] as const;

function formatXafLocal(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/ |\s/g, ' ')} XAF`;
}

function renderContractPreviewHtml(
  lease: MockLease,
  unit: MockUnit | undefined,
  tenant: MockTenant | undefined,
  template: MockContractTemplate,
): string {
  const tenantName = tenant ? serializeTenant(tenant).displayName : '—';
  const property = properties.get(lease.propertyId);
  const activeClauses = template.optionalClauses.filter((c) => c.enabled);
  const today = new Date().toLocaleDateString('fr-FR');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.5; }
  h1 { text-align: center; font-size: 1.3rem; text-transform: uppercase; }
  h2 { font-size: 1rem; margin-top: 1.5rem; }
  .lessor-block { white-space: pre-wrap; }
  .signature { margin-top: 3rem; }
  footer { margin-top: 2rem; font-size: 0.8rem; color: #555; }
</style>
</head>
<body>
  <h1>${template.headerTitle}</h1>
  <div class="lessor-block">${template.lessorBlock}</div>
  <h2>Entre les soussignés</h2>
  <p>Bailleur : ${property?.name ?? ''}</p>
  <p>Locataire : ${tenantName}</p>
  <h2>Objet du bail</h2>
  <p>Lot ${unit?.code ?? lease.unitId} — ${property?.name ?? ''}, ${property?.district ?? ''}, ${property?.city ?? ''}</p>
  <h2>Conditions financières</h2>
  <p>Loyer mensuel : ${formatXafLocal(lease.rentAmount)}</p>
  <p>Charges : ${formatXafLocal(lease.chargesAmount)}</p>
  <p>Dépôt de garantie : ${formatXafLocal(lease.depositAmount ?? 0)}</p>
  ${activeClauses.map((c) => `<h2>${c.title}</h2><p>${c.body}</p>`).join('\n')}
  <h2>Mentions légales</h2>
  <p>${template.legalMentions}</p>
  ${template.showOhadaBlock ? "<h2>Acte uniforme OHADA</h2><p>Bail commercial soumis aux dispositions de l'Acte uniforme OHADA relatif au droit commercial général.</p>" : ''}
  <p class="signature">Fait à ${template.signatureCity}, le ${today}</p>
  ${template.footerText ? `<footer>${template.footerText}</footer>` : ''}
</body>
</html>`;
}

export const leaseHandlers = [
  http.post(`${API_BASE}/leases`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as Partial<MockLease> & {
      unitId: string;
      primaryTenantId: string;
      startDate: string;
      rentAmount: number;
    };
    const unit = units.get(body.unitId);
    if (!unit || unit.organizationId !== organizationId || unit.deletedAt) {
      return notFound('PORTFOLIO.UNIT_NOT_FOUND');
    }
    if (unit.status === 'OCCUPIED') {
      return conflict('LEASES.UNIT_NOT_AVAILABLE', 'Ce lot est déjà occupé.');
    }
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
    return HttpResponse.json(serializeLease(lease), { status: 201 });
  }),

  http.get(`${API_BASE}/leases`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const propertyId = url.searchParams.get('propertyId');
    const tenantId = url.searchParams.get('tenantId');
    const unitId = url.searchParams.get('unitId');
    const endingWithinDaysRaw = url.searchParams.get('endingWithinDays');
    const endingWithinDays = endingWithinDaysRaw ? Number(endingWithinDaysRaw) : null;
    const q = url.searchParams.get('q');
    const endingBefore = endingWithinDays
      ? new Date(Date.now() + endingWithinDays * 24 * 3600 * 1000).toISOString().slice(0, 10)
      : null;
    const items = [...leases.values()]
      .filter((l) => l.organizationId === organizationId && !l.deletedAt)
      .filter((l) => !status || l.status === status)
      .filter((l) => !propertyId || l.propertyId === propertyId)
      .filter((l) => !tenantId || l.primaryTenantId === tenantId)
      .filter((l) => !unitId || l.unitId === unitId)
      .filter((l) => !endingBefore || (l.endDate !== null && l.endDate <= endingBefore))
      .filter((l) => {
        if (!q) return true;
        const tenant = tenants.get(l.primaryTenantId);
        return matchesQuery(
          q,
          l.reference,
          tenant?.firstName,
          tenant?.lastName,
          tenant?.companyName,
        );
      })
      .map(serializeLeaseSummary);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/leases/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    return HttpResponse.json(serializeLeaseDetail(lease));
  }),

  http.patch(`${API_BASE}/leases/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockLease>;
    const editableFreely = lease.status === 'DRAFT' || lease.status === 'PENDING_SIGNATURE';
    if (!editableFreely) {
      const disallowed = Object.keys(body).some(
        (key) => !(EDITABLE_AFTER_ACTIVATION as readonly string[]).includes(key),
      );
      if (disallowed) {
        return conflict(
          'LEASES.NOT_EDITABLE',
          'Seuls certains champs restent modifiables après activation du bail.',
        );
      }
    }
    Object.assign(lease, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(serializeLease(lease));
  }),

  http.delete(`${API_BASE}/leases/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    if (lease.status !== 'DRAFT' && lease.status !== 'CANCELLED') {
      return conflict('LEASES.NOT_DELETABLE', 'Ce bail ne peut plus être supprimé.');
    }
    lease.deletedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/leases/:id/activate`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    if (lease.status !== 'DRAFT' && lease.status !== 'PENDING_SIGNATURE') {
      return conflict('LEASES.INVALID_TRANSITION', 'Transition de statut invalide.', {
        from: lease.status,
        to: 'ACTIVE',
      });
    }
    const unit = units.get(lease.unitId);
    if (!unit || (unit.status !== 'AVAILABLE' && unit.status !== 'RESERVED')) {
      return conflict('LEASES.UNIT_NOT_AVAILABLE', "Ce lot n'est plus disponible.");
    }
    const body = (await request.json().catch(() => ({}))) as { moveInDate?: string };
    const now = new Date().toISOString();
    unit.status = 'OCCUPIED';
    unit.updatedAt = now;
    lease.status = 'ACTIVE';
    lease.moveInDate = body.moveInDate ?? lease.moveInDate ?? lease.startDate;
    lease.signedAt = lease.signedAt ?? now;
    lease.updatedAt = now;
    if (!lease.reference) {
      lease.reference = `BAIL-${new Date().getFullYear()}-${nextId('seq').split('-').pop()}`;
    }
    if (!partiesForLease(lease.id).some((p) => p.role === 'PRIMARY_TENANT')) {
      const tenant = tenants.get(lease.primaryTenantId);
      const party: MockLeaseParty = {
        id: nextId('leaseparty'),
        organizationId,
        leaseId: lease.id,
        role: 'PRIMARY_TENANT',
        tenantId: lease.primaryTenantId,
        shareBps: 10000,
        isSolidary: true,
        displayName: tenant ? serializeTenant(tenant).displayName : '',
        signedAt: now,
        createdAt: now,
      };
      leaseParties.set(party.id, party);
    }
    if (!deposits.has(lease.id)) {
      const requiredAmount =
        lease.depositAmount ?? Math.round(lease.rentAmount * (unit.depositMonths ?? 2));
      const deposit: MockDeposit = {
        id: nextId('deposit'),
        organizationId,
        leaseId: lease.id,
        tenantId: lease.primaryTenantId,
        status: 'PENDING',
        requiredAmount,
        collectedAmount: 0,
        deductedAmount: 0,
        refundedAmount: 0,
        heldAmount: 0,
        monthsEquivalent: unit.depositMonths ?? 2,
        dueDate: lease.startDate,
        fullyCollectedAt: null,
        refundDueDate: null,
        refundedAt: null,
        refundBankAccountId: null,
      };
      deposits.set(lease.id, deposit);
    }
    return HttpResponse.json(serializeLeaseDetail(lease));
  }),

  http.post(`${API_BASE}/leases/:id/cancel`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    if (lease.status !== 'DRAFT' && lease.status !== 'PENDING_SIGNATURE') {
      return conflict('LEASES.INVALID_TRANSITION', 'Transition de statut invalide.', {
        from: lease.status,
        to: 'CANCELLED',
      });
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    lease.status = 'CANCELLED';
    lease.notes = body.reason
      ? `${lease.notes ?? ''}\nAnnulation : ${body.reason}`.trim()
      : lease.notes;
    lease.updatedAt = new Date().toISOString();
    return HttpResponse.json(serializeLease(lease));
  }),

  http.post(`${API_BASE}/leases/:id/notice`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    if (lease.status !== 'ACTIVE') {
      return conflict('LEASES.INVALID_TRANSITION', 'Transition de statut invalide.', {
        from: lease.status,
        to: 'NOTICE_GIVEN',
      });
    }
    const body = (await request.json()) as { effectiveDate: string; reason: string };
    lease.status = 'NOTICE_GIVEN';
    lease.endDate = body.effectiveDate;
    lease.terminationReason = body.reason;
    lease.updatedAt = new Date().toISOString();
    return HttpResponse.json(serializeLease(lease));
  }),

  http.post(`${API_BASE}/leases/:id/terminate`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    if (lease.status !== 'ACTIVE' && lease.status !== 'NOTICE_GIVEN') {
      return conflict('LEASES.INVALID_TRANSITION', 'Transition de statut invalide.', {
        from: lease.status,
        to: 'TERMINATED',
      });
    }
    const body = (await request.json()) as { effectiveDate: string; reason: string };
    const now = new Date().toISOString();
    lease.status = 'TERMINATED';
    lease.moveOutDate = body.effectiveDate;
    lease.terminatedAt = now;
    lease.terminationReason = body.reason;
    lease.updatedAt = now;
    const unit = units.get(lease.unitId);
    if (unit) {
      unit.status = 'AVAILABLE';
      unit.updatedAt = now;
    }
    const deposit = deposits.get(lease.id);
    if (deposit) {
      const refundDue = new Date(body.effectiveDate);
      refundDue.setDate(refundDue.getDate() + 30);
      deposit.refundDueDate = refundDue.toISOString().slice(0, 10);
    }
    return HttpResponse.json(serializeLeaseDetail(lease));
  }),

  http.get(`${API_BASE}/leases/:id/rent-revisions`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    return HttpResponse.json({
      items: rentRevisionsForLease(lease.id).map(serializeRentRevision),
    });
  }),

  http.post(`${API_BASE}/leases/:id/rent-revisions`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    const body = (await request.json()) as {
      effectiveDate: string;
      newRentAmount: number;
      newChargesAmount?: number;
      reason?: string;
      documentId?: string;
    };
    const previousRevisions = rentRevisionsForLease(lease.id);
    const lastRevision = previousRevisions[previousRevisions.length - 1];
    const minDate = lastRevision ? lastRevision.effectiveDate : lease.startDate;
    if (body.effectiveDate <= minDate) {
      return conflict(
        'LEASES.REVISION_DATE_INVALID',
        'La date de révision doit être postérieure à la dernière révision et au début du bail.',
      );
    }
    const now = new Date().toISOString();
    const revision: MockRentRevision = {
      id: nextId('rentrev'),
      organizationId,
      leaseId: lease.id,
      effectiveDate: body.effectiveDate,
      previousRentAmount: lease.rentAmount,
      newRentAmount: body.newRentAmount,
      previousChargesAmount: lease.chargesAmount,
      newChargesAmount: body.newChargesAmount ?? lease.chargesAmount,
      reason: body.reason ?? null,
      documentId: body.documentId ?? null,
      createdByUserId: null,
      createdAt: now,
    };
    rentRevisions.set(revision.id, revision);
    const today = now.slice(0, 10);
    if (body.effectiveDate <= today) {
      lease.rentAmount = revision.newRentAmount;
      lease.chargesAmount = revision.newChargesAmount;
      lease.updatedAt = now;
    }
    return HttpResponse.json(serializeRentRevision(revision), { status: 201 });
  }),

  http.get(`${API_BASE}/leases/:id/rent-at`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    const url = new URL(request.url);
    const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
    const applicable = rentRevisionsForLease(lease.id)
      .filter((r) => r.effectiveDate <= date)
      .pop();
    if (applicable) {
      return HttpResponse.json({
        date,
        rentAmount: applicable.newRentAmount,
        chargesAmount: applicable.newChargesAmount,
        source: 'REVISION',
        revisionId: applicable.id,
      });
    }
    return HttpResponse.json({
      date,
      rentAmount: lease.rentAmount,
      chargesAmount: lease.chargesAmount,
      source: 'INITIAL',
    });
  }),

  http.post(`${API_BASE}/leases/:id/parties`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    const body = (await request.json()) as {
      role: MockLeaseParty['role'];
      tenantId?: string;
      guarantorId?: string;
      shareBps?: number;
      isSolidary?: boolean;
    };
    const duplicate = partiesForLease(lease.id).some(
      (p) =>
        p.role === body.role &&
        ((body.tenantId && p.tenantId === body.tenantId) ||
          (body.guarantorId && p.guarantorId === body.guarantorId)),
    );
    if (duplicate) {
      return conflict('LEASES.PARTY_DUPLICATE', 'Cette partie est déjà associée à ce bail.');
    }
    const tenant = body.tenantId ? tenants.get(body.tenantId) : undefined;
    const now = new Date().toISOString();
    const party: MockLeaseParty = {
      id: nextId('leaseparty'),
      organizationId,
      leaseId: lease.id,
      role: body.role,
      tenantId: body.tenantId,
      guarantorId: body.guarantorId,
      shareBps: body.shareBps,
      isSolidary: body.isSolidary ?? false,
      displayName: tenant ? serializeTenant(tenant).displayName : '',
      signedAt: null,
      createdAt: now,
    };
    leaseParties.set(party.id, party);
    return HttpResponse.json(serializeLeaseParty(party), { status: 201 });
  }),

  http.patch(`${API_BASE}/leases/:id/parties/:partyId`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const party = leaseParties.get(String(params.partyId));
    if (!party || party.organizationId !== organizationId || party.leaseId !== params.id) {
      return notFound('LEASES.PARTY_NOT_FOUND');
    }
    const body = (await request.json()) as { shareBps?: number; isSolidary?: boolean };
    Object.assign(party, body);
    return HttpResponse.json(serializeLeaseParty(party));
  }),

  http.delete(`${API_BASE}/leases/:id/parties/:partyId`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const party = leaseParties.get(String(params.partyId));
    if (!party || party.organizationId !== organizationId || party.leaseId !== params.id) {
      return notFound('LEASES.PARTY_NOT_FOUND');
    }
    if (party.role === 'PRIMARY_TENANT') {
      return conflict(
        'LEASES.PRIMARY_TENANT_PROTECTED',
        'Le locataire principal ne peut pas être retiré du bail.',
      );
    }
    leaseParties.delete(party.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/leases/:id/contract`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    await request.json().catch(() => ({}));
    const job: MockContractJob = {
      jobId: nextId('job'),
      organizationId,
      leaseId: lease.id,
      status: 'QUEUED',
      pollCount: 0,
      createdAt: new Date().toISOString(),
    };
    contractJobs.set(job.jobId, job);
    return HttpResponse.json({ jobId: job.jobId, status: job.status }, { status: 202 });
  }),

  http.get(`${API_BASE}/leases/:id/contract/jobs/:jobId`, ({ params }) => {
    const job = contractJobs.get(String(params.jobId));
    if (!job || job.leaseId !== params.id) {
      return notFound('LEASES.CONTRACT_JOB_NOT_FOUND');
    }
    job.pollCount += 1;
    if (job.pollCount === 1) {
      job.status = 'QUEUED';
    } else if (job.pollCount === 2) {
      job.status = 'RUNNING';
    } else {
      job.status = 'DONE';
      if (!job.leaseDocumentId) {
        const lease = leases.get(job.leaseId);
        const existingVersions = documentsForLease(job.leaseId).filter(
          (d) => d.kind === 'CONTRACT',
        );
        const version = existingVersions.length
          ? Math.max(...existingVersions.map((d) => d.version)) + 1
          : 1;
        const now = new Date().toISOString();
        const documentId = nextId('document');
        const leaseDoc: MockLeaseDocument = {
          id: nextId('leasedoc'),
          organizationId: job.organizationId,
          leaseId: job.leaseId,
          kind: 'CONTRACT',
          documentId,
          version,
          title: `Contrat de bail ${lease?.reference ?? job.leaseId} v${version}`,
          effectiveDate: lease?.startDate ?? null,
          isSigned: false,
          signedAt: null,
          signatureHash: null,
          generatedByJob: job.jobId,
          createdAt: now,
        };
        leaseDocuments.set(leaseDoc.id, leaseDoc);
        if (lease) {
          lease.contractDocumentId = documentId;
        }
        job.leaseDocumentId = leaseDoc.id;
      }
    }
    return HttpResponse.json({
      jobId: job.jobId,
      status: job.status,
      leaseDocumentId: job.leaseDocumentId,
      error: job.error,
    });
  }),

  http.get(`${API_BASE}/leases/:id/contract/preview`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    const unit = units.get(lease.unitId);
    const tenant = tenants.get(lease.primaryTenantId);
    const template = contractTemplates.get(organizationId) ?? {
      ...DEFAULT_CONTRACT_TEMPLATE,
      organizationId,
    };
    const html = renderContractPreviewHtml(lease, unit, tenant, template);
    return new HttpResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }),

  http.get(`${API_BASE}/leases/:id/documents`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    return HttpResponse.json({ items: documentsForLease(lease.id).map(serializeLeaseDocument) });
  }),

  http.post(`${API_BASE}/leases/:id/documents`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    const body = (await request.json()) as {
      documentId: string;
      kind: MockLeaseDocument['kind'];
      title: string;
      effectiveDate?: string;
      isSigned?: boolean;
      signedAt?: string;
    };
    const sameKind = documentsForLease(lease.id).filter((d) => d.kind === body.kind);
    const version = sameKind.length ? Math.max(...sameKind.map((d) => d.version)) + 1 : 1;
    const now = new Date().toISOString();
    const doc: MockLeaseDocument = {
      id: nextId('leasedoc'),
      organizationId,
      leaseId: lease.id,
      kind: body.kind,
      documentId: body.documentId,
      version,
      title: body.title,
      effectiveDate: body.effectiveDate ?? null,
      isSigned: body.isSigned ?? false,
      signedAt: body.signedAt ?? null,
      signatureHash: null,
      generatedByJob: null,
      createdAt: now,
    };
    leaseDocuments.set(doc.id, doc);
    return HttpResponse.json(serializeLeaseDocument(doc), { status: 201 });
  }),

  http.get(`${API_BASE}/leases/:id/deposit`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    const deposit = deposits.get(lease.id);
    if (!deposit) return notFound('DEPOSITS.NOT_FOUND');
    return HttpResponse.json(serializeDepositDetail(deposit));
  }),

  http.post(`${API_BASE}/leases/:id/deposit/movements`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId || lease.deletedAt) {
      return notFound('LEASES.NOT_FOUND');
    }
    const deposit = deposits.get(lease.id);
    if (!deposit) return notFound('DEPOSITS.NOT_FOUND');
    const body = (await request.json()) as {
      movementType: MockDepositMovement['movementType'];
      amount: number;
      movementDate?: string;
      reason?: string;
      paymentId?: string;
      inspectionId?: string;
      reversalOfId?: string;
    };
    if (
      (body.movementType === 'REFUND' || body.movementType === 'DEDUCTION') &&
      body.amount > deposit.heldAmount
    ) {
      return conflict(
        'DEPOSITS.INSUFFICIENT_BALANCE',
        'Le montant dépasse le solde actuellement détenu.',
      );
    }
    if (
      body.movementType === 'REFUND' &&
      lease.status !== 'TERMINATED' &&
      lease.status !== 'EXPIRED'
    ) {
      return conflict(
        'DEPOSITS.LEASE_NOT_CLOSED',
        'La restitution du dépôt suppose un bail résilié ou expiré.',
      );
    }
    const now = new Date().toISOString();
    const movement: MockDepositMovement = {
      id: nextId('depmvt'),
      organizationId,
      depositId: deposit.id,
      leaseId: lease.id,
      movementType: body.movementType,
      amount: body.amount,
      movementDate: body.movementDate ?? now.slice(0, 10),
      reason: body.reason,
      paymentId: body.paymentId,
      inspectionId: body.inspectionId,
      reversalOfId: body.reversalOfId,
      currency: 'XAF',
      createdByUserId: null,
      createdAt: now,
    };
    depositMovements.set(movement.id, movement);

    if (body.movementType === 'COLLECTION' || body.movementType === 'ADJUSTMENT') {
      deposit.collectedAmount += body.amount;
      if (!deposit.fullyCollectedAt && deposit.collectedAmount >= deposit.requiredAmount) {
        deposit.fullyCollectedAt = now;
      }
    } else if (body.movementType === 'REFUND') {
      deposit.refundedAmount += body.amount;
      deposit.refundedAt = now;
    } else if (body.movementType === 'DEDUCTION') {
      deposit.deductedAmount += body.amount;
    }
    deposit.heldAmount = deposit.collectedAmount - deposit.deductedAmount - deposit.refundedAmount;
    deposit.status = computeDepositStatus(deposit);
    return HttpResponse.json(serializeDepositDetail(deposit), { status: 201 });
  }),

  http.get(`${API_BASE}/deposits/summary`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const orgDeposits = [...deposits.values()].filter((d) => d.organizationId === organizationId);
    const heldTotal = orgDeposits.reduce((sum, d) => sum + d.heldAmount, 0);
    const pendingTotal = orgDeposits
      .filter((d) => d.status === 'PENDING' || d.status === 'PARTIALLY_PAID')
      .reduce((sum, d) => sum + Math.max(0, d.requiredAmount - d.collectedAmount), 0);
    const soonThreshold = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const refundDueCount = orgDeposits.filter(
      (d) => d.refundDueDate && d.refundDueDate <= soonThreshold && d.status !== 'REFUNDED',
    ).length;
    const byStatus: Record<string, number> = {
      PENDING: 0,
      PARTIALLY_PAID: 0,
      HELD: 0,
      PARTIALLY_REFUNDED: 0,
      REFUNDED: 0,
      FORFEITED: 0,
    };
    orgDeposits.forEach((d) => {
      byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
    });
    return HttpResponse.json({ heldTotal, pendingTotal, refundDueCount, byStatus });
  }),

  http.get(`${API_BASE}/deposits`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const refundDueBefore = url.searchParams.get('refundDueBefore');
    const items = [...deposits.values()]
      .filter((d) => d.organizationId === organizationId)
      .filter((d) => !status || d.status === status)
      .filter(
        (d) => !refundDueBefore || (d.refundDueDate !== null && d.refundDueDate <= refundDueBefore),
      )
      .map(serializeDepositSummary);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/organizations/:id/contract-template`, ({ params }) => {
    const organizationId = String(params.id);
    const existing = contractTemplates.get(organizationId);
    if (existing) return HttpResponse.json(existing);
    const template: MockContractTemplate = { ...DEFAULT_CONTRACT_TEMPLATE, organizationId };
    contractTemplates.set(organizationId, template);
    return HttpResponse.json(template);
  }),

  http.patch(`${API_BASE}/organizations/:id/contract-template`, async ({ params, request }) => {
    const organizationId = String(params.id);
    const body = (await request.json()) as Partial<MockContractTemplate>;
    const existing = contractTemplates.get(organizationId) ?? {
      ...DEFAULT_CONTRACT_TEMPLATE,
      organizationId,
    };
    const updated: MockContractTemplate = { ...existing, ...body, organizationId };
    contractTemplates.set(organizationId, updated);
    return HttpResponse.json(updated);
  }),
];
