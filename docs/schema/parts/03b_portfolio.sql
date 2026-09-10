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
