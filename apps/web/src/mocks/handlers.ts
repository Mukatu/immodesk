import { http, HttpResponse } from 'msw';

// Cycle d'import statique avec leases-handlers.ts : ce fichier lui exporte les
// Maps/helpers phase 0-1 (valeurs lues seulement au moment des requêtes, jamais
// au chargement du module), et importe ici `leaseHandlers` uniquement pour le
// spread final du tableau `handlers`, construit tout en bas de ce fichier — donc
// après que les deux modules aient fini de s'évaluer. Sûr en pratique (testé).
import { leaseHandlers } from './leases-handlers';
import { leases, seedLeasesDemoData } from './leases-seed';
import { billingHandlers } from './billing-handlers';
import { invoices as billingInvoices, seedBillingDemoData } from './billing-seed';
import { paymentsHandlers, seedPaymentsDemoData } from './payments-handlers';
import { cashHandlers, seedCashDemoData } from './cash-handlers';
import { receiptsHandlers, seedReceiptsDemoData } from './receipts-handlers';
import { receipts as demoReceipts } from './receipts-seed';
import { messagesHandlers, seedMessagesDemoData } from './messages-handlers';
import { penaltyRulesHandlers, seedPenaltyRulesDemoData } from './penalty-rules-handlers';
import {
  notificationTemplatesHandlers,
  seedNotificationTemplatesDemoData,
} from './notification-templates-handlers';
import { API_BASE } from './api-base';

/**
 * Mock MSW de l'API — Phase 0 uniquement, conforme à docs/api/phase0-contract.md.
 * Utilisé en e2e (Playwright) pour ne jamais dépendre d'un vrai backend.
 * État en mémoire, réinitialisé à chaque démarrage du serveur Next (process e2e).
 */

const DEV_OTP_CODE = '000000';

// API_BASE est importé (et réexporté) depuis son propre module sans dépendance :
// voir le commentaire de api-base.ts sur le cycle d'import avec leases-handlers.ts
// et le TDZ en build de production que ça évite.
export { API_BASE };

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
export const organizations = new Map<string, MockOrganization>();
const memberships: MockMembership[] = [];
const invitations = new Map<string, MockInvitation>();
const accessTokens = new Map<string, string>(); // token -> userId
const refreshTokens = new Map<string, string>(); // token -> userId

interface MockOrganizationSettings {
  defaultPaymentDueDay: number;
  timezone: string;
  currency: 'XAF';
  defaultGraceDays: number;
  receiptFooterText: string | null;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  billing: {
    generateDaysBefore: number;
    autoIssue: boolean;
    defaultPenaltyRuleId: string | null;
    applyPenalties: boolean;
  };
  cash: {
    collectorHoldingCapAmount: number;
    requireTenantSignature: boolean;
    denominationsEnabled: boolean;
  };
  messaging: {
    receiptChannelOrder: ('WHATSAPP' | 'SMS')[];
    sendCashReceiptToTenant: boolean;
    sendInvoiceIssued: boolean;
  };
}

const organizationSettings = new Map<string, MockOrganizationSettings>();

function getOrInitSettings(organizationId: string): MockOrganizationSettings {
  let settings = organizationSettings.get(organizationId);
  if (!settings) {
    settings = {
      defaultPaymentDueDay: 5,
      timezone: 'Africa/Brazzaville',
      currency: 'XAF',
      defaultGraceDays: 3,
      receiptFooterText: null,
      whatsappEnabled: false,
      smsEnabled: true,
      billing: {
        generateDaysBefore: 5,
        autoIssue: true,
        defaultPenaltyRuleId: null,
        applyPenalties: false,
      },
      cash: {
        collectorHoldingCapAmount: 500_000,
        requireTenantSignature: true,
        denominationsEnabled: false,
      },
      messaging: {
        receiptChannelOrder: ['WHATSAPP', 'SMS'],
        sendCashReceiptToTenant: true,
        sendInvoiceIssued: true,
      },
    };
    organizationSettings.set(organizationId, settings);
  }
  return settings;
}

