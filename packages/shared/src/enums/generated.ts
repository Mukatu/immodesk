/**
 * Fichier généré automatiquement — NE PAS ÉDITER À LA MAIN.
 *
 * Source : docs/schema/schema.sql (déclarations `CREATE TYPE ... AS ENUM`).
 * Régénérer via : `pnpm --filter @immodesk/shared gen:enums`
 */

export const OrganizationType = ['AGENCY', 'INDEPENDENT_LANDLORD', 'INDEPENDENT_MANAGER'] as const;
export type OrganizationType = (typeof OrganizationType)[number];

export const OrganizationStatus = ['ACTIVE', 'SUSPENDED', 'CLOSED'] as const;
export type OrganizationStatus = (typeof OrganizationStatus)[number];

export const MemberRole = ['OWNER', 'MANAGER', 'COLLECTOR', 'ACCOUNTANT', 'VIEWER'] as const;
export type MemberRole = (typeof MemberRole)[number];

export const MemberStatus = ['ACTIVE', 'SUSPENDED', 'REMOVED'] as const;
export type MemberStatus = (typeof MemberStatus)[number];

export const UserStatus = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'] as const;
export type UserStatus = (typeof UserStatus)[number];

export const OtpPurpose = [
  'LOGIN',
  'PHONE_VERIFICATION',
  'PASSWORD_RESET',
  'SENSITIVE_ACTION',
] as const;
export type OtpPurpose = (typeof OtpPurpose)[number];

export const OtpDelivery = ['SMS', 'WHATSAPP', 'EMAIL'] as const;
export type OtpDelivery = (typeof OtpDelivery)[number];

export const InvitationStatus = ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'] as const;
export type InvitationStatus = (typeof InvitationStatus)[number];

export const ApiKeyStatus = ['ACTIVE', 'REVOKED'] as const;
export type ApiKeyStatus = (typeof ApiKeyStatus)[number];

export const PartyType = ['INDIVIDUAL', 'COMPANY'] as const;
export type PartyType = (typeof PartyType)[number];

export const IdDocumentType = [
  'CNI',
  'PASSPORT',
  'RESIDENCE_PERMIT',
  'DRIVING_LICENSE',
  'VOTER_CARD',
  'RCCM',
  'NIU',
  'OTHER',
] as const;
export type IdDocumentType = (typeof IdDocumentType)[number];

export const ContactChannelType = ['PHONE', 'MOBILE', 'WHATSAPP', 'EMAIL', 'FAX'] as const;
export type ContactChannelType = (typeof ContactChannelType)[number];

export const ContactOwnerType = ['LANDLORD', 'TENANT', 'GUARANTOR', 'MEMBER', 'SUPPLIER'] as const;
export type ContactOwnerType = (typeof ContactOwnerType)[number];

export const GenderType = ['MALE', 'FEMALE', 'UNSPECIFIED'] as const;
export type GenderType = (typeof GenderType)[number];

export const PropertyType = [
  'HOUSE',
  'VILLA',
  'APARTMENT_BUILDING',
  'COMPOUND',
  'COMMERCIAL_BUILDING',
  'MIXED_USE',
  'LAND',
  'WAREHOUSE',
  'OTHER',
] as const;
export type PropertyType = (typeof PropertyType)[number];

export const UnitType = [
  'STUDIO',
  'ROOM',
  'APARTMENT',
  'HOUSE',
  'SHOP',
  'OFFICE',
  'WAREHOUSE',
  'PARKING',
  'LAND_PLOT',
  'OTHER',
] as const;
export type UnitType = (typeof UnitType)[number];

export const UnitStatus = [
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'UNDER_MAINTENANCE',
  'UNAVAILABLE',
] as const;
export type UnitStatus = (typeof UnitStatus)[number];

export const MeterType = [
  'ELECTRICITY_E2C',
  'WATER_LCDE',
  'GAS',
  'PRIVATE_SUBMETER',
  'SOLAR',
  'OTHER',
] as const;
export type MeterType = (typeof MeterType)[number];

export const TariffBasis = [
  'PER_UNIT_CONSUMED',
  'FLAT_MONTHLY',
  'PER_OCCUPANT',
  'PER_SQUARE_METER',
  'SHARED_PRORATA',
] as const;
export type TariffBasis = (typeof TariffBasis)[number];

