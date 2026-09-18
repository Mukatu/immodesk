import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 10, apport d'affaires (parrainage), conforme à
 * docs/api/phase10-contract.md section « Apport d'affaires » et arbitrages
 * n°5 à 7. 7 routes partenaire + 4 routes back-office plateforme.
 *
 * Aucun rôle « OWNER plateforme » n'existe dans ce mock (pas de notion de
 * super-admin dans handlers.ts) : les routes `/admin/*` sont donc ouvertes à
 * toute requête authentifiée par cohérence avec le reste du mock, la
 * vérification de rôle plateforme étant hors périmètre de ce lot.
 */
import { API_BASE } from './api-base';
import {
  DEV_OTP_CODE,
  conflict,
  memberships,
  nextId,
  notFound,
  organizations,
  paginate,
  userFromAuthHeader,
  users,
} from './handlers';
import {
  atRiskSubscriptions,
  findPartnerByUserId,
  generateReferralCode,
  qualifyReferralsForOrganization,
  referralCommissions,
  referralPartners,
  referralPayouts,
  referralPropertyRegistrations,
  referrals,
  seedReferralDemoData,
  type MockReferral,
  type MockReferralCommission,
  type MockReferralPartner,
  type MockReferralPayout,
  type ReferralSourceMock,
} from './referral-seed';

export { seedReferralDemoData, qualifyReferralsForOrganization };

function unauthorized() {
  return HttpResponse.json(
    { code: 'IAM.UNAUTHORIZED', message: 'Authentification requise.' },
    { status: 401 },
  );
}

/** Le contrat réserve les codes 4xx métier d'anti-abus à ce statut HTTP (422 REFERRALS.SELF_REFERRAL). */
function unprocessable(code: string, message: string) {
  return HttpResponse.json({ code, message }, { status: 422 });
}

function serializePartner(partner: MockReferralPartner) {
  return { ...partner };
}

function serializeReferral(referral: MockReferral) {
  return { ...referral };
}

function serializeCommission(commission: MockReferralCommission) {
  return { ...commission };
}

function serializePayout(payout: MockReferralPayout) {
  return { ...payout };
}

/**
 * Un seul parrainage par organisation, pour toujours (arbitrage n°5,
 * `referrals_org_uk`), et anti-abus serveur (contrat, section « Anti-abus »)
 * partagés entre `/organizations/{id}/referral-code` et
 * `/referral-partners/me/properties/{id}/confirm-otp` : mêmes règles, deux
 * points d'entrée.
 */
function tryCreateReferral(
  partner: MockReferralPartner,
  referrerUserId: string,
  organizationId: string,
  source: ReferralSourceMock,
): { referral: MockReferral } | { error: 'SELF_REFERRAL' | 'ALREADY_REFERRED' } {
  const isSelf = partner.userId === referrerUserId;
  const isMember = memberships.some(
    (m) => m.organizationId === organizationId && m.userId === partner.userId,
  );
  if (isSelf || isMember) return { error: 'SELF_REFERRAL' };

  const alreadyReferred = [...referrals.values()].some(
    (r) => r.referredOrganizationId === organizationId,
  );
  if (alreadyReferred) return { error: 'ALREADY_REFERRED' };

  const org = organizations.get(organizationId);
  const id = nextId('referral');
  const referral: MockReferral = {
    id,
    partnerId: partner.id,
    referredOrganizationId: organizationId,
    referredOrganizationName: org?.tradeName ?? org?.legalName ?? 'Organisation',
    source,
    status: 'PENDING',
    qualifiedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
  };
  referrals.set(id, referral);
  return { referral };
}

