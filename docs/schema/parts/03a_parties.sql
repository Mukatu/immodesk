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