export const BankAccountHolderType = ['ORGANIZATION', 'LANDLORD', 'TENANT'] as const;
export type BankAccountHolderType = (typeof BankAccountHolderType)[number];

export const MandateStatus = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'] as const;
export type MandateStatus = (typeof MandateStatus)[number];

export const MandateScope = ['FULL_MANAGEMENT', 'RENT_COLLECTION_ONLY', 'LETTING_ONLY'] as const;
export type MandateScope = (typeof MandateScope)[number];

export const LeaseStatus = [
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'NOTICE_GIVEN',
  'TERMINATED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type LeaseStatus = (typeof LeaseStatus)[number];

export const LeasePartyRole = ['PRIMARY_TENANT', 'CO_TENANT', 'GUARANTOR', 'OCCUPANT'] as const;
export type LeasePartyRole = (typeof LeasePartyRole)[number];

export const LeaseDocumentKind = [
  'CONTRACT',
  'AMENDMENT',
  'NOTICE',
  'TERMINATION',
  'INVENTORY',
  'INSURANCE',
  'OTHER',
] as const;
export type LeaseDocumentKind = (typeof LeaseDocumentKind)[number];

export const RentPeriod = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'] as const;
export type RentPeriod = (typeof RentPeriod)[number];

export const DepositStatus = [
  'PENDING',
  'PARTIALLY_PAID',
  'HELD',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FORFEITED',
] as const;
export type DepositStatus = (typeof DepositStatus)[number];

export const DepositMovementType = [
  'COLLECTION',
  'REFUND',
  'DEDUCTION',
  'TRANSFER',
  'ADJUSTMENT',
] as const;
export type DepositMovementType = (typeof DepositMovementType)[number];

export const InspectionType = ['MOVE_IN', 'MOVE_OUT', 'PERIODIC', 'CONTRADICTORY'] as const;
export type InspectionType = (typeof InspectionType)[number];

export const InspectionStatus = [
  'DRAFT',
  'IN_PROGRESS',
  'PENDING_SIGNATURE',
  'SIGNED',
  'DISPUTED',
  'CANCELLED',
] as const;
export type InspectionStatus = (typeof InspectionStatus)[number];

export const InspectionCondition = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'MISSING'] as const;
export type InspectionCondition = (typeof InspectionCondition)[number];

export const InvoiceStatus = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;
export type InvoiceStatus = (typeof InvoiceStatus)[number];

export const InvoiceLineType = [
  'RENT',
  'WATER_CHARGE',
  'ELECTRICITY_CHARGE',
  'SERVICE_CHARGE',
  'PENALTY',
  'DEPOSIT',
  'AGENCY_FEE',
  'REPAIR_REBILL',
  'DISCOUNT',
  'OTHER',
] as const;
export type InvoiceLineType = (typeof InvoiceLineType)[number];

export const PenaltyBasis = [
  'RATE_BPS_PER_DAY',
  'RATE_BPS_PER_MONTH',
  'FLAT_AMOUNT',
  'FLAT_AMOUNT_PER_DAY',
] as const;
export type PenaltyBasis = (typeof PenaltyBasis)[number];

export const PaymentMethod = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'BANK_CHECK'] as const;
export type PaymentMethod = (typeof PaymentMethod)[number];

export const PaymentStatus = [
  'PENDING',
  'PENDING_VERIFICATION',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'REVERSED',
] as const;
export type PaymentStatus = (typeof PaymentStatus)[number];

export const PaymentDirection = ['INBOUND', 'OUTBOUND'] as const;
export type PaymentDirection = (typeof PaymentDirection)[number];

export const CreditStatus = ['OPEN', 'PARTIALLY_USED', 'USED', 'REFUNDED', 'EXPIRED'] as const;
export type CreditStatus = (typeof CreditStatus)[number];

export const CashReceiptStatus = ['DRAFT', 'ISSUED', 'REMITTED', 'CANCELLED'] as const;
export type CashReceiptStatus = (typeof CashReceiptStatus)[number];

export const RemittanceStatus = [
  'OPEN',
  'SUBMITTED',
  'VERIFIED',
  'DEPOSITED',
  'REJECTED',
  'CANCELLED',
] as const;
export type RemittanceStatus = (typeof RemittanceStatus)[number];

