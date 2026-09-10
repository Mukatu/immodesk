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