let seq = 1;
export function nextId(prefix: string): string {
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

// ---------------------------------------------------------------------------
// Phase 1 — Tiers et patrimoine (docs/api/phase1-contract.md)
// Maps dédiées, isolées de la phase 0, toujours scopées par organizationId.
// ---------------------------------------------------------------------------

export type PartyType = 'INDIVIDUAL' | 'COMPANY';
type Gender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';
type IdDocumentType =
  | 'CNI'
  | 'PASSPORT'
  | 'RESIDENCE_PERMIT'
  | 'DRIVING_LICENSE'
  | 'VOTER_CARD'
  | 'RCCM'
  | 'NIU'
  | 'OTHER';
export type PropertyType =
  | 'HOUSE'
  | 'VILLA'
  | 'APARTMENT_BUILDING'
  | 'COMPOUND'
  | 'COMMERCIAL_BUILDING'
  | 'MIXED_USE'
  | 'LAND'
  | 'WAREHOUSE'
  | 'OTHER';
export type UnitType =
  | 'STUDIO'
  | 'ROOM'
  | 'APARTMENT'
  | 'HOUSE'
  | 'SHOP'
  | 'OFFICE'
  | 'WAREHOUSE'
  | 'PARKING'
  | 'LAND_PLOT'
  | 'OTHER';
export type UnitStatus =
  'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'UNDER_MAINTENANCE' | 'UNAVAILABLE';
type ContactOwnerType = 'LANDLORD' | 'TENANT' | 'GUARANTOR' | 'MEMBER' | 'SUPPLIER';
type ContactChannelType = 'PHONE' | 'MOBILE' | 'WHATSAPP' | 'EMAIL' | 'FAX';
type BankAccountHolderType = 'ORGANIZATION' | 'LANDLORD' | 'TENANT';
type MomoProvider = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'CINETPAY' | 'PAWAPAY' | 'OTHER';
export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'BANK_CHECK';
export type DocumentKind =
  | 'ID_DOCUMENT'
  | 'LEASE_CONTRACT'
  | 'MANDATE'
  | 'RECEIPT_PDF'
  | 'INVOICE_PDF'
  | 'CASH_RECEIPT_PDF'
  | 'TRANSFER_PROOF'
  | 'CHECK_IMAGE'
  | 'BANK_STATEMENT'
  | 'INSPECTION_REPORT'
  | 'INSPECTION_PHOTO'
  | 'MAINTENANCE_PHOTO'
  | 'SIGNATURE'
  | 'OWNER_STATEMENT_PDF'
  | 'EXPENSE_INVOICE'
  | 'PROPERTY_PHOTO'
  | 'OTHER';

export interface MockLandlord {
  id: string;
  organizationId: string;
  partyType: PartyType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  gender?: Gender;
  birthDate?: string;
  nationality?: string;
  idDocumentType?: IdDocumentType;
  idDocumentNumber?: string;
  idDocumentExpiry?: string;
  idDocumentId?: string;
  rccmNumber?: string;
  niuNumber?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  addressLine?: string;
  district?: string;
  city: string;
  countryCode: string;
  defaultBankAccountId?: string;
  payoutMethod: PaymentMethod;
  notes?: string;
  isSelf: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MockTenant {
  id: string;
  organizationId: string;
  partyType: PartyType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  idDocumentType?: IdDocumentType;
  idDocumentNumber?: string;
  idDocumentExpiry?: string;
  idDocumentId?: string;
  rccmNumber?: string;
  niuNumber?: string;
  profession?: string;
  employerName?: string;
  monthlyIncome?: number;
  primaryPhone: string;
  secondaryPhone?: string;
  whatsappPhone?: string;
  email?: string;
  addressLine?: string;
  district?: string;
  city?: string;
  countryCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  clientRef?: string;
  notes?: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MockGuarantor {
  id: string;
  organizationId: string;
  tenantId: string;
  partyType: PartyType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  relationship?: string;
  idDocumentType?: IdDocumentType;
  idDocumentNumber?: string;
  idDocumentId?: string;
  profession?: string;
  employerName?: string;
  monthlyIncome?: number;
  guaranteeAmount?: number;
  primaryPhone: string;
  email?: string;
  addressLine?: string;
  district?: string;
  city?: string;
  countryCode?: string;
  notes?: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MockContactChannel {
  id: string;
  organizationId: string;
  ownerType: ContactOwnerType;
  ownerId: string;
  channelType: ContactChannelType;
  value: string;
  label?: string;
  isPrimary: boolean;
  optIn: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  optOutAt: string | null;
  createdAt: string;
}

export interface MockProperty {
  id: string;
  organizationId: string;
  landlordId: string;
  code?: string;
  name: string;
  propertyType: PropertyType;
  addressLine: string;
  district: string;
  arrondissement?: string;
  landmark?: string;
  city: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  landTitleReference?: string;
  parcelNumber?: string;
  builtYear?: number;
  totalAreaSqm?: number;
  floorsCount?: number;
  hasWater?: boolean;
  hasElectricity?: boolean;
  hasBorehole?: boolean;
  caretakerName?: string;
  caretakerPhone?: string;
  coverDocumentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MockUnit {
  id: string;
  organizationId: string;
  propertyId: string;
  code: string;
  label?: string;
  unitType: UnitType;
  status: UnitStatus;
  floorNumber?: number;
  roomsCount?: number;
  bedroomsCount?: number;
  bathroomsCount?: number;
  areaSqm?: number;
  isFurnished?: boolean;
  hasPrivateMeter?: boolean;
  baseRentAmount: number;
  baseChargesAmount?: number;
  depositMonths?: number;
  amenities?: Record<string, boolean | string | number>;
  notes?: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MockBankAccount {
  id: string;
  organizationId: string;
  holderType: BankAccountHolderType;
  landlordId?: string;
  tenantId?: string;
  label: string;
  bankCode: string;
  bankName: string;
  branchName?: string;
  accountHolderName: string;
  accountNumber?: string;
  ribKey?: string;
  iban?: string;
  swiftBic?: string;
  momoProvider?: MomoProvider;
  momoMsisdn?: string;
  isDefault: boolean;
  currency: 'XAF';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockDocument {
  id: string;
  organizationId: string;
  objectKey: string;
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  pagesCount: number | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  uploadedByUserId: string | null;
  uploadedAt: string;
  retentionUntil: string | null;
  deletedAt: string | null;
}

export const landlords = new Map<string, MockLandlord>();
export const tenants = new Map<string, MockTenant>();
const guarantors = new Map<string, MockGuarantor>();
const contactChannels = new Map<string, MockContactChannel>();
export const properties = new Map<string, MockProperty>();
export const units = new Map<string, MockUnit>();
const bankAccounts = new Map<string, MockBankAccount>();
export const documents = new Map<string, MockDocument>();
const pendingUploadObjects = new Map<
  string,
  { organizationId: string; mimeType: string; sizeBytes: number; maxSizeBytes: number }
>();

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  let local: string;
  if (digits.startsWith('+242')) local = digits.slice(4);
  else if (digits.startsWith('00242')) local = digits.slice(5);
  else if (digits.startsWith('242') && digits.length === 12) local = digits.slice(3);
  else local = digits.replace(/^\+/, '');
  if (!/^\d{9}$/.test(local)) return null;
  return `+242${local}`;
}

function foldSearch(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function matchesQuery(
  q: string | null,
  ...fields: Array<string | null | undefined>
): boolean {
  if (!q) return true;
  const needle = foldSearch(q);
  return fields.some((f) => !!f && foldSearch(f).includes(needle));
}

function displayNameFor(
  partyType: PartyType,
  firstName?: string,
  lastName?: string,
  companyName?: string,
): string {
  if (partyType === 'COMPANY') return companyName ?? '';
  if (firstName && lastName) return `${firstName} ${lastName}`;
  return lastName ?? firstName ?? '';
}

export function orgIdFromRequest(request: Request): string | null {
  return request.headers.get('X-Organization-Id');
}

export function paginate<T>(items: T[]) {
  return { items, pageInfo: { nextCursor: null, hasNextPage: false, limit: items.length } };
}

export function unauthorizedOrg() {
  return HttpResponse.json(
    { code: 'IAM.ORGANIZATION_REQUIRED', message: 'En-tête X-Organization-Id manquant.' },
    { status: 401 },
  );
}

function computeOccupancy(propertyId: string) {
  const propUnits = [...units.values()].filter((u) => u.propertyId === propertyId && !u.deletedAt);
  const unitsCount = propUnits.length;
  const occupiedCount = propUnits.filter((u) => u.status === 'OCCUPIED').length;
  const availableCount = propUnits.filter((u) => u.status === 'AVAILABLE').length;
  const occupancyRateBps = unitsCount === 0 ? 0 : Math.round((occupiedCount / unitsCount) * 10000);
  return { unitsCount, occupiedCount, availableCount, occupancyRateBps };
}

export function landlordSummaryFor(landlord: MockLandlord) {
  return {
    id: landlord.id,
    displayName: displayNameFor(
      landlord.partyType,
      landlord.firstName,
      landlord.lastName,
      landlord.companyName,
    ),
    primaryPhone: landlord.primaryPhone,
    isSelf: landlord.isSelf,
  };
}

function serializeLandlord(landlord: MockLandlord) {
  const { organizationId: _organizationId, ...rest } = landlord;
  const propertiesCount = [...properties.values()].filter(
    (p) => p.landlordId === landlord.id && !p.deletedAt,
  ).length;
  return {
    ...rest,
    displayName: displayNameFor(
      landlord.partyType,
      landlord.firstName,
      landlord.lastName,
      landlord.companyName,
    ),
    propertiesCount,
  };
}

export function serializeTenant(tenant: MockTenant) {
  const { organizationId: _organizationId, ...rest } = tenant;
  return {
    ...rest,
    displayName: displayNameFor(
      tenant.partyType,
      tenant.firstName,
      tenant.lastName,
      tenant.companyName,
    ),
  };
}

function serializeGuarantor(guarantor: MockGuarantor) {
  const { organizationId: _organizationId, ...rest } = guarantor;
  return {
    ...rest,
    displayName: displayNameFor(
      guarantor.partyType,
      guarantor.firstName,
      guarantor.lastName,
      guarantor.companyName,
    ),
  };
}

function serializeContactChannel(channel: MockContactChannel) {
  const { organizationId: _organizationId, ...rest } = channel;
  return rest;
}

export function serializePropertySummary(property: MockProperty) {
  const landlord = landlords.get(property.landlordId);
  return {
    id: property.id,
    code: property.code ?? null,
    name: property.name,
    propertyType: property.propertyType,
    district: property.district,
    city: property.city,
    landlord: landlord
      ? landlordSummaryFor(landlord)
      : { id: property.landlordId, displayName: '', primaryPhone: '', isSelf: false },
    occupancy: computeOccupancy(property.id),
    coverDocumentId: property.coverDocumentId ?? null,
  };
}

function serializeProperty(property: MockProperty) {
  const { organizationId: _organizationId, ...rest } = property;
  const unitsCount = [...units.values()].filter(
    (u) => u.propertyId === property.id && !u.deletedAt,
  ).length;
  return { ...rest, unitsCount };
}

export function serializeUnit(unit: MockUnit) {
  const { organizationId: _organizationId, ...rest } = unit;
  return rest;
}

function serializeBankAccount(account: MockBankAccount) {
  const { organizationId: _organizationId, ...rest } = account;
  return rest;
}

export function serializeDocument(document: MockDocument) {
  const { organizationId: _organizationId, objectKey: _objectKey, ...rest } = document;
  return rest;
}

// Données de démonstration congolaises — isolées sous une organisation fixe et
// jamais atteinte par les scénarios e2e (qui créent toujours une organisation
// fraîche), de sorte qu'un nouveau portefeuille démarre toujours vide.
export const DEMO_ORG_ID = 'org-demo-cg';

(function seedPhase1DemoData() {
  const now = new Date().toISOString();

  const landlord1: MockLandlord = {
    id: nextId('landlord'),
    organizationId: DEMO_ORG_ID,
    partyType: 'INDIVIDUAL',
    firstName: 'Jean-Pierre',
    lastName: 'Mabiala',
    primaryPhone: normalizePhone('066123456')!,
    city: 'Brazzaville',
    district: 'Poto-Poto',
    countryCode: 'CG',
    payoutMethod: 'BANK_TRANSFER',
    isSelf: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const landlord2: MockLandlord = {
    id: nextId('landlord'),
    organizationId: DEMO_ORG_ID,
    partyType: 'INDIVIDUAL',
    firstName: 'Bernadette',
    lastName: 'Nkounkou',
    primaryPhone: normalizePhone('055112233')!,
    city: 'Brazzaville',
    district: 'Bacongo',
    countryCode: 'CG',
    payoutMethod: 'MOBILE_MONEY',
    isSelf: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const landlord3: MockLandlord = {
    id: nextId('landlord'),
    organizationId: DEMO_ORG_ID,
    partyType: 'COMPANY',
    companyName: 'SCI Bacongo Immo',
    primaryPhone: normalizePhone('066998877')!,
    city: 'Brazzaville',
    district: 'Bacongo',
    countryCode: 'CG',
    payoutMethod: 'BANK_TRANSFER',
    isSelf: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  [landlord1, landlord2, landlord3].forEach((l) => landlords.set(l.id, l));

  const property1: MockProperty = {
    id: nextId('property'),
    organizationId: DEMO_ORG_ID,
    landlordId: landlord1.id,
    code: 'IMM-001',
    name: 'Résidence Poto-Poto',
    propertyType: 'APARTMENT_BUILDING',
    addressLine: 'Avenue de la Paix',
    district: 'Poto-Poto',
    city: 'Brazzaville',
    countryCode: 'CG',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const property2: MockProperty = {
    id: nextId('property'),
    organizationId: DEMO_ORG_ID,
    landlordId: landlord3.id,
    code: 'IMM-002',
    name: 'Villa Bacongo',
    propertyType: 'COMPOUND',
    addressLine: 'Rue des Manguiers',
    district: 'Bacongo',
    city: 'Brazzaville',
    countryCode: 'CG',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  [property1, property2].forEach((p) => properties.set(p.id, p));

  const unitDefs: Array<[MockProperty, string, UnitStatus, UnitType, number]> = [
    [property1, 'A01', 'OCCUPIED', 'APARTMENT', 150000],
    [property1, 'A02', 'AVAILABLE', 'APARTMENT', 150000],
    [property1, 'A03', 'RESERVED', 'APARTMENT', 175000],
    [property1, 'A04', 'OCCUPIED', 'APARTMENT', 175000],
    [property2, 'V1', 'OCCUPIED', 'HOUSE', 350000],
    [property2, 'V2', 'AVAILABLE', 'HOUSE', 350000],
  ];
  unitDefs.forEach(([property, code, status, unitType, baseRentAmount]) => {
    const unit: MockUnit = {
      id: nextId('unit'),
      organizationId: DEMO_ORG_ID,
      propertyId: property.id,
      code,
      unitType,
      status,
      baseRentAmount,
      currency: 'XAF',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    units.set(unit.id, unit);
  });

  const tenant1: MockTenant = {
    id: nextId('tenant'),
    organizationId: DEMO_ORG_ID,
    partyType: 'INDIVIDUAL',
    firstName: 'Serge',
    lastName: 'Loubassou',
    primaryPhone: normalizePhone('066111222')!,
    city: 'Brazzaville',
    district: 'Moungali',
    countryCode: 'CG',
    currency: 'XAF',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const tenant2: MockTenant = {
    id: nextId('tenant'),
    organizationId: DEMO_ORG_ID,
    partyType: 'INDIVIDUAL',
    firstName: 'Grace',
    lastName: 'Ondongo',
    primaryPhone: normalizePhone('055443322')!,
    city: 'Brazzaville',
    district: 'Ouenzé',
    countryCode: 'CG',
    currency: 'XAF',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  [tenant1, tenant2].forEach((t) => tenants.set(t.id, t));

  const bankAccountDefs: Array<
    [MockBankAccount['holderType'], string | undefined, string | undefined, string, string, string]
  > = [
    ['LANDLORD', landlord1.id, undefined, 'BGFI', 'BGFIBank Congo', 'Jean-Pierre Mabiala'],
    ['LANDLORD', landlord3.id, undefined, 'LCB', 'LCB Bank', 'SCI Bacongo Immo'],
    ['TENANT', undefined, tenant1.id, 'ECOBANK', 'Ecobank Congo', 'Serge Loubassou'],
    ['ORGANIZATION', undefined, undefined, 'UBA', 'UBA Congo', 'Agence Immodesk Demo'],
  ];
  bankAccountDefs.forEach(
    ([holderType, landlordId, tenantId, bankCode, bankName, accountHolderName]) => {
      const account: MockBankAccount = {
        id: nextId('bank'),
        organizationId: DEMO_ORG_ID,
        holderType,
        landlordId,
        tenantId,
        label: `Compte ${bankCode}`,
        bankCode,
        bankName,
        accountHolderName,
        isDefault: true,
        currency: 'XAF',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      bankAccounts.set(account.id, account);
    },
  );
})();

seedLeasesDemoData({ properties, units, tenants, DEMO_ORG_ID, nextId, normalizePhone });
seedBillingDemoData({ leases: [...leases.values()], DEMO_ORG_ID, nextId });
seedPaymentsDemoData({ invoices: billingInvoices, DEMO_ORG_ID, nextId });
seedCashDemoData({
  invoices: billingInvoices,
  DEMO_ORG_ID,
  nextId,
  tenantName: (tenantId) => {
    const tenant = tenants.get(tenantId);
    return tenant ? serializeTenant(tenant).displayName : 'Locataire inconnu';
  },
});
seedReceiptsDemoData({
  invoices: billingInvoices,
  DEMO_ORG_ID,
  nextId,
  landlordDisplayNameForProperty: (propertyId) => {
    const property = properties.get(propertyId);
    const landlord = property ? landlords.get(property.landlordId) : undefined;
    return landlord ? landlordSummaryFor(landlord).displayName : 'Bailleur inconnu';
  },
  organizationName: 'Agence Immodesk Demo',
});
seedMessagesDemoData({
  receipts: demoReceipts,
  DEMO_ORG_ID,
  nextId,
  tenantPhone: (tenantId) => tenants.get(tenantId)?.primaryPhone ?? '+242060000000',
});
seedPenaltyRulesDemoData({ DEMO_ORG_ID, nextId });
seedNotificationTemplatesDemoData({ DEMO_ORG_ID, nextId });

export function notFound(code: string, message = 'Introuvable.') {
  return HttpResponse.json({ code, message }, { status: 404 });
}

export function conflict(code: string, message: string, details?: Record<string, unknown>) {
  return HttpResponse.json({ code, message, ...(details ? { details } : {}) }, { status: 409 });
}

export function badRequest(code: string, message: string) {
  return HttpResponse.json({ code, message }, { status: 400 });
}

function hasRequiredName(body: {
  partyType: PartyType;
  lastName?: string;
  companyName?: string;
}): boolean {
  return body.partyType === 'COMPANY' ? !!body.companyName : !!body.lastName;
}

export const handlers = [
  http.post(`${API_BASE}/auth/otp/request`, async ({ request }) => {
    const body = (await request.json()) as { phone: string };
    findOrCreateUser(body.phone);
    return HttpResponse.json(
      {
        requestId: nextId('otpreq'),
        channel: 'SMS',
        expiresInSeconds: 300,
        resendAfterSeconds: 60,
      },
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
      return HttpResponse.json(
        { code: 'IAM.UNAUTHORIZED', message: 'Non authentifié.' },
        { status: 401 },
      );
    }
    return HttpResponse.json({ user, organizations: membershipsForUser(user.id) });
  }),

  http.post(`${API_BASE}/organizations`, async ({ request }) => {
    const user = userFromAuthHeader(request);
    if (!user) {
      return HttpResponse.json(
        { code: 'IAM.UNAUTHORIZED', message: 'Non authentifié.' },
        { status: 401 },
      );
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
    if (!org)
      return HttpResponse.json({ code: 'ORG.NOT_FOUND', message: 'Introuvable.' }, { status: 404 });
    return HttpResponse.json(org);
  }),

  http.get(`${API_BASE}/organizations/:id/settings`, ({ params }) => {
    const orgId = String(params.id);
    if (!organizations.has(orgId)) {
      return HttpResponse.json({ code: 'ORG.NOT_FOUND', message: 'Introuvable.' }, { status: 404 });
    }
    return HttpResponse.json(getOrInitSettings(orgId));
  }),

  http.patch(`${API_BASE}/organizations/:id/settings`, async ({ params, request }) => {
    const orgId = String(params.id);
    if (!organizations.has(orgId)) {
      return HttpResponse.json({ code: 'ORG.NOT_FOUND', message: 'Introuvable.' }, { status: 404 });
    }
    const current = getOrInitSettings(orgId);
    const body = (await request.json()) as Partial<MockOrganizationSettings>;
    const updated: MockOrganizationSettings = {
      ...current,
      ...body,
      billing: { ...current.billing, ...(body.billing ?? {}) },
      cash: { ...current.cash, ...(body.cash ?? {}) },
      messaging: { ...current.messaging, ...(body.messaging ?? {}) },
    };
    organizationSettings.set(orgId, updated);
    return HttpResponse.json(updated);
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
      return HttpResponse.json(
        { code: 'ORG.INVITATION_NOT_FOUND', message: 'Invitation introuvable.' },
        { status: 404 },
      );
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
      return HttpResponse.json(
        { code: 'ORG.INVITATION_NOT_FOUND', message: 'Invitation introuvable.' },
        { status: 404 },
      );
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
    return HttpResponse.json({
      organization: org,
      role: invitation.role,
      joinedAt: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE}/feature-flags`, () => HttpResponse.json({ flags: { demo: true } })),

  http.get(`${API_BASE}/health`, () =>
    HttpResponse.json({ status: 'ok', checks: { database: true, redis: true, storage: true } }),
  ),

  // --- Landlords (phase 1) ------------------------------------------------
  http.post(`${API_BASE}/landlords`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as Partial<MockLandlord> & { primaryPhone: string };
    if (
      !hasRequiredName(body as { partyType: PartyType; lastName?: string; companyName?: string })
    ) {
      return badRequest('PARTIES.NAME_REQUIRED', 'Le nom est requis.');
    }
    const primaryPhone = normalizePhone(body.primaryPhone);
    if (!primaryPhone) return badRequest('PARTIES.PHONE_INVALID', 'Numéro de téléphone invalide.');
    const now = new Date().toISOString();
    const landlord: MockLandlord = {
      ...(body as MockLandlord),
      id: nextId('landlord'),
      organizationId,
      primaryPhone,
      city: body.city ?? '',
      countryCode: body.countryCode ?? 'CG',
      payoutMethod: body.payoutMethod ?? 'BANK_TRANSFER',
      isSelf: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    landlords.set(landlord.id, landlord);
    return HttpResponse.json(serializeLandlord(landlord), { status: 201 });
  }),

  http.get(`${API_BASE}/landlords`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const city = url.searchParams.get('city');
    const items = [...landlords.values()]
      .filter((l) => l.organizationId === organizationId && !l.deletedAt)
      .filter((l) => !city || l.city === city)
      .filter((l) => matchesQuery(q, l.firstName, l.lastName, l.companyName, l.primaryPhone))
      .map(serializeLandlord);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/landlords/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const landlord = landlords.get(String(params.id));
    if (!landlord || landlord.organizationId !== organizationId || landlord.deletedAt) {
      return notFound('PARTIES.LANDLORD_NOT_FOUND');
    }
    const landlordProperties = [...properties.values()]
      .filter((p) => p.landlordId === landlord.id && !p.deletedAt)
      .map(serializePropertySummary);
    const landlordBankAccounts = [...bankAccounts.values()]
      .filter((a) => a.landlordId === landlord.id)
      .map(serializeBankAccount);
    return HttpResponse.json({
      ...serializeLandlord(landlord),
      properties: landlordProperties,
      bankAccounts: landlordBankAccounts,
    });
  }),

  http.patch(`${API_BASE}/landlords/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const landlord = landlords.get(String(params.id));
    if (!landlord || landlord.organizationId !== organizationId || landlord.deletedAt) {
      return notFound('PARTIES.LANDLORD_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockLandlord>;
    if (body.primaryPhone) {
      const normalized = normalizePhone(body.primaryPhone);
      if (!normalized) return badRequest('PARTIES.PHONE_INVALID', 'Numéro de téléphone invalide.');
      body.primaryPhone = normalized;
    }
    Object.assign(landlord, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(serializeLandlord(landlord));
  }),

  http.delete(`${API_BASE}/landlords/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const landlord = landlords.get(String(params.id));
    if (!landlord || landlord.organizationId !== organizationId || landlord.deletedAt) {
      return notFound('PARTIES.LANDLORD_NOT_FOUND');
    }
    if (landlord.isSelf) {
      return conflict('PARTIES.SELF_LANDLORD_PROTECTED', 'Ce bailleur ne peut pas être supprimé.');
    }
    const hasProperties = [...properties.values()].some(
      (p) => p.landlordId === landlord.id && !p.deletedAt,
    );
    if (hasProperties) {
      return conflict('PARTIES.LANDLORD_HAS_PROPERTIES', 'Ce bailleur a des immeubles rattachés.');
    }
    landlord.deletedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Tenants -------------------------------------------------------------
  http.post(`${API_BASE}/tenants`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as Partial<MockTenant> & {
      primaryPhone: string;
      confirmDuplicatePhone?: boolean;
    };
    if (
      !hasRequiredName(body as { partyType: PartyType; lastName?: string; companyName?: string })
    ) {
      return badRequest('PARTIES.NAME_REQUIRED', 'Le nom est requis.');
    }
    const primaryPhone = normalizePhone(body.primaryPhone);
    if (!primaryPhone) return badRequest('PARTIES.PHONE_INVALID', 'Numéro de téléphone invalide.');
    const existing = [...tenants.values()].find(
      (t) => t.organizationId === organizationId && !t.deletedAt && t.primaryPhone === primaryPhone,
    );
    if (existing && !body.confirmDuplicatePhone) {
      return conflict(
        'PARTIES.PHONE_ALREADY_USED',
        'Ce numéro est déjà utilisé par un autre locataire.',
        { existingTenantId: existing.id },
      );
    }
    const now = new Date().toISOString();
    const { confirmDuplicatePhone: _confirm, ...tenantBody } = body;
    const tenant: MockTenant = {
      ...(tenantBody as MockTenant),
      id: nextId('tenant'),
      organizationId,
      primaryPhone,
      currency: 'XAF',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    tenants.set(tenant.id, tenant);
    return HttpResponse.json(serializeTenant(tenant), { status: 201 });
  }),

  http.get(`${API_BASE}/tenants`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const items = [...tenants.values()]
      .filter((t) => t.organizationId === organizationId && !t.deletedAt)
      .filter((t) => matchesQuery(q, t.firstName, t.lastName, t.companyName, t.primaryPhone))
      .map(serializeTenant);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/tenants/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tenant = tenants.get(String(params.id));
    if (!tenant || tenant.organizationId !== organizationId || tenant.deletedAt) {
      return notFound('PARTIES.TENANT_NOT_FOUND');
    }
    const tenantGuarantors = [...guarantors.values()]
      .filter((g) => g.tenantId === tenant.id && !g.deletedAt)
      .map(serializeGuarantor);
    const tenantChannels = [...contactChannels.values()]
      .filter((c) => c.ownerType === 'TENANT' && c.ownerId === tenant.id)
      .map(serializeContactChannel);
    const tenantDocuments = [...documents.values()]
      .filter(
        (d) => d.relatedEntityType === 'tenant' && d.relatedEntityId === tenant.id && !d.deletedAt,
      )
      .map(serializeDocument);
    return HttpResponse.json({
      ...serializeTenant(tenant),
      guarantors: tenantGuarantors,
      contactChannels: tenantChannels,
      documents: tenantDocuments,
    });
  }),

  http.patch(`${API_BASE}/tenants/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tenant = tenants.get(String(params.id));
    if (!tenant || tenant.organizationId !== organizationId || tenant.deletedAt) {
      return notFound('PARTIES.TENANT_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockTenant>;
    if (body.primaryPhone) {
      const normalized = normalizePhone(body.primaryPhone);
      if (!normalized) return badRequest('PARTIES.PHONE_INVALID', 'Numéro de téléphone invalide.');
      body.primaryPhone = normalized;
    }
    Object.assign(tenant, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(serializeTenant(tenant));
  }),

  http.delete(`${API_BASE}/tenants/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tenant = tenants.get(String(params.id));
    if (!tenant || tenant.organizationId !== organizationId || tenant.deletedAt) {
      return notFound('PARTIES.TENANT_NOT_FOUND');
    }
    tenant.deletedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Guarantors ------------------------------------------------------------
  http.post(`${API_BASE}/tenants/:id/guarantors`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tenant = tenants.get(String(params.id));
    if (!tenant || tenant.organizationId !== organizationId || tenant.deletedAt) {
      return notFound('PARTIES.TENANT_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockGuarantor> & { primaryPhone: string };
    if (
      !hasRequiredName(body as { partyType: PartyType; lastName?: string; companyName?: string })
    ) {
      return badRequest('PARTIES.NAME_REQUIRED', 'Le nom est requis.');
    }
    const primaryPhone = normalizePhone(body.primaryPhone);
    if (!primaryPhone) return badRequest('PARTIES.PHONE_INVALID', 'Numéro de téléphone invalide.');
    const now = new Date().toISOString();
    const guarantor: MockGuarantor = {
      ...(body as MockGuarantor),
      id: nextId('guarantor'),
      organizationId,
      tenantId: tenant.id,
      primaryPhone,
      currency: 'XAF',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    guarantors.set(guarantor.id, guarantor);
    return HttpResponse.json(serializeGuarantor(guarantor), { status: 201 });
  }),

  http.patch(`${API_BASE}/guarantors/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const guarantor = guarantors.get(String(params.id));
    if (!guarantor || guarantor.organizationId !== organizationId || guarantor.deletedAt) {
      return notFound('PARTIES.GUARANTOR_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockGuarantor>;
    if (body.primaryPhone) {
      const normalized = normalizePhone(body.primaryPhone);
      if (!normalized) return badRequest('PARTIES.PHONE_INVALID', 'Numéro de téléphone invalide.');
      body.primaryPhone = normalized;
    }
    Object.assign(guarantor, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(serializeGuarantor(guarantor));
  }),

  http.delete(`${API_BASE}/guarantors/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const guarantor = guarantors.get(String(params.id));
    if (!guarantor || guarantor.organizationId !== organizationId || guarantor.deletedAt) {
      return notFound('PARTIES.GUARANTOR_NOT_FOUND');
    }
    guarantor.deletedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Contact channels --------------------------------------------------
  http.get(`${API_BASE}/parties/:ownerType/:ownerId/contact-channels`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const ownerId = String(params.ownerId);
    const items = [...contactChannels.values()]
      .filter((c) => c.organizationId === organizationId && c.ownerId === ownerId)
      .map(serializeContactChannel);
    return HttpResponse.json({ items });
  }),

  http.post(
    `${API_BASE}/parties/:ownerType/:ownerId/contact-channels`,
    async ({ params, request }) => {
      const organizationId = orgIdFromRequest(request);
      if (!organizationId) return unauthorizedOrg();
      const ownerTypeParam = String(params.ownerType).toUpperCase().replace(/S$/, '');
      const ownerType = ownerTypeParam as ContactOwnerType;
      const ownerId = String(params.ownerId);
      const body = (await request.json()) as {
        channelType: ContactChannelType;
        value: string;
        label?: string;
        isPrimary?: boolean;
        optIn?: boolean;
      };
      const duplicate = [...contactChannels.values()].some(
        (c) =>
          c.organizationId === organizationId &&
          c.ownerId === ownerId &&
          c.channelType === body.channelType &&
          c.value === body.value,
      );
      if (duplicate) {
        return conflict('PARTIES.CHANNEL_DUPLICATE', 'Ce canal de contact existe déjà.');
      }
      if (body.isPrimary) {
        [...contactChannels.values()]
          .filter((c) => c.ownerId === ownerId && c.channelType === body.channelType)
          .forEach((c) => {
            c.isPrimary = false;
          });
      }
      const channel: MockContactChannel = {
        id: nextId('channel'),
        organizationId,
        ownerType,
        ownerId,
        channelType: body.channelType,
        value: body.value,
        label: body.label,
        isPrimary: body.isPrimary ?? false,
        optIn: body.optIn ?? true,
        isVerified: false,
        verifiedAt: null,
        optOutAt: null,
        createdAt: new Date().toISOString(),
      };
      contactChannels.set(channel.id, channel);
      return HttpResponse.json(serializeContactChannel(channel), { status: 201 });
    },
  ),

  http.patch(`${API_BASE}/contact-channels/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const channel = contactChannels.get(String(params.id));
    if (!channel || channel.organizationId !== organizationId) {
      return notFound('PARTIES.CHANNEL_NOT_FOUND');
    }
    const body = (await request.json()) as { label?: string; isPrimary?: boolean; optIn?: boolean };
    if (body.isPrimary) {
      [...contactChannels.values()]
        .filter(
          (c) =>
            c.ownerId === channel.ownerId &&
            c.channelType === channel.channelType &&
            c.id !== channel.id,
        )
        .forEach((c) => {
          c.isPrimary = false;
        });
    }
    Object.assign(channel, body);
    return HttpResponse.json(serializeContactChannel(channel));
  }),

  http.delete(`${API_BASE}/contact-channels/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const channel = contactChannels.get(String(params.id));
    if (!channel || channel.organizationId !== organizationId) {
      return notFound('PARTIES.CHANNEL_NOT_FOUND');
    }
    contactChannels.delete(channel.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Properties ----------------------------------------------------------
  http.post(`${API_BASE}/properties`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
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
    return HttpResponse.json(serializeProperty(property), { status: 201 });
  }),

  http.get(`${API_BASE}/properties`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const landlordId = url.searchParams.get('landlordId');
    const city = url.searchParams.get('city');
    const items = [...properties.values()]
      .filter((p) => p.organizationId === organizationId && !p.deletedAt)
      .filter((p) => !landlordId || p.landlordId === landlordId)
      .filter((p) => !city || p.city === city)
      .filter((p) => matchesQuery(q, p.name, p.code, p.district))
      .map(serializePropertySummary);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/properties/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const property = properties.get(String(params.id));
    if (!property || property.organizationId !== organizationId || property.deletedAt) {
      return notFound('PORTFOLIO.PROPERTY_NOT_FOUND');
    }
    const landlord = landlords.get(property.landlordId);
    const propertyUnits = [...units.values()]
      .filter((u) => u.propertyId === property.id && !u.deletedAt)
      .map(serializeUnit);
    return HttpResponse.json({
      ...serializeProperty(property),
      landlord: landlord ? landlordSummaryFor(landlord) : null,
      units: propertyUnits,
      occupancy: computeOccupancy(property.id),
    });
  }),

  http.patch(`${API_BASE}/properties/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const property = properties.get(String(params.id));
    if (!property || property.organizationId !== organizationId || property.deletedAt) {
      return notFound('PORTFOLIO.PROPERTY_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockProperty>;
    Object.assign(property, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(serializeProperty(property));
  }),

  http.delete(`${API_BASE}/properties/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const property = properties.get(String(params.id));
    if (!property || property.organizationId !== organizationId || property.deletedAt) {
      return notFound('PORTFOLIO.PROPERTY_NOT_FOUND');
    }
    const hasUnits = [...units.values()].some((u) => u.propertyId === property.id && !u.deletedAt);
    if (hasUnits) {
      return conflict('PORTFOLIO.PROPERTY_HAS_UNITS', 'Cet immeuble a des lots rattachés.');
    }
    property.deletedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/properties/:id/units`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const property = properties.get(String(params.id));
    if (!property || property.organizationId !== organizationId || property.deletedAt) {
      return notFound('PORTFOLIO.PROPERTY_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockUnit> & {
      code: string;
      baseRentAmount: number;
    };
    const codeTaken = [...units.values()].some(
      (u) => u.propertyId === property.id && !u.deletedAt && u.code === body.code,
    );
    if (codeTaken) {
      return conflict(
        'PORTFOLIO.UNIT_CODE_TAKEN',
        'Ce code de lot est déjà utilisé sur cet immeuble.',
      );
    }
    const now = new Date().toISOString();
    const unit: MockUnit = {
      ...(body as MockUnit),
      id: nextId('unit'),
      organizationId,
      propertyId: property.id,
      unitType: body.unitType ?? 'OTHER',
      status: body.status ?? 'AVAILABLE',
      currency: 'XAF',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    units.set(unit.id, unit);
    return HttpResponse.json(serializeUnit(unit), { status: 201 });
  }),

  http.post(`${API_BASE}/properties/:id/units/bulk`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const property = properties.get(String(params.id));
    if (!property || property.organizationId !== organizationId || property.deletedAt) {
      return notFound('PORTFOLIO.PROPERTY_NOT_FOUND');
    }
    const body = (await request.json()) as {
      prefix: string;
      from: number;
      to: number;
      padding?: number;
      template: Partial<MockUnit>;
    };
    const count = body.to - body.from + 1;
    if (count > 200) {
      return badRequest(
        'PORTFOLIO.UNIT_BULK_RANGE_TOO_LARGE',
        'La plage demandée dépasse la limite de 200 lots par lot.',
      );
    }
    const padding = body.padding ?? 0;
    const codes: string[] = [];
    for (let n = body.from; n <= body.to; n += 1) {
      codes.push(`${body.prefix}${String(n).padStart(padding, '0')}`);
    }
    const existingCodes = new Set(
      [...units.values()]
        .filter((u) => u.propertyId === property.id && !u.deletedAt)
        .map((u) => u.code),
    );
    const conflictCode = codes.find((code) => existingCodes.has(code));
    if (conflictCode) {
      return conflict(
        'PORTFOLIO.UNIT_CODE_TAKEN',
        `Le code de lot "${conflictCode}" est déjà utilisé sur cet immeuble.`,
      );
    }
    const now = new Date().toISOString();
    const created: MockUnit[] = codes.map((code) => {
      const unit: MockUnit = {
        ...(body.template as MockUnit),
        id: nextId('unit'),
        organizationId,
        propertyId: property.id,
        code,
        unitType: body.template.unitType ?? 'OTHER',
        status: body.template.status ?? 'AVAILABLE',
        currency: 'XAF',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      return unit;
    });
    created.forEach((unit) => units.set(unit.id, unit));
    return HttpResponse.json({ created: created.map(serializeUnit) }, { status: 201 });
  }),

  // --- Units -----------------------------------------------------------------
  http.get(`${API_BASE}/units`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const propertyId = url.searchParams.get('propertyId');
    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q');
    const items = [...units.values()]
      .filter((u) => u.organizationId === organizationId && !u.deletedAt)
      .filter((u) => !propertyId || u.propertyId === propertyId)
      .filter((u) => !status || u.status === status)
      .filter((u) => matchesQuery(q, u.code, u.label))
      .map(serializeUnit);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/units/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const unit = units.get(String(params.id));
    if (!unit || unit.organizationId !== organizationId || unit.deletedAt) {
      return notFound('PORTFOLIO.UNIT_NOT_FOUND');
    }
    const property = properties.get(unit.propertyId);
    const unitDocuments = [...documents.values()]
      .filter(
        (d) => d.relatedEntityType === 'unit' && d.relatedEntityId === unit.id && !d.deletedAt,
      )
      .map(serializeDocument);
    return HttpResponse.json({
      ...serializeUnit(unit),
      property: property ? serializePropertySummary(property) : null,
      documents: unitDocuments,
    });
  }),

  http.patch(`${API_BASE}/units/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const unit = units.get(String(params.id));
    if (!unit || unit.organizationId !== organizationId || unit.deletedAt) {
      return notFound('PORTFOLIO.UNIT_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockUnit>;
    Object.assign(unit, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(serializeUnit(unit));
  }),

  http.delete(`${API_BASE}/units/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const unit = units.get(String(params.id));
    if (!unit || unit.organizationId !== organizationId || unit.deletedAt) {
      return notFound('PORTFOLIO.UNIT_NOT_FOUND');
    }
    unit.deletedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Bank accounts -------------------------------------------------------
  http.post(`${API_BASE}/bank-accounts`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as Partial<MockBankAccount> & {
      holderType: BankAccountHolderType;
      label: string;
      bankCode: string;
      bankName: string;
      accountHolderName: string;
    };
    const duplicate = [...bankAccounts.values()].some(
      (a) =>
        a.organizationId === organizationId &&
        a.isActive &&
        a.bankCode === body.bankCode &&
        a.accountNumber &&
        a.accountNumber === body.accountNumber,
    );
    if (duplicate) {
      return conflict('BANKING.ACCOUNT_DUPLICATE', 'Ce compte bancaire existe déjà.');
    }
    const now = new Date().toISOString();
    const account: MockBankAccount = {
      ...(body as MockBankAccount),
      id: nextId('bank'),
      organizationId,
      isDefault: body.isDefault ?? false,
      currency: 'XAF',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    bankAccounts.set(account.id, account);
    return HttpResponse.json(serializeBankAccount(account), { status: 201 });
  }),

  http.get(`${API_BASE}/bank-accounts`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const holderType = url.searchParams.get('holderType');
    const landlordId = url.searchParams.get('landlordId');
    const items = [...bankAccounts.values()]
      .filter((a) => a.organizationId === organizationId)
      .filter((a) => !holderType || a.holderType === holderType)
      .filter((a) => !landlordId || a.landlordId === landlordId)
      .map(serializeBankAccount);
    return HttpResponse.json({ items });
  }),

  http.patch(`${API_BASE}/bank-accounts/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const account = bankAccounts.get(String(params.id));
    if (!account || account.organizationId !== organizationId) {
      return notFound('BANKING.ACCOUNT_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<MockBankAccount>;
    Object.assign(account, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(serializeBankAccount(account));
  }),

  http.delete(`${API_BASE}/bank-accounts/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const account = bankAccounts.get(String(params.id));
    if (!account || account.organizationId !== organizationId) {
      return notFound('BANKING.ACCOUNT_NOT_FOUND');
    }
    account.isActive = false;
    account.updatedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Documents -------------------------------------------------------------
  http.post(`${API_BASE}/documents/upload-url`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      kind: DocumentKind;
      relatedEntityType?: string;
      relatedEntityId?: string;
    };
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'application/pdf',
    ];
    if (!allowedMimeTypes.includes(body.mimeType)) {
      return HttpResponse.json(
        { code: 'DOCUMENTS.MIME_NOT_ALLOWED', message: 'Type de fichier non autorisé.' },
        { status: 415 },
      );
    }
    const maxSizeBytes = body.mimeType === 'application/pdf' ? 25 * 1024 * 1024 : 15 * 1024 * 1024;
    if (body.sizeBytes > maxSizeBytes) {
      return HttpResponse.json(
        {
          code: 'DOCUMENTS.FILE_TOO_LARGE',
          message: 'Le fichier dépasse la taille maximale autorisée.',
        },
        { status: 413 },
      );
    }
    const objectKey = nextId('obj');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    pendingUploadObjects.set(objectKey, {
      organizationId,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      maxSizeBytes,
    });
    return HttpResponse.json(
      {
        // Chemin relatif (même origine) plutôt qu'un domaine absolu de stockage
        // simulé : ce PUT est émis directement par le navigateur (DocumentUploader,
        // XHR), qui ne passe jamais par msw/node (actif seulement côté serveur,
        // voir instrumentation.ts) — un domaine absolu inexistant échouerait
        // toujours en e2e. En relatif, il retombe sur /api/proxy/*, relayé côté
        // serveur et donc bien intercepté (voir le handler PUT plus bas).
        uploadUrl: `/api/proxy/documents/upload-object/${objectKey}`,
        objectKey,
        expiresAt,
        maxSizeBytes,
      },
      { status: 201 },
    );
  }),

  http.post(`${API_BASE}/documents`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      objectKey: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      kind: DocumentKind;
      relatedEntityType?: string;
      relatedEntityId?: string;
    };
    const pending = pendingUploadObjects.get(body.objectKey);
    if (!pending || pending.organizationId !== organizationId) {
      return notFound('DOCUMENTS.OBJECT_NOT_FOUND', "L'objet n'a pas été téléversé.");
    }
    const document: MockDocument = {
      id: nextId('document'),
      organizationId,
      objectKey: body.objectKey,
      kind: body.kind,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      widthPx: null,
      heightPx: null,
      pagesCount: null,
      relatedEntityType: body.relatedEntityType ?? null,
      relatedEntityId: body.relatedEntityId ?? null,
      uploadedByUserId: null,
      uploadedAt: new Date().toISOString(),
      retentionUntil: null,
      deletedAt: null,
    };
    documents.set(document.id, document);
    return HttpResponse.json(serializeDocument(document), { status: 201 });
  }),

  http.get(`${API_BASE}/documents`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const relatedEntityType = url.searchParams.get('relatedEntityType');
    const relatedEntityId = url.searchParams.get('relatedEntityId');
    const kind = url.searchParams.get('kind');
    const items = [...documents.values()]
      .filter((d) => d.organizationId === organizationId && !d.deletedAt)
      .filter((d) => !relatedEntityType || d.relatedEntityType === relatedEntityType)
      .filter((d) => !relatedEntityId || d.relatedEntityId === relatedEntityId)
      .filter((d) => !kind || d.kind === kind)
      .map(serializeDocument);
    return HttpResponse.json({ items });
  }),

  http.get(`${API_BASE}/documents/:id/download-url`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const document = documents.get(String(params.id));
    if (!document || document.organizationId !== organizationId || document.deletedAt) {
      return notFound('DOCUMENTS.NOT_FOUND');
    }
    return HttpResponse.json({
      downloadUrl: `https://mock-storage.immodesk.internal/download/${document.objectKey}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }),

  http.delete(`${API_BASE}/documents/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const document = documents.get(String(params.id));
    if (!document || document.organizationId !== organizationId || document.deletedAt) {
      return notFound('DOCUMENTS.NOT_FOUND');
    }
    document.deletedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  // Simulateur de stockage objet : le composant DocumentUploader effectue un
  // PUT direct vers l'URL renvoyée par /documents/upload-url, désormais un
  // chemin relatif /api/proxy/... (voir ce handler) plutôt qu'un domaine
  // absolu inexistant, injoignable par un vrai navigateur en e2e.
  http.put(
    `${API_BASE}/documents/upload-object/:objectKey`,
    () => new HttpResponse(null, { status: 200 }),
  ),

  ...leaseHandlers,
  ...billingHandlers,
  ...paymentsHandlers,
  ...cashHandlers,
  ...receiptsHandlers,
  ...messagesHandlers,
  ...penaltyRulesHandlers,
  ...notificationTemplatesHandlers,
];
