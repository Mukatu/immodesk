-- =====================================================================
-- IMMODESK — Schéma PostgreSQL 16
-- Partie 01 : extensions, rôle applicatif et types énumérés
-- Devise unique : XAF (BEAC), montants en BIGINT (aucune sous-unité).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Rôle applicatif utilisé par l'API NestJS (soumis au RLS).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'immodesk_app') THEN
        CREATE ROLE immodesk_app NOLOGIN;
    END IF;
END
$$;

-- ---------------------------------------------------------------------
-- Tenancy & sécurité
-- ---------------------------------------------------------------------
-- INDEPENDENT_MANAGER : démarcheur / gestionnaire informel (agence unipersonnelle),
-- mêmes capacités qu'une AGENCY avec un plan tarifaire dédié.
CREATE TYPE organization_type AS ENUM ('AGENCY', 'INDEPENDENT_LANDLORD', 'INDEPENDENT_MANAGER');
CREATE TYPE organization_status AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE member_role AS ENUM ('OWNER', 'MANAGER', 'COLLECTOR', 'ACCOUNTANT', 'VIEWER');
CREATE TYPE member_status AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE otp_purpose AS ENUM ('LOGIN', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'SENSITIVE_ACTION');
CREATE TYPE otp_delivery AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
CREATE TYPE api_key_status AS ENUM ('ACTIVE', 'REVOKED');

-- ---------------------------------------------------------------------
-- Tiers
-- ---------------------------------------------------------------------
CREATE TYPE party_type AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE id_document_type AS ENUM (
    'CNI',                 -- Carte nationale d'identité congolaise
    'PASSPORT',
    'RESIDENCE_PERMIT',    -- Carte de séjour
    'DRIVING_LICENSE',
    'VOTER_CARD',
    'RCCM',                -- Registre du commerce (personnes morales)
    'NIU',                 -- Numéro d'identification unique (fiscal)
    'OTHER'
);
CREATE TYPE contact_channel_type AS ENUM ('PHONE', 'MOBILE', 'WHATSAPP', 'EMAIL', 'FAX');
CREATE TYPE contact_owner_type AS ENUM ('LANDLORD', 'TENANT', 'GUARANTOR', 'MEMBER', 'SUPPLIER');
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- ---------------------------------------------------------------------
-- Patrimoine
-- ---------------------------------------------------------------------
CREATE TYPE property_type AS ENUM (
    'HOUSE', 'VILLA', 'APARTMENT_BUILDING', 'COMPOUND', 'COMMERCIAL_BUILDING',
    'MIXED_USE', 'LAND', 'WAREHOUSE', 'OTHER'
);
CREATE TYPE unit_type AS ENUM (
    'STUDIO', 'ROOM', 'APARTMENT', 'HOUSE', 'SHOP', 'OFFICE',
    'WAREHOUSE', 'PARKING', 'LAND_PLOT', 'OTHER'
);
CREATE TYPE unit_status AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'UNDER_MAINTENANCE', 'UNAVAILABLE');
CREATE TYPE meter_type AS ENUM ('ELECTRICITY_E2C', 'WATER_LCDE', 'GAS', 'PRIVATE_SUBMETER', 'SOLAR', 'OTHER');
CREATE TYPE tariff_basis AS ENUM ('PER_UNIT_CONSUMED', 'FLAT_MONTHLY', 'PER_OCCUPANT', 'PER_SQUARE_METER', 'SHARED_PRORATA');
CREATE TYPE bank_account_holder_type AS ENUM ('ORGANIZATION', 'LANDLORD', 'TENANT');

-- ---------------------------------------------------------------------
-- Contrats
-- ---------------------------------------------------------------------
CREATE TYPE mandate_status AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED');
CREATE TYPE mandate_scope AS ENUM ('FULL_MANAGEMENT', 'RENT_COLLECTION_ONLY', 'LETTING_ONLY');
CREATE TYPE lease_status AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'NOTICE_GIVEN', 'TERMINATED', 'EXPIRED', 'CANCELLED');
CREATE TYPE lease_party_role AS ENUM ('PRIMARY_TENANT', 'CO_TENANT', 'GUARANTOR', 'OCCUPANT');
CREATE TYPE lease_document_kind AS ENUM ('CONTRACT', 'AMENDMENT', 'NOTICE', 'TERMINATION', 'INVENTORY', 'INSURANCE', 'OTHER');
CREATE TYPE rent_period AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');
CREATE TYPE deposit_status AS ENUM ('PENDING', 'PARTIALLY_PAID', 'HELD', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED');
CREATE TYPE deposit_movement_type AS ENUM ('COLLECTION', 'REFUND', 'DEDUCTION', 'TRANSFER', 'ADJUSTMENT');
CREATE TYPE inspection_type AS ENUM ('MOVE_IN', 'MOVE_OUT', 'PERIODIC', 'CONTRADICTORY');
CREATE TYPE inspection_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'PENDING_SIGNATURE', 'SIGNED', 'DISPUTED', 'CANCELLED');
CREATE TYPE inspection_condition AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'MISSING');

