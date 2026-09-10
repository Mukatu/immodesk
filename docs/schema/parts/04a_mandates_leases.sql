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

-- ---------------------------------------------------------------------
-- Anti-chevauchement : un lot ne peut porter qu'un bail en cours à la fois.
-- Garanti en base (et non seulement applicativement) par une contrainte
-- d'exclusion GiST sur (unit_id, période). end_date NULL = durée indéterminée.
-- ---------------------------------------------------------------------
ALTER TABLE leases ADD CONSTRAINT leases_no_overlap_excl
    EXCLUDE USING gist (
        unit_id WITH =,
        daterange(start_date, COALESCE(end_date, DATE '9999-12-31'), '[)') WITH &&
    )
    WHERE (status IN ('ACTIVE', 'NOTICE_GIVEN') AND deleted_at IS NULL);

-- ---------------------------------------------------------------------
-- Révisions de loyer : historique daté, les factures passées restent inchangées.
-- ---------------------------------------------------------------------
CREATE TABLE lease_rent_revisions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id                 UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    effective_date           DATE NOT NULL,
    previous_rent_amount     BIGINT NOT NULL CHECK (previous_rent_amount >= 0),
    new_rent_amount          BIGINT NOT NULL CHECK (new_rent_amount >= 0),
    previous_charges_amount  BIGINT NOT NULL DEFAULT 0 CHECK (previous_charges_amount >= 0),
    new_charges_amount       BIGINT NOT NULL DEFAULT 0 CHECK (new_charges_amount >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    reason                   TEXT,
    document_id              UUID,
    created_by_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT lease_rent_revisions_uk UNIQUE (lease_id, effective_date)
);
COMMENT ON TABLE lease_rent_revisions IS 'Révisions de loyer et de charges d''un bail, datées ; le loyer applicable à une date est la dernière révision effective à cette date, sinon le loyer initial du bail. Une révision ne peut pas être antérieure à une période déjà facturée.';
CREATE INDEX lease_rent_revisions_lease_idx ON lease_rent_revisions (lease_id, effective_date DESC);
