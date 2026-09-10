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
