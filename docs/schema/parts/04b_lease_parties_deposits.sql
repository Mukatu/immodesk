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
