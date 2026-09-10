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
