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
-- =====================================================================
-- Partie 02a : Tenancy & sécurité — organisations et utilisateurs globaux
-- =====================================================================

CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type                organization_type NOT NULL,
    status              organization_status NOT NULL DEFAULT 'ACTIVE',
    legal_name          TEXT NOT NULL,
    trade_name          TEXT,
    slug                TEXT NOT NULL,
    rccm_number         TEXT,
    niu_number          TEXT,
    tax_regime          TEXT,
    contact_phone       TEXT NOT NULL,
    contact_email       TEXT,
    address_line        TEXT,
    district            TEXT,
    city                TEXT NOT NULL DEFAULT 'Brazzaville',
    country_code        CHAR(2) NOT NULL DEFAULT 'CG',
    logo_document_id    UUID,
    default_landlord_id UUID,
    currency            CHAR(3) NOT NULL DEFAULT 'XAF',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT organizations_slug_key UNIQUE (slug),
    CONSTRAINT organizations_phone_e164_chk CHECK (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT organizations_currency_chk CHECK (currency = 'XAF')
);
COMMENT ON TABLE organizations IS 'Tenant SaaS : agence immobilière ou bailleur indépendant. Racine de l''isolation multi-tenant.';
COMMENT ON COLUMN organizations.slug IS 'Identifiant court URL-safe, utilisé dans les numérotations (CASH-{org}-...).';
COMMENT ON COLUMN organizations.rccm_number IS 'Registre du Commerce et du Crédit Mobilier (Congo-Brazzaville).';
COMMENT ON COLUMN organizations.niu_number IS 'Numéro d''Identification Unique fiscal.';
COMMENT ON COLUMN organizations.district IS 'Quartier / arrondissement (ex. Bacongo, Poto-Poto, Tié-Tié).';
COMMENT ON COLUMN organizations.default_landlord_id IS 'Pour INDEPENDENT_LANDLORD : le landlord "self" que possède l''organisation.';
COMMENT ON COLUMN organizations.contact_phone IS 'Téléphone au format E.164 (ex. +242061234567).';

CREATE TABLE organization_settings (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    timezone                  TEXT NOT NULL DEFAULT 'Africa/Brazzaville',
    locale                    TEXT NOT NULL DEFAULT 'fr-CG',
    currency                  CHAR(3) NOT NULL DEFAULT 'XAF',
    default_payment_due_day   SMALLINT NOT NULL DEFAULT 5,
    default_grace_days        SMALLINT NOT NULL DEFAULT 5,
    invoice_generation_lead_days SMALLINT NOT NULL DEFAULT 7,
    default_penalty_rule_id   UUID,
    default_commission_rate_bps INTEGER NOT NULL DEFAULT 1000,
    momo_fee_bearer           fee_bearer NOT NULL DEFAULT 'TENANT',
    receipt_verification_base_url TEXT,
    whatsapp_enabled          BOOLEAN NOT NULL DEFAULT true,
    sms_fallback_enabled      BOOLEAN NOT NULL DEFAULT true,
    cash_remittance_max_open_amount BIGINT NOT NULL DEFAULT 0 CHECK (cash_remittance_max_open_amount >= 0),
    settings_json             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT organization_settings_org_key UNIQUE (organization_id),
    CONSTRAINT organization_settings_due_day_chk CHECK (default_payment_due_day BETWEEN 1 AND 28),
    CONSTRAINT organization_settings_grace_chk CHECK (default_grace_days BETWEEN 0 AND 60),
    CONSTRAINT organization_settings_comm_chk CHECK (default_commission_rate_bps BETWEEN 0 AND 10000)
);
COMMENT ON TABLE organization_settings IS 'Paramétrage métier par organisation (échéances, pénalités, commission, canaux).';
COMMENT ON COLUMN organization_settings.default_payment_due_day IS 'Jour du mois d''échéance du loyer par défaut (1 à 28).';
COMMENT ON COLUMN organization_settings.default_grace_days IS 'Jours de grâce avant application des pénalités.';
COMMENT ON COLUMN organization_settings.default_commission_rate_bps IS 'Commission de gestion par défaut en points de base (1000 bps = 10 %).';
COMMENT ON COLUMN organization_settings.cash_remittance_max_open_amount IS 'Plafond d''encaisse ouverte par démarcheur ; 0 = illimité.';

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164          TEXT NOT NULL,
    phone_verified_at   TIMESTAMPTZ,
    email               TEXT,
    email_verified_at   TIMESTAMPTZ,
    first_name          TEXT,
    last_name           TEXT,
    display_name        TEXT,
    gender              gender_type NOT NULL DEFAULT 'UNSPECIFIED',
    locale              TEXT NOT NULL DEFAULT 'fr-CG',
    avatar_document_id  UUID,
    status              user_status NOT NULL DEFAULT 'PENDING',
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT users_phone_key UNIQUE (phone_e164),
    CONSTRAINT users_phone_e164_chk CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT users_email_chk CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
COMMENT ON TABLE users IS 'Table GLOBALE (hors RLS) : un utilisateur peut appartenir à plusieurs organisations et être locataire ailleurs.';
COMMENT ON COLUMN users.phone_e164 IS 'Identifiant de connexion principal, format E.164 (+242...).';
COMMENT ON COLUMN users.status IS 'PENDING tant que le téléphone n''est pas vérifié par OTP.';

CREATE UNIQUE INDEX users_email_uk ON users (lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;
-- =====================================================================
-- Partie 02b : Tenancy & sécurité — credentials, OTP, sessions, membres
-- =====================================================================

CREATE TABLE user_credentials (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash          TEXT,
    password_algo          TEXT NOT NULL DEFAULT 'argon2id',
    password_updated_at    TIMESTAMPTZ,
    pin_hash               TEXT,
    totp_secret_encrypted  BYTEA,
    mfa_enabled            BOOLEAN NOT NULL DEFAULT false,
    failed_attempts        SMALLINT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    locked_until           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_credentials_user_key UNIQUE (user_id)
);
COMMENT ON TABLE user_credentials IS 'Table GLOBALE : secrets d''authentification. Mot de passe optionnel (web) ; l''auth principale est téléphone + OTP.';
COMMENT ON COLUMN user_credentials.pin_hash IS 'Code PIN court utilisé par l''app démarcheur en mode hors ligne.';
COMMENT ON COLUMN user_credentials.locked_until IS 'Verrouillage temporaire après trop de tentatives échouées.';

CREATE TABLE otp_codes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_e164     TEXT NOT NULL,
    purpose        otp_purpose NOT NULL,
    delivery       otp_delivery NOT NULL DEFAULT 'SMS',
    code_hash      TEXT NOT NULL,
    attempts       SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts   SMALLINT NOT NULL DEFAULT 5,
    expires_at     TIMESTAMPTZ NOT NULL,
    consumed_at    TIMESTAMPTZ,
    request_ip     INET,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT otp_codes_phone_e164_chk CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);
COMMENT ON TABLE otp_codes IS 'Table GLOBALE : codes à usage unique envoyés par SMS ou WhatsApp. Le code clair n''est jamais stocké.';
COMMENT ON COLUMN otp_codes.code_hash IS 'Hash du code (pgcrypto), jamais le code en clair.';

CREATE INDEX otp_codes_phone_purpose_idx ON otp_codes (phone_e164, purpose, created_at DESC);
CREATE INDEX otp_codes_active_idx ON otp_codes (expires_at) WHERE consumed_at IS NULL;

CREATE TABLE refresh_tokens (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash         TEXT NOT NULL,
    family_id          UUID NOT NULL DEFAULT gen_random_uuid(),
    parent_token_id    UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    device_id          TEXT,
    device_label       TEXT,
    user_agent         TEXT,
    ip_address         INET,
    issued_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    revoked_reason     TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT refresh_tokens_hash_key UNIQUE (token_hash)
);
COMMENT ON TABLE refresh_tokens IS 'Table GLOBALE : refresh tokens rotatifs (30 j). Une famille compromise est révoquée en bloc.';
COMMENT ON COLUMN refresh_tokens.family_id IS 'Chaîne de rotation : la réutilisation d''un token révoqué invalide toute la famille.';

CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE organization_members (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                 member_role NOT NULL,
    status               member_status NOT NULL DEFAULT 'ACTIVE',
    job_title            TEXT,
    employee_ref         TEXT,
    collector_zone       TEXT,
    cash_limit_amount    BIGINT NOT NULL DEFAULT 0 CHECK (cash_limit_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    invited_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT organization_members_uk UNIQUE (organization_id, user_id)
);
COMMENT ON TABLE organization_members IS 'Rattachement d''un utilisateur à une organisation avec son rôle (OWNER, MANAGER, COLLECTOR, ACCOUNTANT, VIEWER).';
COMMENT ON COLUMN organization_members.collector_zone IS 'Zone/quartier de tournée du démarcheur (COLLECTOR).';
COMMENT ON COLUMN organization_members.cash_limit_amount IS 'Encaisse maximale autorisée avant reversement obligatoire ; 0 = illimité.';

CREATE INDEX organization_members_org_role_idx ON organization_members (organization_id, role) WHERE status = 'ACTIVE';

CREATE TABLE invitations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_e164         TEXT,
    email              TEXT,
    role               member_role NOT NULL,
    token_hash         TEXT NOT NULL,
    status             invitation_status NOT NULL DEFAULT 'PENDING',
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at         TIMESTAMPTZ NOT NULL,
    accepted_at        TIMESTAMPTZ,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT invitations_token_key UNIQUE (token_hash),
    CONSTRAINT invitations_target_chk CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL)
);
COMMENT ON TABLE invitations IS 'Invitation d''un collaborateur à rejoindre une organisation (lien signé + OTP).';

CREATE INDEX invitations_org_status_idx ON invitations (organization_id, status);

CREATE TABLE api_keys (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    key_prefix         TEXT NOT NULL,
    key_hash           TEXT NOT NULL,
    scopes             TEXT[] NOT NULL DEFAULT '{}',
    status             api_key_status NOT NULL DEFAULT 'ACTIVE',
    allowed_ips        INET[],
    last_used_at       TIMESTAMPTZ,
    expires_at         TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT api_keys_hash_key UNIQUE (key_hash),
    CONSTRAINT api_keys_prefix_key UNIQUE (key_prefix)
);
COMMENT ON TABLE api_keys IS 'Clés d''API machine-to-machine par organisation (intégrations, exports comptables).';
COMMENT ON COLUMN api_keys.key_prefix IS 'Préfixe public affichable (8 caractères) permettant d''identifier la clé sans la révéler.';
-- =====================================================================
-- Partie 03a : Tiers — bailleurs, locataires, garants, canaux de contact
-- =====================================================================

CREATE TABLE landlords (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    party_type           party_type NOT NULL DEFAULT 'INDIVIDUAL',
    is_self              BOOLEAN NOT NULL DEFAULT false,
    first_name           TEXT,
    last_name            TEXT,
    company_name         TEXT,
    gender               gender_type NOT NULL DEFAULT 'UNSPECIFIED',
    birth_date           DATE,
    nationality          CHAR(2),
    id_document_type     id_document_type,
    id_document_number   TEXT,
    id_document_expiry   DATE,
    id_document_id       UUID,
    rccm_number          TEXT,
    niu_number           TEXT,
    primary_phone        TEXT NOT NULL,
    secondary_phone      TEXT,
    email                TEXT,
    address_line         TEXT,
    district             TEXT,
    city                 TEXT NOT NULL DEFAULT 'Brazzaville',
    country_code         CHAR(2) NOT NULL DEFAULT 'CG',
    default_bank_account_id UUID,
    payout_method        payment_method NOT NULL DEFAULT 'MOBILE_MONEY',
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT landlords_name_chk CHECK (
        (party_type = 'INDIVIDUAL' AND last_name IS NOT NULL) OR
        (party_type = 'COMPANY' AND company_name IS NOT NULL)),
    CONSTRAINT landlords_phone_chk CHECK (primary_phone ~ '^\+[1-9][0-9]{7,14}$')
);
COMMENT ON TABLE landlords IS 'Propriétaire d''un bien. Sous mandat de gestion en agence ; landlord "self" pour un bailleur indépendant.';
COMMENT ON COLUMN landlords.user_id IS 'Compte utilisateur global lié au bailleur : ouvre le portail bailleur en LECTURE SEULE (encaissements, quittances, relevés de gérance, reversements). Invitation envoyée par WhatsApp par le gestionnaire ; NULL tant que le bailleur n''a pas activé son accès.';
COMMENT ON COLUMN landlords.is_self IS 'true = le bailleur est l''organisation elle-même (type INDEPENDENT_LANDLORD).';
COMMENT ON COLUMN landlords.district IS 'Quartier de résidence (ex. Moungali, Mpita).';
COMMENT ON COLUMN landlords.payout_method IS 'Canal de reversement des loyers nets au bailleur.';
COMMENT ON COLUMN landlords.id_document_id IS 'Document scanné de la pièce d''identité (FK vers documents ajoutée en partie 11).';

