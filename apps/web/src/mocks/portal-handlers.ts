import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Portail bailleur (phase 7), routes `/portal/*` conformes à
 * docs/api/phase7-contract.md, plus deux routes d'activation (`/portal/activation/*`)
 * ajoutées par ce projet : le contrat ne détaille pas le mécanisme d'activation par
 * OTP depuis le lien d'invitation, seulement son effet (« un users est créé et lié
 * à landlords.user_id »). Jamais de X-Organization-Id : LANDLORD_PORTAL n'appartient
 * à aucune organisation (arbitrage n°7).
 */
import { API_BASE } from './api-base';
import {
  findOrCreateUser,
  issueTokens,
  landlords,
  nextId,
  notFound,
  organizations,
  paginate,
  serializeTenant,
  tenants,
  units,
  userFromAuthHeader,
} from './handlers';
import { landlordInvitationTokens } from './agency-seed';
import { leases } from './leases-seed';
import { payments } from './payments-seed';
import { ownerStatements, payouts } from './agency-seed';
import { receipts } from './receipts-seed';

/** Même code de démonstration que POST /auth/otp/verify (voir DEV_OTP_CODE, handlers.ts). */
const DEV_PORTAL_OTP_CODE = '000000';

function maskPhone(phone: string): string {
  return phone.length > 4 ? `${'•'.repeat(phone.length - 4)}${phone.slice(-4)}` : phone;
}

function portalLandlordView(landlordId: string) {
  const landlord = landlords.get(landlordId);
  if (!landlord) return null;
  return {
    id: landlord.id,
    displayName:
      landlord.partyType === 'COMPANY'
        ? (landlord.companyName ?? '')
        : `${landlord.firstName ?? ''} ${landlord.lastName ?? ''}`.trim(),
    primaryPhone: landlord.primaryPhone,
    email: landlord.email ?? null,
    countryCode: landlord.countryCode,
    isDiaspora: landlord.countryCode !== 'CG',
    payoutMethod: landlord.payoutMethod,
  };
}

/** Bailleurs (tous organismes confondus) liés au compte portail authentifié. */
function landlordsForUser(userId: string) {
  return [...landlords.values()].filter((l) => l.userId === userId);
}

function tenantRef(tenantId: string) {
  const tenant = tenants.get(tenantId);
  if (!tenant) return { id: tenantId, displayName: 'Locataire inconnu' };
  return { id: tenant.id, displayName: serializeTenant(tenant).displayName };
}

function unitRef(unitId: string) {
  const unit = units.get(unitId);
  return { id: unitId, code: unit?.code ?? '—' };
}

function portalUnauthorized() {
  return HttpResponse.json(
    { code: 'AGENCY.PORTAL_READ_ONLY', message: 'Accès portail requis.' },
    { status: 401 },
  );
}

/** Résout le bailleur portail courant à partir du jeton (premier bailleur lié, s'il y en a plusieurs). */
function currentPortalLandlordId(request: Request): string | null {
  const user = userFromAuthHeader(request);
  if (!user) return null;
  return landlordsForUser(user.id)[0]?.id ?? null;
}

