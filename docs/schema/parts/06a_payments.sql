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
