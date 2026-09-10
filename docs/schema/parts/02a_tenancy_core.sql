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