export const portalHandlers = [
  http.post(`${API_BASE}/portal/activation/request`, async ({ request }) => {
    const body = (await request.json()) as { invitationToken: string };
    const invitation = landlordInvitationTokens.get(body.invitationToken);
    if (!invitation) return notFound('AGENCY.INVITATION_NOT_FOUND');
    const landlord = landlords.get(invitation.landlordId);
    if (!landlord) return notFound('AGENCY.INVITATION_NOT_FOUND');
    return HttpResponse.json({
      phoneMasked: maskPhone(landlord.primaryPhone),
      requestId: nextId('portalotpreq'),
      resendAfterSeconds: 60,
    });
  }),

  http.post(`${API_BASE}/portal/activation/verify`, async ({ request }) => {
    const body = (await request.json()) as { invitationToken: string; code: string };
    const invitation = landlordInvitationTokens.get(body.invitationToken);
    if (!invitation) return notFound('AGENCY.INVITATION_NOT_FOUND');
    if (body.code !== DEV_PORTAL_OTP_CODE) {
      return HttpResponse.json(
        { code: 'IAM.OTP_INVALID', message: 'Code incorrect.' },
        { status: 401 },
      );
    }
    const landlord = landlords.get(invitation.landlordId);
    if (!landlord) return notFound('AGENCY.INVITATION_NOT_FOUND');
    const user = findOrCreateUser(landlord.primaryPhone);
    landlord.userId = user.id;
    const { accessToken, refreshToken } = issueTokens(user.id);
    const org = organizations.get(invitation.organizationId);
    return HttpResponse.json({
      accessToken,
      refreshToken,
      landlord: portalLandlordView(landlord.id),
      organizations: org ? [{ id: org.id, name: org.tradeName ?? org.legalName }] : [],
    });
  }),

  http.get(`${API_BASE}/portal/me`, ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) return portalUnauthorized();
    const myLandlords = landlordsForUser(user.id);
    if (myLandlords.length === 0) return portalUnauthorized();
    const orgsSeen = new Map<string, { id: string; name: string }>();
    for (const landlord of myLandlords) {
      const org = organizations.get(landlord.organizationId);
      if (org) orgsSeen.set(org.id, { id: org.id, name: org.tradeName ?? org.legalName });
    }
    return HttpResponse.json({
      landlord: portalLandlordView(myLandlords[0]!.id),
      organizations: [...orgsSeen.values()],
    });
  }),

  http.get(`${API_BASE}/portal/statements`, ({ request }) => {
    const landlordId = currentPortalLandlordId(request);
    if (!landlordId) return portalUnauthorized();
    const items = [...ownerStatements.values()]
      .filter(
        (s) => s.landlordId === landlordId && s.status !== 'DRAFT' && s.status !== 'CANCELLED',
      )
      .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))
      .map((s) => ({
        id: s.id,
        statementNumber: s.statementNumber,
        status: s.status,
        landlord: {
          id: landlordId,
          displayName: portalLandlordView(landlordId)?.displayName ?? '',
        },
        property: null,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
        rentCollectedAmount: s.rentCollectedAmount,
        commissionAmount: s.commissionAmount,
        expensesAmount: s.expensesAmount,
        carryForwardAmount: s.carryForwardAmount,
        netPayableAmount: s.netPayableAmount,
        issuedAt: s.issuedAt,
        sentAt: s.sentAt,
        settledAt: s.settledAt,
      }));
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/portal/statements/:id/pdf`, ({ params, request }) => {
    const landlordId = currentPortalLandlordId(request);
    if (!landlordId) return portalUnauthorized();
    const statement = ownerStatements.get(String(params.id));
    if (!statement || statement.landlordId !== landlordId)
      return notFound('AGENCY.STATEMENT_NOT_FOUND');
    return HttpResponse.json({
      downloadUrl: `https://mock-storage.immodesk.internal/owner-statements/${statement.id}.pdf`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }),

  http.get(`${API_BASE}/portal/payouts`, ({ request }) => {
    const landlordId = currentPortalLandlordId(request);
    if (!landlordId) return portalUnauthorized();
    const items = [...payouts.values()]
      .filter((p) => p.landlordId === landlordId && p.status !== 'CANCELLED')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((p) => ({
        ...p,
        landlord: {
          id: landlordId,
          displayName: portalLandlordView(landlordId)?.displayName ?? '',
        },
      }));
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/portal/collections`, ({ request }) => {
    const landlordId = currentPortalLandlordId(request);
    if (!landlordId) return portalUnauthorized();
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...payments.values()]
      .filter(
        (p) =>
          p.status === 'CONFIRMED' && p.leaseId && leases.get(p.leaseId)?.landlordId === landlordId,
      )
      .filter((p) => !from || p.paymentDate >= from)
      .filter((p) => !to || p.paymentDate <= to)
      .sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1))
      .map((p) => {
        const lease = p.leaseId ? leases.get(p.leaseId) : undefined;
        const primaryAllocation = p.allocations.find((a) => !a.isReversal);
        return {
          paymentId: p.id,
          paymentDate: p.paymentDate,
          method: p.method,
          amount: p.amount,
          tenant: tenantRef(p.tenantId),
          unit: lease ? unitRef(lease.unitId) : { id: '', code: '—' },
          invoiceNumber: primaryAllocation?.invoiceNumber ?? null,
        };
      });
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/portal/receipts`, ({ request }) => {
    const landlordId = currentPortalLandlordId(request);
    if (!landlordId) return portalUnauthorized();
    const items = [...receipts.values()]
      .filter((r) => {
        const payment = payments.get(r.paymentId);
        const lease = payment?.leaseId ? leases.get(payment.leaseId) : undefined;
        return lease?.landlordId === landlordId;
      })
      .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1))
      .map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        status: r.status,
        issueDate: r.issueDate,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        totalAmount: r.totalAmount,
        tenant: tenantRef(r.tenantId),
        paymentId: r.paymentId,
        invoiceId: r.invoiceId,
        sentAt: r.sentAt,
        sentChannel: r.sentChannel,
      }));
    return HttpResponse.json(paginate(items));
  }),
];