-- ---------------------------------------------------------------------
-- Facturation & encaissement
-- ---------------------------------------------------------------------
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE invoice_line_type AS ENUM (
    'RENT', 'WATER_CHARGE', 'ELECTRICITY_CHARGE', 'SERVICE_CHARGE', 'PENALTY',
    'DEPOSIT', 'AGENCY_FEE', 'REPAIR_REBILL', 'DISCOUNT', 'OTHER'
);
CREATE TYPE penalty_basis AS ENUM ('RATE_BPS_PER_DAY', 'RATE_BPS_PER_MONTH', 'FLAT_AMOUNT', 'FLAT_AMOUNT_PER_DAY');
CREATE TYPE payment_method AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'BANK_CHECK');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PENDING_VERIFICATION', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'REVERSED');
CREATE TYPE payment_direction AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE credit_status AS ENUM ('OPEN', 'PARTIALLY_USED', 'USED', 'REFUNDED', 'EXPIRED');
CREATE TYPE cash_receipt_status AS ENUM ('DRAFT', 'ISSUED', 'REMITTED', 'CANCELLED');
CREATE TYPE remittance_status AS ENUM ('OPEN', 'SUBMITTED', 'VERIFIED', 'DEPOSITED', 'REJECTED', 'CANCELLED');
CREATE TYPE declaration_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'MATCHED', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE momo_provider AS ENUM ('MTN_MOMO', 'AIRTEL_MONEY', 'CINETPAY', 'PAWAPAY', 'OTHER');
CREATE TYPE momo_status AS ENUM ('INITIATED', 'PENDING', 'DECLARED', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'REFUNDED');
-- Canal d'une transaction Mobile Money : poussée par un agrégateur, ou déclarée par le locataire après un transfert direct vers le numéro du bailleur.
CREATE TYPE momo_channel AS ENUM ('AGGREGATOR', 'DECLARED');
CREATE TYPE fee_bearer AS ENUM ('TENANT', 'ORGANIZATION', 'LANDLORD', 'SHARED');
CREATE TYPE check_status AS ENUM ('RECEIVED', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED', 'RETURNED');
CREATE TYPE statement_format AS ENUM ('CSV', 'MT940', 'CAMT053', 'OFX', 'XLSX', 'PDF_OCR');
CREATE TYPE bank_statement_status AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'RECONCILING', 'RECONCILED', 'FAILED');
CREATE TYPE statement_line_direction AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE match_type AS ENUM ('EXACT', 'SUGGESTED', 'MANUAL', 'PARTIAL', 'SPLIT');
CREATE TYPE match_status AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED', 'REVERSED');
CREATE TYPE receipt_status AS ENUM ('DRAFT', 'GENERATING', 'ISSUED', 'SENT', 'CANCELLED');
CREATE TYPE sequence_kind AS ENUM ('CASH_RECEIPT', 'RENT_INVOICE', 'RECEIPT', 'OWNER_STATEMENT', 'REMITTANCE', 'EXPENSE', 'PAYOUT', 'SUBSCRIPTION_INVOICE');

