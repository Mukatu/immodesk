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
