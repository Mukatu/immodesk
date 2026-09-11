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

/** Codes d'erreur stables utilisés côté UI (liste non exhaustive, phase 0 + phase 1). */
export const ApiErrorCode = {
  OTP_INVALID: 'IAM.OTP_INVALID',
  OTP_LOCKED: 'IAM.OTP_LOCKED',
  RATE_LIMITED: 'IAM.RATE_LIMITED',
  REFRESH_REVOKED: 'IAM.REFRESH_REVOKED',
  LAST_OWNER: 'ORG.LAST_OWNER',
  PHONE_INVALID: 'PARTIES.PHONE_INVALID',
  NAME_REQUIRED: 'PARTIES.NAME_REQUIRED',
  PHONE_ALREADY_USED: 'PARTIES.PHONE_ALREADY_USED',
  SELF_LANDLORD_PROTECTED: 'PARTIES.SELF_LANDLORD_PROTECTED',
  LANDLORD_HAS_PROPERTIES: 'PARTIES.LANDLORD_HAS_PROPERTIES',
  CHANNEL_DUPLICATE: 'PARTIES.CHANNEL_DUPLICATE',
  PROPERTY_HAS_UNITS: 'PORTFOLIO.PROPERTY_HAS_UNITS',
  UNIT_CODE_TAKEN: 'PORTFOLIO.UNIT_CODE_TAKEN',
  UNIT_HAS_ACTIVE_LEASE: 'PORTFOLIO.UNIT_HAS_ACTIVE_LEASE',
  ACCOUNT_DUPLICATE: 'BANKING.ACCOUNT_DUPLICATE',
  FILE_TOO_LARGE: 'DOCUMENTS.FILE_TOO_LARGE',
  MIME_NOT_ALLOWED: 'DOCUMENTS.MIME_NOT_ALLOWED',
} as const;

/**
 * Types du contrat d'API — Phase 1 (tiers et patrimoine).
 * Recopiés depuis docs/api/phase1-contract.md. Ne pas diverger du contrat
 * sans mettre à jour ce fichier et le document source.
 */

// ---- Énumérations ----

export type PartyType = 'INDIVIDUAL' | 'COMPANY';

export type Gender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';

export type IdDocumentType =
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

export type ContactOwnerType = 'LANDLORD' | 'TENANT' | 'GUARANTOR' | 'MEMBER' | 'SUPPLIER';

export type ContactChannelType = 'PHONE' | 'MOBILE' | 'WHATSAPP' | 'EMAIL' | 'FAX';

export type BankAccountHolderType = 'ORGANIZATION' | 'LANDLORD' | 'TENANT';

export type MomoProvider = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'CINETPAY' | 'PAWAPAY' | 'OTHER';

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

export type RelatedEntityType =
  'landlord' | 'tenant' | 'guarantor' | 'property' | 'unit' | 'organization' | 'lease';

// ---- Tiers : bailleurs ----

export interface LandlordInput {
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
  city?: string;
  countryCode?: string;
  defaultBankAccountId?: string;
  payoutMethod?: PaymentMethod;
  notes?: string;
}