CREATE UNIQUE INDEX landlords_self_uk ON landlords (organization_id) WHERE is_self AND deleted_at IS NULL;
CREATE INDEX landlords_org_idx ON landlords (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX landlords_phone_idx ON landlords (organization_id, primary_phone);

-- FK différée : organizations.default_landlord_id (déclarée en partie 02a).
ALTER TABLE organizations
    ADD CONSTRAINT organizations_default_landlord_fk
    FOREIGN KEY (default_landlord_id) REFERENCES landlords(id) ON DELETE SET NULL;

CREATE TABLE tenants (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    party_type           party_type NOT NULL DEFAULT 'INDIVIDUAL',
    first_name           TEXT,
    last_name            TEXT,
    company_name         TEXT,
    gender               gender_type NOT NULL DEFAULT 'UNSPECIFIED',
    birth_date           DATE,
    birth_place          TEXT,
    nationality          CHAR(2),
    id_document_type     id_document_type,
    id_document_number   TEXT,
    id_document_expiry   DATE,
    id_document_id       UUID,
    rccm_number          TEXT,
    niu_number           TEXT,
    profession           TEXT,
    employer_name        TEXT,
    monthly_income       BIGINT CHECK (monthly_income IS NULL OR monthly_income >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    primary_phone        TEXT NOT NULL,
    secondary_phone      TEXT,
    whatsapp_phone       TEXT,
    email                TEXT,
    address_line         TEXT,
    district             TEXT,
    city                 TEXT NOT NULL DEFAULT 'Brazzaville',
    country_code         CHAR(2) NOT NULL DEFAULT 'CG',
    emergency_contact_name  TEXT,
    emergency_contact_phone TEXT,
    client_ref           TEXT,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT tenants_name_chk CHECK (
        (party_type = 'INDIVIDUAL' AND last_name IS NOT NULL) OR
        (party_type = 'COMPANY' AND company_name IS NOT NULL)),
    CONSTRAINT tenants_phone_chk CHECK (primary_phone ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT tenants_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE tenants IS 'Locataire personne physique ou morale. Peut disposer ou non d''un compte utilisateur (portail locataire).';
COMMENT ON COLUMN tenants.monthly_income IS 'Revenu mensuel déclaré en XAF, utilisé pour le scoring de solvabilité.';
COMMENT ON COLUMN tenants.client_ref IS 'ULID généré sur l''appareil mobile, clé d''idempotence unique par organisation.';

CREATE INDEX tenants_org_idx ON tenants (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX tenants_phone_idx ON tenants (organization_id, primary_phone);
CREATE INDEX tenants_name_idx ON tenants (organization_id, lower(coalesce(last_name, company_name)));

CREATE TABLE guarantors (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id            UUID REFERENCES tenants(id) ON DELETE SET NULL,
    party_type           party_type NOT NULL DEFAULT 'INDIVIDUAL',
    first_name           TEXT,
    last_name            TEXT,
    company_name         TEXT,
    relationship         TEXT,
    id_document_type     id_document_type,
    id_document_number   TEXT,
    id_document_id       UUID,
    profession           TEXT,
    employer_name        TEXT,
    monthly_income       BIGINT CHECK (monthly_income IS NULL OR monthly_income >= 0),
    guarantee_amount     BIGINT CHECK (guarantee_amount IS NULL OR guarantee_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    primary_phone        TEXT NOT NULL,
    email                TEXT,
    address_line         TEXT,
    district             TEXT,
    city                 TEXT NOT NULL DEFAULT 'Brazzaville',
    country_code         CHAR(2) NOT NULL DEFAULT 'CG',
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT guarantors_phone_chk CHECK (primary_phone ~ '^\+[1-9][0-9]{7,14}$')
);
COMMENT ON TABLE guarantors IS 'Garant (caution) rattaché à un locataire et/ou à un bail. Optionnel.';
COMMENT ON COLUMN guarantors.relationship IS 'Lien avec le locataire (parent, employeur, ami...).';
COMMENT ON COLUMN guarantors.guarantee_amount IS 'Plafond de la caution solidaire en XAF ; NULL = illimité.';

CREATE INDEX guarantors_org_idx ON guarantors (organization_id) WHERE deleted_at IS NULL;

CREATE TABLE contact_channels (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_type        contact_owner_type NOT NULL,
    owner_id          UUID NOT NULL,
    channel_type      contact_channel_type NOT NULL,
    value             TEXT NOT NULL,
    label             TEXT,
    is_primary        BOOLEAN NOT NULL DEFAULT false,
    is_verified       BOOLEAN NOT NULL DEFAULT false,
    verified_at       TIMESTAMPTZ,
    opt_in            BOOLEAN NOT NULL DEFAULT true,
    opt_out_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT contact_channels_uk UNIQUE (organization_id, owner_type, owner_id, channel_type, value)
);
COMMENT ON TABLE contact_channels IS 'Coordonnées multiples (téléphone, WhatsApp, email) d''un tiers, avec consentement de contact.';
COMMENT ON COLUMN contact_channels.owner_id IS 'Référence polymorphe vers landlords/tenants/guarantors/organization_members selon owner_type.';
COMMENT ON COLUMN contact_channels.opt_in IS 'Consentement à recevoir relances et quittances sur ce canal.';

CREATE UNIQUE INDEX contact_channels_primary_uk
    ON contact_channels (organization_id, owner_type, owner_id, channel_type) WHERE is_primary;
CREATE INDEX contact_channels_value_idx ON contact_channels (organization_id, value);
-- =====================================================================
-- Partie 03b : Patrimoine — biens, lots, comptes bancaires
-- =====================================================================

CREATE TABLE properties (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    landlord_id          UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    code                 TEXT,
    name                 TEXT NOT NULL,
    property_type        property_type NOT NULL DEFAULT 'HOUSE',
    address_line         TEXT NOT NULL,
    district             TEXT NOT NULL,
    arrondissement       TEXT,
    landmark             TEXT,
    city                 TEXT NOT NULL DEFAULT 'Brazzaville',
    country_code         CHAR(2) NOT NULL DEFAULT 'CG',
    latitude             NUMERIC(9,6),
    longitude            NUMERIC(9,6),
    land_title_reference TEXT,
    parcel_number        TEXT,
    built_year           SMALLINT,
    total_area_sqm       NUMERIC(10,2) CHECK (total_area_sqm IS NULL OR total_area_sqm > 0),
    floors_count         SMALLINT CHECK (floors_count IS NULL OR floors_count >= 0),
    units_count          INTEGER NOT NULL DEFAULT 0 CHECK (units_count >= 0),
    has_water            BOOLEAN NOT NULL DEFAULT true,
    has_electricity      BOOLEAN NOT NULL DEFAULT true,
    has_borehole         BOOLEAN NOT NULL DEFAULT false,
    caretaker_name       TEXT,
    caretaker_phone      TEXT,
    cover_document_id    UUID,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT properties_code_uk UNIQUE (organization_id, code)
);
COMMENT ON TABLE properties IS 'Bien immobilier (immeuble, parcelle, villa) rattaché à un bailleur.';
COMMENT ON COLUMN properties.district IS 'Quartier — élément d''adressage principal au Congo-Brazzaville.';
COMMENT ON COLUMN properties.landmark IS 'Repère d''orientation (« derrière l''école X »), l''adressage postal étant peu fiable.';
COMMENT ON COLUMN properties.land_title_reference IS 'Référence du titre foncier ou de l''attestation de propriété.';
COMMENT ON COLUMN properties.units_count IS 'Compteur dénormalisé de lots actifs, maintenu par l''application.';
COMMENT ON COLUMN properties.caretaker_phone IS 'Téléphone du gardien / concierge au format E.164.';

CREATE INDEX properties_org_idx ON properties (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX properties_landlord_idx ON properties (organization_id, landlord_id) WHERE deleted_at IS NULL;
CREATE INDEX properties_district_idx ON properties (organization_id, city, district);

CREATE TABLE units (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id          UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    code                 TEXT NOT NULL,
    label                TEXT,
    unit_type            unit_type NOT NULL DEFAULT 'APARTMENT',
    status               unit_status NOT NULL DEFAULT 'AVAILABLE',
    floor_number         SMALLINT,
    rooms_count          SMALLINT CHECK (rooms_count IS NULL OR rooms_count >= 0),
    bedrooms_count       SMALLINT CHECK (bedrooms_count IS NULL OR bedrooms_count >= 0),
    bathrooms_count      SMALLINT CHECK (bathrooms_count IS NULL OR bathrooms_count >= 0),
    area_sqm             NUMERIC(10,2) CHECK (area_sqm IS NULL OR area_sqm > 0),
    is_furnished         BOOLEAN NOT NULL DEFAULT false,
    has_private_meter    BOOLEAN NOT NULL DEFAULT false,
    base_rent_amount     BIGINT NOT NULL DEFAULT 0 CHECK (base_rent_amount >= 0),
    base_charges_amount  BIGINT NOT NULL DEFAULT 0 CHECK (base_charges_amount >= 0),
    deposit_months       SMALLINT NOT NULL DEFAULT 2 CHECK (deposit_months >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    amenities            JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT units_code_uk UNIQUE (organization_id, property_id, code)
);
COMMENT ON TABLE units IS 'Lot louable d''un bien (studio, chambre, appartement, boutique, parcelle).';
COMMENT ON COLUMN units.base_rent_amount IS 'Loyer de référence en XAF ; le loyer contractuel réel est porté par leases.';
COMMENT ON COLUMN units.base_charges_amount IS 'Charges forfaitaires de référence en XAF (eau, électricité communes, gardiennage).';
COMMENT ON COLUMN units.deposit_months IS 'Nombre de mois de loyer exigés en caution (usage local : 2 à 3 mois).';
COMMENT ON COLUMN units.amenities IS 'Équipements libres (climatisation, cour, forage, groupe électrogène...).';

CREATE INDEX units_org_status_idx ON units (organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX units_property_idx ON units (organization_id, property_id) WHERE deleted_at IS NULL;

CREATE TABLE bank_accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    holder_type          bank_account_holder_type NOT NULL DEFAULT 'ORGANIZATION',
    landlord_id          UUID REFERENCES landlords(id) ON DELETE CASCADE,
    tenant_id            UUID REFERENCES tenants(id) ON DELETE CASCADE,
    label                TEXT NOT NULL,
    bank_code            TEXT NOT NULL,
    bank_name            TEXT NOT NULL,
    branch_name          TEXT,
    account_holder_name  TEXT NOT NULL,
    account_number       TEXT,
    rib_key              TEXT,
    iban                 TEXT,
    swift_bic            TEXT,
    momo_provider        momo_provider,
    momo_msisdn          TEXT,
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    is_default           BOOLEAN NOT NULL DEFAULT false,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_accounts_holder_chk CHECK (
        (holder_type = 'ORGANIZATION' AND landlord_id IS NULL AND tenant_id IS NULL) OR
        (holder_type = 'LANDLORD'     AND landlord_id IS NOT NULL) OR
        (holder_type = 'TENANT'       AND tenant_id IS NOT NULL)),
    CONSTRAINT bank_accounts_identifier_chk CHECK (account_number IS NOT NULL OR iban IS NOT NULL OR momo_msisdn IS NOT NULL),
    CONSTRAINT bank_accounts_momo_chk CHECK (momo_msisdn IS NULL OR momo_msisdn ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT bank_accounts_number_uk UNIQUE (organization_id, bank_code, account_number)
);

-- FK différée : landlords.default_bank_account_id référence bank_accounts, créée après landlords.
ALTER TABLE landlords
    ADD CONSTRAINT landlords_default_bank_account_fk
    FOREIGN KEY (default_bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;
COMMENT ON TABLE bank_accounts IS 'Comptes de règlement : banques locales (BGFI, LCB, Ecobank, UBA, BSCA, Crédit du Congo...) ou portefeuilles Mobile Money.';
COMMENT ON COLUMN bank_accounts.bank_code IS 'Code banque libre (aucune liste figée) — sert au rapprochement des relevés.';
COMMENT ON COLUMN bank_accounts.rib_key IS 'Clé RIB à 2 chiffres du plan de comptes bancaire CEMAC.';
COMMENT ON COLUMN bank_accounts.momo_msisdn IS 'Numéro du portefeuille Mobile Money au format E.164.';

CREATE UNIQUE INDEX bank_accounts_default_org_uk ON bank_accounts (organization_id)
    WHERE is_default AND holder_type = 'ORGANIZATION' AND is_active;
CREATE UNIQUE INDEX bank_accounts_default_landlord_uk ON bank_accounts (organization_id, landlord_id)
    WHERE is_default AND holder_type = 'LANDLORD' AND is_active;
-- =====================================================================
-- Partie 03c : Patrimoine — compteurs, relevés, tarifs de charges
-- =====================================================================

CREATE TABLE utility_tariffs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id          UUID REFERENCES properties(id) ON DELETE CASCADE,
    meter_type           meter_type NOT NULL,
    basis                tariff_basis NOT NULL DEFAULT 'PER_UNIT_CONSUMED',
    label                TEXT NOT NULL,
    unit_price_amount    BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
    flat_amount          BIGINT NOT NULL DEFAULT 0 CHECK (flat_amount >= 0),
    standing_charge_amount BIGINT NOT NULL DEFAULT 0 CHECK (standing_charge_amount >= 0),
    minimum_amount       BIGINT NOT NULL DEFAULT 0 CHECK (minimum_amount >= 0),
    measurement_unit     TEXT NOT NULL DEFAULT 'kWh',
    invoice_line_type    invoice_line_type NOT NULL DEFAULT 'ELECTRICITY_CHARGE',
    effective_from       DATE NOT NULL,
    effective_to         DATE,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT utility_tariffs_period_chk CHECK (effective_to IS NULL OR effective_from < effective_to)
);
COMMENT ON TABLE utility_tariffs IS 'Grille de refacturation des charges (E2C électricité, LCDE eau, sous-compteurs privés) applicable à une organisation ou à un bien.';
COMMENT ON COLUMN utility_tariffs.unit_price_amount IS 'Prix en XAF de l''unité consommée (kWh, m3) pour la base PER_UNIT_CONSUMED.';
COMMENT ON COLUMN utility_tariffs.flat_amount IS 'Montant forfaitaire mensuel en XAF pour la base FLAT_MONTHLY.';
COMMENT ON COLUMN utility_tariffs.standing_charge_amount IS 'Abonnement / prime fixe ajoutée à la consommation.';
COMMENT ON COLUMN utility_tariffs.measurement_unit IS 'Unité de mesure du compteur (kWh pour E2C, m3 pour LCDE).';

CREATE INDEX utility_tariffs_lookup_idx ON utility_tariffs (organization_id, meter_type, effective_from DESC) WHERE is_active;

CREATE TABLE meters (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id          UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id              UUID REFERENCES units(id) ON DELETE SET NULL,
    meter_type           meter_type NOT NULL,
    serial_number        TEXT NOT NULL,
    subscriber_number    TEXT,
    provider_name        TEXT,
    is_prepaid           BOOLEAN NOT NULL DEFAULT false,
    is_shared            BOOLEAN NOT NULL DEFAULT false,
    shared_ratio_bps     INTEGER CHECK (shared_ratio_bps IS NULL OR shared_ratio_bps BETWEEN 0 AND 10000),
    measurement_unit     TEXT NOT NULL DEFAULT 'kWh',
    digits_count         SMALLINT NOT NULL DEFAULT 6 CHECK (digits_count BETWEEN 3 AND 12),
    initial_index        NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (initial_index >= 0),
    tariff_id            UUID REFERENCES utility_tariffs(id) ON DELETE SET NULL,
    installed_at         DATE,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT meters_serial_uk UNIQUE (organization_id, serial_number)
);
COMMENT ON TABLE meters IS 'Compteur d''eau (LCDE) ou d''électricité (E2C), général ou divisionnaire, rattaché à un bien et éventuellement à un lot.';
COMMENT ON COLUMN meters.subscriber_number IS 'Numéro d''abonné auprès du concessionnaire (E2C / LCDE).';
COMMENT ON COLUMN meters.is_prepaid IS 'Compteur prépayé (recharge) : pas de relevé différentiel facturable.';
COMMENT ON COLUMN meters.shared_ratio_bps IS 'Quote-part en points de base imputée au lot quand le compteur est partagé.';
COMMENT ON COLUMN meters.digits_count IS 'Nombre de chiffres de l''afficheur, pour détecter le passage à zéro (rollover).';

CREATE INDEX meters_property_idx ON meters (organization_id, property_id) WHERE is_active;
CREATE INDEX meters_unit_idx ON meters (organization_id, unit_id) WHERE unit_id IS NOT NULL;

CREATE TABLE meter_readings (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meter_id             UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    unit_id              UUID REFERENCES units(id) ON DELETE SET NULL,
    lease_id             UUID,
    reading_date         DATE NOT NULL,
    period_start         DATE,
    period_end           DATE,
    previous_index       NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (previous_index >= 0),
    current_index        NUMERIC(14,3) NOT NULL CHECK (current_index >= 0),
    consumption          NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (consumption >= 0),
    rollover_applied     BOOLEAN NOT NULL DEFAULT false,
    tariff_id            UUID REFERENCES utility_tariffs(id) ON DELETE SET NULL,
    unit_price_amount    BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
    computed_amount      BIGINT NOT NULL DEFAULT 0 CHECK (computed_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    is_estimated         BOOLEAN NOT NULL DEFAULT false,
    is_invoiced          BOOLEAN NOT NULL DEFAULT false,
    invoice_line_id      UUID,
    photo_document_id    UUID,
    recorded_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    client_ref           TEXT,
    sync_batch_id        UUID,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT meter_readings_client_ref_uk UNIQUE (organization_id, client_ref),
    CONSTRAINT meter_readings_period_chk CHECK (period_start IS NULL OR period_end IS NULL OR period_start < period_end)
);
COMMENT ON TABLE meter_readings IS 'Relevé de compteur saisi sur le terrain (photo à l''appui), base de la refacturation des charges.';
COMMENT ON COLUMN meter_readings.consumption IS 'Consommation calculée = current_index - previous_index, corrigée du rollover et de la quote-part.';
COMMENT ON COLUMN meter_readings.computed_amount IS 'Montant en XAF à refacturer, figé au moment du relevé.';
COMMENT ON COLUMN meter_readings.is_estimated IS 'Relevé estimé (compteur inaccessible) à régulariser au relevé suivant.';
COMMENT ON COLUMN meter_readings.client_ref IS 'ULID d''idempotence généré par l''application mobile hors ligne.';

CREATE INDEX meter_readings_meter_date_idx ON meter_readings (organization_id, meter_id, reading_date DESC);
CREATE INDEX meter_readings_to_invoice_idx ON meter_readings (organization_id, lease_id) WHERE NOT is_invoiced;
CREATE INDEX meter_readings_sync_idx ON meter_readings (sync_batch_id) WHERE sync_batch_id IS NOT NULL;
-- =====================================================================
-- Partie 04a : Contrats — mandats de gestion et baux
-- =====================================================================

CREATE TABLE management_mandates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    landlord_id             UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    property_id             UUID REFERENCES properties(id) ON DELETE CASCADE,
    reference               TEXT NOT NULL,
    scope                   mandate_scope NOT NULL DEFAULT 'FULL_MANAGEMENT',
    status                  mandate_status NOT NULL DEFAULT 'DRAFT',
    start_date              DATE NOT NULL,
    end_date                DATE,
    notice_days             SMALLINT NOT NULL DEFAULT 90 CHECK (notice_days >= 0),
    auto_renew              BOOLEAN NOT NULL DEFAULT true,
    commission_basis        commission_basis NOT NULL DEFAULT 'RATE_BPS_ON_RENT_COLLECTED',
    commission_rate_bps     INTEGER CHECK (commission_rate_bps IS NULL OR commission_rate_bps BETWEEN 0 AND 10000),
    commission_flat_amount  BIGINT CHECK (commission_flat_amount IS NULL OR commission_flat_amount >= 0),
    letting_fee_rate_bps    INTEGER CHECK (letting_fee_rate_bps IS NULL OR letting_fee_rate_bps BETWEEN 0 AND 10000),
    vat_rate_bps            INTEGER NOT NULL DEFAULT 1800 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    payout_day              SMALLINT NOT NULL DEFAULT 10 CHECK (payout_day BETWEEN 1 AND 28),
    payout_bank_account_id  UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    currency                CHAR(3) NOT NULL DEFAULT 'XAF',
    signed_at               TIMESTAMPTZ,
    signature_document_id   UUID,
    signature_hash          TEXT,
    terminated_at           TIMESTAMPTZ,
    termination_reason      TEXT,
    document_id             UUID,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT management_mandates_ref_uk UNIQUE (organization_id, reference),
    CONSTRAINT management_mandates_dates_chk CHECK (end_date IS NULL OR start_date < end_date),
    CONSTRAINT management_mandates_commission_chk CHECK (commission_rate_bps IS NOT NULL OR commission_flat_amount IS NOT NULL)
);
COMMENT ON TABLE management_mandates IS 'Mandat de gestion liant une agence à un bailleur, pour tout son portefeuille ou pour un bien donné.';
COMMENT ON COLUMN management_mandates.commission_rate_bps IS 'Taux de commission en points de base (1000 = 10 %) ; exclusif ou cumulable avec commission_flat_amount.';
COMMENT ON COLUMN management_mandates.letting_fee_rate_bps IS 'Honoraires de mise en location, en points de base du loyer annuel.';
COMMENT ON COLUMN management_mandates.vat_rate_bps IS 'TVA applicable aux honoraires (18 % au Congo-Brazzaville).';
COMMENT ON COLUMN management_mandates.payout_day IS 'Jour du mois de reversement des loyers nets au bailleur.';
COMMENT ON COLUMN management_mandates.signature_hash IS 'Empreinte SHA-256 du document signé, gage d''intégrité.';

CREATE INDEX management_mandates_landlord_idx ON management_mandates (organization_id, landlord_id, status);

CREATE TABLE leases (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_id                   UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    property_id               UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    landlord_id               UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    primary_tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    mandate_id                UUID REFERENCES management_mandates(id) ON DELETE SET NULL,
    reference                 TEXT NOT NULL,
    status                    lease_status NOT NULL DEFAULT 'DRAFT',
    start_date                DATE NOT NULL,
    end_date                  DATE,
    move_in_date              DATE,
    move_out_date             DATE,
    rent_period               rent_period NOT NULL DEFAULT 'MONTHLY',
    rent_amount               BIGINT NOT NULL CHECK (rent_amount >= 0),
    charges_amount            BIGINT NOT NULL DEFAULT 0 CHECK (charges_amount >= 0),
    charges_are_provisional   BOOLEAN NOT NULL DEFAULT false,
    deposit_amount            BIGINT NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    agency_fee_amount         BIGINT NOT NULL DEFAULT 0 CHECK (agency_fee_amount >= 0),
    advance_months            SMALLINT NOT NULL DEFAULT 0 CHECK (advance_months >= 0),
    currency                  CHAR(3) NOT NULL DEFAULT 'XAF',
    payment_due_day           SMALLINT NOT NULL DEFAULT 5 CHECK (payment_due_day BETWEEN 1 AND 28),
    grace_days                SMALLINT NOT NULL DEFAULT 5 CHECK (grace_days BETWEEN 0 AND 60),
    penalty_rule_id           UUID,
    preferred_payment_method  payment_method NOT NULL DEFAULT 'CASH',
    collector_user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    indexation_rate_bps       INTEGER CHECK (indexation_rate_bps IS NULL OR indexation_rate_bps BETWEEN 0 AND 10000),
    next_indexation_date      DATE,
    notice_days               SMALLINT NOT NULL DEFAULT 30 CHECK (notice_days >= 0),
    auto_renew                BOOLEAN NOT NULL DEFAULT true,
    signed_at                 TIMESTAMPTZ,
    signature_document_id     UUID,
    signature_hash            TEXT,
    contract_document_id      UUID,
    terminated_at             TIMESTAMPTZ,
    termination_reason        TEXT,
    balance_amount            BIGINT NOT NULL DEFAULT 0,
    client_ref                TEXT,
    notes                     TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at                TIMESTAMPTZ,
    CONSTRAINT leases_ref_uk UNIQUE (organization_id, reference),
    CONSTRAINT leases_client_ref_uk UNIQUE (organization_id, client_ref),
    CONSTRAINT leases_dates_chk CHECK (end_date IS NULL OR start_date < end_date),
    CONSTRAINT leases_moveout_chk CHECK (move_out_date IS NULL OR move_in_date IS NULL OR move_in_date <= move_out_date)
);
COMMENT ON TABLE leases IS 'Contrat de bail : loyer, charges, caution, échéance et pénalités. Pivot de la facturation.';
COMMENT ON COLUMN leases.rent_amount IS 'Loyer contractuel en XAF pour une période rent_period.';
COMMENT ON COLUMN leases.charges_are_provisional IS 'true = provisions sur charges régularisées sur relevés de compteurs.';
COMMENT ON COLUMN leases.advance_months IS 'Nombre de mois de loyer payés d''avance à l''entrée (usage local courant).';
COMMENT ON COLUMN leases.payment_due_day IS 'Jour du mois d''exigibilité du loyer.';
COMMENT ON COLUMN leases.grace_days IS 'Jours de tolérance après échéance avant bascule OVERDUE et pénalités.';
COMMENT ON COLUMN leases.collector_user_id IS 'Démarcheur affecté à la collecte terrain de ce bail.';
COMMENT ON COLUMN leases.indexation_rate_bps IS 'Taux de révision annuelle du loyer en points de base.';
COMMENT ON COLUMN leases.balance_amount IS 'Solde locataire dénormalisé en XAF : positif = dette, négatif = avoir. Peut être négatif, donc sans CHECK >= 0.';
COMMENT ON COLUMN leases.signature_hash IS 'Empreinte SHA-256 du contrat signé (signature manuscrite capturée sur mobile).';

CREATE INDEX leases_org_status_idx ON leases (organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX leases_unit_idx ON leases (organization_id, unit_id) WHERE deleted_at IS NULL;
CREATE INDEX leases_tenant_idx ON leases (organization_id, primary_tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX leases_collector_idx ON leases (organization_id, collector_user_id) WHERE status = 'ACTIVE';
CREATE INDEX leases_unpaid_idx ON leases (organization_id, balance_amount DESC) WHERE status = 'ACTIVE' AND balance_amount > 0;

-- FK différée : meter_readings.lease_id (déclarée en partie 03c avant l'existence de leases).
ALTER TABLE meter_readings
    ADD CONSTRAINT meter_readings_lease_fk FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE SET NULL;
-- =====================================================================
-- Partie 04b : Contrats — parties au bail, documents, dépôts de garantie
-- =====================================================================

CREATE TABLE lease_parties (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id          UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    role              lease_party_role NOT NULL,
    tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
    guarantor_id      UUID REFERENCES guarantors(id) ON DELETE CASCADE,
    share_bps         INTEGER NOT NULL DEFAULT 10000 CHECK (share_bps BETWEEN 0 AND 10000),
    is_solidary       BOOLEAN NOT NULL DEFAULT true,
    signed_at         TIMESTAMPTZ,
    signature_document_id UUID,
    signature_hash    TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT lease_parties_target_chk CHECK (
        (role = 'GUARANTOR' AND guarantor_id IS NOT NULL AND tenant_id IS NULL) OR
        (role <> 'GUARANTOR' AND tenant_id IS NOT NULL AND guarantor_id IS NULL)),
    CONSTRAINT lease_parties_tenant_uk UNIQUE (lease_id, tenant_id),
    CONSTRAINT lease_parties_guarantor_uk UNIQUE (lease_id, guarantor_id)
);
COMMENT ON TABLE lease_parties IS 'Parties signataires d''un bail : locataire principal, co-locataires, garants, occupants déclarés.';
COMMENT ON COLUMN lease_parties.share_bps IS 'Quote-part du loyer imputée à cette partie, en points de base (10000 = 100 %).';
COMMENT ON COLUMN lease_parties.is_solidary IS 'Clause de solidarité : chaque co-locataire est redevable de la totalité.';

CREATE UNIQUE INDEX lease_parties_primary_uk ON lease_parties (lease_id) WHERE role = 'PRIMARY_TENANT';

CREATE TABLE lease_documents (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id          UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    kind              lease_document_kind NOT NULL DEFAULT 'CONTRACT',
    document_id       UUID NOT NULL,
    version           SMALLINT NOT NULL DEFAULT 1 CHECK (version >= 1),
    title             TEXT NOT NULL,
    effective_date    DATE,
    is_signed         BOOLEAN NOT NULL DEFAULT false,
    signed_at         TIMESTAMPTZ,
    signature_hash    TEXT,
    generated_by_job  TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT lease_documents_version_uk UNIQUE (lease_id, kind, version)
);
COMMENT ON TABLE lease_documents IS 'Pièces contractuelles d''un bail : contrat PDF généré, avenants, congés, attestations d''assurance.';
COMMENT ON COLUMN lease_documents.generated_by_job IS 'Identifiant du job BullMQ ayant produit le PDF (Puppeteer).';

CREATE INDEX lease_documents_lease_idx ON lease_documents (organization_id, lease_id, kind);

CREATE TABLE deposits (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id               UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    status                 deposit_status NOT NULL DEFAULT 'PENDING',
    required_amount        BIGINT NOT NULL CHECK (required_amount >= 0),
    collected_amount       BIGINT NOT NULL DEFAULT 0 CHECK (collected_amount >= 0),
    deducted_amount        BIGINT NOT NULL DEFAULT 0 CHECK (deducted_amount >= 0),
    refunded_amount        BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
    held_amount            BIGINT NOT NULL DEFAULT 0 CHECK (held_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    held_by                TEXT NOT NULL DEFAULT 'ORGANIZATION',
    months_equivalent      SMALLINT CHECK (months_equivalent IS NULL OR months_equivalent >= 0),
    due_date               DATE,
    fully_collected_at     TIMESTAMPTZ,
    refund_due_date        DATE,
    refunded_at            TIMESTAMPTZ,
    refund_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT deposits_lease_uk UNIQUE (lease_id),
    CONSTRAINT deposits_balance_chk CHECK (deducted_amount + refunded_amount <= collected_amount)
);
COMMENT ON TABLE deposits IS 'Dépôt de garantie (caution) d''un bail : appel, encaissement fractionné, retenues et restitution.';
COMMENT ON COLUMN deposits.held_by IS 'Détenteur des fonds : ORGANIZATION (agence) ou LANDLORD (bailleur).';
COMMENT ON COLUMN deposits.held_amount IS 'Solde encore détenu en XAF = collected - deducted - refunded.';
COMMENT ON COLUMN deposits.refund_due_date IS 'Date limite légale de restitution après état des lieux de sortie.';

CREATE INDEX deposits_org_status_idx ON deposits (organization_id, status);

CREATE TABLE deposit_movements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    deposit_id        UUID NOT NULL REFERENCES deposits(id) ON DELETE RESTRICT,
    lease_id          UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
    movement_type     deposit_movement_type NOT NULL,
    amount            BIGINT NOT NULL CHECK (amount >= 0),
    currency          CHAR(3) NOT NULL DEFAULT 'XAF',
    movement_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_id        UUID,
    inspection_id     UUID,
    reason            TEXT,
    reversal_of_id    UUID REFERENCES deposit_movements(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE deposit_movements IS 'Mouvements du dépôt de garantie (encaissement, retenue, restitution). Correction par contre-passation via reversal_of_id.';
COMMENT ON COLUMN deposit_movements.inspection_id IS 'État des lieux justifiant une retenue pour dégradations (FK ajoutée en partie 04c).';
COMMENT ON COLUMN deposit_movements.reversal_of_id IS 'Mouvement annulé par cette écriture de contre-passation.';

CREATE INDEX deposit_movements_deposit_idx ON deposit_movements (organization_id, deposit_id, movement_date DESC);
-- =====================================================================
-- Partie 04c : Contrats — états des lieux
-- =====================================================================

CREATE TABLE inspections (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id               UUID REFERENCES leases(id) ON DELETE SET NULL,
    unit_id                UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    property_id            UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE SET NULL,
    reference              TEXT NOT NULL,
    inspection_type        inspection_type NOT NULL,
    status                 inspection_status NOT NULL DEFAULT 'DRAFT',
    scheduled_at           TIMESTAMPTZ,
    performed_at           TIMESTAMPTZ,
    performed_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_present         BOOLEAN NOT NULL DEFAULT true,
    landlord_present       BOOLEAN NOT NULL DEFAULT false,
    overall_condition      inspection_condition,
    keys_handed_count      SMALLINT CHECK (keys_handed_count IS NULL OR keys_handed_count >= 0),
    total_damage_amount    BIGINT NOT NULL DEFAULT 0 CHECK (total_damage_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    tenant_signed_at       TIMESTAMPTZ,
    agent_signed_at        TIMESTAMPTZ,
    signature_document_id  UUID,
    signature_hash         TEXT,
    report_document_id     UUID,
    dispute_reason         TEXT,
    client_ref             TEXT,
    sync_batch_id          UUID,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT inspections_ref_uk UNIQUE (organization_id, reference),
    CONSTRAINT inspections_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE inspections IS 'État des lieux d''entrée, de sortie, périodique ou contradictoire, réalisé sur mobile hors ligne.';
COMMENT ON COLUMN inspections.total_damage_amount IS 'Somme des chiffrages de dégradations en XAF, base des retenues sur caution.';
COMMENT ON COLUMN inspections.signature_hash IS 'Empreinte SHA-256 du rapport signé par le locataire sur l''écran du mobile.';
COMMENT ON COLUMN inspections.client_ref IS 'ULID d''idempotence produit par l''appareil mobile.';

CREATE INDEX inspections_org_type_idx ON inspections (organization_id, inspection_type, status);
CREATE INDEX inspections_lease_idx ON inspections (organization_id, lease_id);
CREATE INDEX inspections_sync_idx ON inspections (sync_batch_id) WHERE sync_batch_id IS NOT NULL;

-- FK différée : deposit_movements.inspection_id (déclarée en partie 04b).
ALTER TABLE deposit_movements
    ADD CONSTRAINT deposit_movements_inspection_fk FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL;

CREATE TABLE inspection_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inspection_id        UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    room_label           TEXT NOT NULL,
    element_label        TEXT NOT NULL,
    element_category     TEXT,
    condition            inspection_condition NOT NULL DEFAULT 'GOOD',
    quantity             SMALLINT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    is_damaged           BOOLEAN NOT NULL DEFAULT false,
    damage_description   TEXT,
    repair_amount        BIGINT NOT NULL DEFAULT 0 CHECK (repair_amount >= 0),
    charged_to           expense_bearer NOT NULL DEFAULT 'TENANT',
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    position             SMALLINT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE inspection_items IS 'Ligne d''état des lieux : un élément (mur, porte, robinetterie) d''une pièce et son état constaté.';
COMMENT ON COLUMN inspection_items.repair_amount IS 'Chiffrage de la remise en état en XAF.';
COMMENT ON COLUMN inspection_items.charged_to IS 'Partie supportant le coût : locataire (dégradation) ou bailleur (vétusté).';

CREATE INDEX inspection_items_inspection_idx ON inspection_items (organization_id, inspection_id, position);

CREATE TABLE inspection_photos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inspection_id        UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    inspection_item_id   UUID REFERENCES inspection_items(id) ON DELETE CASCADE,
    document_id          UUID NOT NULL,
    caption              TEXT,
    taken_at             TIMESTAMPTZ,
    latitude             NUMERIC(9,6),
    longitude            NUMERIC(9,6),
    checksum_sha256      TEXT,
    position             SMALLINT NOT NULL DEFAULT 0,
    client_ref           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE inspection_photos IS 'Photos horodatées et géolocalisées attachées à un état des lieux ou à l''une de ses lignes.';
COMMENT ON COLUMN inspection_photos.checksum_sha256 IS 'Empreinte du fichier capturé sur l''appareil, garantissant l''absence de retouche.';

CREATE INDEX inspection_photos_inspection_idx ON inspection_photos (organization_id, inspection_id, position);
-- =====================================================================
-- Partie 05a : Facturation — séquences, règles de pénalité, factures
-- =====================================================================

CREATE TABLE sequences (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind              TEXT NOT NULL,
    period            TEXT NOT NULL DEFAULT '',
    last_value        BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0),
    prefix            TEXT,
    padding           SMALLINT NOT NULL DEFAULT 5 CHECK (padding BETWEEN 1 AND 12),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sequences_uk UNIQUE (organization_id, kind, period)
);
COMMENT ON TABLE sequences IS 'Compteurs de numérotation atomiques par organisation, nature et période. Alimente next_sequence().';
COMMENT ON COLUMN sequences.kind IS 'Nature du document : CASH_RECEIPT, RENT_INVOICE, RECEIPT, OWNER_STATEMENT, REMITTANCE, EXPENSE, PAYOUT.';
COMMENT ON COLUMN sequences.period IS 'Période de remise à zéro, typiquement YYYYMM ; chaîne vide pour une séquence continue.';
COMMENT ON COLUMN sequences.padding IS 'Longueur du numéro complété par des zéros (LOY-202603-00042).';

CREATE TABLE penalty_rules (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    basis                penalty_basis NOT NULL DEFAULT 'RATE_BPS_PER_MONTH',
    rate_bps             INTEGER CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
    flat_amount          BIGINT CHECK (flat_amount IS NULL OR flat_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    grace_days           SMALLINT NOT NULL DEFAULT 5 CHECK (grace_days BETWEEN 0 AND 60),
    cap_amount           BIGINT CHECK (cap_amount IS NULL OR cap_amount >= 0),
    cap_rate_bps         INTEGER CHECK (cap_rate_bps IS NULL OR cap_rate_bps BETWEEN 0 AND 10000),
    max_periods          SMALLINT CHECK (max_periods IS NULL OR max_periods >= 0),
    applies_to_charges   BOOLEAN NOT NULL DEFAULT false,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    is_default           BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT penalty_rules_name_uk UNIQUE (organization_id, name),
    CONSTRAINT penalty_rules_value_chk CHECK (rate_bps IS NOT NULL OR flat_amount IS NOT NULL)
);
COMMENT ON TABLE penalty_rules IS 'Barème de pénalités de retard : taux en points de base ou montant forfaitaire, plafonné.';
COMMENT ON COLUMN penalty_rules.rate_bps IS 'Taux en points de base appliqué au montant impayé (500 = 5 %).';
COMMENT ON COLUMN penalty_rules.flat_amount IS 'Pénalité forfaitaire en XAF, alternative au taux.';
COMMENT ON COLUMN penalty_rules.cap_rate_bps IS 'Plafond exprimé en points de base du principal impayé.';
COMMENT ON COLUMN penalty_rules.max_periods IS 'Nombre maximal de périodes pénalisables.';

CREATE UNIQUE INDEX penalty_rules_default_uk ON penalty_rules (organization_id) WHERE is_default AND is_active;

-- FK différées vers penalty_rules.
ALTER TABLE leases
    ADD CONSTRAINT leases_penalty_rule_fk FOREIGN KEY (penalty_rule_id) REFERENCES penalty_rules(id) ON DELETE SET NULL;
ALTER TABLE organization_settings
    ADD CONSTRAINT organization_settings_penalty_rule_fk FOREIGN KEY (default_penalty_rule_id) REFERENCES penalty_rules(id) ON DELETE SET NULL;

CREATE TABLE rent_invoices (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id               UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_id                UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    property_id            UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    landlord_id            UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    invoice_number         TEXT NOT NULL,
    status                 invoice_status NOT NULL DEFAULT 'DRAFT',
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    issue_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date               DATE NOT NULL,
    grace_until_date       DATE,
    rent_amount            BIGINT NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
    charges_amount         BIGINT NOT NULL DEFAULT 0 CHECK (charges_amount >= 0),
    penalty_amount         BIGINT NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
    other_amount           BIGINT NOT NULL DEFAULT 0 CHECK (other_amount >= 0),
    discount_amount        BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount            BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance_amount         BIGINT NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    penalty_rule_id        UUID REFERENCES penalty_rules(id) ON DELETE SET NULL,
    last_penalty_run_date  DATE,
    issued_at              TIMESTAMPTZ,
    paid_at                TIMESTAMPTZ,
    cancelled_at           TIMESTAMPTZ,
    cancellation_reason    TEXT,
    document_id            UUID,
    generated_by_job       TEXT,
    client_ref             TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rent_invoices_number_uk UNIQUE (organization_id, invoice_number),
    CONSTRAINT rent_invoices_period_uk UNIQUE (lease_id, period_start),
    CONSTRAINT rent_invoices_client_ref_uk UNIQUE (organization_id, client_ref),
    CONSTRAINT rent_invoices_period_chk CHECK (period_start < period_end),
    CONSTRAINT rent_invoices_paid_chk CHECK (paid_amount <= total_amount)
);
COMMENT ON TABLE rent_invoices IS 'Facture de loyer d''un bail pour une période. Générée par cron J-N avant échéance. Une seule facture par (bail, période).';
COMMENT ON COLUMN rent_invoices.invoice_number IS 'Numéro séquentiel LOY-{YYYYMM}-{seq} produit par next_sequence().';
COMMENT ON COLUMN rent_invoices.grace_until_date IS 'due_date + grace_days du bail : bascule en OVERDUE au-delà.';
COMMENT ON COLUMN rent_invoices.balance_amount IS 'Reste dû en XAF = total_amount - paid_amount, recalculé à chaque affectation de paiement.';
COMMENT ON COLUMN rent_invoices.last_penalty_run_date IS 'Dernière exécution du calcul de pénalités, pour éviter les doubles applications.';

CREATE INDEX rent_invoices_org_status_idx ON rent_invoices (organization_id, status, due_date);
CREATE INDEX rent_invoices_lease_period_idx ON rent_invoices (organization_id, lease_id, period_start DESC);
CREATE INDEX rent_invoices_overdue_idx ON rent_invoices (organization_id, due_date, balance_amount DESC)
    WHERE status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE') AND balance_amount > 0;
CREATE INDEX rent_invoices_tenant_open_idx ON rent_invoices (organization_id, tenant_id)
    WHERE status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE');
-- =====================================================================
-- Partie 05b : Facturation — lignes de facture et avoirs locataires
-- =====================================================================

CREATE TABLE invoice_lines (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id           UUID NOT NULL REFERENCES rent_invoices(id) ON DELETE CASCADE,
    line_type            invoice_line_type NOT NULL,
    label                TEXT NOT NULL,
    description          TEXT,
    quantity             NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit_price_amount    BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
    amount               BIGINT NOT NULL DEFAULT 0 CHECK (amount >= 0),
    vat_rate_bps         INTEGER NOT NULL DEFAULT 0 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    vat_amount           BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    is_credit            BOOLEAN NOT NULL DEFAULT false,
    meter_reading_id     UUID REFERENCES meter_readings(id) ON DELETE SET NULL,
    expense_id           UUID,
    penalty_rule_id      UUID REFERENCES penalty_rules(id) ON DELETE SET NULL,
    period_start         DATE,
    period_end           DATE,
    position             SMALLINT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT invoice_lines_period_chk CHECK (period_start IS NULL OR period_end IS NULL OR period_start < period_end)
);
COMMENT ON TABLE invoice_lines IS 'Détail d''une facture : loyer, charges eau/électricité, pénalités, refacturations, remises.';
COMMENT ON COLUMN invoice_lines.amount IS 'Montant hors taxe de la ligne en XAF ; toujours positif, le sens est porté par is_credit.';
COMMENT ON COLUMN invoice_lines.is_credit IS 'true = ligne en diminution (remise, avoir) déduite du total de la facture.';
COMMENT ON COLUMN invoice_lines.meter_reading_id IS 'Relevé de compteur source pour les lignes de charges refacturées.';
COMMENT ON COLUMN invoice_lines.expense_id IS 'Dépense refacturée au locataire (FK ajoutée en partie 09).';

CREATE INDEX invoice_lines_invoice_idx ON invoice_lines (organization_id, invoice_id, position);
CREATE INDEX invoice_lines_type_idx ON invoice_lines (organization_id, line_type);

-- FK différée : meter_readings.invoice_line_id (déclarée en partie 03c).
ALTER TABLE meter_readings
    ADD CONSTRAINT meter_readings_invoice_line_fk FOREIGN KEY (invoice_line_id) REFERENCES invoice_lines(id) ON DELETE SET NULL;

CREATE TABLE tenant_credits (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id             UUID REFERENCES leases(id) ON DELETE SET NULL,
    status               credit_status NOT NULL DEFAULT 'OPEN',
    origin               TEXT NOT NULL DEFAULT 'OVERPAYMENT',
    amount               BIGINT NOT NULL CHECK (amount >= 0),
    used_amount          BIGINT NOT NULL DEFAULT 0 CHECK (used_amount >= 0),
    remaining_amount     BIGINT NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    source_payment_id    UUID,
    source_invoice_id    UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    expires_at           DATE,
    refunded_at          TIMESTAMPTZ,
    reason               TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tenant_credits_used_chk CHECK (used_amount <= amount)
);
COMMENT ON TABLE tenant_credits IS 'Avoir locataire issu d''un trop-perçu, d''une annulation de facture ou d''un geste commercial ; imputable sur les factures suivantes.';
COMMENT ON COLUMN tenant_credits.origin IS 'OVERPAYMENT, INVOICE_CANCELLATION, DEPOSIT_TRANSFER, GOODWILL, ADJUSTMENT.';
COMMENT ON COLUMN tenant_credits.remaining_amount IS 'Solde disponible en XAF = amount - used_amount.';
COMMENT ON COLUMN tenant_credits.source_payment_id IS 'Paiement à l''origine du trop-perçu (FK ajoutée en partie 06).';

CREATE INDEX tenant_credits_open_idx ON tenant_credits (organization_id, tenant_id)
    WHERE status IN ('OPEN', 'PARTIALLY_USED');
-- =====================================================================
-- Partie 06a : Encaissement — paiements et affectations
-- Tables append-only : correction par contre-passation (reversal_of_id).
-- =====================================================================

CREATE TABLE payments (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id                UUID REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id                 UUID REFERENCES leases(id) ON DELETE RESTRICT,
    landlord_id              UUID REFERENCES landlords(id) ON DELETE RESTRICT,
    direction                payment_direction NOT NULL DEFAULT 'INBOUND',
    method                   payment_method NOT NULL,
    status                   payment_status NOT NULL DEFAULT 'PENDING',
    reference                TEXT NOT NULL,
    external_reference       TEXT,
    amount                   BIGINT NOT NULL CHECK (amount >= 0),
    fee_amount               BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    fee_bearer               fee_bearer NOT NULL DEFAULT 'TENANT',
    net_amount               BIGINT NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
    allocated_amount         BIGINT NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
    unallocated_amount       BIGINT NOT NULL DEFAULT 0 CHECK (unallocated_amount >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    payment_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    value_date               DATE,
    received_by_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    bank_account_id          UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    collection_latitude      NUMERIC(9,6),
    collection_longitude     NUMERIC(9,6),
    confirmed_at             TIMESTAMPTZ,
    confirmed_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at              TIMESTAMPTZ,
    rejection_reason         TEXT,
    reversed_at              TIMESTAMPTZ,
    reversal_of_id           UUID REFERENCES payments(id) ON DELETE RESTRICT,
    reversal_reason          TEXT,
    idempotency_key          TEXT,
    client_ref               TEXT,
    sync_batch_id            UUID,
    notes                    TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payments_reference_uk UNIQUE (organization_id, reference),
    CONSTRAINT payments_client_ref_uk UNIQUE (organization_id, client_ref),
    CONSTRAINT payments_allocated_chk CHECK (allocated_amount <= amount)
);
COMMENT ON TABLE payments IS 'Règlement encaissé ou décaissé, tous canaux confondus. APPEND-ONLY : aucune modification ni suppression, la correction passe par une contre-passation.';
COMMENT ON COLUMN payments.reference IS 'Référence interne unique par organisation, imprimée sur la quittance.';
COMMENT ON COLUMN payments.external_reference IS 'Référence opérateur : transaction Mobile Money, avis de virement, numéro de chèque.';
COMMENT ON COLUMN payments.fee_amount IS 'Frais du canal en XAF (commission Mobile Money notamment).';
COMMENT ON COLUMN payments.fee_bearer IS 'Partie supportant les frais : locataire, agence, bailleur ou partagé.';
COMMENT ON COLUMN payments.net_amount IS 'Montant net encaissé en XAF après frais lorsque ceux-ci sont à la charge du bénéficiaire.';
COMMENT ON COLUMN payments.unallocated_amount IS 'Part non encore imputée à une facture ; alimente un tenant_credit à la clôture.';
COMMENT ON COLUMN payments.collection_latitude IS 'Position GPS de l''encaissement terrain, tracée pour le contrôle des tournées.';
COMMENT ON COLUMN payments.reversal_of_id IS 'Paiement annulé par cette écriture de contre-passation.';
COMMENT ON COLUMN payments.client_ref IS 'ULID d''idempotence généré par l''appareil mobile hors ligne.';

CREATE INDEX payments_org_date_idx ON payments (organization_id, payment_date DESC);
CREATE INDEX payments_lease_idx ON payments (organization_id, lease_id, payment_date DESC);
CREATE INDEX payments_tenant_idx ON payments (organization_id, tenant_id, payment_date DESC);
CREATE INDEX payments_reference_lookup_idx ON payments (organization_id, reference, external_reference);
CREATE INDEX payments_external_ref_idx ON payments (organization_id, external_reference) WHERE external_reference IS NOT NULL;
CREATE INDEX payments_pending_idx ON payments (organization_id, method, created_at)
    WHERE status IN ('PENDING', 'PENDING_VERIFICATION');
CREATE INDEX payments_unallocated_idx ON payments (organization_id, tenant_id)
    WHERE status = 'CONFIRMED' AND unallocated_amount > 0;
CREATE INDEX payments_sync_idx ON payments (sync_batch_id) WHERE sync_batch_id IS NOT NULL;
CREATE INDEX payments_collector_idx ON payments (organization_id, received_by_user_id, payment_date DESC)
    WHERE method = 'CASH';

CREATE TABLE payment_allocations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id           UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    invoice_id           UUID REFERENCES rent_invoices(id) ON DELETE RESTRICT,
    invoice_line_id      UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
    deposit_id           UUID REFERENCES deposits(id) ON DELETE RESTRICT,
    tenant_credit_id     UUID REFERENCES tenant_credits(id) ON DELETE RESTRICT,
    amount               BIGINT NOT NULL CHECK (amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    allocation_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    allocation_order     SMALLINT NOT NULL DEFAULT 0,
    is_reversal          BOOLEAN NOT NULL DEFAULT false,
    reversal_of_id       UUID REFERENCES payment_allocations(id) ON DELETE RESTRICT,
    created_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payment_allocations_target_chk CHECK (
        num_nonnulls(invoice_id, deposit_id, tenant_credit_id) = 1)
);
COMMENT ON TABLE payment_allocations IS 'Imputation d''un paiement sur une facture, une caution ou un avoir. APPEND-ONLY : une désaffectation est une écriture inverse.';
COMMENT ON COLUMN payment_allocations.allocation_order IS 'Ordre d''apurement appliqué (pénalités, charges, puis loyer, du plus ancien au plus récent).';
COMMENT ON COLUMN payment_allocations.is_reversal IS 'true = écriture de contre-passation annulant une imputation antérieure.';

CREATE INDEX payment_allocations_payment_idx ON payment_allocations (organization_id, payment_id);
CREATE INDEX payment_allocations_invoice_idx ON payment_allocations (organization_id, invoice_id);

-- FK différées vers payments.
ALTER TABLE deposit_movements
    ADD CONSTRAINT deposit_movements_payment_fk FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE tenant_credits
    ADD CONSTRAINT tenant_credits_payment_fk FOREIGN KEY (source_payment_id) REFERENCES payments(id) ON DELETE SET NULL;
-- =====================================================================
-- Partie 06b : Encaissement espèces — reçus de caisse et reversements
-- =====================================================================

CREATE TABLE cash_remittances (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    collector_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reference                TEXT NOT NULL,
    status                   remittance_status NOT NULL DEFAULT 'OPEN',
    opened_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at             TIMESTAMPTZ,
    verified_at              TIMESTAMPTZ,
    deposited_at             TIMESTAMPTZ,
    declared_amount          BIGINT NOT NULL DEFAULT 0 CHECK (declared_amount >= 0),
    counted_amount           BIGINT NOT NULL DEFAULT 0 CHECK (counted_amount >= 0),
    expected_amount          BIGINT NOT NULL DEFAULT 0 CHECK (expected_amount >= 0),
    variance_amount          BIGINT NOT NULL DEFAULT 0,
    receipts_count           INTEGER NOT NULL DEFAULT 0 CHECK (receipts_count >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    denominations            JSONB NOT NULL DEFAULT '{}'::jsonb,
    deposit_bank_account_id  UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    deposit_slip_document_id UUID,
    verified_by_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason         TEXT,
    signature_document_id    UUID,
    signature_hash           TEXT,
    client_ref               TEXT,
    notes                    TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cash_remittances_ref_uk UNIQUE (organization_id, reference),
    CONSTRAINT cash_remittances_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE cash_remittances IS 'Reversement de l''encaisse d''un démarcheur vers l''agence ou le bailleur, avec comptage contradictoire.';
COMMENT ON COLUMN cash_remittances.expected_amount IS 'Somme des reçus de caisse rattachés, calculée par le système.';
COMMENT ON COLUMN cash_remittances.counted_amount IS 'Montant réellement compté au guichet lors de la vérification.';
COMMENT ON COLUMN cash_remittances.variance_amount IS 'Écart en XAF (counted - expected) ; peut être négatif, donc sans CHECK >= 0.';
COMMENT ON COLUMN cash_remittances.denominations IS 'Détail du comptage par coupure XAF ({"10000": 12, "5000": 4}).';
COMMENT ON COLUMN cash_remittances.signature_hash IS 'Empreinte SHA-256 du bordereau signé par le démarcheur et le caissier.';

-- Contrainte métier : une seule remise OUVERTE par démarcheur et par organisation.
CREATE UNIQUE INDEX cash_remittances_one_open_per_collector_uk
    ON cash_remittances (organization_id, collector_user_id) WHERE status = 'OPEN';
CREATE INDEX cash_remittances_org_status_idx ON cash_remittances (organization_id, status, opened_at DESC);

CREATE TABLE cash_receipts (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id               UUID REFERENCES payments(id) ON DELETE RESTRICT,
    lease_id                 UUID REFERENCES leases(id) ON DELETE RESTRICT,
    tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    collector_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    remittance_id            UUID REFERENCES cash_remittances(id) ON DELETE SET NULL,
    receipt_number           TEXT NOT NULL,
    status                   cash_receipt_status NOT NULL DEFAULT 'ISSUED',
    amount                   BIGINT NOT NULL CHECK (amount >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    received_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    payer_name               TEXT NOT NULL,
    payer_phone              TEXT,
    purpose                  TEXT,
    latitude                 NUMERIC(9,6),
    longitude                NUMERIC(9,6),
    signature_document_id    UUID,
    signature_hash           TEXT,
    document_id              UUID,
    cancelled_at             TIMESTAMPTZ,
    cancellation_reason      TEXT,
    reversal_of_id           UUID REFERENCES cash_receipts(id) ON DELETE RESTRICT,
    client_ref               TEXT,
    sync_batch_id            UUID,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cash_receipts_number_uk UNIQUE (organization_id, receipt_number),
    CONSTRAINT cash_receipts_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE cash_receipts IS 'Reçu de caisse numéroté CASH-{org}-{collector}-{seq}, signé par le locataire sur mobile. APPEND-ONLY.';
COMMENT ON COLUMN cash_receipts.payer_name IS 'Nom du payeur tel que déclaré sur le terrain (peut différer du locataire titulaire).';
COMMENT ON COLUMN cash_receipts.signature_document_id IS 'Image de la signature manuscrite capturée sur l''écran.';
COMMENT ON COLUMN cash_receipts.signature_hash IS 'Empreinte SHA-256 liant la signature au contenu du reçu.';
COMMENT ON COLUMN cash_receipts.reversal_of_id IS 'Reçu annulé par cette écriture de contre-passation.';

CREATE INDEX cash_receipts_collector_idx ON cash_receipts (organization_id, collector_user_id, received_at DESC);
CREATE INDEX cash_receipts_open_idx ON cash_receipts (organization_id, collector_user_id)
    WHERE status = 'ISSUED' AND remittance_id IS NULL;
CREATE INDEX cash_receipts_remittance_idx ON cash_receipts (organization_id, remittance_id);
CREATE INDEX cash_receipts_sync_idx ON cash_receipts (sync_batch_id) WHERE sync_batch_id IS NOT NULL;

CREATE TABLE cash_remittance_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    remittance_id        UUID NOT NULL REFERENCES cash_remittances(id) ON DELETE CASCADE,
    cash_receipt_id      UUID NOT NULL REFERENCES cash_receipts(id) ON DELETE RESTRICT,
    payment_id           UUID REFERENCES payments(id) ON DELETE RESTRICT,
    amount               BIGINT NOT NULL CHECK (amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    is_verified          BOOLEAN NOT NULL DEFAULT false,
    variance_amount      BIGINT NOT NULL DEFAULT 0,
    variance_reason      TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cash_remittance_items_uk UNIQUE (remittance_id, cash_receipt_id)
);
COMMENT ON TABLE cash_remittance_items IS 'Détail d''un bordereau de reversement : un reçu de caisse justifié pièce par pièce.';
COMMENT ON COLUMN cash_remittance_items.variance_amount IS 'Écart constaté sur cette pièce lors du comptage ; peut être négatif.';

CREATE INDEX cash_remittance_items_remittance_idx ON cash_remittance_items (organization_id, remittance_id);
-- =====================================================================
-- Partie 07 : Encaissement — virements déclarés, chèques, Mobile Money
-- =====================================================================

CREATE TABLE bank_transfer_declarations (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id               UUID REFERENCES leases(id) ON DELETE RESTRICT,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    status                 declaration_status NOT NULL DEFAULT 'SUBMITTED',
    declared_amount        BIGINT NOT NULL CHECK (declared_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    transfer_date          DATE NOT NULL,
    transfer_reference     TEXT,
    payer_name             TEXT NOT NULL,
    payer_bank_code        TEXT,
    payer_bank_name        TEXT,
    payer_account_number   TEXT,
    beneficiary_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    proof_document_id      UUID,
    submitted_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at            TIMESTAMPTZ,
    rejection_reason       TEXT,
    matched_statement_line_id UUID,
    client_ref             TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_transfer_declarations_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE bank_transfer_declarations IS 'Déclaration de virement par le locataire, preuve à l''appui, en attente de confirmation par le relevé bancaire.';
COMMENT ON COLUMN bank_transfer_declarations.transfer_reference IS 'Libellé ou référence de l''ordre de virement, utilisé comme clé de rapprochement.';
COMMENT ON COLUMN bank_transfer_declarations.proof_document_id IS 'Photo ou PDF de l''avis de virement téléversé par le locataire.';
COMMENT ON COLUMN bank_transfer_declarations.matched_statement_line_id IS 'Ligne de relevé confirmant l''encaissement (FK ajoutée en partie 08).';

CREATE INDEX bank_transfer_declarations_status_idx ON bank_transfer_declarations (organization_id, status, transfer_date DESC);
CREATE INDEX bank_transfer_declarations_ref_idx ON bank_transfer_declarations (organization_id, transfer_reference);

CREATE TABLE bank_checks (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id               UUID REFERENCES leases(id) ON DELETE RESTRICT,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    status                 check_status NOT NULL DEFAULT 'RECEIVED',
    check_number           TEXT NOT NULL,
    drawer_name            TEXT NOT NULL,
    drawer_bank_code       TEXT NOT NULL,
    drawer_bank_name       TEXT NOT NULL,
    drawer_account_number  TEXT,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    issue_date             DATE NOT NULL,
    received_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deposit_date           DATE,
    deposit_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    clearing_date          DATE,
    cleared_at             TIMESTAMPTZ,
    bounced_at             TIMESTAMPTZ,
    bounce_reason          TEXT,
    bounce_fee_amount      BIGINT NOT NULL DEFAULT 0 CHECK (bounce_fee_amount >= 0),
    image_document_id      UUID,
    received_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_checks_number_uk UNIQUE (organization_id, drawer_bank_code, check_number),
    CONSTRAINT bank_checks_dates_chk CHECK (deposit_date IS NULL OR issue_date <= deposit_date)
);
COMMENT ON TABLE bank_checks IS 'Chèque remis par un locataire : réception, remise en banque, compensation ou rejet.';
COMMENT ON COLUMN bank_checks.drawer_bank_code IS 'Code de la banque tirée (libre : BGFI, LCB, ECOBANK, UBA, BSCA...).';
COMMENT ON COLUMN bank_checks.clearing_date IS 'Date de compensation prévue ou constatée.';
COMMENT ON COLUMN bank_checks.bounce_fee_amount IS 'Frais de rejet en XAF refacturés au locataire.';

CREATE INDEX bank_checks_status_idx ON bank_checks (organization_id, status, deposit_date);
CREATE INDEX bank_checks_tenant_idx ON bank_checks (organization_id, tenant_id);

CREATE TABLE mobile_money_transactions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id               UUID REFERENCES leases(id) ON DELETE RESTRICT,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    provider               momo_provider NOT NULL,
    channel                momo_channel NOT NULL DEFAULT 'AGGREGATOR',
    aggregator             TEXT,
    declared_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    proof_document_id      UUID,
    verified_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at            TIMESTAMPTZ,
    rejection_reason       TEXT,
    direction              payment_direction NOT NULL DEFAULT 'INBOUND',
    status                 momo_status NOT NULL DEFAULT 'INITIATED',
    provider_transaction_id TEXT,
    aggregator_transaction_id TEXT,
    merchant_reference     TEXT NOT NULL,
    payer_msisdn           TEXT NOT NULL,
    payee_msisdn           TEXT,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    fee_amount             BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    fee_bearer             fee_bearer NOT NULL DEFAULT 'TENANT',
    net_amount             BIGINT NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    initiated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at           TIMESTAMPTZ,
    expires_at             TIMESTAMPTZ,
    status_checked_at      TIMESTAMPTZ,
    status_check_count     SMALLINT NOT NULL DEFAULT 0 CHECK (status_check_count >= 0),
    failure_code           TEXT,
    failure_message        TEXT,
    raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    webhook_event_id       UUID,
    idempotency_key        TEXT,
    client_ref             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT momo_merchant_ref_uk UNIQUE (organization_id, merchant_reference),
    CONSTRAINT momo_provider_tx_uk UNIQUE (provider, provider_transaction_id),
    CONSTRAINT momo_msisdn_chk CHECK (payer_msisdn ~ '^\+[1-9][0-9]{7,14}$')
);
COMMENT ON TABLE mobile_money_transactions IS 'Transaction Mobile Money via agrégateur (CinetPay, PawaPay) ou opérateur direct (MTN MoMo, Airtel Money).';
COMMENT ON COLUMN mobile_money_transactions.merchant_reference IS 'Référence marchande envoyée à l''agrégateur, clé d''idempotence de la demande de paiement.';
COMMENT ON COLUMN mobile_money_transactions.payer_msisdn IS 'Numéro du portefeuille débité, format E.164.';
COMMENT ON COLUMN mobile_money_transactions.fee_amount IS 'Frais opérateur en XAF prélevés sur la transaction.';
COMMENT ON COLUMN mobile_money_transactions.status_check_count IS 'Nombre de re-interrogations de statut : un webhook seul ne vaut jamais confirmation.';
COMMENT ON COLUMN mobile_money_transactions.raw_payload IS 'Payload brut de l''agrégateur conservé intégralement pour audit et rejeu.';

CREATE INDEX momo_status_idx ON mobile_money_transactions (organization_id, status, initiated_at DESC);
CREATE INDEX momo_pending_recheck_idx ON mobile_money_transactions (status_checked_at)
    WHERE status IN ('INITIATED', 'PENDING');
CREATE INDEX momo_payer_idx ON mobile_money_transactions (organization_id, payer_msisdn);
CREATE INDEX momo_declared_pending_idx ON mobile_money_transactions (organization_id, initiated_at DESC)
    WHERE channel = 'DECLARED' AND status = 'DECLARED';
COMMENT ON COLUMN mobile_money_transactions.channel IS 'AGGREGATOR : initiée via MobileMoneyProvider ; DECLARED : transfert direct vers le numéro du bailleur déclaré par le locataire (référence opérateur saisie), à vérifier manuellement ou par relevé opérateur.';
COMMENT ON COLUMN mobile_money_transactions.aggregator IS 'Nom de l''agrégateur (CINETPAY, PAWAPAY) ; NULL pour une transaction déclarée.';
COMMENT ON COLUMN mobile_money_transactions.proof_document_id IS 'Capture d''écran facultative du transfert (documents), mode déclaré.';
ALTER TABLE mobile_money_transactions ADD CONSTRAINT momo_channel_chk CHECK (
    (channel = 'AGGREGATOR' AND aggregator IS NOT NULL) OR (channel = 'DECLARED' AND provider_transaction_id IS NOT NULL));
CREATE INDEX momo_payload_gin ON mobile_money_transactions USING GIN (raw_payload jsonb_path_ops);
-- =====================================================================
-- Partie 08a : Rapprochement — relevés bancaires importés
-- =====================================================================

CREATE TABLE bank_statements (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_account_id        UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    format                 statement_format NOT NULL DEFAULT 'CSV',
    status                 bank_statement_status NOT NULL DEFAULT 'UPLOADED',
    statement_reference    TEXT,
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    opening_balance        BIGINT NOT NULL DEFAULT 0,
    closing_balance        BIGINT NOT NULL DEFAULT 0,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    lines_count            INTEGER NOT NULL DEFAULT 0 CHECK (lines_count >= 0),
    matched_lines_count    INTEGER NOT NULL DEFAULT 0 CHECK (matched_lines_count >= 0),
    total_credit_amount    BIGINT NOT NULL DEFAULT 0 CHECK (total_credit_amount >= 0),
    total_debit_amount     BIGINT NOT NULL DEFAULT 0 CHECK (total_debit_amount >= 0),
    document_id            UUID,
    file_checksum_sha256   TEXT,
    imported_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    imported_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    parsed_at              TIMESTAMPTZ,
    reconciled_at          TIMESTAMPTZ,
    parse_error            TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_statements_period_chk CHECK (period_start < period_end),
    CONSTRAINT bank_statements_checksum_uk UNIQUE (organization_id, bank_account_id, file_checksum_sha256)
);
COMMENT ON TABLE bank_statements IS 'Relevé bancaire importé (CSV, MT940, CAMT.053) servant de base au rapprochement des virements et chèques.';
COMMENT ON COLUMN bank_statements.opening_balance IS 'Solde d''ouverture en XAF ; peut être négatif (découvert), donc sans CHECK >= 0.';
COMMENT ON COLUMN bank_statements.file_checksum_sha256 IS 'Empreinte du fichier : bloque le double import du même relevé.';
COMMENT ON COLUMN bank_statements.matched_lines_count IS 'Nombre de lignes rapprochées, pour le suivi du taux de rapprochement.';

CREATE INDEX bank_statements_account_idx ON bank_statements (organization_id, bank_account_id, period_start DESC);
CREATE INDEX bank_statements_status_idx ON bank_statements (organization_id, status);

CREATE TABLE bank_statement_lines (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    statement_id           UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    bank_account_id        UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    line_number            INTEGER NOT NULL CHECK (line_number >= 0),
    direction              statement_line_direction NOT NULL,
    operation_date         DATE NOT NULL,
    value_date             DATE,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    running_balance        BIGINT,
    label                  TEXT NOT NULL,
    counterparty_name      TEXT,
    counterparty_account   TEXT,
    bank_reference         TEXT,
    end_to_end_reference   TEXT,
    operation_code         TEXT,
    is_matched             BOOLEAN NOT NULL DEFAULT false,
    matched_amount         BIGINT NOT NULL DEFAULT 0 CHECK (matched_amount >= 0),
    is_ignored             BOOLEAN NOT NULL DEFAULT false,
    ignore_reason          TEXT,
    normalized_label       TEXT,
    raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_statement_lines_uk UNIQUE (statement_id, line_number),
    CONSTRAINT bank_statement_lines_matched_chk CHECK (matched_amount <= amount)
);
COMMENT ON TABLE bank_statement_lines IS 'Écriture unitaire d''un relevé bancaire, candidate au rapprochement avec un paiement ou une déclaration de virement.';
COMMENT ON COLUMN bank_statement_lines.running_balance IS 'Solde progressif en XAF après l''écriture ; peut être négatif.';
COMMENT ON COLUMN bank_statement_lines.end_to_end_reference IS 'Référence de bout en bout du virement, clé de rapprochement la plus fiable.';
COMMENT ON COLUMN bank_statement_lines.normalized_label IS 'Libellé normalisé (majuscules, sans accents ni ponctuation) pour le rapprochement approximatif.';
COMMENT ON COLUMN bank_statement_lines.raw_payload IS 'Ligne source brute (champs CSV ou tags MT940) conservée pour audit.';

CREATE INDEX bank_statement_lines_statement_idx ON bank_statement_lines (organization_id, statement_id, line_number);
CREATE INDEX bank_statement_lines_unmatched_idx ON bank_statement_lines (organization_id, operation_date DESC)
    WHERE NOT is_matched AND NOT is_ignored AND direction = 'CREDIT';
CREATE INDEX bank_statement_lines_amount_idx ON bank_statement_lines (organization_id, amount, operation_date);
CREATE INDEX bank_statement_lines_label_idx ON bank_statement_lines (organization_id, normalized_label);

-- FK différée : bank_transfer_declarations.matched_statement_line_id (déclarée en partie 07).
ALTER TABLE bank_transfer_declarations
    ADD CONSTRAINT bank_transfer_declarations_line_fk
    FOREIGN KEY (matched_statement_line_id) REFERENCES bank_statement_lines(id) ON DELETE SET NULL;
-- =====================================================================
-- Partie 08b : Rapprochement bancaire et quittances
-- =====================================================================

CREATE TABLE reconciliation_matches (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    statement_line_id        UUID NOT NULL REFERENCES bank_statement_lines(id) ON DELETE RESTRICT,
    payment_id               UUID REFERENCES payments(id) ON DELETE RESTRICT,
    declaration_id           UUID REFERENCES bank_transfer_declarations(id) ON DELETE RESTRICT,
    bank_check_id            UUID REFERENCES bank_checks(id) ON DELETE RESTRICT,
    remittance_id            UUID REFERENCES cash_remittances(id) ON DELETE RESTRICT,
    match_type               match_type NOT NULL DEFAULT 'SUGGESTED',
    status                   match_status NOT NULL DEFAULT 'PROPOSED',
    matched_amount           BIGINT NOT NULL CHECK (matched_amount >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    confidence_score         SMALLINT NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
    match_criteria           JSONB NOT NULL DEFAULT '{}'::jsonb,
    matched_by_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at             TIMESTAMPTZ,
    confirmed_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at              TIMESTAMPTZ,
    rejection_reason         TEXT,
    reversed_at              TIMESTAMPTZ,
    reversal_of_id           UUID REFERENCES reconciliation_matches(id) ON DELETE RESTRICT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reconciliation_matches_target_chk CHECK (
        num_nonnulls(payment_id, declaration_id, bank_check_id, remittance_id) >= 1)
);
COMMENT ON TABLE reconciliation_matches IS 'Rapprochement d''une ligne de relevé avec un paiement, une déclaration de virement, un chèque ou un reversement d''espèces.';
COMMENT ON COLUMN reconciliation_matches.match_type IS 'EXACT (référence et montant), SUGGESTED (score), MANUAL, PARTIAL, SPLIT (une ligne pour plusieurs paiements).';
COMMENT ON COLUMN reconciliation_matches.confidence_score IS 'Score de confiance 0-100 du moteur de rapprochement automatique.';
COMMENT ON COLUMN reconciliation_matches.match_criteria IS 'Critères ayant produit la suggestion (référence, montant, date, nom du payeur).';

CREATE UNIQUE INDEX reconciliation_matches_confirmed_line_uk
    ON reconciliation_matches (statement_line_id, coalesce(payment_id, declaration_id, bank_check_id, remittance_id))
    WHERE status = 'CONFIRMED';
CREATE INDEX reconciliation_matches_line_idx ON reconciliation_matches (organization_id, statement_line_id);
CREATE INDEX reconciliation_matches_pending_idx ON reconciliation_matches (organization_id, confidence_score DESC)
    WHERE status = 'PROPOSED';

CREATE TABLE receipts (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id               UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    invoice_id               UUID REFERENCES rent_invoices(id) ON DELETE RESTRICT,
    lease_id                 UUID REFERENCES leases(id) ON DELETE RESTRICT,
    tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    landlord_id              UUID REFERENCES landlords(id) ON DELETE RESTRICT,
    unit_id                  UUID REFERENCES units(id) ON DELETE RESTRICT,
    receipt_number           TEXT NOT NULL,
    status                   receipt_status NOT NULL DEFAULT 'DRAFT',
    period_start             DATE,
    period_end               DATE,
    issue_date               DATE NOT NULL DEFAULT CURRENT_DATE,
    rent_amount              BIGINT NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
    charges_amount           BIGINT NOT NULL DEFAULT 0 CHECK (charges_amount >= 0),
    penalty_amount           BIGINT NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
    total_amount             BIGINT NOT NULL CHECK (total_amount >= 0),
    remaining_balance_amount BIGINT NOT NULL DEFAULT 0,
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    verification_token       TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    verification_url         TEXT,
    qr_payload               TEXT,
    content_hash             TEXT,
    document_id              UUID,
    generated_at             TIMESTAMPTZ,
    generated_by_job         TEXT,
    sent_at                  TIMESTAMPTZ,
    sent_channel             notification_channel,
    message_log_id           UUID,
    cancelled_at             TIMESTAMPTZ,
    cancellation_reason      TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT receipts_number_uk UNIQUE (organization_id, receipt_number),
    CONSTRAINT receipts_token_uk UNIQUE (verification_token),
    CONSTRAINT receipts_period_chk CHECK (period_start IS NULL OR period_end IS NULL OR period_start < period_end)
);
COMMENT ON TABLE receipts IS 'Quittance de loyer QUI-{YYYYMM}-{seq} au format PDF, vérifiable publiquement par QR code. APPEND-ONLY.';
COMMENT ON COLUMN receipts.verification_token IS 'Jeton aléatoire du QR code permettant à un tiers de vérifier l''authenticité de la quittance sans authentification.';
COMMENT ON COLUMN receipts.verification_url IS 'URL publique de vérification incorporant verification_token.';
COMMENT ON COLUMN receipts.qr_payload IS 'Contenu exact encodé dans le QR code imprimé sur le PDF.';
COMMENT ON COLUMN receipts.content_hash IS 'Empreinte SHA-256 des données quittancées, contrôlée lors de la vérification publique.';
COMMENT ON COLUMN receipts.remaining_balance_amount IS 'Solde du bail après ce règlement ; peut être négatif (avoir), donc sans CHECK >= 0.';

CREATE INDEX receipts_tenant_idx ON receipts (organization_id, tenant_id, issue_date DESC);
CREATE INDEX receipts_payment_idx ON receipts (organization_id, payment_id);
CREATE INDEX receipts_pending_send_idx ON receipts (organization_id, status) WHERE status IN ('DRAFT', 'GENERATING', 'ISSUED');
-- =====================================================================
-- Partie 09a : Gestion d'agence — dépenses et commissions
-- =====================================================================

CREATE TABLE expenses (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id            UUID REFERENCES properties(id) ON DELETE SET NULL,
    unit_id                UUID REFERENCES units(id) ON DELETE SET NULL,
    lease_id               UUID REFERENCES leases(id) ON DELETE SET NULL,
    landlord_id            UUID REFERENCES landlords(id) ON DELETE SET NULL,
    maintenance_request_id UUID,
    reference              TEXT NOT NULL,
    category               expense_category NOT NULL DEFAULT 'REPAIR',
    status                 expense_status NOT NULL DEFAULT 'DRAFT',
    borne_by               expense_bearer NOT NULL DEFAULT 'LANDLORD',
    label                  TEXT NOT NULL,
    description            TEXT,
    supplier_name          TEXT,
    supplier_phone         TEXT,
    supplier_niu           TEXT,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    vat_rate_bps           INTEGER NOT NULL DEFAULT 0 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    vat_amount             BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    expense_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_at                TIMESTAMPTZ,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    is_rebillable          BOOLEAN NOT NULL DEFAULT false,
    rebilled_invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
    is_deductible_from_rent BOOLEAN NOT NULL DEFAULT true,
    owner_statement_id     UUID,
    invoice_document_id    UUID,
    approved_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at            TIMESTAMPTZ,
    created_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    client_ref             TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT expenses_reference_uk UNIQUE (organization_id, reference),
    CONSTRAINT expenses_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE expenses IS 'Dépense engagée sur un bien : réparation, facture E2C/LCDE, taxe, gardiennage. Déduite du relevé de gérance ou refacturée au locataire.';
COMMENT ON COLUMN expenses.borne_by IS 'Partie supportant réellement la charge : bailleur, locataire (refacturation) ou agence.';
COMMENT ON COLUMN expenses.is_deductible_from_rent IS 'true = la dépense est déduite des loyers reversés au bailleur.';
COMMENT ON COLUMN expenses.rebilled_invoice_line_id IS 'Ligne de facture de refacturation au locataire, le cas échéant.';
COMMENT ON COLUMN expenses.supplier_niu IS 'Numéro d''Identification Unique du fournisseur, requis pour la déductibilité fiscale.';

CREATE INDEX expenses_org_date_idx ON expenses (organization_id, expense_date DESC);
CREATE INDEX expenses_property_idx ON expenses (organization_id, property_id, expense_date DESC);
CREATE INDEX expenses_pending_statement_idx ON expenses (organization_id, landlord_id)
    WHERE status = 'PAID' AND owner_statement_id IS NULL AND is_deductible_from_rent;

-- FK différée : invoice_lines.expense_id (déclarée en partie 05b).
ALTER TABLE invoice_lines
    ADD CONSTRAINT invoice_lines_expense_fk FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL;

CREATE TABLE commissions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mandate_id             UUID REFERENCES management_mandates(id) ON DELETE SET NULL,
    landlord_id            UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    lease_id               UUID REFERENCES leases(id) ON DELETE SET NULL,
    property_id            UUID REFERENCES properties(id) ON DELETE SET NULL,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    status                 commission_status NOT NULL DEFAULT 'PENDING',
    basis                  commission_basis NOT NULL DEFAULT 'RATE_BPS_ON_RENT_COLLECTED',
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    base_amount            BIGINT NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
    rate_bps               INTEGER CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
    flat_amount            BIGINT CHECK (flat_amount IS NULL OR flat_amount >= 0),
    amount                 BIGINT NOT NULL DEFAULT 0 CHECK (amount >= 0),
    vat_rate_bps           INTEGER NOT NULL DEFAULT 1800 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    vat_amount             BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    owner_statement_id     UUID,
    accrued_at             TIMESTAMPTZ,
    settled_at             TIMESTAMPTZ,
    reversal_of_id         UUID REFERENCES commissions(id) ON DELETE RESTRICT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT commissions_period_chk CHECK (period_start < period_end),
    CONSTRAINT commissions_value_chk CHECK (rate_bps IS NOT NULL OR flat_amount IS NOT NULL)
);
COMMENT ON TABLE commissions IS 'Honoraires de gestion dus à l''agence, calculés sur les loyers encaissés ou dus selon le mandat.';
COMMENT ON COLUMN commissions.base_amount IS 'Assiette de calcul en XAF (loyer encaissé ou appelé sur la période).';
COMMENT ON COLUMN commissions.rate_bps IS 'Taux appliqué en points de base ; alternative à flat_amount.';
COMMENT ON COLUMN commissions.amount IS 'Commission hors taxe en XAF.';
COMMENT ON COLUMN commissions.reversal_of_id IS 'Commission annulée par contre-passation (impayé régularisé, reversement erroné).';

CREATE INDEX commissions_landlord_period_idx ON commissions (organization_id, landlord_id, period_start DESC);
CREATE INDEX commissions_pending_statement_idx ON commissions (organization_id, landlord_id)
    WHERE status = 'ACCRUED' AND owner_statement_id IS NULL;
-- =====================================================================
-- Partie 09b : Gestion d'agence — relevés de gérance et reversements
-- =====================================================================

CREATE TABLE owner_statements (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    landlord_id            UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    mandate_id             UUID REFERENCES management_mandates(id) ON DELETE SET NULL,
    property_id            UUID REFERENCES properties(id) ON DELETE SET NULL,
    statement_number       TEXT NOT NULL,
    status                 statement_status NOT NULL DEFAULT 'DRAFT',
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    issue_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    rent_due_amount        BIGINT NOT NULL DEFAULT 0 CHECK (rent_due_amount >= 0),
    rent_collected_amount  BIGINT NOT NULL DEFAULT 0 CHECK (rent_collected_amount >= 0),
    charges_collected_amount BIGINT NOT NULL DEFAULT 0 CHECK (charges_collected_amount >= 0),
    commission_amount      BIGINT NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
    commission_vat_amount  BIGINT NOT NULL DEFAULT 0 CHECK (commission_vat_amount >= 0),
    expenses_amount        BIGINT NOT NULL DEFAULT 0 CHECK (expenses_amount >= 0),
    deposits_held_amount   BIGINT NOT NULL DEFAULT 0 CHECK (deposits_held_amount >= 0),
    carry_forward_amount   BIGINT NOT NULL DEFAULT 0,
    net_payable_amount     BIGINT NOT NULL DEFAULT 0,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    occupancy_rate_bps     INTEGER CHECK (occupancy_rate_bps IS NULL OR occupancy_rate_bps BETWEEN 0 AND 10000),
    collection_rate_bps    INTEGER CHECK (collection_rate_bps IS NULL OR collection_rate_bps BETWEEN 0 AND 10000),
    document_id            UUID,
    generated_by_job       TEXT,
    issued_at              TIMESTAMPTZ,
    sent_at                TIMESTAMPTZ,
    settled_at             TIMESTAMPTZ,
    cancelled_at           TIMESTAMPTZ,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT owner_statements_number_uk UNIQUE (organization_id, statement_number),
    CONSTRAINT owner_statements_period_uk UNIQUE (organization_id, landlord_id, property_id, period_start),
    CONSTRAINT owner_statements_period_chk CHECK (period_start < period_end)
);
COMMENT ON TABLE owner_statements IS 'Relevé de gérance périodique adressé au bailleur : loyers encaissés, honoraires, dépenses, net à reverser.';
COMMENT ON COLUMN owner_statements.carry_forward_amount IS 'Report du solde de la période précédente en XAF ; peut être négatif.';
COMMENT ON COLUMN owner_statements.net_payable_amount IS 'Net à reverser au bailleur en XAF ; négatif = le bailleur doit à l''agence.';
COMMENT ON COLUMN owner_statements.occupancy_rate_bps IS 'Taux d''occupation du portefeuille sur la période, en points de base.';
COMMENT ON COLUMN owner_statements.collection_rate_bps IS 'Taux de recouvrement (encaissé / appelé), en points de base.';

CREATE INDEX owner_statements_landlord_idx ON owner_statements (organization_id, landlord_id, period_start DESC);
CREATE INDEX owner_statements_status_idx ON owner_statements (organization_id, status);

-- FK différées vers owner_statements.
ALTER TABLE expenses
    ADD CONSTRAINT expenses_owner_statement_fk FOREIGN KEY (owner_statement_id) REFERENCES owner_statements(id) ON DELETE SET NULL;
ALTER TABLE commissions
    ADD CONSTRAINT commissions_owner_statement_fk FOREIGN KEY (owner_statement_id) REFERENCES owner_statements(id) ON DELETE SET NULL;

CREATE TABLE owner_statement_lines (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    statement_id           UUID NOT NULL REFERENCES owner_statements(id) ON DELETE CASCADE,
    line_type              owner_statement_line_type NOT NULL,
    label                  TEXT NOT NULL,
    property_id            UUID REFERENCES properties(id) ON DELETE SET NULL,
    unit_id                UUID REFERENCES units(id) ON DELETE SET NULL,
    lease_id               UUID REFERENCES leases(id) ON DELETE SET NULL,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE SET NULL,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    expense_id             UUID REFERENCES expenses(id) ON DELETE SET NULL,
    commission_id          UUID REFERENCES commissions(id) ON DELETE SET NULL,
    period_start           DATE,
    period_end             DATE,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    is_debit               BOOLEAN NOT NULL DEFAULT false,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    position               SMALLINT NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE owner_statement_lines IS 'Détail ligne à ligne d''un relevé de gérance, traçant chaque encaissement, honoraire et dépense.';
COMMENT ON COLUMN owner_statement_lines.is_debit IS 'true = ligne en déduction du net à reverser (honoraires, dépenses, TVA).';

CREATE INDEX owner_statement_lines_statement_idx ON owner_statement_lines (organization_id, statement_id, position);

CREATE TABLE owner_payouts (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    landlord_id            UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    statement_id           UUID REFERENCES owner_statements(id) ON DELETE SET NULL,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    reference              TEXT NOT NULL,
    status                 payout_status NOT NULL DEFAULT 'PENDING',
    method                 payment_method NOT NULL DEFAULT 'MOBILE_MONEY',
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    fee_amount             BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    fee_bearer             fee_bearer NOT NULL DEFAULT 'LANDLORD',
    net_amount             BIGINT NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    bank_account_id        UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    momo_transaction_id    UUID REFERENCES mobile_money_transactions(id) ON DELETE SET NULL,
    scheduled_date         DATE,
    approved_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at            TIMESTAMPTZ,
    paid_at                TIMESTAMPTZ,
    failure_reason         TEXT,
    proof_document_id      UUID,
    client_ref             TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT owner_payouts_reference_uk UNIQUE (organization_id, reference),
    CONSTRAINT owner_payouts_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE owner_payouts IS 'Reversement effectif du net de gérance au bailleur (virement, Mobile Money, espèces ou chèque).';
COMMENT ON COLUMN owner_payouts.fee_amount IS 'Frais de transfert en XAF, à la charge du bailleur ou de l''agence selon fee_bearer.';
COMMENT ON COLUMN owner_payouts.proof_document_id IS 'Justificatif du reversement (avis de virement, reçu Mobile Money).';

CREATE INDEX owner_payouts_landlord_idx ON owner_payouts (organization_id, landlord_id, scheduled_date DESC);
CREATE INDEX owner_payouts_pending_idx ON owner_payouts (organization_id, scheduled_date)
    WHERE status IN ('PENDING', 'APPROVED', 'PROCESSING');
-- =====================================================================
-- Partie 10a : Exploitation — demandes de maintenance
-- =====================================================================

CREATE TABLE maintenance_requests (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id            UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    unit_id                UUID REFERENCES units(id) ON DELETE SET NULL,
    lease_id               UUID REFERENCES leases(id) ON DELETE SET NULL,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE SET NULL,
    reference              TEXT NOT NULL,
    status                 maintenance_status NOT NULL DEFAULT 'OPEN',
    priority               maintenance_priority NOT NULL DEFAULT 'NORMAL',
    reporter_type          maintenance_reporter NOT NULL DEFAULT 'TENANT',
    reported_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    category               expense_category NOT NULL DEFAULT 'REPAIR',
    title                  TEXT NOT NULL,
    description            TEXT NOT NULL,
    location_detail        TEXT,
    reported_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at        TIMESTAMPTZ,
    assigned_to_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at            TIMESTAMPTZ,
    supplier_name          TEXT,
    supplier_phone         TEXT,
    scheduled_at           TIMESTAMPTZ,
    started_at             TIMESTAMPTZ,
    resolved_at            TIMESTAMPTZ,
    closed_at              TIMESTAMPTZ,
    sla_due_at             TIMESTAMPTZ,
    estimated_amount       BIGINT NOT NULL DEFAULT 0 CHECK (estimated_amount >= 0),
    actual_amount          BIGINT NOT NULL DEFAULT 0 CHECK (actual_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    charged_to             expense_bearer NOT NULL DEFAULT 'LANDLORD',
    landlord_approved      BOOLEAN NOT NULL DEFAULT false,
    landlord_approved_at   TIMESTAMPTZ,
    tenant_rating          SMALLINT CHECK (tenant_rating IS NULL OR tenant_rating BETWEEN 1 AND 5),
    rejection_reason       TEXT,
    inspection_id          UUID REFERENCES inspections(id) ON DELETE SET NULL,
    client_ref             TEXT,
    sync_batch_id          UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT maintenance_requests_reference_uk UNIQUE (organization_id, reference),
    CONSTRAINT maintenance_requests_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE maintenance_requests IS 'Demande d''intervention technique signalée par un locataire, un démarcheur ou issue d''un état des lieux.';
COMMENT ON COLUMN maintenance_requests.sla_due_at IS 'Échéance de traitement contractuelle, dérivée de la priorité.';
COMMENT ON COLUMN maintenance_requests.charged_to IS 'Partie supportant le coût final : bailleur (vétusté) ou locataire (dégradation).';
COMMENT ON COLUMN maintenance_requests.landlord_approved IS 'Accord du bailleur requis au-delà du seuil de délégation du mandat.';
COMMENT ON COLUMN maintenance_requests.tenant_rating IS 'Satisfaction du locataire après clôture (1 à 5).';

CREATE INDEX maintenance_requests_org_status_idx ON maintenance_requests (organization_id, status, priority DESC, reported_at DESC);
CREATE INDEX maintenance_requests_property_idx ON maintenance_requests (organization_id, property_id, status);
CREATE INDEX maintenance_requests_sla_idx ON maintenance_requests (organization_id, sla_due_at)
    WHERE status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED');
CREATE INDEX maintenance_requests_sync_idx ON maintenance_requests (sync_batch_id) WHERE sync_batch_id IS NOT NULL;

-- FK différée : expenses.maintenance_request_id (déclarée en partie 09a).
ALTER TABLE expenses
    ADD CONSTRAINT expenses_maintenance_fk FOREIGN KEY (maintenance_request_id)
    REFERENCES maintenance_requests(id) ON DELETE SET NULL;

CREATE TABLE maintenance_updates (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_id             UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    author_user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    author_label           TEXT,
    previous_status        maintenance_status,
    new_status             maintenance_status,
    message                TEXT,
    is_visible_to_tenant   BOOLEAN NOT NULL DEFAULT true,
    amount_delta           BIGINT NOT NULL DEFAULT 0,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    photo_document_id      UUID,
    expense_id             UUID REFERENCES expenses(id) ON DELETE SET NULL,
    occurred_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    client_ref             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE maintenance_updates IS 'Fil chronologique d''une demande de maintenance : changements de statut, commentaires, photos, coûts.';
COMMENT ON COLUMN maintenance_updates.author_label IS 'Nom affiché lorsque l''auteur n''est pas un utilisateur du système (prestataire externe).';
COMMENT ON COLUMN maintenance_updates.amount_delta IS 'Variation du coût estimé en XAF ; peut être négative, donc sans CHECK >= 0.';
COMMENT ON COLUMN maintenance_updates.is_visible_to_tenant IS 'false = note interne non exposée dans le portail locataire.';

CREATE INDEX maintenance_updates_request_idx ON maintenance_updates (organization_id, request_id, occurred_at DESC);
-- =====================================================================
-- Partie 10b : Communication — modèles, notifications, journal des messages
-- =====================================================================

CREATE TABLE notification_templates (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code                   TEXT NOT NULL,
    channel                notification_channel NOT NULL,
    locale                 TEXT NOT NULL DEFAULT 'fr-CG',
    name                   TEXT NOT NULL,
    subject                TEXT,
    body                   TEXT NOT NULL,
    provider_template_name TEXT,
    provider_template_lang TEXT,
    variables              JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    is_system              BOOLEAN NOT NULL DEFAULT false,
    approved_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notification_templates_uk UNIQUE (organization_id, code, channel, locale)
);
COMMENT ON TABLE notification_templates IS 'Modèle de message par canal et par langue (quittance, relance, échéance, confirmation de paiement).';
COMMENT ON COLUMN notification_templates.provider_template_name IS 'Nom du template approuvé côté WhatsApp Cloud API, obligatoire hors fenêtre de 24 h.';
COMMENT ON COLUMN notification_templates.variables IS 'Liste ordonnée des variables attendues par le modèle ({{1}}, {{2}}...).';

CREATE TABLE notifications (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id            UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    channel                notification_channel NOT NULL,
    status                 notification_status NOT NULL DEFAULT 'SCHEDULED',
    recipient_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
    recipient_landlord_id  UUID REFERENCES landlords(id) ON DELETE SET NULL,
    recipient_address      TEXT NOT NULL,
    subject                TEXT,
    body                   TEXT NOT NULL,
    payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_entity_type    TEXT,
    related_entity_id      UUID,
    scheduled_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at                TIMESTAMPTZ,
    failed_at              TIMESTAMPTZ,
    attempts               SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts           SMALLINT NOT NULL DEFAULT 3,
    last_error             TEXT,
    job_id                 TEXT,
    dedupe_key             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notifications_dedupe_uk UNIQUE (organization_id, dedupe_key)
);
COMMENT ON TABLE notifications IS 'Notification planifiée ou envoyée à un tiers, indépendamment du canal effectif.';
COMMENT ON COLUMN notifications.recipient_address IS 'Adresse de destination : numéro E.164 (SMS/WhatsApp), courriel ou jeton push.';
COMMENT ON COLUMN notifications.related_entity_type IS 'Entité déclenchante (rent_invoice, receipt, maintenance_request, lease).';
COMMENT ON COLUMN notifications.dedupe_key IS 'Clé anti-doublon : empêche deux relances identiques le même jour.';

CREATE INDEX notifications_pending_idx ON notifications (organization_id, scheduled_at)
    WHERE status IN ('SCHEDULED', 'QUEUED');
CREATE INDEX notifications_recipient_idx ON notifications (organization_id, recipient_tenant_id, scheduled_at DESC);
CREATE INDEX notifications_entity_idx ON notifications (organization_id, related_entity_type, related_entity_id);

CREATE TABLE message_logs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    notification_id        UUID REFERENCES notifications(id) ON DELETE SET NULL,
    channel                notification_channel NOT NULL,
    status                 message_status NOT NULL DEFAULT 'QUEUED',
    provider               TEXT NOT NULL,
    provider_message_id    TEXT,
    direction              TEXT NOT NULL DEFAULT 'OUTBOUND',
    from_address           TEXT,
    to_address             TEXT NOT NULL,
    template_code          TEXT,
    content_preview        TEXT,
    segments_count         SMALLINT NOT NULL DEFAULT 1 CHECK (segments_count >= 0),
    cost_amount            BIGINT NOT NULL DEFAULT 0 CHECK (cost_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    queued_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at                TIMESTAMPTZ,
    delivered_at           TIMESTAMPTZ,
    read_at                TIMESTAMPTZ,
    failed_at              TIMESTAMPTZ,
    error_code             TEXT,
    error_message          TEXT,
    raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_entity_type    TEXT,
    related_entity_id      UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT message_logs_provider_msg_uk UNIQUE (provider, provider_message_id)
);
COMMENT ON TABLE message_logs IS 'Journal technique des messages WhatsApp/SMS/e-mail, avec accusés de livraison et de lecture.';
COMMENT ON COLUMN message_logs.segments_count IS 'Nombre de segments SMS facturés par la passerelle.';
COMMENT ON COLUMN message_logs.cost_amount IS 'Coût unitaire du message en XAF, pour le suivi budgétaire des relances.';
COMMENT ON COLUMN message_logs.raw_payload IS 'Réponse brute du fournisseur et webhooks de statut associés.';

CREATE INDEX message_logs_org_status_idx ON message_logs (organization_id, status, queued_at DESC);
CREATE INDEX message_logs_to_idx ON message_logs (organization_id, to_address, queued_at DESC);
CREATE INDEX message_logs_entity_idx ON message_logs (organization_id, related_entity_type, related_entity_id);

-- FK différée : receipts.message_log_id (déclarée en partie 08b).
ALTER TABLE receipts
    ADD CONSTRAINT receipts_message_log_fk FOREIGN KEY (message_log_id) REFERENCES message_logs(id) ON DELETE SET NULL;
-- =====================================================================
-- Partie 10c : Communication — relances (dunning)
-- =====================================================================

CREATE TABLE dunning_rules (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                   TEXT NOT NULL,
    step_order             SMALLINT NOT NULL DEFAULT 1 CHECK (step_order >= 1),
    trigger_type           dunning_trigger NOT NULL DEFAULT 'DAYS_AFTER_DUE',
    offset_days            SMALLINT NOT NULL DEFAULT 0,
    channel                notification_channel NOT NULL DEFAULT 'WHATSAPP',
    fallback_channel       notification_channel,
    template_id            UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    min_balance_amount     BIGINT NOT NULL DEFAULT 0 CHECK (min_balance_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    notify_landlord        BOOLEAN NOT NULL DEFAULT false,
    notify_collector       BOOLEAN NOT NULL DEFAULT false,
    apply_penalty          BOOLEAN NOT NULL DEFAULT false,
    penalty_rule_id        UUID REFERENCES penalty_rules(id) ON DELETE SET NULL,
    escalate_to_legal      BOOLEAN NOT NULL DEFAULT false,
    send_hour_local        SMALLINT NOT NULL DEFAULT 9 CHECK (send_hour_local BETWEEN 0 AND 23),
    skip_weekends          BOOLEAN NOT NULL DEFAULT false,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT dunning_rules_step_uk UNIQUE (organization_id, step_order)
);
COMMENT ON TABLE dunning_rules IS 'Scénario de relance impayés : palier, déclencheur, canal, modèle et pénalité éventuelle.';
COMMENT ON COLUMN dunning_rules.offset_days IS 'Décalage en jours par rapport à l''échéance ; négatif pour un rappel avant terme.';
COMMENT ON COLUMN dunning_rules.min_balance_amount IS 'Seuil d''impayé en XAF sous lequel la relance n''est pas déclenchée.';
COMMENT ON COLUMN dunning_rules.fallback_channel IS 'Canal de secours si le canal principal échoue (WhatsApp non délivré, bascule SMS).';
COMMENT ON COLUMN dunning_rules.send_hour_local IS 'Heure d''envoi en Africa/Brazzaville, pour éviter les envois nocturnes.';

CREATE INDEX dunning_rules_active_idx ON dunning_rules (organization_id, step_order) WHERE is_active;

CREATE TABLE dunning_runs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rule_id                UUID NOT NULL REFERENCES dunning_rules(id) ON DELETE RESTRICT,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE CASCADE,
    lease_id               UUID REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    step_order             SMALLINT NOT NULL CHECK (step_order >= 1),
    status                 dunning_step_status NOT NULL DEFAULT 'PENDING',
    run_date               DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_at            TIMESTAMPTZ,
    days_overdue           SMALLINT NOT NULL DEFAULT 0,
    balance_amount         BIGINT NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    channel                notification_channel NOT NULL,
    notification_id        UUID REFERENCES notifications(id) ON DELETE SET NULL,
    message_log_id         UUID REFERENCES message_logs(id) ON DELETE SET NULL,
    penalty_applied        BOOLEAN NOT NULL DEFAULT false,
    penalty_amount         BIGINT NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
    penalty_invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
    skip_reason            TEXT,
    error_message          TEXT,
    job_id                 TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT dunning_runs_uk UNIQUE (organization_id, rule_id, invoice_id, run_date)
);
COMMENT ON TABLE dunning_runs IS 'Exécution d''un palier de relance sur une facture impayée : message envoyé, pénalité éventuellement appliquée.';
COMMENT ON COLUMN dunning_runs.days_overdue IS 'Jours de retard au moment de l''exécution ; négatif pour un rappel avant échéance.';
COMMENT ON COLUMN dunning_runs.skip_reason IS 'Motif de non-envoi (paiement intervenu, opt-out du locataire, seuil non atteint).';

CREATE INDEX dunning_runs_pending_idx ON dunning_runs (organization_id, scheduled_at)
    WHERE status IN ('PENDING', 'RUNNING');
CREATE INDEX dunning_runs_invoice_idx ON dunning_runs (organization_id, invoice_id, step_order);
CREATE INDEX dunning_runs_tenant_idx ON dunning_runs (organization_id, tenant_id, run_date DESC);
-- =====================================================================
-- Partie 11a : Technique — documents (Cloudflare R2) et FK différées
-- =====================================================================

CREATE TABLE documents (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind                   document_kind NOT NULL DEFAULT 'OTHER',
    storage_provider       storage_provider NOT NULL DEFAULT 'R2',
    bucket                 TEXT NOT NULL,
    object_key             TEXT NOT NULL,
    file_name              TEXT NOT NULL,
    mime_type              TEXT NOT NULL,
    size_bytes             BIGINT NOT NULL CHECK (size_bytes >= 0),
    checksum_sha256        TEXT,
    width_px               INTEGER CHECK (width_px IS NULL OR width_px > 0),
    height_px              INTEGER CHECK (height_px IS NULL OR height_px > 0),
    pages_count            SMALLINT CHECK (pages_count IS NULL OR pages_count > 0),
    is_public              BOOLEAN NOT NULL DEFAULT false,
    is_encrypted           BOOLEAN NOT NULL DEFAULT false,
    related_entity_type    TEXT,
    related_entity_id      UUID,
    uploaded_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    retention_until        DATE,
    metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_ref             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ,
    CONSTRAINT documents_object_uk UNIQUE (bucket, object_key),
    CONSTRAINT documents_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE documents IS 'Fichier stocké sur Cloudflare R2 (compatible S3), servi par URL signée. Référencé par toutes les entités porteuses de pièces jointes.';
COMMENT ON COLUMN documents.object_key IS 'Clé d''objet dans le bucket, préfixée par organization_id pour cloisonner le stockage.';
COMMENT ON COLUMN documents.checksum_sha256 IS 'Empreinte du contenu : intégrité des signatures, photos d''état des lieux et relevés bancaires.';
COMMENT ON COLUMN documents.is_public IS 'true uniquement pour les quittances vérifiables par QR code, servies sans authentification.';
COMMENT ON COLUMN documents.retention_until IS 'Date de purge autorisée au titre de la politique de conservation.';

CREATE INDEX documents_org_kind_idx ON documents (organization_id, kind, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX documents_entity_idx ON documents (organization_id, related_entity_type, related_entity_id);

-- FK différées vers documents (colonnes déclarées dans les parties précédentes).
ALTER TABLE organizations ADD CONSTRAINT organizations_logo_fk FOREIGN KEY (logo_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT users_avatar_fk FOREIGN KEY (avatar_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE landlords ADD CONSTRAINT landlords_id_document_fk FOREIGN KEY (id_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD CONSTRAINT tenants_id_document_fk FOREIGN KEY (id_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE guarantors ADD CONSTRAINT guarantors_id_document_fk FOREIGN KEY (id_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE properties ADD CONSTRAINT properties_cover_fk FOREIGN KEY (cover_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE meter_readings ADD CONSTRAINT meter_readings_photo_fk FOREIGN KEY (photo_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE management_mandates ADD CONSTRAINT management_mandates_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE management_mandates ADD CONSTRAINT management_mandates_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE leases ADD CONSTRAINT leases_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE leases ADD CONSTRAINT leases_contract_fk FOREIGN KEY (contract_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE lease_parties ADD CONSTRAINT lease_parties_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE lease_documents ADD CONSTRAINT lease_documents_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT;
ALTER TABLE inspections ADD CONSTRAINT inspections_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE inspections ADD CONSTRAINT inspections_report_fk FOREIGN KEY (report_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE inspection_photos ADD CONSTRAINT inspection_photos_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT;
ALTER TABLE rent_invoices ADD CONSTRAINT rent_invoices_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE cash_remittances ADD CONSTRAINT cash_remittances_slip_fk FOREIGN KEY (deposit_slip_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE cash_remittances ADD CONSTRAINT cash_remittances_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE cash_receipts ADD CONSTRAINT cash_receipts_signature_fk FOREIGN KEY (signature_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE cash_receipts ADD CONSTRAINT cash_receipts_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE bank_transfer_declarations ADD CONSTRAINT bank_transfer_declarations_proof_fk FOREIGN KEY (proof_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE bank_checks ADD CONSTRAINT bank_checks_image_fk FOREIGN KEY (image_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE bank_statements ADD CONSTRAINT bank_statements_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE receipts ADD CONSTRAINT receipts_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD CONSTRAINT expenses_invoice_document_fk FOREIGN KEY (invoice_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE owner_statements ADD CONSTRAINT owner_statements_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE owner_payouts ADD CONSTRAINT owner_payouts_proof_fk FOREIGN KEY (proof_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE maintenance_updates ADD CONSTRAINT maintenance_updates_photo_fk FOREIGN KEY (photo_document_id) REFERENCES documents(id) ON DELETE SET NULL;
-- =====================================================================
-- Partie 11b : Technique — webhooks, idempotence, synchronisation offline
-- =====================================================================

CREATE TABLE webhook_events (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source                 webhook_source NOT NULL,
    event_type             TEXT NOT NULL,
    status                 webhook_status NOT NULL DEFAULT 'RECEIVED',
    external_event_id      TEXT,
    signature_header       TEXT,
    signature_valid        BOOLEAN,
    http_method            TEXT NOT NULL DEFAULT 'POST',
    request_path           TEXT,
    source_ip              INET,
    headers                JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    received_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at           TIMESTAMPTZ,
    processing_attempts    SMALLINT NOT NULL DEFAULT 0 CHECK (processing_attempts >= 0),
    error_message          TEXT,
    related_entity_type    TEXT,
    related_entity_id      UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT webhook_events_external_uk UNIQUE (source, external_event_id)
);
COMMENT ON TABLE webhook_events IS 'Notification entrante d''un partenaire (agrégateur Mobile Money, WhatsApp, passerelle SMS). Le payload brut est conservé pour audit et rejeu.';
COMMENT ON COLUMN webhook_events.organization_id IS 'Nullable : certains webhooks arrivent avant résolution du tenant ; renseigné dès identification.';
COMMENT ON COLUMN webhook_events.signature_valid IS 'Résultat de la vérification HMAC ; un webhook non signé ne confirme jamais un paiement.';
COMMENT ON COLUMN webhook_events.raw_payload IS 'Corps brut intégral reçu du partenaire.';

CREATE INDEX webhook_events_pending_idx ON webhook_events (source, received_at) WHERE status IN ('RECEIVED', 'PROCESSING');
CREATE INDEX webhook_events_org_idx ON webhook_events (organization_id, source, received_at DESC);
CREATE INDEX webhook_events_payload_gin ON webhook_events USING GIN (raw_payload jsonb_path_ops);

-- FK différée : mobile_money_transactions.webhook_event_id (déclarée en partie 07).
ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT momo_webhook_event_fk FOREIGN KEY (webhook_event_id) REFERENCES webhook_events(id) ON DELETE SET NULL;

CREATE TABLE idempotency_keys (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key                    TEXT NOT NULL,
    scope                  TEXT NOT NULL,
    user_id                UUID REFERENCES users(id) ON DELETE SET NULL,
    request_method         TEXT NOT NULL,
    request_path           TEXT NOT NULL,
    request_hash           TEXT NOT NULL,
    response_status        SMALLINT CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599),
    response_body          JSONB,
    resource_type          TEXT,
    resource_id            UUID,
    locked_at              TIMESTAMPTZ,
    completed_at           TIMESTAMPTZ,
    expires_at             TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT idempotency_keys_uk UNIQUE (organization_id, scope, key)
);
COMMENT ON TABLE idempotency_keys IS 'Registre des clés d''idempotence des écritures API (client_ref mobile, en-tête Idempotency-Key) et de la réponse rejouée.';
COMMENT ON COLUMN idempotency_keys.request_hash IS 'Empreinte du corps de requête : un même clé avec un corps différent est rejetée.';
COMMENT ON COLUMN idempotency_keys.response_body IS 'Réponse mémorisée, restituée telle quelle en cas de rejeu.';

CREATE INDEX idempotency_keys_expiry_idx ON idempotency_keys (expires_at);

CREATE TABLE sync_batches (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id              TEXT NOT NULL,
    device_platform        TEXT,
    app_version            TEXT,
    batch_ref              TEXT NOT NULL,
    status                 sync_batch_status NOT NULL DEFAULT 'RECEIVED',
    operations_count       INTEGER NOT NULL DEFAULT 0 CHECK (operations_count >= 0),
    applied_count          INTEGER NOT NULL DEFAULT 0 CHECK (applied_count >= 0),
    rejected_count         INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
    conflicts_count        INTEGER NOT NULL DEFAULT 0 CHECK (conflicts_count >= 0),
    client_generated_at    TIMESTAMPTZ,
    received_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_at             TIMESTAMPTZ,
    payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
    result                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message          TEXT,
    offline_duration_minutes INTEGER CHECK (offline_duration_minutes IS NULL OR offline_duration_minutes >= 0),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sync_batches_ref_uk UNIQUE (organization_id, device_id, batch_ref)
);
COMMENT ON TABLE sync_batches IS 'Lot d''opérations remontées par l''application mobile hors ligne (Drift/SQLite) et son résultat d''application.';
COMMENT ON COLUMN sync_batches.batch_ref IS 'ULID du lot généré sur l''appareil, clé d''idempotence de la synchronisation.';
COMMENT ON COLUMN sync_batches.conflicts_count IS 'Nombre d''opérations en conflit avec l''état serveur, à arbitrer manuellement.';
COMMENT ON COLUMN sync_batches.payload IS 'Opérations brutes envoyées par l''appareil, conservées pour rejeu et diagnostic.';

CREATE INDEX sync_batches_org_status_idx ON sync_batches (organization_id, status, received_at DESC);
CREATE INDEX sync_batches_device_idx ON sync_batches (organization_id, device_id, received_at DESC);
CREATE INDEX sync_batches_user_idx ON sync_batches (organization_id, user_id, received_at DESC);

-- FK différées vers sync_batches (colonnes sync_batch_id des parties 03c, 04c, 06a, 06b, 10a).
ALTER TABLE meter_readings ADD CONSTRAINT meter_readings_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
ALTER TABLE inspections ADD CONSTRAINT inspections_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
ALTER TABLE payments ADD CONSTRAINT payments_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
ALTER TABLE cash_receipts ADD CONSTRAINT cash_receipts_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
-- =====================================================================
-- Partie 11c : Technique — audit, feature flags — et SaaS (abonnements)
-- =====================================================================

CREATE TABLE audit_logs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_label            TEXT,
    actor_role             member_role,
    action                 audit_action NOT NULL,
    entity_type            TEXT NOT NULL,
    entity_id              UUID NOT NULL,
    previous_state         JSONB,
    new_state              JSONB,
    changed_fields         TEXT[],
    reason                 TEXT,
    ip_address             INET,
    user_agent             TEXT,
    request_id             TEXT,
    api_key_id             UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    occurred_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_logs IS 'Journal d''audit APPEND-ONLY : toute transition d''état de bail, facture, paiement ou remise y est tracée avec les états avant/après.';
COMMENT ON COLUMN audit_logs.previous_state IS 'Instantané JSONB de l''entité avant modification.';
COMMENT ON COLUMN audit_logs.new_state IS 'Instantané JSONB de l''entité après modification.';
COMMENT ON COLUMN audit_logs.request_id IS 'Corrélation avec la trace HTTP et les logs applicatifs (Sentry).';

CREATE INDEX audit_logs_entity_idx ON audit_logs (organization_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (organization_id, actor_user_id, occurred_at DESC);
CREATE INDEX audit_logs_occurred_idx ON audit_logs (organization_id, occurred_at DESC);

CREATE TABLE feature_flags (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key                    TEXT NOT NULL,
    description            TEXT,
    is_enabled             BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage     SMALLINT NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
    starts_at              TIMESTAMPTZ,
    ends_at                TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT feature_flags_period_chk CHECK (ends_at IS NULL OR starts_at IS NULL OR starts_at < ends_at)
);
COMMENT ON TABLE feature_flags IS 'Activation progressive de fonctionnalités. organization_id NULL = drapeau global appliqué à tous les tenants.';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Pourcentage de déploiement progressif quand le drapeau est global.';

CREATE UNIQUE INDEX feature_flags_org_key_uk ON feature_flags (organization_id, key) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX feature_flags_global_key_uk ON feature_flags (key) WHERE organization_id IS NULL;

CREATE TABLE subscription_plans (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                   TEXT NOT NULL,
    name                   TEXT NOT NULL,
    description            TEXT,
    billing_interval       billing_interval NOT NULL DEFAULT 'MONTHLY',
    base_price_amount      BIGINT NOT NULL DEFAULT 0 CHECK (base_price_amount >= 0),
    price_per_unit_amount  BIGINT NOT NULL DEFAULT 0 CHECK (price_per_unit_amount >= 0),
    included_units         INTEGER NOT NULL DEFAULT 0 CHECK (included_units >= 0),
    max_units              INTEGER CHECK (max_units IS NULL OR max_units >= 0),
    max_members            INTEGER CHECK (max_members IS NULL OR max_members >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    trial_days             SMALLINT NOT NULL DEFAULT 14 CHECK (trial_days >= 0),
    features               JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_public              BOOLEAN NOT NULL DEFAULT true,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    position               SMALLINT NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscription_plans_code_uk UNIQUE (code)
);
COMMENT ON TABLE subscription_plans IS 'Table GLOBALE (hors RLS) : catalogue des offres Immodesk, tarifées au lot géré.';
COMMENT ON COLUMN subscription_plans.price_per_unit_amount IS 'Prix en XAF par lot au-delà de included_units.';

CREATE TABLE subscriptions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id                UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status                 subscription_status NOT NULL DEFAULT 'TRIALING',
    billing_interval       billing_interval NOT NULL DEFAULT 'MONTHLY',
    units_count            INTEGER NOT NULL DEFAULT 0 CHECK (units_count >= 0),
    unit_price_amount      BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
    recurring_amount       BIGINT NOT NULL DEFAULT 0 CHECK (recurring_amount >= 0),
    discount_rate_bps      INTEGER NOT NULL DEFAULT 0 CHECK (discount_rate_bps BETWEEN 0 AND 10000),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    trial_ends_at          TIMESTAMPTZ,
    current_period_start   DATE NOT NULL DEFAULT CURRENT_DATE,
    current_period_end     DATE NOT NULL,
    next_billing_date      DATE,
    payment_method         payment_method NOT NULL DEFAULT 'MOBILE_MONEY',
    momo_msisdn            TEXT,
    auto_renew             BOOLEAN NOT NULL DEFAULT true,
    grace_days             SMALLINT NOT NULL DEFAULT 7 CHECK (grace_days >= 0),
    suspended_at           TIMESTAMPTZ,
    cancelled_at           TIMESTAMPTZ,
    cancellation_reason    TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscriptions_org_uk UNIQUE (organization_id),
    CONSTRAINT subscriptions_period_chk CHECK (current_period_start < current_period_end)
);
COMMENT ON TABLE subscriptions IS 'Abonnement SaaS d''une organisation : offre, volume de lots facturé, période en cours.';
COMMENT ON COLUMN subscriptions.units_count IS 'Nombre de lots actifs facturés sur la période, recalculé à chaque échéance.';
COMMENT ON COLUMN subscriptions.grace_days IS 'Jours de tolérance après échéance avant suspension de l''accès.';

CREATE INDEX subscriptions_billing_idx ON subscriptions (next_billing_date) WHERE status IN ('TRIALING', 'ACTIVE', 'PAST_DUE');

CREATE TABLE subscription_invoices (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id        UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
    invoice_number         TEXT NOT NULL,
    status                 invoice_status NOT NULL DEFAULT 'ISSUED',
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    issue_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date               DATE NOT NULL,
    units_count            INTEGER NOT NULL DEFAULT 0 CHECK (units_count >= 0),
    subtotal_amount        BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
    discount_amount        BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    vat_rate_bps           INTEGER NOT NULL DEFAULT 1800 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    vat_amount             BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount            BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    momo_transaction_id    UUID REFERENCES mobile_money_transactions(id) ON DELETE SET NULL,
    document_id            UUID REFERENCES documents(id) ON DELETE SET NULL,
    paid_at                TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscription_invoices_number_uk UNIQUE (invoice_number),
    CONSTRAINT subscription_invoices_period_uk UNIQUE (subscription_id, period_start),
    CONSTRAINT subscription_invoices_period_chk CHECK (period_start < period_end)
);
COMMENT ON TABLE subscription_invoices IS 'Facture d''abonnement Immodesk adressée à l''organisation cliente, réglée par Mobile Money ou virement.';
COMMENT ON COLUMN subscription_invoices.vat_rate_bps IS 'TVA congolaise applicable (1800 bps = 18 %).';

CREATE INDEX subscription_invoices_status_idx ON subscription_invoices (organization_id, status, due_date);
-- =====================================================================
-- Partie 11d : Programme d'apport d'affaires (parrainage)
-- Tables GLOBALES gérées par la plateforme Immodesk : elles ne portent
-- PAS de organization_id d'isolation et ne sont donc pas soumises à la
-- policy générique org_isolation (voir partie 13). Le cloisonnement se
-- fait par partenaire (app.current_user_id) ; l'administration passe par
-- le rôle immodesk_admin (BYPASSRLS).
-- Montants en BIGINT XAF, taux en points de base (bps, 10000 = 100 %).
-- =====================================================================

CREATE TABLE referral_programs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                   TEXT NOT NULL,
    name                   TEXT NOT NULL,
    description            TEXT,
    rate_bps               INTEGER NOT NULL DEFAULT 2000 CHECK (rate_bps BETWEEN 0 AND 10000),
    duration_months        SMALLINT NOT NULL DEFAULT 12 CHECK (duration_months > 0),
    min_payout_amount      BIGINT NOT NULL DEFAULT 5000 CHECK (min_payout_amount >= 0),
    monthly_cap_amount     BIGINT CHECK (monthly_cap_amount IS NULL OR monthly_cap_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    valid_from             DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to               DATE,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referral_programs_code_uk UNIQUE (code),
    CONSTRAINT referral_programs_validity_chk CHECK (valid_to IS NULL OR valid_from < valid_to)
);
COMMENT ON TABLE referral_programs IS 'Table GLOBALE : barèmes du programme d''apport d''affaires définis par la plateforme (taux, durée, plafond). Un referral est figé sur le programme en vigueur à son rattachement.';
COMMENT ON COLUMN referral_programs.code IS 'Code lisible du barème (ex. DEMARCHEUR_2026), unique et stable : sert de référence dans les CGU partenaires.';
COMMENT ON COLUMN referral_programs.rate_bps IS 'Taux de commission en points de base appliqué au montant encaissé de chaque subscription_invoice (2000 bps = 20 %).';
COMMENT ON COLUMN referral_programs.duration_months IS 'Durée en mois pendant laquelle les factures d''abonnement du filleul génèrent une commission, à compter de la qualification.';
COMMENT ON COLUMN referral_programs.min_payout_amount IS 'Seuil minimum de versement en XAF : les commissions APPROVED s''accumulent tant que le total reste sous ce seuil.';
COMMENT ON COLUMN referral_programs.monthly_cap_amount IS 'Plafond mensuel de commission par partenaire en XAF (règle anti-abus) ; NULL = pas de plafond.';
COMMENT ON COLUMN referral_programs.valid_to IS 'Dernier jour d''éligibilité de nouveaux parrainages ; les referrals déjà rattachés vont au terme de leur durée.';

CREATE INDEX referral_programs_active_idx ON referral_programs (is_active, valid_from DESC);

CREATE TABLE referral_partners (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    partner_code           TEXT NOT NULL,
    status                 referral_partner_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    organization_id        UUID REFERENCES organizations(id) ON DELETE SET NULL,
    display_name           TEXT,
    id_document_type       id_document_type,
    id_document_number     TEXT,
    id_document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,
    payout_momo_provider   momo_provider,
    payout_msisdn          TEXT,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    verified_at            TIMESTAMPTZ,
    verified_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    suspended_at           TIMESTAMPTZ,
    suspension_reason      TEXT,
    total_accrued_amount   BIGINT NOT NULL DEFAULT 0 CHECK (total_accrued_amount >= 0),
    total_paid_amount      BIGINT NOT NULL DEFAULT 0 CHECK (total_paid_amount >= 0),
    accepted_terms_at      TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referral_partners_user_uk UNIQUE (user_id),
    CONSTRAINT referral_partners_code_uk UNIQUE (partner_code),
    CONSTRAINT referral_partners_code_chk CHECK (partner_code ~ '^IMD-[A-Z0-9]{6}$'),
    CONSTRAINT referral_partners_msisdn_chk CHECK (payout_msisdn IS NULL OR payout_msisdn ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT referral_partners_payout_chk CHECK (
        (payout_msisdn IS NULL AND payout_momo_provider IS NULL) OR
        (payout_msisdn IS NOT NULL AND payout_momo_provider IS NOT NULL)),
    CONSTRAINT referral_partners_verified_chk CHECK (
        status <> 'ACTIVE' OR (verified_at IS NOT NULL AND payout_msisdn IS NOT NULL)),
    CONSTRAINT referral_partners_totals_chk CHECK (total_paid_amount <= total_accrued_amount)
);
COMMENT ON TABLE referral_partners IS 'Table GLOBALE : apporteur d''affaires (démarcheur en priorité) identifié par un code unique. Un compte utilisateur = au plus un partenaire. Vérification d''identité légère (CNI + numéro Mobile Money) obligatoire avant tout versement.';
COMMENT ON COLUMN referral_partners.user_id IS 'Compte utilisateur global du partenaire ; unique (un utilisateur ne peut détenir qu''un seul code).';
COMMENT ON COLUMN referral_partners.partner_code IS 'Code de parrainage communiqué aux prospects, format IMD-XXXXXX (6 caractères A-Z0-9, sans ambiguïté visuelle).';
COMMENT ON COLUMN referral_partners.organization_id IS 'Organisation propre du partenaire (son espace gestionnaire INDEPENDENT_MANAGER) quand il en a une. Sert la règle anti-abus : il ne peut pas parrainer sa propre organisation.';
COMMENT ON COLUMN referral_partners.id_document_number IS 'Numéro de la pièce d''identité, contrôlé manuellement par la plateforme avant passage en ACTIVE.';
COMMENT ON COLUMN referral_partners.payout_momo_provider IS 'Opérateur Mobile Money de versement (MTN MoMo, Airtel Money) ou agrégateur.';
COMMENT ON COLUMN referral_partners.payout_msisdn IS 'Numéro Mobile Money de versement au format E.164 (+242...), au nom du partenaire.';
COMMENT ON COLUMN referral_partners.verified_by_user_id IS 'Administrateur plateforme ayant validé la pièce d''identité et le numéro de versement.';
COMMENT ON COLUMN referral_partners.total_accrued_amount IS 'Cumul en XAF des commissions constatées (dénormalisation de referral_commissions, recalculée par lot de contrôle).';
COMMENT ON COLUMN referral_partners.total_paid_amount IS 'Cumul en XAF des commissions effectivement versées par Mobile Money.';

CREATE INDEX referral_partners_status_idx ON referral_partners (status, created_at DESC);
CREATE INDEX referral_partners_org_idx ON referral_partners (organization_id) WHERE organization_id IS NOT NULL;

CREATE TABLE referrals (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id                UUID NOT NULL REFERENCES referral_partners(id) ON DELETE RESTRICT,
    referred_organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    referred_property_id      UUID REFERENCES properties(id) ON DELETE SET NULL,
    program_id                UUID NOT NULL REFERENCES referral_programs(id) ON DELETE RESTRICT,
    source                    referral_source NOT NULL DEFAULT 'CODE_AT_SIGNUP',
    status                    referral_status NOT NULL DEFAULT 'PENDING',
    code_used                 TEXT,
    confirmed_by_otp_at       TIMESTAMPTZ,
    qualified_at              TIMESTAMPTZ,
    activated_at              TIMESTAMPTZ,
    expires_at                TIMESTAMPTZ,
    cancelled_at              TIMESTAMPTZ,
    cancellation_reason       TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referrals_org_uk UNIQUE (referred_organization_id),
    CONSTRAINT referrals_otp_chk CHECK (
        source <> 'PARTNER_REGISTERED_PROPERTY'
        OR status IN ('PENDING', 'CANCELLED')
        OR confirmed_by_otp_at IS NOT NULL),
    CONSTRAINT referrals_qualified_chk CHECK (
        status NOT IN ('QUALIFIED', 'ACTIVE', 'EXPIRED') OR qualified_at IS NOT NULL),
    CONSTRAINT referrals_cancelled_chk CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
);
COMMENT ON TABLE referrals IS 'Table GLOBALE : rattachement d''une organisation cliente à un apporteur d''affaires. Une organisation n''a qu''UN SEUL parrain (contrainte referrals_org_uk) et le parrainage est définitif.';
COMMENT ON COLUMN referrals.referred_organization_id IS 'Organisation filleule (bailleur ou gestionnaire). UNIQUE : une organisation ne peut être parrainée qu''une fois, à vie.';
COMMENT ON COLUMN referrals.referred_property_id IS 'Immeuble enregistré par le partenaire quand source = PARTNER_REGISTERED_PROPERTY ; sert de preuve de l''apport.';
COMMENT ON COLUMN referrals.program_id IS 'Barème figé au rattachement : une modification ultérieure de referral_programs ne rétroagit pas.';
COMMENT ON COLUMN referrals.code_used IS 'Code saisi par le filleul à l''inscription, conservé tel quel (traçabilité même si le partenaire change de code).';
COMMENT ON COLUMN referrals.confirmed_by_otp_at IS 'Confirmation du bailleur par OTP quand l''apport résulte d''un immeuble enregistré par le partenaire : obligatoire avant qualification.';
COMMENT ON COLUMN referrals.qualified_at IS 'Date de qualification (filleul confirmé) : point de départ de la fenêtre de commissionnement.';
COMMENT ON COLUMN referrals.activated_at IS 'Date de la première facture d''abonnement réellement encaissée.';
COMMENT ON COLUMN referrals.expires_at IS 'Fin de la fenêtre de commissionnement = qualified_at + programme.duration_months.';
COMMENT ON CONSTRAINT referrals_org_uk ON referrals IS 'Règle anti-abus : une organisation n''a qu''un seul parrain.';

-- Règle anti-auto-parrainage : referred_organization_id ne doit jamais être
-- égal à referral_partners.organization_id du parrain. Cette vérification est
-- inter-tables, donc impossible en CHECK (non déterministe) : elle est portée
-- par le trigger forbid_self_referral() (partie 12) et doublée d'un contrôle
-- applicatif à l'inscription.

CREATE INDEX referrals_partner_status_idx ON referrals (partner_id, status);
CREATE INDEX referrals_org_idx ON referrals (referred_organization_id);
CREATE INDEX referrals_program_idx ON referrals (program_id, status);
CREATE INDEX referrals_expiry_idx ON referrals (expires_at) WHERE status IN ('QUALIFIED', 'ACTIVE');

CREATE TABLE referral_commissions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id              UUID NOT NULL REFERENCES referrals(id) ON DELETE RESTRICT,
    partner_id               UUID NOT NULL REFERENCES referral_partners(id) ON DELETE RESTRICT,
    subscription_invoice_id  UUID NOT NULL REFERENCES subscription_invoices(id) ON DELETE RESTRICT,
    base_amount              BIGINT NOT NULL CHECK (base_amount >= 0),
    rate_bps                 INTEGER NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
    commission_amount        BIGINT NOT NULL CHECK (commission_amount >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    status                   referral_commission_status NOT NULL DEFAULT 'ACCRUED',
    period_month             DATE,
    accrued_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at              TIMESTAMPTZ,
    approved_by_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    paid_at                  TIMESTAMPTZ,
    payout_id                UUID,
    reversal_of_id           UUID REFERENCES referral_commissions(id) ON DELETE RESTRICT,
    reason                   TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referral_commissions_reversal_chk CHECK (reversal_of_id IS NULL OR reversal_of_id <> id),
    CONSTRAINT referral_commissions_approved_chk CHECK (status <> 'APPROVED' OR approved_at IS NOT NULL),
    CONSTRAINT referral_commissions_paid_chk CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND payout_id IS NOT NULL))
);
COMMENT ON TABLE referral_commissions IS 'Table GLOBALE et FINANCIÈRE : commission due à un partenaire sur une facture d''abonnement RÉELLEMENT ENCAISSÉE. Colonnes financières verrouillées et DELETE interdit (trigger guard_financial_row) ; toute correction se fait par contre-passation (reversal_of_id).';
COMMENT ON COLUMN referral_commissions.subscription_invoice_id IS 'Facture d''abonnement encaissée qui déclenche la commission. Une seule commission d''origine par facture (index unique partiel) ; la contre-passation référence la même facture.';
COMMENT ON COLUMN referral_commissions.base_amount IS 'Assiette en XAF = montant hors taxe réellement encaissé de la facture d''abonnement.';
COMMENT ON COLUMN referral_commissions.rate_bps IS 'Taux figé au moment de la constatation, recopié du programme du referral.';
COMMENT ON COLUMN referral_commissions.commission_amount IS 'base_amount * rate_bps / 10000, arrondi à l''unité XAF inférieure. Négatif impossible : une contre-passation porte le même montant avec status REVERSED.';
COMMENT ON COLUMN referral_commissions.period_month IS 'Premier jour du mois d''imputation, utilisé pour le plafond mensuel du programme.';
COMMENT ON COLUMN referral_commissions.payout_id IS 'Versement Mobile Money qui a réglé cette commission ; renseigné au passage en PAID (colonne de workflow, modifiable).';
COMMENT ON COLUMN referral_commissions.reversal_of_id IS 'Commission d''origine contre-passée lorsque la facture d''abonnement est remboursée ou annulée.';
COMMENT ON COLUMN referral_commissions.reason IS 'Motif de l''annulation, de la contre-passation ou du rejet (plafond mensuel atteint, fraude constatée).';

CREATE UNIQUE INDEX referral_commissions_invoice_uk
    ON referral_commissions (subscription_invoice_id) WHERE reversal_of_id IS NULL;
CREATE UNIQUE INDEX referral_commissions_reversal_uk
    ON referral_commissions (reversal_of_id) WHERE reversal_of_id IS NOT NULL;
CREATE INDEX referral_commissions_partner_status_idx ON referral_commissions (partner_id, status, accrued_at DESC);
CREATE INDEX referral_commissions_invoice_idx ON referral_commissions (subscription_invoice_id);
CREATE INDEX referral_commissions_referral_idx ON referral_commissions (referral_id, accrued_at DESC);
CREATE INDEX referral_commissions_payout_idx ON referral_commissions (payout_id) WHERE payout_id IS NOT NULL;

CREATE TABLE referral_payouts (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id             UUID NOT NULL REFERENCES referral_partners(id) ON DELETE RESTRICT,
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    status                 payout_status NOT NULL DEFAULT 'PENDING',
    momo_provider          momo_provider,
    msisdn                 TEXT,
    external_reference     TEXT,
    momo_transaction_id    UUID REFERENCES mobile_money_transactions(id) ON DELETE SET NULL,
    requested_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at            TIMESTAMPTZ,
    approved_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    paid_at                TIMESTAMPTZ,
    failure_reason         TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referral_payouts_period_chk CHECK (period_start <= period_end),
    CONSTRAINT referral_payouts_msisdn_chk CHECK (msisdn IS NULL OR msisdn ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT referral_payouts_paid_chk CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND msisdn IS NOT NULL)),
    CONSTRAINT referral_payouts_failed_chk CHECK (status <> 'FAILED' OR failure_reason IS NOT NULL)
);
COMMENT ON TABLE referral_payouts IS 'Table GLOBALE : versement Mobile Money d''un lot de commissions APPROVED à un partenaire, sur une période. Déclenché quand le cumul atteint referral_programs.min_payout_amount.';
COMMENT ON COLUMN referral_payouts.period_start IS 'Début de la période couverte par le lot de commissions réglées.';
COMMENT ON COLUMN referral_payouts.total_amount IS 'Somme en XAF des commission_amount rattachées (referral_commissions.payout_id).';
COMMENT ON COLUMN referral_payouts.msisdn IS 'Numéro Mobile Money crédité, au format E.164, recopié de referral_partners.payout_msisdn au moment de la demande.';
COMMENT ON COLUMN referral_payouts.external_reference IS 'Référence de la transaction chez l''opérateur ou l''agrégateur, pour rapprochement et contestation.';
COMMENT ON COLUMN referral_payouts.momo_transaction_id IS 'Transaction Mobile Money sortante associée, quand le versement passe par l''agrégateur intégré.';
COMMENT ON COLUMN referral_payouts.failure_reason IS 'Motif d''échec renvoyé par l''opérateur (numéro inconnu, compte plafonné, solde émetteur insuffisant).';

CREATE INDEX referral_payouts_partner_status_idx ON referral_payouts (partner_id, status, requested_at DESC);
CREATE INDEX referral_payouts_period_idx ON referral_payouts (period_start, period_end);

-- FK différée : referral_commissions.payout_id (déclarée plus haut, la table
-- referral_payouts n'existant pas encore à ce moment).
ALTER TABLE referral_commissions
    ADD CONSTRAINT referral_commissions_payout_fk
    FOREIGN KEY (payout_id) REFERENCES referral_payouts(id) ON DELETE SET NULL;
-- =====================================================================
-- Partie 12 : Fonctions et déclencheurs
-- =====================================================================

-- ---------------------------------------------------------------------
-- Horodatage automatique
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION set_updated_at() IS 'Positionne updated_at à now() avant chaque UPDATE. Attaché à toutes les tables portant updated_at.';

-- Attachement générique : une fois pour toutes les tables du schéma public
-- possédant une colonne updated_at.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND c.column_name = 'updated_at'
          AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_set_updated_at BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()', r.table_name);
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- Tables append-only (écritures financières et audit)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_update_delete() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'Table % en append-only : % interdit. Toute correction passe par une écriture de contre-passation.',
        TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$;
COMMENT ON FUNCTION forbid_update_delete() IS 'Interdit UPDATE et DELETE sur les tables financières et d''audit : la correction se fait par contre-passation (reversal_of_id).';

CREATE TRIGGER trg_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();

CREATE TRIGGER trg_payment_allocations_append_only
    BEFORE UPDATE OR DELETE ON payment_allocations
    FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();

-- ---------------------------------------------------------------------
-- Tables financières à colonnes verrouillées (payments, receipts, cash_receipts)
-- DELETE interdit. UPDATE autorisé uniquement sur les colonnes de workflow
-- (statut, dates de confirmation/rejet/annulation, montants imputés, liens
-- vers documents et remises). Les colonnes financières listées en argument
-- du trigger sont « set-once » : une fois non nulles, elles ne changent plus.
-- Toute correction d'un montant passe par une contre-passation (reversal_of_id).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_financial_row() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_col TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Table % : DELETE interdit. Toute correction passe par une contre-passation.',
            TG_TABLE_NAME
            USING ERRCODE = 'restrict_violation';
    END IF;

    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);

    FOREACH v_col IN ARRAY TG_ARGV LOOP
        IF (v_old -> v_col) IS NOT NULL
           AND jsonb_typeof(v_old -> v_col) <> 'null'
           AND (v_old -> v_col) IS DISTINCT FROM (v_new -> v_col) THEN
            RAISE EXCEPTION
                'Table % : la colonne % est verrouillée (valeur financière). Correction par contre-passation uniquement.',
                TG_TABLE_NAME, v_col
                USING ERRCODE = 'restrict_violation';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION guard_financial_row() IS 'Interdit DELETE et verrouille (set-once) les colonnes financières passées en argument ; les colonnes de workflow restent modifiables.';

CREATE TRIGGER trg_payments_guard
    BEFORE UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION guard_financial_row(
        'organization_id', 'tenant_id', 'lease_id', 'landlord_id', 'direction',
        'method', 'reference', 'amount', 'currency', 'payment_date',
        'received_by_user_id', 'client_ref', 'reversal_of_id', 'created_at');

CREATE TRIGGER trg_receipts_guard
    BEFORE UPDATE OR DELETE ON receipts
    FOR EACH ROW EXECUTE FUNCTION guard_financial_row(
        'organization_id', 'payment_id', 'invoice_id', 'tenant_id', 'receipt_number',
        'period_start', 'period_end', 'issue_date', 'rent_amount', 'charges_amount',
        'penalty_amount', 'total_amount', 'currency', 'verification_token',
        'content_hash', 'created_at');

-- Commissions d'apport d'affaires : même régime financier que payments.
-- Colonnes de workflow restant modifiables : status, approved_at,
-- approved_by_user_id, paid_at, payout_id, period_month, reason, updated_at.
CREATE TRIGGER trg_referral_commissions_guard
    BEFORE UPDATE OR DELETE ON referral_commissions
    FOR EACH ROW EXECUTE FUNCTION guard_financial_row(
        'referral_id', 'partner_id', 'subscription_invoice_id', 'base_amount',
        'rate_bps', 'commission_amount', 'accrued_at', 'reversal_of_id', 'created_at');

CREATE TRIGGER trg_cash_receipts_guard
    BEFORE UPDATE OR DELETE ON cash_receipts
    FOR EACH ROW EXECUTE FUNCTION guard_financial_row(
        'organization_id', 'payment_id', 'lease_id', 'tenant_id', 'collector_user_id',
        'receipt_number', 'amount', 'currency', 'received_at', 'payer_name',
        'signature_document_id', 'signature_hash', 'client_ref', 'reversal_of_id',
        'created_at');

-- ---------------------------------------------------------------------
-- Numérotation séquentielle atomique
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_sequence(p_org UUID, p_kind TEXT, p_period TEXT DEFAULT '')
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    v_next BIGINT;
BEGIN
    IF p_org IS NULL OR p_kind IS NULL THEN
        RAISE EXCEPTION 'next_sequence : organisation et nature obligatoires'
            USING ERRCODE = 'null_value_not_allowed';
    END IF;

    INSERT INTO sequences (organization_id, kind, period, last_value)
    VALUES (p_org, p_kind, coalesce(p_period, ''), 1)
    ON CONFLICT (organization_id, kind, period)
    DO UPDATE SET last_value = sequences.last_value + 1,
                  updated_at = now()
    RETURNING last_value INTO v_next;

    RETURN v_next;
END;
$$;
COMMENT ON FUNCTION next_sequence(UUID, TEXT, TEXT) IS
    'Réserve atomiquement le numéro suivant pour (organisation, nature, période) via INSERT ... ON CONFLICT DO UPDATE RETURNING. Alimente LOY-{YYYYMM}-{seq}, QUI-{YYYYMM}-{seq}, CASH-{org}-{collector}-{seq}.';

-- ---------------------------------------------------------------------
-- Formatage d'un numéro de document à partir de la séquence
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION format_sequence_number(p_prefix TEXT, p_period TEXT, p_value BIGINT, p_padding SMALLINT DEFAULT 5)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT concat_ws('-', p_prefix, nullif(p_period, ''), lpad(p_value::TEXT, greatest(p_padding, 1), '0'));
$$;
COMMENT ON FUNCTION format_sequence_number(TEXT, TEXT, BIGINT, SMALLINT) IS
    'Compose un numéro de document lisible : format_sequence_number(''LOY'', ''202603'', 42, 5) -> LOY-202603-00042.';

-- ---------------------------------------------------------------------
-- Apport d'affaires : interdiction de l'auto-parrainage
-- Un partenaire ne peut pas parrainer sa propre organisation. La règle est
-- inter-tables (referrals -> referral_partners.organization_id), donc hors
-- de portée d'une contrainte CHECK : elle est portée par ce déclencheur.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_self_referral() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_partner_org UUID;
    v_partner_code TEXT;
BEGIN
    SELECT p.organization_id, p.partner_code
      INTO v_partner_org, v_partner_code
      FROM referral_partners p
     WHERE p.id = NEW.partner_id;

    IF v_partner_org IS NOT NULL AND v_partner_org = NEW.referred_organization_id THEN
        RAISE EXCEPTION
            'Auto-parrainage interdit : le partenaire % ne peut pas parrainer sa propre organisation (%).',
            coalesce(v_partner_code, NEW.partner_id::TEXT), NEW.referred_organization_id
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION forbid_self_referral() IS 'Règle anti-abus : rejette tout referral dont l''organisation filleule est l''organisation propre du partenaire.';

CREATE TRIGGER trg_referrals_no_self_referral
    BEFORE INSERT OR UPDATE OF partner_id, referred_organization_id ON referrals
    FOR EACH ROW EXECUTE FUNCTION forbid_self_referral();
-- =====================================================================
-- Partie 13 : Row Level Security — isolation multi-tenant
-- L'API positionne `SET LOCAL app.current_organization_id = '<uuid>'`
-- au début de chaque transaction, sous le rôle immodesk_app.
-- =====================================================================

-- Droits du rôle applicatif.
GRANT USAGE ON SCHEMA public TO immodesk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO immodesk_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO immodesk_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO immodesk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO immodesk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO immodesk_app;

-- Activation du RLS et policy org_isolation sur toute table portant organization_id.
DO $$
DECLARE
    r RECORD;
    v_using TEXT;
BEGIN
    FOR r IN
        SELECT c.table_name, c.is_nullable
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND c.column_name = 'organization_id'
          AND t.table_type = 'BASE TABLE'
          -- Les tables du programme d'apport d'affaires sont GLOBALES : leur
          -- éventuel organization_id désigne l'organisation propre du
          -- partenaire, pas un tenant propriétaire de la ligne. Elles portent
          -- leurs propres policies (partner_self) plus bas.
          AND c.table_name NOT LIKE 'referral%'
        ORDER BY c.table_name
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.table_name);

        -- Les tables dont organization_id est nullable portent aussi des lignes
        -- globales (drapeaux système, webhooks non encore rattachés à un tenant).
        IF r.is_nullable = 'YES' THEN
            v_using := '(organization_id IS NULL OR organization_id = current_setting(''app.current_organization_id'', true)::uuid)';
        ELSE
            v_using := '(organization_id = current_setting(''app.current_organization_id'', true)::uuid)';
        END IF;

        EXECUTE format(
            'CREATE POLICY org_isolation ON %I
                 AS PERMISSIVE FOR ALL TO immodesk_app
                 USING %s WITH CHECK %s',
            r.table_name, v_using, v_using);
    END LOOP;
END;
$$;

-- organizations ne porte pas de colonne organization_id : l'isolation se fait
-- sur sa clé primaire.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON organizations
    AS PERMISSIVE FOR ALL TO immodesk_app
    USING (id = current_setting('app.current_organization_id', true)::uuid)
    WITH CHECK (id = current_setting('app.current_organization_id', true)::uuid);
COMMENT ON POLICY org_isolation ON organizations IS
    'Isolation multi-tenant : une transaction ne voit que l''organisation positionnée dans app.current_organization_id.';

-- Tables globales : pas de organization_id, donc pas de RLS d'isolation.
-- users, user_credentials, otp_codes, refresh_tokens et subscription_plans
-- restent accessibles au rôle applicatif, l'autorisation étant assurée
-- par la couche applicative (JWT + organization_members).

-- feature_flags : lecture des drapeaux globaux autorisée à tous les tenants,
-- écriture réservée aux drapeaux du tenant courant.
CREATE POLICY global_flags_readonly ON feature_flags
    AS RESTRICTIVE FOR UPDATE TO immodesk_app
    USING (organization_id IS NOT NULL);
CREATE POLICY global_flags_no_delete ON feature_flags
    AS RESTRICTIVE FOR DELETE TO immodesk_app
    USING (organization_id IS NOT NULL);

COMMENT ON POLICY org_isolation ON organization_settings IS
    'Isolation multi-tenant : une transaction ne voit que les lignes de l''organisation positionnée dans app.current_organization_id.';

-- =====================================================================
-- Programme d'apport d'affaires : tables GLOBALES, cloisonnées par partenaire
-- L'API positionne `SET LOCAL app.current_user_id = '<uuid>'` en plus de
-- app.current_organization_id. Le partenaire ne voit que SES lignes ; toute
-- opération d'administration (constatation, approbation, versement,
-- vérification d'identité, gestion des barèmes) passe par immodesk_admin.
-- =====================================================================

-- Rôle d'administration plateforme : hors RLS (BYPASSRLS), réservé aux
-- travaux de back-office Immodesk et aux jobs de commissionnement.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'immodesk_admin') THEN
        CREATE ROLE immodesk_admin NOLOGIN BYPASSRLS;
    END IF;
END
$$;
COMMENT ON ROLE immodesk_admin IS 'Rôle back-office Immodesk : BYPASSRLS, utilisé par la console d''administration et les jobs de commissionnement / versement du programme d''apport d''affaires.';

GRANT USAGE ON SCHEMA public TO immodesk_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO immodesk_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO immodesk_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO immodesk_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO immodesk_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO immodesk_admin;

ALTER TABLE referral_programs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_partners    ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts     ENABLE ROW LEVEL SECURITY;

-- Barèmes : lecture publique des programmes actifs, écriture réservée à
-- immodesk_admin (aucune policy INSERT/UPDATE/DELETE pour immodesk_app).
CREATE POLICY active_programs_readonly ON referral_programs
    AS PERMISSIVE FOR SELECT TO immodesk_app
    USING (is_active AND valid_from <= CURRENT_DATE
           AND (valid_to IS NULL OR valid_to >= CURRENT_DATE));
COMMENT ON POLICY active_programs_readonly ON referral_programs IS
    'Lecture publique des barèmes en vigueur (affichage des conditions du programme) ; toute écriture passe par immodesk_admin.';

-- Fiche partenaire : chaque utilisateur ne voit et ne gère que la sienne.
CREATE POLICY partner_self ON referral_partners
    AS PERMISSIVE FOR ALL TO immodesk_app
    USING (user_id = current_setting('app.current_user_id', true)::uuid)
    WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);
COMMENT ON POLICY partner_self ON referral_partners IS
    'Un utilisateur ne voit que sa propre fiche partenaire. La vérification d''identité (verified_at, status ACTIVE) est appliquée par immodesk_admin.';

-- Parrainages : visibles et créés par le partenaire lui-même (saisie du code
-- à l'inscription du filleul, enregistrement d'un immeuble apporté).
CREATE POLICY partner_self ON referrals
    AS PERMISSIVE FOR ALL TO immodesk_app
    USING (partner_id = (SELECT id FROM referral_partners
                          WHERE user_id = current_setting('app.current_user_id', true)::uuid))
    WITH CHECK (partner_id = (SELECT id FROM referral_partners
                               WHERE user_id = current_setting('app.current_user_id', true)::uuid));
COMMENT ON POLICY partner_self ON referrals IS
    'Cloisonnement par partenaire : un apporteur ne voit que ses filleuls. L''unicité du parrain et l''interdiction d''auto-parrainage sont assurées par referrals_org_uk et le trigger forbid_self_referral.';

-- Commissions : LECTURE SEULE pour le partenaire. Constatation, approbation
-- et contre-passation sont des écritures financières réservées à immodesk_admin.
CREATE POLICY partner_self ON referral_commissions
    AS PERMISSIVE FOR SELECT TO immodesk_app
    USING (partner_id = (SELECT id FROM referral_partners
                          WHERE user_id = current_setting('app.current_user_id', true)::uuid));
COMMENT ON POLICY partner_self ON referral_commissions IS
    'Le partenaire consulte ses commissions ; il ne peut ni les créer ni les modifier (écritures financières réservées à immodesk_admin, colonnes verrouillées par guard_financial_row).';

-- Versements : LECTURE SEULE pour le partenaire (suivi de ses paiements MoMo).
CREATE POLICY partner_self ON referral_payouts
    AS PERMISSIVE FOR SELECT TO immodesk_app
    USING (partner_id = (SELECT id FROM referral_partners
                          WHERE user_id = current_setting('app.current_user_id', true)::uuid));
COMMENT ON POLICY partner_self ON referral_payouts IS
    'Le partenaire suit ses versements Mobile Money ; l''ordonnancement et l''exécution des paiements relèvent d''immodesk_admin.';
-- =====================================================================
-- Partie 14 : Vues de pilotage
-- security_invoker = true : le RLS du rôle appelant s'applique aux vues.
-- =====================================================================

CREATE OR REPLACE VIEW v_unpaid_invoices WITH (security_invoker = true) AS
SELECT
    i.organization_id,
    i.id                          AS invoice_id,
    i.invoice_number,
    i.status,
    i.period_start,
    i.period_end,
    i.due_date,
    i.grace_until_date,
    GREATEST(0, (CURRENT_DATE - i.due_date))::INTEGER AS days_overdue,
    i.total_amount,
    i.paid_amount,
    i.balance_amount,
    i.penalty_amount,
    i.currency,
    i.lease_id,
    l.reference                   AS lease_reference,
    i.tenant_id,
    coalesce(t.company_name, concat_ws(' ', t.first_name, t.last_name)) AS tenant_name,
    t.primary_phone               AS tenant_phone,
    i.unit_id,
    u.code                        AS unit_code,
    i.property_id,
    p.name                        AS property_name,
    p.district,
    p.city,
    i.landlord_id,
    l.collector_user_id
FROM rent_invoices i
JOIN leases     l ON l.id = i.lease_id
JOIN tenants    t ON t.id = i.tenant_id
JOIN units      u ON u.id = i.unit_id
JOIN properties p ON p.id = i.property_id
WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
  AND i.balance_amount > 0;
COMMENT ON VIEW v_unpaid_invoices IS 'Factures de loyer restant dues, avec ancienneté de la créance et coordonnées du locataire — socle des relances et du tableau des impayés.';

CREATE OR REPLACE VIEW v_tenant_balances WITH (security_invoker = true) AS
SELECT
    t.organization_id,
    t.id                                        AS tenant_id,
    coalesce(t.company_name, concat_ws(' ', t.first_name, t.last_name)) AS tenant_name,
    t.primary_phone,
    coalesce(lz.active_leases_count, 0)                                 AS active_leases_count,
    coalesce(iv.invoiced_amount, 0)::BIGINT                             AS invoiced_amount,
    coalesce(iv.paid_amount, 0)::BIGINT                                 AS paid_amount,
    coalesce(iv.due_amount, 0)::BIGINT                                  AS due_amount,
    coalesce(cd.credit_amount, 0)::BIGINT                               AS credit_amount,
    (coalesce(iv.due_amount, 0) - coalesce(cd.credit_amount, 0))::BIGINT AS net_balance_amount,
    'XAF'::CHAR(3)                                                      AS currency,
    iv.oldest_unpaid_due_date,
    iv.last_unpaid_due_date,
    CASE WHEN iv.oldest_unpaid_due_date IS NOT NULL
         THEN (CURRENT_DATE - iv.oldest_unpaid_due_date)::INTEGER
         ELSE 0 END                                                     AS max_days_overdue
FROM tenants t
LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE l.status = 'ACTIVE') AS active_leases_count
    FROM leases l
    WHERE l.primary_tenant_id = t.id AND l.deleted_at IS NULL
) lz ON true
LEFT JOIN LATERAL (
    SELECT sum(i.total_amount)                            AS invoiced_amount,
           sum(i.paid_amount)                             AS paid_amount,
           sum(i.balance_amount)                          AS due_amount,
           min(i.due_date) FILTER (WHERE i.balance_amount > 0) AS oldest_unpaid_due_date,
           max(i.due_date) FILTER (WHERE i.balance_amount > 0) AS last_unpaid_due_date
    FROM rent_invoices i
    WHERE i.tenant_id = t.id AND i.status <> 'CANCELLED'
) iv ON true
LEFT JOIN LATERAL (
    SELECT sum(tc.remaining_amount) AS credit_amount
    FROM tenant_credits tc
    WHERE tc.tenant_id = t.id AND tc.status IN ('OPEN', 'PARTIALLY_USED')
) cd ON true
WHERE t.deleted_at IS NULL;
COMMENT ON VIEW v_tenant_balances IS 'Solde consolidé par locataire : facturé, encaissé, restant dû et avoirs disponibles.';

CREATE OR REPLACE VIEW v_collector_cash_positions WITH (security_invoker = true) AS
SELECT
    cr.organization_id,
    cr.collector_user_id,
    concat_ws(' ', us.first_name, us.last_name)                          AS collector_name,
    us.phone_e164                                                        AS collector_phone,
    om.collector_zone,
    om.cash_limit_amount,
    count(*) FILTER (WHERE cr.status = 'ISSUED' AND cr.remittance_id IS NULL)          AS open_receipts_count,
    coalesce(sum(cr.amount) FILTER (WHERE cr.status = 'ISSUED' AND cr.remittance_id IS NULL), 0)::BIGINT AS cash_on_hand_amount,
    coalesce(sum(cr.amount) FILTER (WHERE cr.status = 'REMITTED'), 0)::BIGINT          AS remitted_amount,
    coalesce(sum(cr.amount) FILTER (WHERE cr.received_at::date = CURRENT_DATE), 0)::BIGINT AS collected_today_amount,
    'XAF'::CHAR(3)                                                       AS currency,
    max(cr.received_at)                                                  AS last_collection_at,
    orem.id                                                              AS open_remittance_id,
    orem.opened_at                                                       AS open_remittance_opened_at
FROM cash_receipts cr
JOIN users us ON us.id = cr.collector_user_id
LEFT JOIN organization_members om
       ON om.user_id = cr.collector_user_id AND om.organization_id = cr.organization_id
LEFT JOIN cash_remittances orem
       ON orem.organization_id = cr.organization_id
      AND orem.collector_user_id = cr.collector_user_id
      AND orem.status = 'OPEN'
WHERE cr.status <> 'CANCELLED'
GROUP BY cr.organization_id, cr.collector_user_id, us.first_name, us.last_name, us.phone_e164,
         om.collector_zone, om.cash_limit_amount, orem.id, orem.opened_at;
COMMENT ON VIEW v_collector_cash_positions IS 'Encaisse détenue par chaque démarcheur : reçus non reversés, montant du jour et remise ouverte en cours.';

CREATE OR REPLACE VIEW v_owner_monthly_summary WITH (security_invoker = true) AS
SELECT
    i.organization_id,
    i.landlord_id,
    coalesce(ld.company_name, concat_ws(' ', ld.first_name, ld.last_name)) AS landlord_name,
    date_trunc('month', i.period_start)::date                             AS period_month,
    count(DISTINCT i.property_id)                                          AS properties_count,
    count(DISTINCT i.unit_id)                                              AS units_invoiced_count,
    count(DISTINCT i.lease_id)                                             AS leases_count,
    coalesce(sum(i.rent_amount), 0)::BIGINT                                AS rent_invoiced_amount,
    coalesce(sum(i.charges_amount), 0)::BIGINT                             AS charges_invoiced_amount,
    coalesce(sum(i.penalty_amount), 0)::BIGINT                             AS penalty_invoiced_amount,
    coalesce(sum(i.total_amount), 0)::BIGINT                               AS total_invoiced_amount,
    coalesce(sum(i.paid_amount), 0)::BIGINT                                AS total_collected_amount,
    coalesce(sum(i.balance_amount), 0)::BIGINT                             AS total_outstanding_amount,
    CASE WHEN sum(i.total_amount) > 0
         THEN round(sum(i.paid_amount)::numeric * 10000 / sum(i.total_amount))::INTEGER
         ELSE NULL END                                                     AS collection_rate_bps,
    coalesce(cm.commission_amount, 0)::BIGINT                              AS commission_amount,
    coalesce(ex.expenses_amount, 0)::BIGINT                                AS expenses_amount,
    (coalesce(sum(i.paid_amount), 0) - coalesce(cm.commission_amount, 0) - coalesce(ex.expenses_amount, 0))::BIGINT
                                                                           AS estimated_net_payable_amount,
    'XAF'::CHAR(3)                                                         AS currency
FROM rent_invoices i
JOIN landlords ld ON ld.id = i.landlord_id
LEFT JOIN LATERAL (
    SELECT sum(c.total_amount) AS commission_amount
    FROM commissions c
    WHERE c.landlord_id = i.landlord_id
      AND c.status <> 'CANCELLED'
      AND date_trunc('month', c.period_start) = date_trunc('month', i.period_start)
) cm ON true
LEFT JOIN LATERAL (
    SELECT sum(e.total_amount) AS expenses_amount
    FROM expenses e
    WHERE e.landlord_id = i.landlord_id
      AND e.status IN ('PAID', 'APPROVED')
      AND e.is_deductible_from_rent
      AND date_trunc('month', e.expense_date) = date_trunc('month', i.period_start)
) ex ON true
WHERE i.status <> 'CANCELLED'
GROUP BY i.organization_id, i.landlord_id, ld.company_name, ld.first_name, ld.last_name,
         date_trunc('month', i.period_start), cm.commission_amount, ex.expenses_amount;
COMMENT ON VIEW v_owner_monthly_summary IS 'Synthèse mensuelle par bailleur : appelé, encaissé, impayés, honoraires et dépenses, avec net estimé à reverser.';

GRANT SELECT ON v_unpaid_invoices, v_tenant_balances, v_collector_cash_positions, v_owner_monthly_summary
    TO immodesk_app;
