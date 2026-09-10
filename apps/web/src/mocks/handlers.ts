import { http, HttpResponse } from 'msw';

/**
 * Mock MSW de l'API — Phase 0 uniquement, conforme à docs/api/phase0-contract.md.
 * Utilisé en e2e (Playwright) pour ne jamais dépendre d'un vrai backend.
 * État en mémoire, réinitialisé à chaque démarrage du serveur Next (process e2e).
 */

const DEV_OTP_CODE = '000000';

// Base ciblée par les handlers : doit correspondre exactement à API_INTERNAL_URL, la seule
// base que le process Next appelle réellement (route handlers /api/auth/*, et le proxy
// /api/proxy/* pour les appels directs du navigateur — voir ce fichier). Un motif générique
// à origine libre intercepterait par erreur les routes BFF internes de Next elles-mêmes,
// qui partagent le même suffixe de chemin.
const API_BASE = process.env.API_INTERNAL_URL ?? 'https://mock.immodesk.internal/v1';

interface MockUser {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  locale: 'fr-CG';
  timezone: 'Africa/Brazzaville';
  createdAt: string;
}

interface MockOrganization {
  id: string;
  type: 'AGENCY' | 'INDEPENDENT_LANDLORD' | 'INDEPENDENT_MANAGER';
  legalName: string;
  tradeName: string | null;
  slug: string;
  city: string;
  district: string | null;
  contactPhone: string;
  contactEmail: string | null;
  logoUrl: string | null;
  status: 'ACTIVE';
  createdAt: string;
}

interface MockMembership {
  organizationId: string;
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'COLLECTOR' | 'ACCOUNTANT' | 'VIEWER';
  status: 'ACTIVE';
  joinedAt: string;
}