export const DeclarationStatus = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'MATCHED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;
export type DeclarationStatus = (typeof DeclarationStatus)[number];

export const MomoProvider = ['MTN_MOMO', 'AIRTEL_MONEY', 'CINETPAY', 'PAWAPAY', 'OTHER'] as const;
export type MomoProvider = (typeof MomoProvider)[number];

export const MomoStatus = [
  'INITIATED',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type MomoStatus = (typeof MomoStatus)[number];

export const FeeBearer = ['TENANT', 'ORGANIZATION', 'LANDLORD', 'SHARED'] as const;
export type FeeBearer = (typeof FeeBearer)[number];

export const CheckStatus = [
  'RECEIVED',
  'DEPOSITED',
  'CLEARED',
  'BOUNCED',
  'CANCELLED',
  'RETURNED',
] as const;
export type CheckStatus = (typeof CheckStatus)[number];

export const StatementFormat = ['CSV', 'MT940', 'CAMT053', 'OFX', 'XLSX', 'PDF_OCR'] as const;
export type StatementFormat = (typeof StatementFormat)[number];

export const BankStatementStatus = [
  'UPLOADED',
  'PARSING',
  'PARSED',
  'RECONCILING',
  'RECONCILED',
  'FAILED',
] as const;
export type BankStatementStatus = (typeof BankStatementStatus)[number];

export const StatementLineDirection = ['CREDIT', 'DEBIT'] as const;
export type StatementLineDirection = (typeof StatementLineDirection)[number];

export const MatchType = ['EXACT', 'SUGGESTED', 'MANUAL', 'PARTIAL', 'SPLIT'] as const;
export type MatchType = (typeof MatchType)[number];

export const MatchStatus = ['PROPOSED', 'CONFIRMED', 'REJECTED', 'REVERSED'] as const;
export type MatchStatus = (typeof MatchStatus)[number];

export const ReceiptStatus = ['DRAFT', 'GENERATING', 'ISSUED', 'SENT', 'CANCELLED'] as const;
export type ReceiptStatus = (typeof ReceiptStatus)[number];

export const SequenceKind = [
  'CASH_RECEIPT',
  'RENT_INVOICE',
  'RECEIPT',
  'OWNER_STATEMENT',
  'REMITTANCE',
  'EXPENSE',
  'PAYOUT',
  'SUBSCRIPTION_INVOICE',
] as const;
export type SequenceKind = (typeof SequenceKind)[number];

export const ExpenseCategory = [
  'REPAIR',
  'MAINTENANCE',
  'PLUMBING',
  'ELECTRICITY',
  'CLEANING',
  'SECURITY',
  'UTILITY_BILL',
  'TAX',
  'INSURANCE',
  'SYNDIC_FEE',
  'LEGAL_FEE',
  'TRAVEL',
  'SUPPLIES',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof ExpenseCategory)[number];

export const ExpenseStatus = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PAID',
  'REBILLED',
  'REJECTED',
  'CANCELLED',
] as const;
export type ExpenseStatus = (typeof ExpenseStatus)[number];

export const ExpenseBearer = ['LANDLORD', 'TENANT', 'ORGANIZATION'] as const;
export type ExpenseBearer = (typeof ExpenseBearer)[number];

export const CommissionBasis = [
  'RATE_BPS_ON_RENT_COLLECTED',
  'RATE_BPS_ON_RENT_DUE',
  'FLAT_AMOUNT_PER_MONTH',
  'FLAT_AMOUNT_PER_LEASE',
] as const;
export type CommissionBasis = (typeof CommissionBasis)[number];

export const CommissionStatus = ['PENDING', 'ACCRUED', 'INVOICED', 'SETTLED', 'CANCELLED'] as const;
export type CommissionStatus = (typeof CommissionStatus)[number];

export const StatementStatus = ['DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELLED'] as const;
export type StatementStatus = (typeof StatementStatus)[number];

export const OwnerStatementLineType = [
  'RENT_COLLECTED',
  'CHARGE_COLLECTED',
  'COMMISSION',
  'EXPENSE',
  'VAT',
  'DEPOSIT_HELD',
  'CARRY_FORWARD',
  'ADJUSTMENT',
  'OTHER',
] as const;
export type OwnerStatementLineType = (typeof OwnerStatementLineType)[number];

export const PayoutStatus = [
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
] as const;
export type PayoutStatus = (typeof PayoutStatus)[number];

