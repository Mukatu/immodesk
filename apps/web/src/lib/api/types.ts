/**
 * Types du contrat d'API — Phase 0.
 * Recopiés depuis docs/api/phase0-contract.md en attendant le client généré
 * depuis openapi.json (packages/shared, en cours de création par un autre chantier).
 * Ne pas diverger du contrat sans mettre à jour ce fichier et le document source.
 */

export type Role = 'OWNER' | 'MANAGER' | 'COLLECTOR' | 'ACCOUNTANT' | 'VIEWER';

export type OrganizationType = 'AGENCY' | 'INDEPENDENT_LANDLORD' | 'INDEPENDENT_MANAGER';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  locale: 'fr-CG';
  timezone: 'Africa/Brazzaville';
  createdAt: string;
}

export interface Organization {
  id: string;
  type: OrganizationType;
  legalName: string;
  tradeName: string | null;
  slug: string;
  city: string;
  district: string | null;
  contactPhone: string;
  contactEmail: string | null;
  logoUrl: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface OrganizationMembership {
  organization: Organization;
  role: Role;
  joinedAt: string;
}

export interface OrganizationSettings {
  defaultPaymentDueDay: number;
  timezone: string;
  currency: 'XAF';
  defaultGraceDays: number;
  receiptFooterText: string | null;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
}

export interface Member {
  id: string;
  user: Pick<User, 'id' | 'phone' | 'fullName'>;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
}

export interface Invitation {
  id: string;
  phone: string;
  role: Role;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface PageInfo {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  pageInfo: PageInfo;
}

/** Format d'erreur stable du contrat : { code, message, details? }. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ---- Corps de requêtes ----

export interface OtpRequestBody {
  phone: string;
  channel?: 'SMS' | 'WHATSAPP';
}

export interface OtpRequestResponse {
  requestId: string;
  channel: 'SMS' | 'WHATSAPP';
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface OtpVerifyBody {
  phone: string;
  code: string;
  deviceName?: string;
}

export interface OtpVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  organizations: OrganizationMembership[];
}

export interface RefreshBody {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: User;
  organizations: OrganizationMembership[];
}

export interface UpdateMeBody {
  fullName?: string;
  email?: string;
  locale?: string;
  timezone?: string;
}

export interface CreateOrganizationBody {
  type: OrganizationType;
  legalName: string;
  tradeName?: string;
  city: string;
  district?: string;
  contactPhone: string;
  contactEmail?: string;
}

export interface UpdateOrganizationBody {
  legalName?: string;
  tradeName?: string;
  city?: string;
  district?: string;
  contactPhone?: string;
  contactEmail?: string;
  logoDocumentId?: string;
}

export interface UpdateMemberBody {
  role: Role;
}

export interface CreateInvitationBody {
  phone: string;
  role: Role;
  fullName?: string;
}

export interface InvitationPreview {
  organizationName: string;
  role: Role;
  expiresAt: string;
}

export interface FeatureFlagsResponse {
  flags: Record<string, boolean>;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  checks: { database: boolean; redis: boolean; storage: boolean };
}

/** Codes d'erreur stables utilisés côté UI (liste non exhaustive, phase 0). */
export const ApiErrorCode = {
  OTP_INVALID: 'IAM.OTP_INVALID',
  OTP_LOCKED: 'IAM.OTP_LOCKED',
  RATE_LIMITED: 'IAM.RATE_LIMITED',
  REFRESH_REVOKED: 'IAM.REFRESH_REVOKED',
  LAST_OWNER: 'ORG.LAST_OWNER',
} as const;