interface MockInvitation {
  id: string;
  organizationId: string;
  phone: string;
  role: MockMembership['role'];
  status: 'PENDING' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

const users = new Map<string, MockUser>();
const organizations = new Map<string, MockOrganization>();
const memberships: MockMembership[] = [];
const invitations = new Map<string, MockInvitation>();
const accessTokens = new Map<string, string>(); // token -> userId
const refreshTokens = new Map<string, string>(); // token -> userId

let seq = 1;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function findOrCreateUser(phone: string): MockUser {
  const existing = [...users.values()].find((u) => u.phone === phone);
  if (existing) return existing;
  const user: MockUser = {
    id: nextId('user'),
    phone,
    fullName: `Utilisateur ${phone.slice(-4)}`,
    email: null,
    locale: 'fr-CG',
    timezone: 'Africa/Brazzaville',
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  return user;
}

function issueTokens(userId: string) {
  const accessToken = nextId('access');
  const refreshToken = nextId('refresh');
  accessTokens.set(accessToken, userId);
  refreshTokens.set(refreshToken, userId);
  return { accessToken, refreshToken };
}

function userFromAuthHeader(request: Request): MockUser | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const userId = accessTokens.get(auth.slice('Bearer '.length));
  return userId ? (users.get(userId) ?? null) : null;
}

function membershipsForUser(userId: string) {
  return memberships
    .filter((m) => m.userId === userId)
    .map((m) => ({
      organization: organizations.get(m.organizationId)!,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
}

export const handlers = [
  http.post(`${API_BASE}/auth/otp/request`, async ({ request }) => {
    const body = (await request.json()) as { phone: string };
    findOrCreateUser(body.phone);
    return HttpResponse.json(
      { requestId: nextId('otpreq'), channel: 'SMS', expiresInSeconds: 300, resendAfterSeconds: 60 },
      { status: 201 },
    );
  }),

  http.post(`${API_BASE}/auth/otp/verify`, async ({ request }) => {
    const body = (await request.json()) as { phone: string; code: string };
    if (body.code !== DEV_OTP_CODE) {
      return HttpResponse.json(
        { code: 'IAM.OTP_INVALID', message: 'Code incorrect.' },
        { status: 401 },
      );
    }
    const user = findOrCreateUser(body.phone);
    const { accessToken, refreshToken } = issueTokens(user.id);
    return HttpResponse.json(
      { accessToken, refreshToken, user, organizations: membershipsForUser(user.id) },
      { status: 200 },
    );
  }),

  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string };
    const userId = refreshTokens.get(body.refreshToken);
    if (!userId) {
      return HttpResponse.json(
        { code: 'IAM.REFRESH_REVOKED', message: 'Session expirée.' },
        { status: 401 },
      );
    }
    refreshTokens.delete(body.refreshToken);
    const { accessToken, refreshToken } = issueTokens(userId);
    return HttpResponse.json({ accessToken, refreshToken }, { status: 200 });
  }),

  http.post(`${API_BASE}/auth/logout`, async () => new HttpResponse(null, { status: 204 })),

  http.get(`${API_BASE}/me`, ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) {
      return HttpResponse.json({ code: 'IAM.UNAUTHORIZED', message: 'Non authentifié.' }, { status: 401 });
    }
    return HttpResponse.json({ user, organizations: membershipsForUser(user.id) });
  }),

  http.post(`${API_BASE}/organizations`, async ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) {
      return HttpResponse.json({ code: 'IAM.UNAUTHORIZED', message: 'Non authentifié.' }, { status: 401 });
    }
    const body = (await request.json()) as {
      type: MockOrganization['type'];
      legalName: string;
      tradeName?: string;
      city: string;
      district?: string;
      contactPhone: string;
      contactEmail?: string;
    };
    const org: MockOrganization = {
      id: nextId('org'),
      type: body.type,
      legalName: body.legalName,
      tradeName: body.tradeName ?? null,
      slug: body.legalName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      city: body.city,
      district: body.district ?? null,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail ?? null,
      logoUrl: null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    organizations.set(org.id, org);
    memberships.push({
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date().toISOString(),
    });
    return HttpResponse.json(org, { status: 201 });
  }),

  http.get(`${API_BASE}/organizations/:id`, ({ params }) => {
    const org = organizations.get(String(params.id));
    if (!org) return HttpResponse.json({ code: 'ORG.NOT_FOUND', message: 'Introuvable.' }, { status: 404 });
    return HttpResponse.json(org);
  }),

  http.get(`${API_BASE}/organizations/:id/settings`, ({ params }) => {
    if (!organizations.has(String(params.id))) {
      return HttpResponse.json({ code: 'ORG.NOT_FOUND', message: 'Introuvable.' }, { status: 404 });
    }
    return HttpResponse.json({
      defaultPaymentDueDay: 5,
      timezone: 'Africa/Brazzaville',
      currency: 'XAF',
      defaultGraceDays: 3,
      receiptFooterText: null,
      whatsappEnabled: false,
      smsEnabled: true,
    });
  }),

  http.get(`${API_BASE}/organizations/:id/members`, ({ params }) => {
    const orgId = String(params.id);
    const items = memberships
      .filter((m) => m.organizationId === orgId)
      .map((m) => {
        const user = users.get(m.userId)!;
        return {
          id: `member-${m.organizationId}-${m.userId}`,
          user: { id: user.id, phone: user.phone, fullName: user.fullName },
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt,
        };
      });
    return HttpResponse.json({ items });
  }),

  http.get(`${API_BASE}/organizations/:id/invitations`, ({ params }) => {
    const orgId = String(params.id);
    const items = [...invitations.values()].filter((i) => i.organizationId === orgId);
    return HttpResponse.json({ items });
  }),

  http.post(`${API_BASE}/organizations/:id/invitations`, async ({ params, request }) => {
    const orgId = String(params.id);
    const body = (await request.json()) as {
      phone: string;
      role: MockMembership['role'];
      fullName?: string;
    };
    const invitation: MockInvitation = {
      id: nextId('invitation'),
      organizationId: orgId,
      phone: body.phone,
      role: body.role,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    invitations.set(invitation.id, invitation);
    return HttpResponse.json(invitation, { status: 201 });
  }),

  http.delete(`${API_BASE}/organizations/:orgId/invitations/:invitationId`, ({ params }) => {
    invitations.delete(String(params.invitationId));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE}/invitations/:token`, ({ params }) => {
    const invitation = invitations.get(String(params.token));
    if (!invitation || invitation.status !== 'PENDING') {
      return HttpResponse.json({ code: 'ORG.INVITATION_NOT_FOUND', message: 'Invitation introuvable.' }, { status: 404 });
    }
    const org = organizations.get(invitation.organizationId)!;
    return HttpResponse.json({
      organizationName: org.legalName,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    });
  }),

  http.post(`${API_BASE}/invitations/:token/accept`, ({ params, request }) => {
    const user = userFromAuthHeader(request);
    const invitation = invitations.get(String(params.token));
    if (!user || !invitation) {
      return HttpResponse.json({ code: 'ORG.INVITATION_NOT_FOUND', message: 'Invitation introuvable.' }, { status: 404 });
    }
    invitation.status = 'PENDING';
    memberships.push({
      organizationId: invitation.organizationId,
      userId: user.id,
      role: invitation.role,
      status: 'ACTIVE',
      joinedAt: new Date().toISOString(),
    });
    const org = organizations.get(invitation.organizationId)!;
    return HttpResponse.json({ organization: org, role: invitation.role, joinedAt: new Date().toISOString() });
  }),

  http.get(`${API_BASE}/feature-flags`, () => HttpResponse.json({ flags: { demo: true } })),

  http.get(`${API_BASE}/health`, () =>
    HttpResponse.json({ status: 'ok', checks: { database: true, redis: true, storage: true } }),
  ),
];