-- ---------------------------------------------------------------------
-- Gestion d'agence
-- ---------------------------------------------------------------------
CREATE TYPE expense_category AS ENUM (
    'REPAIR', 'MAINTENANCE', 'PLUMBING', 'ELECTRICITY', 'CLEANING', 'SECURITY',
    'UTILITY_BILL', 'TAX', 'INSURANCE', 'SYNDIC_FEE', 'LEGAL_FEE', 'TRAVEL', 'SUPPLIES', 'OTHER'
);
CREATE TYPE expense_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REBILLED', 'REJECTED', 'CANCELLED');
CREATE TYPE expense_bearer AS ENUM ('LANDLORD', 'TENANT', 'ORGANIZATION');
CREATE TYPE commission_basis AS ENUM ('RATE_BPS_ON_RENT_COLLECTED', 'RATE_BPS_ON_RENT_DUE', 'FLAT_AMOUNT_PER_MONTH', 'FLAT_AMOUNT_PER_LEASE');
CREATE TYPE commission_status AS ENUM ('PENDING', 'ACCRUED', 'INVOICED', 'SETTLED', 'CANCELLED');
CREATE TYPE statement_status AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELLED');
CREATE TYPE owner_statement_line_type AS ENUM ('RENT_COLLECTED', 'CHARGE_COLLECTED', 'COMMISSION', 'EXPENSE', 'VAT', 'DEPOSIT_HELD', 'CARRY_FORWARD', 'ADJUSTMENT', 'OTHER');
CREATE TYPE payout_status AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- ---------------------------------------------------------------------
-- Exploitation & communication
-- ---------------------------------------------------------------------
CREATE TYPE maintenance_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REJECTED');
CREATE TYPE maintenance_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE maintenance_reporter AS ENUM ('TENANT', 'LANDLORD', 'COLLECTOR', 'MANAGER', 'INSPECTION');
CREATE TYPE notification_channel AS ENUM ('WHATSAPP', 'SMS', 'EMAIL', 'PUSH', 'IN_APP');
CREATE TYPE notification_status AS ENUM ('SCHEDULED', 'QUEUED', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE message_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'REJECTED', 'EXPIRED');
CREATE TYPE dunning_step_status AS ENUM ('PENDING', 'RUNNING', 'SENT', 'SKIPPED', 'FAILED', 'CANCELLED');
CREATE TYPE dunning_trigger AS ENUM ('DAYS_BEFORE_DUE', 'DAYS_AFTER_DUE', 'ON_ISSUE', 'ON_OVERDUE');

-- ---------------------------------------------------------------------
-- Technique & SaaS
-- ---------------------------------------------------------------------
CREATE TYPE document_kind AS ENUM (
    'ID_DOCUMENT', 'LEASE_CONTRACT', 'MANDATE', 'RECEIPT_PDF', 'INVOICE_PDF', 'CASH_RECEIPT_PDF',
    'TRANSFER_PROOF', 'CHECK_IMAGE', 'BANK_STATEMENT', 'INSPECTION_REPORT', 'INSPECTION_PHOTO',
    'MAINTENANCE_PHOTO', 'SIGNATURE', 'OWNER_STATEMENT_PDF', 'EXPENSE_INVOICE', 'PROPERTY_PHOTO', 'OTHER'
);
CREATE TYPE storage_provider AS ENUM ('R2', 'S3', 'LOCAL');
CREATE TYPE webhook_source AS ENUM ('CINETPAY', 'PAWAPAY', 'MTN_MOMO', 'AIRTEL_MONEY', 'WHATSAPP_CLOUD', 'SMS_GATEWAY', 'OTHER');
CREATE TYPE webhook_status AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');
CREATE TYPE sync_batch_status AS ENUM ('RECEIVED', 'VALIDATING', 'APPLIED', 'PARTIALLY_APPLIED', 'REJECTED', 'FAILED');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATE_TRANSITION', 'LOGIN', 'EXPORT', 'IMPORT');
CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');
CREATE TYPE billing_interval AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- ---------------------------------------------------------------------
-- Programme d'apport d'affaires (parrainage) — tables globales plateforme
-- ---------------------------------------------------------------------
-- Cycle de vie d'un partenaire : inscription -> vérification d'identité
-- (CNI + numéro Mobile Money) -> ACTIVE (versements autorisés).
CREATE TYPE referral_partner_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED');
-- Cycle de vie d'un parrainage : PENDING (code saisi, non confirmé),
-- QUALIFIED (bailleur confirmé par OTP), ACTIVE (première facture payée),
-- EXPIRED (durée du programme écoulée), CANCELLED (abus ou renonciation).
CREATE TYPE referral_status AS ENUM ('PENDING', 'QUALIFIED', 'ACTIVE', 'EXPIRED', 'CANCELLED');
-- Cycle de vie d'une commission : ACCRUED (facture encaissée) -> APPROVED
-- (contrôle plateforme) -> PAID (versée) ; REVERSED si la facture est remboursée.
CREATE TYPE referral_commission_status AS ENUM ('ACCRUED', 'APPROVED', 'PAID', 'REVERSED', 'CANCELLED');
-- Origine du rattachement d'une organisation à un partenaire.
CREATE TYPE referral_source AS ENUM ('CODE_AT_SIGNUP', 'PARTNER_REGISTERED_PROPERTY', 'LINK', 'MANUAL_ADMIN');
