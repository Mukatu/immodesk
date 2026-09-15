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
  createdAt: string;
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