export const referralHandlers = [
  // --- Devenir partenaire ---
  http.post(`${API_BASE}/referral-partners`, async ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) return unauthorized();
    if (findPartnerByUserId(user.id)) {
      return conflict(
        'REFERRALS.PARTNER_ALREADY_EXISTS',
        "Ce compte est déjà inscrit comme apporteur d'affaires.",
      );
    }
    const body = (await request.json()) as { displayName: string; phone: string };
    const id = nextId('refpartner');
    const partner: MockReferralPartner = {
      id,
      userId: user.id,
      displayName: body.displayName,
      phone: body.phone,
      code: generateReferralCode(),
      status: 'PENDING_VERIFICATION',
      momoProvider: null,
      payoutMsisdn: null,
      verifiedAt: null,
      createdAt: new Date().toISOString(),
    };
    referralPartners.set(id, partner);
    return HttpResponse.json(serializePartner(partner), { status: 201 });
  }),

  http.get(`${API_BASE}/referral-partners/me`, ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) return unauthorized();
    const partner = findPartnerByUserId(user.id);
    if (!partner) return notFound('REFERRALS.PARTNER_NOT_FOUND');
    return HttpResponse.json(serializePartner(partner));
  }),

  // --- Rattachement d'un filleul : code saisi à l'inscription ---
  http.post(`${API_BASE}/organizations/:id/referral-code`, async ({ params, request }) => {
    const organizationId = String(params.id);
    if (!organizations.has(organizationId)) return notFound('ORG.NOT_FOUND');
    const user = userFromAuthHeader(request);
    if (!user) return unauthorized();
    const body = (await request.json()) as { code: string };
    const normalizedCode = body.code.trim().toUpperCase();
    const partner = [...referralPartners.values()].find((p) => p.code === normalizedCode);
    if (!partner) return notFound('REFERRALS.CODE_NOT_FOUND');

    const result = tryCreateReferral(partner, user.id, organizationId, 'CODE_AT_SIGNUP');
    if ('error' in result) {
      if (result.error === 'SELF_REFERRAL') {
        return unprocessable(
          'REFERRALS.SELF_REFERRAL',
          'Un partenaire ne peut pas se parrainer lui-même, ni parrainer une organisation dont il est déjà membre.',
        );
      }
      return conflict('REFERRALS.ALREADY_REFERRED', 'Cette organisation a déjà été parrainée.');
    }
    return HttpResponse.json(serializeReferral(result.referral), { status: 201 });
  }),

  // --- Rattachement d'un filleul : enregistrement d'un bien par le partenaire ---
  http.post(`${API_BASE}/referral-partners/me/properties`, async ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) return unauthorized();
    const partner = findPartnerByUserId(user.id);
    if (!partner) return notFound('REFERRALS.PARTNER_NOT_FOUND');
    const body = (await request.json()) as {
      landlordPhone: string;
      propertyName: string;
      propertyAddressLine: string;
      propertyCity: string;
    };
    const id = nextId('refproperty');
    // Aucune ligne Referral ici (referrals_otp_chk) : elle naît à la confirmation.
    referralPropertyRegistrations.set(id, {
      id,
      partnerId: partner.id,
      landlordPhone: body.landlordPhone,
      propertyName: body.propertyName,
      propertyAddressLine: body.propertyAddressLine,
      propertyCity: body.propertyCity,
      confirmedAt: null,
      createdAt: new Date().toISOString(),
    });
    // `registrationId` : champ hors contrat, ajouté pour permettre à l'appelant
    // de construire l'URL de confirmation (le contrat ne détaille pas comment
    // le bailleur — ou l'écran qui le guide — obtient cet id autrement).
    return HttpResponse.json(
      { confirmationSentTo: body.landlordPhone, registrationId: id },
      { status: 202 },
    );
  }),

  // --- Confirmation par le bailleur (route publique, motif SENSITIVE_ACTION implicite) ---
  http.post(
    `${API_BASE}/referral-partners/me/properties/:id/confirm-otp`,
    async ({ params, request }) => {
      const registration = referralPropertyRegistrations.get(String(params.id));
      if (!registration) return notFound('REFERRALS.PROPERTY_REGISTRATION_NOT_FOUND');
      if (registration.confirmedAt) {
        return conflict(
          'REFERRALS.PROPERTY_ALREADY_CONFIRMED',
          'Cette inscription a déjà été confirmée.',
        );
      }
      const body = (await request.json()) as { code: string };
      if (body.code !== DEV_OTP_CODE) {
        return HttpResponse.json(
          { code: 'IAM.OTP_INVALID', message: 'Code incorrect.' },
          { status: 401 },
        );
      }
      const partner = referralPartners.get(registration.partnerId);
      if (!partner) return notFound('REFERRALS.PARTNER_NOT_FOUND');

      // Résolution de l'organisation du bailleur par son numéro : mock
      // simplifié, le contrat ne détaille pas ce mécanisme (le bailleur est
      // supposé déjà propriétaire d'une organisation existante).
      const landlordUser = [...users.values()].find((u) => u.phone === registration.landlordPhone);
      const landlordOrgId = landlordUser
        ? memberships.find((m) => m.userId === landlordUser.id && m.role === 'OWNER')
            ?.organizationId
        : undefined;
      if (!landlordUser || !landlordOrgId) {
        return notFound('REFERRALS.LANDLORD_ORGANIZATION_NOT_FOUND');
      }

      const result = tryCreateReferral(
        partner,
        landlordUser.id,
        landlordOrgId,
        'PARTNER_REGISTERED_PROPERTY',
      );
      if ('error' in result) {
        if (result.error === 'SELF_REFERRAL') {
          return unprocessable(
            'REFERRALS.SELF_REFERRAL',
            'Un partenaire ne peut pas se parrainer lui-même, ni parrainer une organisation dont il est déjà membre.',
          );
        }
        return conflict('REFERRALS.ALREADY_REFERRED', 'Cette organisation a déjà été parrainée.');
      }
      registration.confirmedAt = new Date().toISOString();
      return HttpResponse.json(serializeReferral(result.referral), { status: 201 });
    },
  ),

  // --- Consultation par le partenaire ---
  http.get(`${API_BASE}/referral-partners/me/referrals`, ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) return unauthorized();
    const partner = findPartnerByUserId(user.id);
    if (!partner) return notFound('REFERRALS.PARTNER_NOT_FOUND');
    const items = [...referrals.values()]
      .filter((r) => r.partnerId === partner.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(serializeReferral);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/referral-partners/me/commissions`, ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) return unauthorized();
    const partner = findPartnerByUserId(user.id);
    if (!partner) return notFound('REFERRALS.PARTNER_NOT_FOUND');
    const items = [...referralCommissions.values()]
      .filter((c) => c.partnerId === partner.id)
      .sort((a, b) => (a.accruedAt < b.accruedAt ? 1 : -1));
    const totals = items.reduce(
      (acc, c) => {
        if (c.status === 'ACCRUED') acc.accrued += c.amount;
        else if (c.status === 'APPROVED') acc.approved += c.amount;
        else if (c.status === 'PAID') acc.paid += c.amount;
        return acc;
      },
      { accrued: 0, approved: 0, paid: 0 },
    );
    return HttpResponse.json({ items: items.map(serializeCommission), totals });
  }),

  // --- Back-office plateforme ---
  // ACCRUED -> APPROVED par lot mensuel. `heldByCap` reste 0 : aucun
  // programme de parrainage (plafond mensuel) n'est seedé dans ce lot.
  http.post(`${API_BASE}/admin/referral-commissions/approve`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      partnerId?: string;
      periodEnd?: string;
    };
    const now = new Date().toISOString();
    let approved = 0;
    const heldByCap = 0;
    for (const commission of referralCommissions.values()) {
      if (commission.status !== 'ACCRUED') continue;
      if (body.partnerId && commission.partnerId !== body.partnerId) continue;
      if (body.periodEnd && commission.accruedAt.slice(0, 10) > body.periodEnd) continue;
      commission.status = 'APPROVED';
      commission.approvedAt = now;
      approved += 1;
    }
    return HttpResponse.json({ approved, heldByCap });
  }),

  // Versement groupé : regroupe les commissions APPROVED par partenaire.
  // Simplifié directement en PAID (sans étape PROCESSING intermédiaire) —
  // « sans logique de calcul complexe », comme demandé pour ce lot.
  http.post(`${API_BASE}/admin/referral-payouts`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { partnerIds?: string[] };
    const now = new Date().toISOString();
    const approvedByPartner = new Map<string, MockReferralCommission[]>();
    for (const commission of referralCommissions.values()) {
      if (commission.status !== 'APPROVED') continue;
      if (body.partnerIds && !body.partnerIds.includes(commission.partnerId)) continue;
      const list = approvedByPartner.get(commission.partnerId) ?? [];
      list.push(commission);
      approvedByPartner.set(commission.partnerId, list);
    }
    const payoutIds: string[] = [];
    for (const [partnerId, commissionsForPartner] of approvedByPartner) {
      const amount = commissionsForPartner.reduce((sum, c) => sum + c.amount, 0);
      const periodStart = commissionsForPartner
        .map((c) => c.accruedAt)
        .sort()[0]!
        .slice(0, 10);
      const payoutId = nextId('refpayout');
      const payout: MockReferralPayout = {
        id: payoutId,
        partnerId,
        periodStart,
        periodEnd: now.slice(0, 10),
        amount,
        status: 'PAID',
        commissionsCount: commissionsForPartner.length,
        failureReason: null,
        paidAt: now,
        createdAt: now,
      };
      referralPayouts.set(payoutId, payout);
      for (const commission of commissionsForPartner) {
        commission.status = 'PAID';
        commission.payoutId = payoutId;
        commission.paidAt = now;
      }
      payoutIds.push(payoutId);
    }
    return HttpResponse.json({ payoutIds }, { status: 202 });
  }),

  http.get(`${API_BASE}/admin/referral-payouts/:id`, ({ params }) => {
    const payout = referralPayouts.get(String(params.id));
    if (!payout) return notFound('REFERRALS.PAYOUT_NOT_FOUND');
    return HttpResponse.json(serializePayout(payout));
  }),

  http.get(`${API_BASE}/admin/subscriptions/at-risk`, () => {
    const items = [...atRiskSubscriptions.values()].sort((a, b) => b.daysPastDue - a.daysPastDue);
    return HttpResponse.json(paginate(items));
  }),
];