export interface Landlord
  extends
    Required<
      Pick<LandlordInput, 'partyType' | 'primaryPhone' | 'city' | 'countryCode' | 'payoutMethod'>
    >,
    Omit<LandlordInput, 'partyType' | 'primaryPhone' | 'city' | 'countryCode' | 'payoutMethod'> {
  id: string;
  isSelf: boolean;
  displayName: string;
  propertiesCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LandlordSummary {
  id: string;
  displayName: string;
  primaryPhone: string;
  isSelf: boolean;
}

// ---- Tiers : locataires ----

export interface TenantInput {
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
}

export interface Tenant extends TenantInput {
  id: string;
  displayName: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ---- Tiers : garants ----

export interface GuarantorInput {
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
}

export interface Guarantor extends GuarantorInput {
  id: string;
  tenantId: string;
  displayName: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ---- Tiers : canaux de contact ----

export interface ContactChannelInput {
  channelType: ContactChannelType;
  value: string;
  label?: string;
  isPrimary?: boolean;
  optIn?: boolean;
}

export interface ContactChannel extends ContactChannelInput {
  id: string;
  ownerType: ContactOwnerType;
  ownerId: string;
  isVerified: boolean;
  verifiedAt: string | null;
  optOutAt: string | null;
  createdAt: string;
}

// ---- Patrimoine : immeubles ----

export interface PropertyInput {
  landlordId: string;
  code?: string;
  name: string;
  propertyType?: PropertyType;
  addressLine: string;
  district: string;
  arrondissement?: string;
  landmark?: string;
  city?: string;
  countryCode?: string;
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
}

export interface Occupancy {
  unitsCount: number;
  occupiedCount: number;
  availableCount: number;
  occupancyRateBps: number;
}

export interface Property extends PropertyInput {
  id: string;
  unitsCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PropertySummary {
  id: string;
  code: string | null;
  name: string;
  propertyType: PropertyType;
  district: string;
  city: string;
  landlord: LandlordSummary;
  occupancy: Occupancy;
  coverDocumentId: string | null;
}

// ---- Patrimoine : lots ----

export interface UnitInput {
  code: string;
  label?: string;
  unitType?: UnitType;
  status?: UnitStatus;
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
}

export interface Unit extends UnitInput {
  id: string;
  propertyId: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BulkUnitsInput {
  prefix: string; // "A"
  from: number;
  to: number; // 1..12 → A1..A12 (to − from + 1 ≤ 200)
  padding?: number; // 2 → A01..A12
  template: Omit<UnitInput, 'code' | 'label'>;
}

// ---- Comptes bancaires ----

export interface BankAccountInput {
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
  isDefault?: boolean;
}

export interface BankAccount extends BankAccountInput {
  id: string;
  currency: 'XAF';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Documents ----

export interface Document {
  id: string;
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

// ---- Vues détaillées (GET {id}) ----

export interface LandlordDetail extends Landlord {
  properties: PropertySummary[];
  bankAccounts: BankAccount[];
}

export interface TenantDetail extends Tenant {
  guarantors: Guarantor[];
  contactChannels: ContactChannel[];
  documents: Document[];
}

export interface PropertyDetail extends Property {
  landlord: LandlordSummary;
  units: Unit[];
  occupancy: Occupancy;
}

export interface UnitDetail extends Unit {
  property: PropertySummary;
  documents: Document[];
}

// ---- Documents : upload ----

export interface UploadUrlRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: DocumentKind;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
  maxSizeBytes: number;
}

export interface CreateDocumentBody {
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: DocumentKind;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  checksumSha256?: string;
  clientRef?: string;
}

/**
 * Types du contrat d'API — Phase 2 (baux et dépôts de garantie).
 * Recopiés depuis docs/api/phase2-contract.md. Ne pas diverger du contrat
 * sans mettre à jour ce fichier et le document source.
 */

// ---- Énumérations ----

export type LeaseStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'NOTICE_GIVEN'
  | 'TERMINATED'
  | 'EXPIRED'
  | 'CANCELLED';

export type RentPeriod = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export type LeasePartyRole = 'PRIMARY_TENANT' | 'CO_TENANT' | 'GUARANTOR' | 'OCCUPANT';

export type LeaseDocumentKind =
  'CONTRACT' | 'AMENDMENT' | 'NOTICE' | 'TERMINATION' | 'INVENTORY' | 'INSURANCE' | 'OTHER';

export type DepositStatus =
  'PENDING' | 'PARTIALLY_PAID' | 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FORFEITED';

export type DepositMovementType = 'COLLECTION' | 'REFUND' | 'DEDUCTION' | 'TRANSFER' | 'ADJUSTMENT';

// ---- Baux ----

export interface LeaseInput {
  unitId: string;
  primaryTenantId: string;
  startDate: string;
  endDate?: string | null;
  moveInDate?: string;
  rentPeriod?: RentPeriod;
  rentAmount: number;
  chargesAmount?: number;
  chargesAreProvisional?: boolean;
  depositAmount?: number; // défaut : unit.depositMonths × rentAmount
  agencyFeeAmount?: number;
  advanceMonths?: number;
  paymentDueDay?: number;
  graceDays?: number;
  preferredPaymentMethod?: PaymentMethod;
  collectorUserId?: string;
  noticeDays?: number;
  autoRenew?: boolean;
  indexationRateBps?: number;
  nextIndexationDate?: string;
  notes?: string;
  clientRef?: string;
}

export interface Lease extends LeaseInput {
  id: string;
  reference: string | null;
  status: LeaseStatus;
  propertyId: string;
  landlordId: string;
  moveOutDate: string | null;
  currency: 'XAF';
  signedAt: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  balanceAmount: number;
  contractDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LeaseSummary {
  id: string;
  reference: string | null;
  status: LeaseStatus;
  unit: { id: string; code: string; label: string | null };
  property: { id: string; name: string };
  tenant: { id: string; displayName: string; primaryPhone: string };
  startDate: string;
  endDate: string | null;
  rentAmount: number;
  chargesAmount: number;
  paymentDueDay: number;
}

export interface LeaseDetail extends Lease {
  unit: Unit;
  property: PropertySummary;
  landlord: LandlordSummary;
  primaryTenant: Tenant;
  parties: LeaseParty[];
  rentRevisions: RentRevision[];
  deposit: DepositDetail | null;
  documents: LeaseDocument[];
}

export interface LeasePartyInput {
  role: LeasePartyRole;
  tenantId?: string;
  guarantorId?: string;
  shareBps?: number;
  isSolidary?: boolean;
}

export interface LeaseParty extends LeasePartyInput {
  id: string;
  leaseId: string;
  displayName: string;
  signedAt: string | null;
  createdAt: string;
}

export interface RentRevision {
  id: string;
  leaseId: string;
  effectiveDate: string;
  previousRentAmount: number;
  newRentAmount: number;
  previousChargesAmount: number;
  newChargesAmount: number;
  reason: string | null;
  documentId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface LeaseDocument {
  id: string;
  leaseId: string;
  kind: LeaseDocumentKind;
  documentId: string;
  version: number;
  title: string;
  effectiveDate: string | null;
  isSigned: boolean;
  signedAt: string | null;
  signatureHash: string | null;
  generatedByJob: string | null;
  createdAt: string;
}

// ---- Dépôts de garantie ----

export interface DepositMovementInput {
  movementType: DepositMovementType;
  amount: number;
  movementDate?: string;
  reason?: string;
  paymentId?: string;
  inspectionId?: string;
  reversalOfId?: string;
}

export interface DepositMovement extends DepositMovementInput {
  id: string;
  depositId: string;
  leaseId: string;
  currency: 'XAF';
  createdByUserId: string | null;
  createdAt: string;
}

export interface DepositDetail {
  id: string;
  leaseId: string;
  tenantId: string;
  status: DepositStatus;
  requiredAmount: number;
  collectedAmount: number;
  deductedAmount: number;
  refundedAmount: number;
  heldAmount: number;
  monthsEquivalent: number | null;
  dueDate: string | null;
  fullyCollectedAt: string | null;
  refundDueDate: string | null;
  refundedAt: string | null;
  refundBankAccountId: string | null;
  movements: DepositMovement[];
}

export interface DepositSummary {
  id: string;
  leaseId: string;
  leaseReference: string | null;
  tenant: { id: string; displayName: string };
  unit: { id: string; code: string };
  status: DepositStatus;
  requiredAmount: number;
  heldAmount: number;
  refundDueDate: string | null;
}

// ---- Gabarit de contrat ----

export interface ContractTemplate {
  headerTitle: string; // « CONTRAT DE BAIL À USAGE D'HABITATION »
  lessorBlock: string; // texte libre (raison sociale, RCCM, adresse)
  optionalClauses: { key: string; title: string; body: string; enabled: boolean }[];
  legalMentions: string; // mentions légales, à valider par le conseil juridique
  signatureCity: string; // « Brazzaville »
  showOhadaBlock: boolean; // bloc bail commercial (Acte uniforme OHADA)
  footerText: string | null;
}
