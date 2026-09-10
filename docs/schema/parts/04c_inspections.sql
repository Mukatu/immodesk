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
