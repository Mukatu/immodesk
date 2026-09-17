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
  billing: BillingSettings;
  cash: CashSettings;
  messaging: MessagingSettings;
  /** Ajouté en phase 8 : optionnel pour ne pas casser les usages existants. */
  facilities?: FacilitiesSettings;
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
  STATEMENT_ALREADY_IMPORTED: 'BANK.STATEMENT_ALREADY_IMPORTED',
  STATEMENT_FORMAT_UNKNOWN: 'BANK.STATEMENT_FORMAT_UNKNOWN',
  STATEMENT_BALANCE_MISMATCH: 'BANK.STATEMENT_BALANCE_MISMATCH',
  STATEMENT_CURRENCY_UNSUPPORTED: 'BANK.STATEMENT_CURRENCY_UNSUPPORTED',
  STATEMENT_HAS_MATCHES: 'BANK.STATEMENT_HAS_MATCHES',
  OVER_MATCHED: 'BANK.OVER_MATCHED',
  CHECK_ALREADY_REGISTERED: 'BANK.CHECK_ALREADY_REGISTERED',
  STATEMENT_PERIOD_INVALID: 'BANK.STATEMENT_PERIOD_INVALID',
  MATCH_TARGET_REQUIRED: 'BANK.MATCH_TARGET_REQUIRED',
  // Phase 8 : états des lieux, compteurs et charges, maintenance.
  METERS_INDEX_REGRESSION: 'METERS.INDEX_REGRESSION',
  METERS_READING_DUPLICATE_DATE: 'METERS.READING_DUPLICATE_DATE',
  METERS_SERIAL_TAKEN: 'METERS.SERIAL_TAKEN',
  INSPECTIONS_LOCKED: 'INSPECTIONS.LOCKED',
  INSPECTIONS_PHOTO_REQUIRED: 'INSPECTIONS.PHOTO_REQUIRED',
  INSPECTIONS_DEDUCTION_ALREADY_APPLIED: 'INSPECTIONS.DEDUCTION_ALREADY_APPLIED',
  DEPOSITS_INSUFFICIENT_BALANCE: 'DEPOSITS.INSUFFICIENT_BALANCE',
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

/**
 * Doit rester strictement identique à `RELATED_ENTITY_TYPES` de
 * `apps/api/src/modules/documents/domain/document-rules.ts`, que l'API valide
 * par `@IsIn` : toute valeur absente de cette liste est refusée par 400.
 */
export type RelatedEntityType =
  | 'landlord'
  | 'tenant'
  | 'guarantor'
  | 'property'
  | 'unit'
  | 'organization'
  | 'lease'
  // Phase 6 : import de relevé bancaire et photo de chèque.
  | 'bank_statement'
  | 'bank_check'
  // Phase 7 : justificatif de dépense, preuve de reversement.
  | 'expense'
  | 'payout'
  // Phase 8 : états des lieux, compteurs et maintenance.
  | 'inspection'
  | 'inspection_item'
  | 'meter_reading'
  | 'maintenance_request'
  | 'maintenance_update';

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

// ---- Énumérations (phase 3 : facturation, paiements, espèces, quittances, messagerie) ----

export type InvoiceStatus =
  'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type InvoiceLineType =
  | 'RENT'
  | 'WATER_CHARGE'
  | 'ELECTRICITY_CHARGE'
  | 'SERVICE_CHARGE'
  | 'PENALTY'
  | 'DEPOSIT'
  | 'AGENCY_FEE'
  | 'REPAIR_REBILL'
  | 'DISCOUNT'
  | 'OTHER';

export type PaymentStatus =
  'PENDING' | 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';

export type PaymentDirection = 'INBOUND' | 'OUTBOUND';

export type FeeBearer = 'TENANT' | 'ORGANIZATION' | 'LANDLORD' | 'SHARED';

export type CreditStatus = 'OPEN' | 'PARTIALLY_USED' | 'USED' | 'REFUNDED' | 'EXPIRED';

export type CashReceiptStatus = 'DRAFT' | 'ISSUED' | 'REMITTED' | 'CANCELLED';

export type RemittanceStatus =
  'OPEN' | 'SUBMITTED' | 'VERIFIED' | 'DEPOSITED' | 'REJECTED' | 'CANCELLED';

export type ReceiptStatus = 'DRAFT' | 'GENERATING' | 'ISSUED' | 'SENT' | 'CANCELLED';

export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';

export type NotificationStatus = 'SCHEDULED' | 'QUEUED' | 'SENT' | 'FAILED' | 'CANCELLED';

export type MessageStatus =
  'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REJECTED' | 'EXPIRED';

export type PenaltyBasis =
  'RATE_BPS_PER_DAY' | 'RATE_BPS_PER_MONTH' | 'FLAT_AMOUNT' | 'FLAT_AMOUNT_PER_DAY';

// ---- Relances (phase 9) ----

export type DunningTrigger = 'DAYS_BEFORE_DUE' | 'DAYS_AFTER_DUE' | 'ON_ISSUE' | 'ON_OVERDUE';

/**
 * Il n'existe pas de statut DELIVERED (arbitrage du contrat phase 9) : la
 * remise effective d'un message se lit dans `message_logs`, jamais ici.
 */
export type DunningStepStatus = 'PENDING' | 'RUNNING' | 'SENT' | 'SKIPPED' | 'FAILED' | 'CANCELLED';

// ---- Paramètres d'organisation (phase 3) ----

export interface BillingSettings {
  generateDaysBefore: number;
  autoIssue: boolean;
  defaultPenaltyRuleId: string | null;
  applyPenalties: boolean;
}

export interface CashSettings {
  collectorHoldingCapAmount: number;
  requireTenantSignature: boolean;
  denominationsEnabled: boolean;
}

export interface MessagingSettings {
  receiptChannelOrder: ('WHATSAPP' | 'SMS')[];
  sendCashReceiptToTenant: boolean;
  sendInvoiceIssued: boolean;
}

// ---- Facturation ----

export interface InvoiceLineInput {
  lineType: InvoiceLineType;
  label: string;
  description?: string;
  quantity?: number;
  unitPriceAmount: number;
  amount?: number;
  vatRateBps?: number;
  isCredit?: boolean;
  periodStart?: string;
  periodEnd?: string;
}