export const MaintenanceStatus = [
  'OPEN',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
] as const;
export type MaintenanceStatus = (typeof MaintenanceStatus)[number];

export const MaintenancePriority = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type MaintenancePriority = (typeof MaintenancePriority)[number];

export const MaintenanceReporter = [
  'TENANT',
  'LANDLORD',
  'COLLECTOR',
  'MANAGER',
  'INSPECTION',
] as const;
export type MaintenanceReporter = (typeof MaintenanceReporter)[number];

export const NotificationChannel = ['WHATSAPP', 'SMS', 'EMAIL', 'PUSH', 'IN_APP'] as const;
export type NotificationChannel = (typeof NotificationChannel)[number];

export const NotificationStatus = ['SCHEDULED', 'QUEUED', 'SENT', 'FAILED', 'CANCELLED'] as const;
export type NotificationStatus = (typeof NotificationStatus)[number];

export const MessageStatus = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'REJECTED',
  'EXPIRED',
] as const;
export type MessageStatus = (typeof MessageStatus)[number];

export const DunningStepStatus = [
  'PENDING',
  'RUNNING',
  'SENT',
  'SKIPPED',
  'FAILED',
  'CANCELLED',
] as const;
export type DunningStepStatus = (typeof DunningStepStatus)[number];

export const DunningTrigger = [
  'DAYS_BEFORE_DUE',
  'DAYS_AFTER_DUE',
  'ON_ISSUE',
  'ON_OVERDUE',
] as const;
export type DunningTrigger = (typeof DunningTrigger)[number];

export const DocumentKind = [
  'ID_DOCUMENT',
  'LEASE_CONTRACT',
  'MANDATE',
  'RECEIPT_PDF',
  'INVOICE_PDF',
  'CASH_RECEIPT_PDF',
  'TRANSFER_PROOF',
  'CHECK_IMAGE',
  'BANK_STATEMENT',
  'INSPECTION_REPORT',
  'INSPECTION_PHOTO',
  'MAINTENANCE_PHOTO',
  'SIGNATURE',
  'OWNER_STATEMENT_PDF',
  'EXPENSE_INVOICE',
  'PROPERTY_PHOTO',
  'OTHER',
] as const;
export type DocumentKind = (typeof DocumentKind)[number];

export const StorageProvider = ['R2', 'S3', 'LOCAL'] as const;
export type StorageProvider = (typeof StorageProvider)[number];

export const WebhookSource = [
  'CINETPAY',
  'PAWAPAY',
  'MTN_MOMO',
  'AIRTEL_MONEY',
  'WHATSAPP_CLOUD',
  'SMS_GATEWAY',
  'OTHER',
] as const;
export type WebhookSource = (typeof WebhookSource)[number];

export const WebhookStatus = ['RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED'] as const;
export type WebhookStatus = (typeof WebhookStatus)[number];

export const SyncBatchStatus = [
  'RECEIVED',
  'VALIDATING',
  'APPLIED',
  'PARTIALLY_APPLIED',
  'REJECTED',
  'FAILED',
] as const;
export type SyncBatchStatus = (typeof SyncBatchStatus)[number];

export const AuditAction = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATE_TRANSITION',
  'LOGIN',
  'EXPORT',
  'IMPORT',
] as const;
export type AuditAction = (typeof AuditAction)[number];

export const SubscriptionStatus = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[number];

export const BillingInterval = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;
export type BillingInterval = (typeof BillingInterval)[number];

export const ReferralPartnerStatus = [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'CLOSED',
] as const;
export type ReferralPartnerStatus = (typeof ReferralPartnerStatus)[number];

export const ReferralStatus = ['PENDING', 'QUALIFIED', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const;
export type ReferralStatus = (typeof ReferralStatus)[number];

export const ReferralCommissionStatus = [
  'ACCRUED',
  'APPROVED',
  'PAID',
  'REVERSED',
  'CANCELLED',
] as const;
export type ReferralCommissionStatus = (typeof ReferralCommissionStatus)[number];

export const ReferralSource = [
  'CODE_AT_SIGNUP',
  'PARTNER_REGISTERED_PROPERTY',
  'LINK',
  'MANUAL_ADMIN',
] as const;
export type ReferralSource = (typeof ReferralSource)[number];