export interface InvoiceLine extends InvoiceLineInput {
  id: string;
  invoiceId: string;
  amount: number;
  vatAmount: number;
  position: number;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  lease: { id: string; reference: string | null };
  tenant: { id: string; displayName: string; primaryPhone: string };
  unit: { id: string; code: string };
  property: { id: string; name: string };
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  graceUntilDate: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

export interface InvoiceDetail extends InvoiceSummary {
  rentAmount: number;
  chargesAmount: number;
  penaltyAmount: number;
  otherAmount: number;
  discountAmount: number;
  issueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  lines: InvoiceLine[];
  allocations: AllocationView[];
  receipt: ReceiptSummary | null;
  documentId: string | null;
  notes: string | null;
}

export interface AllocationView {
  id: string;
  paymentId: string;
  paymentReference: string;
  method: PaymentMethod;
  amount: number;
  allocationDate: string;
  isReversal: boolean;
}

export interface CreateInvoiceBody {
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  lines: InvoiceLineInput[];
  notes?: string;
  issue?: boolean;
}

export interface PenaltyRuleInput {
  name: string;
  basis: PenaltyBasis;
  rateBps?: number;
  flatAmount?: number;
  graceDays?: number;
  capAmount?: number;
  capRateBps?: number;
  maxPeriods?: number;
  appliesToCharges?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface PenaltyRule extends PenaltyRuleInput {
  id: string;
  currency: 'XAF';
  createdAt: string;
}

export interface SimulatePenaltyBody {
  balanceAmount: number;
  daysOverdue: number;
}

export interface SimulatePenaltyResult {
  penaltyAmount: number;
  cappedBy: 'capAmount' | 'capRateBps' | null;
  periods: number;
}

export interface BillingRunInput {
  periodStart?: string;
  dryRun?: boolean;
}

export type BillingRunStatus = 'RUNNING' | 'DONE' | 'FAILED';

export interface BillingRun {
  runId: string;
  status: BillingRunStatus;
  startedAt: string;
  finishedAt: string | null;
  created: number;
  skipped: number;
  errors: { leaseId: string; reason: string }[];
}

export interface BillingDashboard {
  period: string;
  expectedAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  invoicesCount: number;
  paidCount: number;
  byProperty: {
    propertyId: string;
    name: string;
    expected: number;
    collected: number;
    outstanding: number;
  }[];
  byMethod: Record<PaymentMethod, number>;
}

// ---- Paiements ----

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  tenantId: string;
  leaseId?: string;
  paymentDate?: string;
  valueDate?: string;
  externalReference?: string;
  bankAccountId?: string;
  feeAmount?: number;
  feeBearer?: FeeBearer;
  autoAllocate?: boolean;
  allocations?: { invoiceId: string; amount: number }[];
  confirmed?: boolean;
  clientRef?: string;
  notes?: string;
  collectionLatitude?: number;
  collectionLongitude?: number;
}

export interface PaymentSummary {
  id: string;
  reference: string;
  method: PaymentMethod;
  status: PaymentStatus;
  direction: PaymentDirection;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  paymentDate: string;
  tenant: { id: string; displayName: string } | null;
  lease: { id: string; reference: string | null } | null;
  receivedByUserId: string | null;
  reversalOfId: string | null;
}

export interface PaymentDetail extends PaymentSummary {
  externalReference: string | null;
  feeAmount: number;
  netAmount: number;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  allocations: {
    id: string;
    invoiceId: string | null;
    invoiceNumber: string | null;
    tenantCreditId: string | null;
    amount: number;
    isReversal: boolean;
  }[];
  cashReceipt: CashReceiptSummary | null;
  receipts: ReceiptSummary[];
  clientRef: string | null;
  notes: string | null;
  createdAt: string;
}

export interface TenantCredit {
  id: string;
  tenantId: string;
  leaseId: string | null;
  status: CreditStatus;
  origin: string;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  sourcePaymentId: string | null;
  sourceInvoiceId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface TenantCredits {
  remainingAmount: number;
  items: TenantCredit[];
}

export interface TenantStatementLine {
  date: string;
  type: 'INVOICE' | 'PAYMENT' | 'REVERSAL' | 'CREDIT';
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TenantStatement {
  openingBalance: number;
  lines: TenantStatementLine[];
  closingBalance: number;
}

// ---- Espèces ----

export interface CashReceiptInput {
  tenantId: string;
  leaseId?: string;
  amount: number;
  payerName?: string;
  payerPhone?: string;
  purpose?: string;
  receivedAt?: string;
  autoAllocate?: boolean;
  allocations?: { invoiceId: string; amount: number }[];
  signatureDataUrl?: string;
  paperReceiptDocumentId?: string;
  latitude?: number;
  longitude?: number;
  clientRef: string;
}

export interface CashReceiptSummary {
  id: string;
  receiptNumber: string;
  status: CashReceiptStatus;
  amount: number;
  receivedAt: string;
  tenant: { id: string; displayName: string };
  collectorUserId: string;
  collectorName: string;
  remittanceId: string | null;
  paymentId: string | null;
}

export interface CashReceiptDetail extends CashReceiptSummary {
  payerName: string;
  payerPhone: string | null;
  purpose: string | null;
  leaseId: string | null;
  signatureDocumentId: string | null;
  signatureHash: string | null;
  documentId: string | null;
  allocations: { invoiceId: string; invoiceNumber: string | null; amount: number }[];
  cancelledAt: string | null;
  cancellationReason: string | null;
  clientRef: string | null;
}

export interface CollectorBalance {
  userId: string;
  fullName: string;
  heldAmount: number;
  receiptsCount: number;
  oldestReceiptAt: string | null;
  capAmount: number;
  overCap: boolean;
  lastRemittanceAt: string | null;
}

export interface RemittanceInput {
  cashReceiptIds: string[];
  declaredAmount: number;
  denominations?: Record<string, number>;
  submit?: boolean;
  notes?: string;
  clientRef?: string;
}

export interface RemittanceVerifyInput {
  countedAmount: number;
  items?: {
    cashReceiptId: string;
    isVerified: boolean;
    varianceAmount?: number;
    varianceReason?: string;
  }[];
  notes?: string;
}

export interface RemittanceSummary {
  id: string;
  reference: string;
  status: RemittanceStatus;
  collectorUserId: string;
  collectorName: string;
  declaredAmount: number;
  expectedAmount: number;
  countedAmount: number;
  varianceAmount: number;
  receiptsCount: number;
  openedAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
}

export interface RemittanceDetail extends RemittanceSummary {
  items: {
    id: string;
    cashReceiptId: string;
    receiptNumber: string;
    amount: number;
    isVerified: boolean;
    varianceAmount: number;
    varianceReason: string | null;
  }[];
  denominations: Record<string, number>;
  verifiedByUserId: string | null;
  rejectionReason: string | null;
  depositedAt: string | null;
  depositBankAccountId: string | null;
  notes: string | null;
}

// ---- Quittances ----

export interface ReceiptSummary {
  id: string;
  receiptNumber: string;
  status: ReceiptStatus;
  issueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalAmount: number;
  tenant: { id: string; displayName: string };
  paymentId: string;
  invoiceId: string | null;
  sentAt: string | null;
  sentChannel: NotificationChannel | null;
}

export interface ReceiptDetail extends ReceiptSummary {
  rentAmount: number;
  chargesAmount: number;
  penaltyAmount: number;
  remainingBalanceAmount: number;
  verificationUrl: string;
  documentId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  messageLogs: MessageLog[];
}

export interface ReceiptVerification {
  receiptNumber: string;
  issueDate: string;
  period: string | null;
  totalAmount: number;
  tenantName: string;
  landlordDisplayName: string;
  organizationName: string;
  status: ReceiptStatus;
}

// ---- Messagerie ----

export interface NotificationTemplate {
  id: string;
  code: string;
  channel: NotificationChannel;
  locale: string;
  name: string;
  subject: string | null;
  body: string;
  providerTemplateName: string | null;
  providerTemplateLang: string | null;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  approvedAt: string | null;
}

export interface UpdateNotificationTemplateBody {
  body?: string;
  subject?: string;
  providerTemplateName?: string;
  providerTemplateLang?: string;
  isActive?: boolean;
}

export interface MessageLog {
  id: string;
  notificationId: string | null;
  channel: NotificationChannel;
  status: MessageStatus;
  provider: string;
  providerMessageId: string | null;
  toAddress: string;
  templateCode: string | null;
  contentPreview: string | null;
  costAmount: number;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

/**
 * Types du contrat d'API — Phase 4 (Mobile Money à deux modes, virement déclaré,
 * webhooks). Recopiés depuis docs/api/phase4-contract.md. Ne pas diverger du
 * contrat sans mettre à jour ce fichier et le document source.
 */

// ---- Énumérations ----

export type MomoChannel = 'AGGREGATOR' | 'DECLARED';

export type MomoStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'DECLARED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REFUNDED';

/** Statut d'une déclaration de virement bancaire (`bank_transfer_declarations`). */
export type DeclarationStatus =
  'SUBMITTED' | 'UNDER_REVIEW' | 'MATCHED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type WebhookSource =
  'CINETPAY' | 'PAWAPAY' | 'MTN_MOMO' | 'AIRTEL_MONEY' | 'WHATSAPP_CLOUD' | 'SMS_GATEWAY' | 'OTHER';

export type WebhookStatus = 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'IGNORED' | 'FAILED';

/**
 * Fournisseur d'agrégateur Mobile Money configuré pour l'organisation (distinct
 * de `MomoProvider`, qui identifie l'opérateur d'une transaction donnée).
 */
export type MomoAggregatorProvider = 'SIMULATOR' | 'CINETPAY';

/**
 * Prise en charge des frais d'agrégateur Mobile Money : seulement TENANT ou
 * ORGANIZATION. Distinct de `FeeBearer` (phase 3), qui couvre aussi LANDLORD et
 * SHARED pour les paiements en général — `MomoTransaction.feeBearer` réutilise
 * `FeeBearer` tel quel car le contrat lui donne les 4 valeurs.
 */
export type MomoFeeBearer = 'TENANT' | 'ORGANIZATION';

// ---- Paramètres d'organisation : méthodes de paiement ----

export interface PaymentMethodsSettings {
  mobileMoneyDeclared: { enabled: boolean };
  mobileMoneyAggregator: {
    enabled: boolean;
    provider: MomoAggregatorProvider;
    feeBearer: MomoFeeBearer;
    feeRateBps: number;
    minAmount: number;
    maxAmount: number;
  };
  bankTransfer: { enabled: boolean; confirmOnApproval: boolean };
  pendingExpiryMinutes: number;
}

/** Réponse de `GET/PATCH /v1/organizations/{id}/payment-methods`. */
export interface PaymentMethodsSettingsResponse extends PaymentMethodsSettings {
  aggregatorAvailable: boolean;
}

// ---- Mobile Money : déclaré ----

export interface MomoDeclarationInput {
  tenantId: string;
  leaseId?: string;
  invoiceId?: string;
  provider: 'MTN_MOMO' | 'AIRTEL_MONEY';
  operatorReference: string;
  payerMsisdn: string;
  payeeMsisdn: string;
  amount: number;
  paidAt?: string;
  proofDocumentId?: string;
  clientRef: string;
  notes?: string;
}

export interface MomoApproveInput {
  approvedAmount?: number;
  reason?: string;
  allocations?: { invoiceId: string; amount: number }[];
}

export interface MomoTransaction {
  id: string;
  channel: MomoChannel;
  status: MomoStatus;
  provider: MomoProvider;
  aggregator: string | null;
  merchantReference: string;
  providerTransactionId: string | null;
  aggregatorTransactionId: string | null;
  payerMsisdn: string;
  payeeMsisdn: string | null;
  amount: number;
  feeAmount: number;
  feeBearer: FeeBearer;
  netAmount: number;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  paymentId: string | null;
  proofDocumentId: string | null;
  declaredByUserId: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  initiatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  statusCheckedAt: string | null;
  statusCheckCount: number;
}

// ---- Mobile Money : agrégateur ----

export interface MomoQuote {
  amount: number;
  feeAmount: number;
  totalDebited: number;
  netReceived: number;
  feeBearer: MomoFeeBearer;
}

export interface MomoInitiateInput {
  invoiceId?: string;
  tenantId: string;
  amount: number;
  payerMsisdn: string;
  clientRef: string;
}

// ---- Virement déclaré ----

export interface TransferDeclarationInput {
  tenantId: string;
  leaseId?: string;
  invoiceId?: string;
  declaredAmount: number;
  transferDate: string;
  transferReference?: string;
  payerName: string;
  payerBankCode?: string;
  payerBankName?: string;
  payerAccountNumber?: string;
  beneficiaryBankAccountId: string;
  proofDocumentId: string;
  clientRef: string;
  notes?: string;
}

export interface TransferDeclaration extends TransferDeclarationInput {
  id: string;
  status: DeclarationStatus;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  paymentId: string | null;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  matchedStatementLineId: string | null;
  ageHours: number;
  createdAt: string;
}

// ---- Instructions de paiement ----

export interface PaymentInstructions {
  transferReference: string | null;
  invoice: { id: string; invoiceNumber: string | null; balanceAmount: number } | null;
  bankAccounts: {
    id: string;
    bankName: string;
    accountHolderName: string;
    accountNumber: string | null;
    ribKey: string | null;
    iban: string | null;
  }[];
  mobileMoneyNumbers: {
    bankAccountId: string;
    provider: MomoProvider;
    msisdn: string;
    holderName: string;
  }[];
  aggregatorAvailable: boolean;
}

// ---- Webhooks ----

export interface WebhookEvent {
  id: string;
  source: WebhookSource;
  eventType: string;
  status: WebhookStatus;
  externalEventId: string | null;
  signatureValid: boolean | null;
  receivedAt: string;
  processedAt: string | null;
  processingAttempts: number;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  rawPayload: unknown;
}

/**
 * Types du contrat d'API — Phase 5 (mode hors ligne mobile, synchronisation par
 * lots). Recopiés depuis docs/api/phase5-contract.md. Ne pas diverger du
 * contrat sans mettre à jour ce fichier et le document source. Le protocole
 * est générique ; un seul type d'opération réel en phase 5 : `CASH_RECEIPT`
 * (plus `DOCUMENT` pour les pièces jointes). Aucune table de conflits côté
 * API : un conflit est une opération rejetée pour changement côté serveur,
 * agrégée depuis `sync_batches.result`.
 */

// ---- Énumérations ----

export type SyncOperationType = 'CASH_RECEIPT' | 'DOCUMENT';

export type SyncOperationOutcome = 'APPLIED' | 'DUPLICATE' | 'REJECTED' | 'CONFLICT' | 'SKIPPED';

export type SyncBatchStatus = 'APPLIED' | 'PARTIALLY_APPLIED' | 'REJECTED' | 'FAILED';

export type SyncConflictResolution = 'APPLIED' | 'DISCARDED';

// ---- Lots de synchronisation ----

export interface SyncOperationResult {
  clientRef: string;
  type: SyncOperationType;
  outcome: SyncOperationOutcome;
  resourceType?: string;
  resourceId?: string;
  /** Code d'erreur métier, ex. BILLING.INVOICE_NOT_OPEN. */
  code?: string;
  /** Message en français, affichable au démarcheur. */
  message?: string;
  retryable?: boolean;
}

/**
 * `deviceId`/`devicePlatform`/`appVersion`/`collector` : extension web par
 * rapport au `SyncBatchResult` du contrat (qui ne détaille que le résultat),
 * nécessaire pour les colonnes « appareil » et « démarcheur » de l'écran de
 * supervision et pour les filtres `collectorUserId` de la route de liste.
 */
export interface SyncBatchSummary {
  id: string;
  batchRef: string;
  status: SyncBatchStatus;
  deviceId: string;
  devicePlatform: string | null;
  appVersion: string | null;
  collector: { userId: string; fullName: string };
  operationsCount: number;
  appliedCount: number;
  rejectedCount: number;
  conflictsCount: number;
  receivedAt: string;
  appliedAt: string | null;
}

export interface SyncBatchDetail extends SyncBatchSummary {
  clientGeneratedAt: string | null;
  offlineDurationMinutes: number | null;
  results: SyncOperationResult[];
}

// ---- Conflits ----

export interface SyncConflict {
  /** batchId + clientRef, encodé. */
  id: string;
  batchId: string;
  clientRef: string;
  type: SyncOperationType;
  code: string;
  message: string;
  /** Corps d'origine de l'opération, pour rejouer après décision. */
  payload: unknown;
  collector: { userId: string; fullName: string };
  deviceId: string;
  clientCreatedAt: string;
  receivedAt: string;
  resolvedAt: string | null;
  resolution: SyncConflictResolution | null;
  /**
   * Extension web (non contractuelle) : résumé de la facture visée par
   * l'opération d'origine, pour l'affichage face à l'état actuel dans
   * /app/synchronisation/conflits. Absent si la facture n'existe plus.
   */
  targetInvoice: {
    id: string;
    invoiceNumber: string | null;
    status: InvoiceStatus;
    balanceAmount: number;
    tenantDisplayName: string;
  } | null;
  /** Motif d'abandon, renseigné une fois résolu par DISCARD. */
  resolutionReason: string | null;
}

export interface ResolveConflictBody {
  decision: 'APPLY' | 'DISCARD';
  overrides?: { invoiceId?: string; autoAllocate?: boolean };
  reason?: string;
}

export interface ResolveConflictResponse {
  conflict: SyncConflict;
  result: SyncOperationResult;
}

// ---- Appareils ----

/** Réponse de supervision « quel démarcheur n'a pas synchronisé depuis longtemps ». */
export interface DeviceStatus {
  deviceId: string;
  devicePlatform: string | null;
  appVersion: string | null;
  collector: { userId: string; fullName: string };
  lastBatchAt: string | null;
  lastBatchStatus: SyncBatchStatus | null;
  pendingConflicts: number;
  totalApplied: number;
}

// ---- Configuration mobile ----

/** `GET /v1/mobile/config` : paramètres appliqués par le mobile sans recompilation. */
export interface MobileConfig {
  maxPhotoBytes: number;
  photoMaxDimension: number;
  photoQuality: number;
  maxSignatureBytes: number;
  retentionHours: number;
  syncIntervalSeconds: number;
  maxOperationsPerBatch: number;
  offlineWritesEnabled: boolean;
}

/**
 * Types du contrat d'API — Phase 6 (rapprochement bancaire et chèques).
 * Recopiés depuis docs/api/phase6-contract.md. Ne pas diverger du contrat
 * sans mettre à jour ce fichier et le document source.
 */

// ---- Énumérations ----

export type StatementFormat = 'CSV' | 'MT940' | 'CAMT053' | 'OFX' | 'XLSX' | 'PDF_OCR';

export type BankStatementStatus =
  'UPLOADED' | 'PARSING' | 'PARSED' | 'RECONCILING' | 'RECONCILED' | 'FAILED';

export type StatementLineDirection = 'CREDIT' | 'DEBIT';

/** Champ dérivé exposé en lecture sur `StatementLine.state` : pas de colonne persistée. */
export type LineState = 'UNMATCHED' | 'SUGGESTED' | 'PARTIALLY_MATCHED' | 'MATCHED' | 'IGNORED';

export type MatchType = 'EXACT' | 'SUGGESTED' | 'MANUAL' | 'PARTIAL' | 'SPLIT';

export type MatchStatus = 'PROPOSED' | 'CONFIRMED' | 'REJECTED' | 'REVERSED';

export type ReconciliationTargetType = 'PAYMENT' | 'DECLARATION' | 'CHECK' | 'REMITTANCE';

/**
 * Cycle de vie d'un chèque : RECEIVED → DEPOSITED → CLEARED, avec branches
 * BOUNCED, CANCELLED, RETURNED. Ne pas réutiliser REGISTERED ni REJECTED
 * (anciennes valeurs du plan de phases, remplacées par ce contrat).
 */
export type CheckStatus =
  'RECEIVED' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED' | 'RETURNED';

// ---- Relevés bancaires ----

export interface StatementSummary {
  id: string;
  bankAccountId: string;
  format: StatementFormat;
  status: BankStatementStatus;
  isDiscarded: boolean;
  statementReference: string | null;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  linesCount: number;
  matchedLinesCount: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  importedAt: string;
  importedByUserId: string | null;
}

export interface ImportReport {
  statementId: string;
  linesAccepted: number;
  linesIgnored: number;
  linesInError: { lineNumber: number; reason: string }[];
  autoMatched: number;
  suggested: number;
}

export interface StatementDetail extends StatementSummary {
  documentId: string | null;
  fileChecksumSha256: string | null;
  parsedAt: string | null;
  reconciledAt: string | null;
  parseError: string | null;
  report: ImportReport | null;
}

/** `POST /v1/bank-statements/{id}/reconcile` : relance le rapprochement automatique. */
export interface ReconcileRunResult {
  matched: number;
  suggested: number;
  unmatched: number;
}

/** `GET /v1/bank-statement-adapters` : formats de relevé pris en charge par l'import. */
export interface BankStatementAdapterInfo {
  code: string;
  label: string;
  format: StatementFormat;
  sampleAvailable: boolean;
}

// ---- Lignes de relevé ----

export interface StatementLine {
  id: string;
  statementId: string;
  bankAccountId: string;
  lineNumber: number;
  direction: StatementLineDirection;
  operationDate: string;
  valueDate: string | null;
  amount: number;
  matchedAmount: number;
  state: LineState;
  label: string;
  normalizedLabel: string | null;
  counterpartyName: string | null;
  bankReference: string | null;
  endToEndReference: string | null;
  isIgnored: boolean;
  ignoreReason: string | null;
  matches: ReconciliationMatch[];
  ageDays: number;
}

export interface PatchStatementLineBody {
  isIgnored?: boolean;
  ignoreReason?: string;
}

export interface MatchSuggestion {
  targetType: ReconciliationTargetType;
  targetId: string;
  label: string;
  amount: number;
  date: string;
  confidenceScore: number;
  criteria: Record<string, unknown>;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
}

// ---- Rapprochement ----

export interface ReconciliationMatch {
  id: string;
  statementLineId: string;
  targetType: ReconciliationTargetType;
  targetId: string;
  matchType: MatchType;
  status: MatchStatus;
  matchedAmount: number;
  confidenceScore: number;
  matchCriteria: Record<string, unknown>;
  matchedByUserId: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalOfId: string | null;
  createdAt: string;
}

export interface CreateReconciliationMatchBody {
  statementLineId: string;
  targetType: ReconciliationTargetType;
  targetId: string;
  matchedAmount: number;
}

export interface RejectReconciliationMatchBody {
  reason: string;
}

export interface ReverseReconciliationMatchBody {
  reason: string;
}

/** `POST /v1/reconciliation-matches/{id}/reverse` : pas de suppression, écriture miroir. */
export interface ReverseMatchResult {
  reversed: ReconciliationMatch;
  mirror: ReconciliationMatch;
}

// ---- Chèques ----

export interface BankCheckInput {
  tenantId: string;
  leaseId?: string;
  invoiceId?: string;
  checkNumber: string;
  drawerName: string;
  drawerBankCode: string;
  drawerBankName: string;
  drawerAccountNumber?: string;
  amount: number;
  issueDate: string;
  receivedAt?: string;
  imageDocumentId?: string;
  notes?: string;
}

export interface BankCheck extends BankCheckInput {
  id: string;
  status: CheckStatus;
  paymentId: string | null;
  depositDate: string | null;
  depositBankAccountId: string | null;
  clearingDate: string | null;
  bouncedAt: string | null;
  bounceReason: string | null;
  bounceFeeAmount: number;
  receivedByUserId: string | null;
  ageDays: number;
}

export interface BankCheckDetail extends BankCheck {
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  matches: ReconciliationMatch[];
}

export interface DepositBankCheckBody {
  depositDate: string;
  depositBankAccountId: string;
}

export interface ClearBankCheckBody {
  clearingDate?: string;
}

export interface BounceBankCheckBody {
  reason: string;
  bounceFeeAmount?: number;
}

// ---- Tableau de bord ----

export interface ReconciliationDashboardAccountRow {
  bankAccountId: string;
  bankAccountLabel: string;
  unmatchedCount: number;
  unmatchedAmount: number;
  oldestUnmatchedDays: number;
  matchedRatioBps: number;
}

export interface ReconciliationDashboard {
  unmatchedCount: number;
  unmatchedAmount: number;
  oldestUnmatchedDays: number;
  matchedRatioBps: number;
  byAccount: ReconciliationDashboardAccountRow[];
}

// ---- Paramètres de rapprochement ----

export interface ReconciliationSettings {
  /** Défaut 75, entre 50 et 95. */
  suggestionThreshold: number;
  /** Défaut 15. */
  dateWindowDays: number;
  /** Défaut 2. */
  amountTolerancePercent: number;
  /** Défaut true. */
  autoConfirmExact: boolean;
  /** Défaut 15 jours ouvrés. */
  checkClearingAlertDays: number;
  /** Défaut 0. */
  bounceFeeAmount: number;
}

/**
 * Types du contrat d'API — Phase 7 (gestion d'agence, relevés de gérance, portail bailleur).
 * Recopiés depuis docs/api/phase7-contract.md. Les relevés de gérance sont préfixés
 * `OwnerStatement*` (et non `Statement*` comme le contrat) pour ne pas entrer en collision
 * avec les types `StatementSummary`/`StatementDetail`/`StatementLine` du relevé bancaire
 * importé en phase 6 : mêmes champs que le contrat, nom seulement adapté à ce fichier.
 */

export type MandateStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED';
export type MandateScope = 'FULL_MANAGEMENT' | 'RENT_COLLECTION_ONLY' | 'LETTING_ONLY';

export type CommissionBasis =
  | 'RATE_BPS_ON_RENT_COLLECTED'
  | 'RATE_BPS_ON_RENT_DUE'
  | 'FLAT_AMOUNT_PER_MONTH'
  | 'FLAT_AMOUNT_PER_LEASE';
export type CommissionStatus = 'PENDING' | 'ACCRUED' | 'INVOICED' | 'SETTLED' | 'CANCELLED';

export type ExpenseStatus =
  'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REBILLED' | 'REJECTED' | 'CANCELLED';
export type ExpenseBearer = 'LANDLORD' | 'TENANT' | 'ORGANIZATION';
export type ExpenseCategory =
  | 'REPAIR'
  | 'MAINTENANCE'
  | 'PLUMBING'
  | 'ELECTRICITY'
  | 'CLEANING'
  | 'SECURITY'
  | 'UTILITY_BILL'
  | 'TAX'
  | 'INSURANCE'
  | 'SYNDIC_FEE'
  | 'LEGAL_FEE'
  | 'TRAVEL'
  | 'SUPPLIES'
  | 'OTHER';

/** `StatementStatus` du contrat. Ni VALIDATED ni APPROVED : « valider » = ISSUED. */
export type OwnerStatementStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'CANCELLED';
export type OwnerStatementLineType =
  | 'RENT_COLLECTED'
  | 'CHARGE_COLLECTED'
  | 'COMMISSION'
  | 'EXPENSE'
  | 'VAT'
  | 'DEPOSIT_HELD'
  | 'CARRY_FORWARD'
  | 'ADJUSTMENT'
  | 'OTHER';

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';

/** Statut d'invitation dérivé côté web depuis `MandateDetail.landlordPortal` (pas une valeur DDL). */
export type LandlordInvitationStatus = 'NOT_INVITED' | 'INVITED' | 'ACTIVATED';

// ---- Mandats de gestion ----

export interface MandateInput {
  landlordId: string;
  propertyIds: string[];
  scope?: MandateScope;
  startDate: string;
  endDate?: string;
  noticeDays?: number;
  autoRenew?: boolean;
  commissionBasis?: CommissionBasis;
  commissionRateBps?: number;
  commissionFlatAmount?: number;
  lettingFeeRateBps?: number;
  vatRateBps?: number;
  payoutDay?: number;
  payoutBankAccountId?: string;
  notes?: string;
}

export interface Mandate extends MandateInput {
  id: string;
  reference: string;
  status: MandateStatus;
  signedAt: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  currency: 'XAF';
  createdAt: string;
}

export interface MandateSummary {
  id: string;
  reference: string;
  status: MandateStatus;
  landlord: { id: string; displayName: string; isDiaspora: boolean };
  propertiesCount: number;
  commissionRateBps: number | null;
  startDate: string;
  endDate: string | null;
}

export interface MandateLandlordPortalInfo {
  invited: boolean;
  invitedAt: string | null;
  activated: boolean;
  userId: string | null;
}

export interface MandateDetail extends Mandate {
  landlord: LandlordSummary;
  properties: PropertySummary[];
  statements: OwnerStatementSummary[];
  landlordPortal: MandateLandlordPortalInfo;
}

export interface SuspendMandateBody {
  reason: string;
}

export interface TerminateMandateBody {
  effectiveDate: string;
  reason: string;
}

export interface AddMandatePropertiesBody {
  propertyIds: string[];
}

export interface LandlordInvitationResponse {
  notificationId: string;
  invitationStatus: LandlordInvitationStatus;
}

// ---- Dépenses ----

export interface ExpenseInput {
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  landlordId?: string;
  category: ExpenseCategory;
  label: string;
  description?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierNiu?: string;
  amount: number;
  vatRateBps?: number;
  expenseDate: string;
  borneBy?: ExpenseBearer;
  isRebillable?: boolean;
  isDeductibleFromRent?: boolean;
  invoiceDocumentId?: string;
  clientRef?: string;
  notes?: string;
}

export interface Expense extends ExpenseInput {
  id: string;
  reference: string;
  status: ExpenseStatus;
  vatAmount: number;
  totalAmount: number;
  currency: 'XAF';
  ownerStatementId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectionReason?: string | null;
  property: { id: string; name: string } | null;
  landlord: { id: string; displayName: string } | null;
  createdAt: string;
}

export interface RejectExpenseBody {
  reason: string;
}

// ---- Commissions ----

export interface Commission {
  id: string;
  mandateId: string | null;
  landlordId: string;
  landlord: { id: string; displayName: string };
  leaseId: string | null;
  paymentId: string | null;
  status: CommissionStatus;
  basis: CommissionBasis;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  rateBps: number | null;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  ownerStatementId: string | null;
  reversalOfId: string | null;
}

export interface CommissionTotals {
  count: number;
  baseAmount: number;
  amount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface CommissionListResponse {
  items: Commission[];
  pageInfo: PageInfo;
  totals: CommissionTotals;
}

// ---- Campagne et relevés de gérance ----

export interface OwnerStatementRunResponse {
  runId: string;
}

export interface OwnerStatementRunError {
  landlordId?: string;
  propertyId?: string;
  reason: string;
}

export interface OwnerStatementRunStatus {
  status: 'RUNNING' | 'DONE' | 'FAILED';
  created: number;
  skipped: number;
  errors: OwnerStatementRunError[];
}

export interface OwnerStatementSummary {
  id: string;
  statementNumber: string;
  status: OwnerStatementStatus;
  landlord: { id: string; displayName: string };
  property: { id: string; name: string } | null;
  periodStart: string;
  periodEnd: string;
  rentCollectedAmount: number;
  commissionAmount: number;
  expensesAmount: number;
  carryForwardAmount: number;
  netPayableAmount: number;
  issuedAt: string | null;
  sentAt: string | null;
  settledAt: string | null;
}

export interface OwnerStatementLine {
  id: string;
  lineType: OwnerStatementLineType;
  label: string;
  amount: number;
  isDebit: boolean;
  position: number;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  expenseId: string | null;
  commissionId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface OwnerStatementDetail extends OwnerStatementSummary {
  mandateId: string | null;
  chargesCollectedAmount: number;
  commissionVatAmount: number;
  depositsHeldAmount: number;
  occupancyRateBps: number | null;
  collectionRateBps: number | null;
  documentId: string | null;
  lines: OwnerStatementLine[];
  payout: Payout | null;
}

export interface CancelOwnerStatementBody {
  reason: string;
}

// ---- Reversements ----

export interface CreatePayoutBody {
  statementId: string;
}

export interface FailPayoutBody {
  reason: string;
}

export interface ExecutePayoutBody {
  proofDocumentId: string;
  externalReference?: string;
  momoTransactionId?: string;
}

export interface Payout {
  id: string;
  reference: string;
  statementId: string | null;
  landlordId: string;
  landlord: { id: string; displayName: string };
  status: PayoutStatus;
  method: PaymentMethod;
  amount: number;
  feeAmount: number;
  feeBearer: FeeBearer;
  netAmount: number;
  bankAccountId: string | null;
  momoTransactionId: string | null;
  scheduledDate: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  failureReason: string | null;
  proofDocumentId: string | null;
  createdAt: string;
}

export interface CollectionView {
  paymentId: string;
  paymentDate: string;
  method: PaymentMethod;
  amount: number;
  tenant: { id: string; displayName: string };
  unit: { id: string; code: string };
  invoiceNumber: string | null;
}

// ---- Onboarding du gestionnaire indépendant ----

export interface OnboardingIndependentManagerInput {
  organizationLegalName: string;
  organizationCity: string;
  organizationContactPhone: string;
  landlordFirstName: string;
  landlordLastName: string;
  landlordPhone: string;
  propertyName: string;
  propertyAddressLine: string;
  propertyCity: string;
  commissionRateBps?: number;
}

export interface OnboardingIndependentManagerResult {
  organization: Organization;
  landlord: LandlordSummary;
  property: PropertySummary;
  mandate: Mandate;
}

// ---- Portail bailleur ----

export interface PortalLandlord {
  id: string;
  displayName: string;
  primaryPhone: string;
  email: string | null;
  countryCode: string;
  isDiaspora: boolean;
  payoutMethod: PaymentMethod;
}

export interface PortalOrganizationRef {
  id: string;
  name: string;
}

export interface PortalMeResponse {
  landlord: PortalLandlord;
  organizations: PortalOrganizationRef[];
}

export interface PortalActivationRequestBody {
  invitationToken: string;
}

export interface PortalActivationRequestResponse {
  phoneMasked: string;
  requestId: string;
  resendAfterSeconds: number;
}

export interface PortalActivationVerifyBody {
  invitationToken: string;
  code: string;
}

export interface PortalActivationVerifyResponse {
  accessToken: string;
  refreshToken: string;
  landlord: PortalLandlord;
  organizations: PortalOrganizationRef[];
}

/**
 * Types du contrat d'API — Phase 8 (états des lieux, compteurs et charges,
 * maintenance). Recopiés depuis docs/api/phase8-contract.md. Ne pas diverger
 * du contrat sans mettre à jour ce fichier et le document source.
 */

// ---- Énumérations ----

export type InspectionType = 'MOVE_IN' | 'MOVE_OUT' | 'PERIODIC' | 'CONTRADICTORY';

export type InspectionStatus =
  'DRAFT' | 'IN_PROGRESS' | 'PENDING_SIGNATURE' | 'SIGNED' | 'DISPUTED' | 'CANCELLED';

/**
 * Six niveaux (et non les cinq du plan de phases initial) : neuf, bon état,
 * état d'usage, mauvais état, dégradé, manquant.
 */
export type InspectionCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'MISSING';

export type InspectionComparisonRowStatus =
  'UNCHANGED' | 'DEGRADED' | 'IMPROVED' | 'ADDED' | 'MISSING';

/**
 * Noms actuels des fournisseurs congolais (E2C, LCDE) : le plan de phases citait
 * SNE et SNDE, anciennes appellations absentes du schéma.
 */
export type MeterType =
  'ELECTRICITY_E2C' | 'WATER_LCDE' | 'GAS' | 'PRIVATE_SUBMETER' | 'SOLAR' | 'OTHER';

export type TariffBasis =
  'PER_UNIT_CONSUMED' | 'FLAT_MONTHLY' | 'PER_OCCUPANT' | 'PER_SQUARE_METER' | 'SHARED_PRORATA';

export type MaintenanceStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED';

export type MaintenancePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type MaintenanceReporter = 'TENANT' | 'LANDLORD' | 'COLLECTOR' | 'MANAGER' | 'INSPECTION';

/**
 * `invoice_line_type` produit par la refacturation de charges : jamais une
 * valeur inventée en dehors de ces deux-là (rappel du contrat phase 8).
 */
export type UtilityInvoiceLineType = 'WATER_CHARGE' | 'ELECTRICITY_CHARGE';

// ---- Paramètres d'organisation (organization_settings.settings_json.facilities) ----

export interface FacilitiesSettings {
  /** Défaut false : facturer le forfait du tarif si aucun relevé sur la période. */
  utilityFallbackFlat: boolean;
  /** Défaut 3 : jour du mois de la campagne de charges, avant la facturation du 5. */
  utilityRunDayOfMonth: number;
  /** Défaut POOR. */
  inspectionPhotoRequiredFrom: 'POOR' | 'DAMAGED';
  maintenanceSlaHours: { URGENT: number; HIGH: number; NORMAL: number; LOW: number };
  /** Défaut false : la conversion état des lieux → maintenance reste une proposition. */
  autoCreateMaintenanceFromInspection: boolean;
}

// ---- États des lieux ----

export interface InspectionInput {
  unitId: string;
  leaseId?: string;
  tenantId?: string;
  inspectionType: InspectionType;
  scheduledAt?: string;
  tenantPresent?: boolean;
  landlordPresent?: boolean;
  keysHandedCount?: number;
  notes?: string;
  clientRef?: string;
}

export interface Inspection extends InspectionInput {
  id: string;
  /** `EDL-{YYYYMM}-{seq}`. */
  reference: string;
  status: InspectionStatus;
  propertyId: string;
  overallCondition: InspectionCondition | null;
  totalDamageAmount: number;
  performedAt: string | null;
  performedByUserId: string | null;
  tenantSignedAt: string | null;
  agentSignedAt: string | null;
  reportDocumentId: string | null;
  disputeReason: string | null;
}

/**
 * Forme de résumé pour `GET /v1/inspections` : non détaillée par le contrat
 * (qui ne définit qu'`Inspection`/`InspectionDetail`) ; construite ici sur le
 * même principe que les autres `*Summary` du client (LeaseSummary, etc.).
 */
export interface InspectionSummary {
  id: string;
  reference: string;
  status: InspectionStatus;
  inspectionType: InspectionType;
  unit: { id: string; code: string };
  property: { id: string; name: string };
  tenant: { id: string; displayName: string } | null;
  scheduledAt: string | null;
  performedAt: string | null;
  overallCondition: InspectionCondition | null;
  totalDamageAmount: number;
}

export interface InspectionItemInput {
  roomLabel: string;
  elementLabel: string;
  elementCategory?: string;
  condition: InspectionCondition;
  quantity?: number;
  isDamaged?: boolean;
  damageDescription?: string;
  repairAmount?: number;
  /** Réutilise les valeurs d'`ExpenseBearer` (phase 7), identiques ici. */
  chargedTo?: ExpenseBearer;
  position?: number;
}

export interface InspectionItem extends InspectionItemInput {
  id: string;
  inspectionId: string;
  photos: InspectionPhoto[];
  /** Extension web : évite un second appel pour griser l'action côté écran. */
  hasDepositDeduction?: boolean;
  hasMaintenanceRequest?: boolean;
}

export interface InspectionPhoto {
  id: string;
  inspectionItemId: string | null;
  documentId: string;
  caption: string | null;
  takenAt: string | null;
  checksumSha256: string | null;
  position: number;
}

export interface InspectionDetail extends Inspection {
  unit: Unit;
  property: PropertySummary;
  tenant: { id: string; displayName: string } | null;
  items: InspectionItem[];
}

export interface InspectionPatchBody extends Partial<
  Omit<InspectionInput, 'unitId' | 'inspectionType'>
> {
  scheduledAt?: string;
}

export interface AddInspectionPhotoBody {
  documentId: string;
  caption?: string;
  takenAt?: string;
  checksumSha256?: string;
  position?: number;
}

/**
 * Les signatures sont des images téléversées via le module documents
 * (`tenantSignatureDocumentId`/`agentSignatureDocumentId`, tous deux
 * facultatifs côté serveur) : c'est le mobile, sur le terrain, qui les
 * capture et les téléverse. Le dashboard web n'a aucun composant de capture
 * de signature et n'envoie donc aucun de ces deux identifiants.
 *
 * Si le locataire est absent, `tenantPresent: false` et `absenceReason`
 * deviennent obligatoires ; le statut passe alors en `PENDING_SIGNATURE`
 * plutôt que `SIGNED` (delai de grâce de 15 jours avant clôture manuelle).
 */
export interface SignInspectionBody {
  tenantSignatureDocumentId?: string;
  agentSignatureDocumentId?: string;
  tenantPresent?: boolean;
  absenceReason?: string;
}

export interface DisputeInspectionBody {
  reason: string;
}

export interface InspectionComparisonRow {
  roomLabel: string;
  elementLabel: string;
  entryCondition: InspectionCondition | null;
  exitCondition: InspectionCondition | null;
  degradationLevels: number;
  suggestedDeductionAmount: number;
  entryPhotos: string[];
  exitPhotos: string[];
  status: InspectionComparisonRowStatus;
}

export interface InspectionComparison {
  unitId: string;
  moveIn: InspectionSummary | null;
  moveOut: InspectionSummary | null;
  rows: InspectionComparisonRow[];
  totalSuggestedDeduction: number;
}

export interface DepositDeductionBody {
  amount: number;
  reason?: string;
  /** Motif obligatoire pour outrepasser l'exclusivité retenue/maintenance (arbitrage 5). */
  managerOverrideReason?: string;
}

export interface ConvertToMaintenanceRequestBody {
  priority?: MaintenancePriority;
  estimatedAmount?: number;
  chargedTo?: ExpenseBearer;
  /** Motif obligatoire pour outrepasser l'exclusivité retenue/maintenance (arbitrage 5). */
  managerOverrideReason?: string;
}

export interface InspectionPdfResponse {
  downloadUrl: string;
  expiresAt: string;
}

// ---- Compteurs et relevés ----

export interface MeterInput {
  propertyId: string;
  unitId?: string;
  meterType: MeterType;
  serialNumber: string;
  subscriberNumber?: string;
  providerName?: string;
  /** Un compteur prépayé n'est jamais relevé pour refacturation (charge forfaitaire). */
  isPrepaid?: boolean;
  isShared?: boolean;
  sharedRatioBps?: number;
  measurementUnit?: string;
  digitsCount?: number;
  initialIndex?: number;
  tariffId?: string;
  installedAt?: string;
}

export interface Meter extends MeterInput {
  id: string;
  isActive: boolean;
  lastReading: { readingDate: string; currentIndex: number } | null;
}

export interface MeterReadingInput {
  readingDate: string;
  currentIndex: number;
  periodStart?: string;
  periodEnd?: string;
  /** Passage par zéro du compteur : sinon 422 METERS.INDEX_REGRESSION sous l'index précédent. */
  rolloverApplied?: boolean;
  /** Un relevé estimé n'est jamais facturé tant qu'un MANAGER ne l'a pas confirmé. */
  isEstimated?: boolean;
  photoDocumentId?: string;
  notes?: string;
  /** Idempotence : deux appels avec le même `clientRef` ne créent qu'un relevé. */
  clientRef: string;
}

export interface MeterReading extends MeterReadingInput {
  id: string;
  meterId: string;
  unitId: string | null;
  leaseId: string | null;
  /** Calculés côté serveur, jamais fournis par l'appelant. */
  previousIndex: number;
  consumption: number;
  tariffId: string | null;
  unitPriceAmount: number;
  computedAmount: number;
  /** Idempotence de la refacturation : ignoré par toute campagne déjà passée. */
  isInvoiced: boolean;
  invoiceLineId: string | null;
  recordedByUserId: string | null;
}

export interface ConsumptionPoint {
  readingDate: string;
  consumption: number;
  computedAmount: number;
}

/** `GET /v1/meters/{id}/readings` : pagination + série de consommation pour le graphe. */
export interface MeterReadingsResponse extends Paginated<MeterReading> {
  consumptionSeries: ConsumptionPoint[];
}

export interface ConfirmMeterReadingBody {
  isEstimated: false;
  notes?: string;
}

// ---- Grilles tarifaires ----

export interface UtilityTariffInput {
  /** Absent : grille globale à l'organisation. */
  propertyId?: string;
  meterType: MeterType;
  basis?: TariffBasis;
  label: string;
  unitPriceAmount?: number;
  flatAmount?: number;
  standingChargeAmount?: number;
  minimumAmount?: number;
  measurementUnit?: string;
  invoiceLineType?: UtilityInvoiceLineType;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UtilityTariff extends UtilityTariffInput {
  id: string;
  isActive: boolean;
  currency: 'XAF';
}

// ---- Campagne de refacturation ----

export interface UtilityRunInput {
  periodStart: string;
  periodEnd: string;
  meterType?: MeterType;
  propertyId?: string;
  dryRun?: boolean;
}

export interface UtilityRunLaunchResponse {
  runId: string;
}

export type UtilityRunStatus = 'RUNNING' | 'DONE' | 'FAILED';

export interface UtilityRunSkippedEntry {
  unitId: string;
  propertyId: string;
  reason: string;
}

export interface UtilityRunErrorEntry {
  meterId?: string;
  unitId?: string;
  reason: string;
}

export interface UtilityRunReport {
  runId: string;
  status: UtilityRunStatus;
  created: number;
  skipped: UtilityRunSkippedEntry[];
  errors: UtilityRunErrorEntry[];
}

// ---- Maintenance ----

export interface MaintenanceInput {
  propertyId: string;
  unitId?: string;
  leaseId?: string;
  tenantId?: string;
  priority?: MaintenancePriority;
  reporterType?: MaintenanceReporter;
  category?: ExpenseCategory;
  title: string;
  description: string;
  locationDetail?: string;
  estimatedAmount?: number;
  chargedTo?: ExpenseBearer;
  /** Renseigné par la conversion d'un poste d'état des lieux. */
  inspectionId?: string;
  clientRef?: string;
}

export interface MaintenanceSummary {
  id: string;
  /** `MNT-{YYYYMM}-{seq}`. */
  reference: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  title: string;
  property: { id: string; name: string };
  unit: { id: string; code: string } | null;
  reportedAt: string;
  slaDueAt: string | null;
  isOverdue: boolean;
  assignedToUserId: string | null;
  ageHours: number;
}

export interface MaintenanceUpdateInput {
  newStatus?: MaintenanceStatus;
  message?: string;
  photoDocumentId?: string;
  amountDelta?: number;
  isVisibleToTenant?: boolean;
  expenseId?: string;
  clientRef?: string;
}

export interface MaintenanceUpdate extends MaintenanceUpdateInput {
  id: string;
  requestId: string;
  authorUserId: string | null;
  authorLabel: string | null;
  previousStatus: MaintenanceStatus | null;
  occurredAt: string;
}

/**
 * `chargedTo` typé `string` (et non `ExpenseBearer`) : reprise à l'identique
 * du contrat, qui diverge ici de `MaintenanceInput.chargedTo`.
 */
export interface MaintenanceDetail extends MaintenanceSummary {
  description: string;
  locationDetail: string | null;
  category: ExpenseCategory;
  reporterType: MaintenanceReporter;
  estimatedAmount: number;
  actualAmount: number;
  chargedTo: string;
  landlordApproved: boolean;
  inspectionId: string | null;
  rejectionReason: string | null;
  updates: MaintenanceUpdate[];
}

export interface AssignMaintenanceRequestBody {
  assignedToUserId: string;
  message?: string;
}

export interface ResolveMaintenanceRequestBody {
  message?: string;
  actualAmount?: number;
  photoDocumentId?: string;
}

export interface RejectMaintenanceRequestBody {
  reason: string;
}

// ---- Règles de relance (phase 9) ----

export interface DunningRuleInput {
  name: string;
  stepOrder: number;
  triggerType?: DunningTrigger;
  offsetDays: number;
  channel?: NotificationChannel;
  fallbackChannel?: NotificationChannel;
  templateId?: string;
  minBalanceAmount?: number;
  notifyLandlord?: boolean;
  notifyCollector?: boolean;
  applyPenalty?: boolean;
  penaltyRuleId?: string;
  escalateToLegal?: boolean;
  sendHourLocal?: number;
  skipWeekends?: boolean;
  isActive?: boolean;
}

export interface DunningRule extends DunningRuleInput {
  id: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
}

export interface DunningRun {
  id: string;
  ruleId: string;
  ruleName: string;
  stepOrder: number;
  status: DunningStepStatus;
  runDate: string;
  scheduledAt: string;
  executedAt: string | null;
  daysOverdue: number;
  balanceAmount: number;
  channel: NotificationChannel;
  invoice: { id: string; invoiceNumber: string | null } | null;
  tenant: { id: string; displayName: string };
  notificationId: string | null;
  messageLogId: string | null;
  messageStatus: MessageStatus | null;
  guarantorNotified: boolean;
  penaltyApplied: boolean;
  penaltyAmount: number;
  skipReason: string | null;
  errorMessage: string | null;
}

export interface DunningRunsQuery {
  ruleId?: string;
  invoiceId?: string;
  status?: DunningStepStatus;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface TriggerDunningRunsBody {
  dryRun?: boolean;
}

export interface TriggerDunningRunsResult {
  scanned: number;
  created: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
}

// ---- Tableaux de bord (phase 9) ----

export interface CollectionRateDashboardQuery {
  from?: string;
  to?: string;
  propertyId?: string;
  landlordId?: string;
}

export interface CollectionRateDashboard {
  from: string;
  to: string;
  dueAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  collectionRateBps: number;
  series: {
    period: string;
    dueAmount: number;
    collectedAmount: number;
    collectionRateBps: number;
  }[];
  byProperty: {
    propertyId: string;
    name: string;
    dueAmount: number;
    collectedAmount: number;
    collectionRateBps: number;
  }[];
}

export interface ArrearsDashboardQuery {
  asOf?: string;
  propertyId?: string;
  landlordId?: string;
}

export type ArrearsBucketLabel = '0-30' | '31-60' | '61-90' | '90+';

export interface ArrearsDashboard {
  asOf: string;
  totalAmount: number;
  invoicesCount: number;
  buckets: { label: ArrearsBucketLabel; amount: number; invoicesCount: number }[];
  topDebtors: {
    tenantId: string;
    displayName: string;
    phone: string;
    amount: number;
    oldestDueDate: string;
    daysOverdue: number;
  }[];
}

export interface VacancyDashboardQuery {
  asOf?: string;
  propertyId?: string;
}

export interface VacancyDashboard {
  asOf: string;
  unitsCount: number;
  occupiedCount: number;
  vacantCount: number;
  vacancyRateBps: number;
  averageVacancyDays: number;
  byProperty: {
    propertyId: string;
    name: string;
    unitsCount: number;
    vacantCount: number;
    vacancyRateBps: number;
  }[];
}

export interface PaymentMethodsDashboardQuery {
  from?: string;
  to?: string;
  propertyId?: string;
}

export interface PaymentMethodsDashboard {
  from: string;
  to: string;
  totalAmount: number;
  byMethod: { method: PaymentMethod; amount: number; shareBps: number; count: number }[];
}

// ---- Exports (phase 9) ----

/** Le format est le CSV uniquement (arbitrage 5 du contrat) : Excel natif n'existe pas. */
export type ExportKind = 'invoices' | 'payments' | 'arrears' | 'dashboard';

export interface ExportRequestBody {
  filters?: Record<string, string | number | boolean | undefined>;
}

export interface ExportSyncResult {
  documentId: string;
  downloadUrl: string;
  expiresAt: string;
  rowCount: number;
}

export interface ExportJobAccepted {
  jobId: string;
}

export type ExportResponse = ExportSyncResult | ExportJobAccepted;

export type ExportJobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

export interface ExportJob {
  status: ExportJobStatus;
  documentId?: string;
  downloadUrl?: string;
  error?: string;
}
