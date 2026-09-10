-- =====================================================================
-- Partie 09b : Gestion d'agence — relevés de gérance et reversements
-- =====================================================================

CREATE TABLE owner_statements (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    landlord_id            UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    mandate_id             UUID REFERENCES management_mandates(id) ON DELETE SET NULL,
    property_id            UUID REFERENCES properties(id) ON DELETE SET NULL,
    statement_number       TEXT NOT NULL,
    status                 statement_status NOT NULL DEFAULT 'DRAFT',
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    issue_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    rent_due_amount        BIGINT NOT NULL DEFAULT 0 CHECK (rent_due_amount >= 0),
    rent_collected_amount  BIGINT NOT NULL DEFAULT 0 CHECK (rent_collected_amount >= 0),
    charges_collected_amount BIGINT NOT NULL DEFAULT 0 CHECK (charges_collected_amount >= 0),
    commission_amount      BIGINT NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
    commission_vat_amount  BIGINT NOT NULL DEFAULT 0 CHECK (commission_vat_amount >= 0),
    expenses_amount        BIGINT NOT NULL DEFAULT 0 CHECK (expenses_amount >= 0),
    deposits_held_amount   BIGINT NOT NULL DEFAULT 0 CHECK (deposits_held_amount >= 0),
    carry_forward_amount   BIGINT NOT NULL DEFAULT 0,
    net_payable_amount     BIGINT NOT NULL DEFAULT 0,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    occupancy_rate_bps     INTEGER CHECK (occupancy_rate_bps IS NULL OR occupancy_rate_bps BETWEEN 0 AND 10000),
    collection_rate_bps    INTEGER CHECK (collection_rate_bps IS NULL OR collection_rate_bps BETWEEN 0 AND 10000),
    document_id            UUID,
    generated_by_job       TEXT,
    issued_at              TIMESTAMPTZ,
    sent_at                TIMESTAMPTZ,
    settled_at             TIMESTAMPTZ,
    cancelled_at           TIMESTAMPTZ,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT owner_statements_number_uk UNIQUE (organization_id, statement_number),
    CONSTRAINT owner_statements_period_uk UNIQUE (organization_id, landlord_id, property_id, period_start),
    CONSTRAINT owner_statements_period_chk CHECK (period_start < period_end)
);
COMMENT ON TABLE owner_statements IS 'Relevé de gérance périodique adressé au bailleur : loyers encaissés, honoraires, dépenses, net à reverser.';
COMMENT ON COLUMN owner_statements.carry_forward_amount IS 'Report du solde de la période précédente en XAF ; peut être négatif.';
COMMENT ON COLUMN owner_statements.net_payable_amount IS 'Net à reverser au bailleur en XAF ; négatif = le bailleur doit à l''agence.';
COMMENT ON COLUMN owner_statements.occupancy_rate_bps IS 'Taux d''occupation du portefeuille sur la période, en points de base.';
COMMENT ON COLUMN owner_statements.collection_rate_bps IS 'Taux de recouvrement (encaissé / appelé), en points de base.';

CREATE INDEX owner_statements_landlord_idx ON owner_statements (organization_id, landlord_id, period_start DESC);
CREATE INDEX owner_statements_status_idx ON owner_statements (organization_id, status);

-- FK différées vers owner_statements.
ALTER TABLE expenses
    ADD CONSTRAINT expenses_owner_statement_fk FOREIGN KEY (owner_statement_id) REFERENCES owner_statements(id) ON DELETE SET NULL;
ALTER TABLE commissions
    ADD CONSTRAINT commissions_owner_statement_fk FOREIGN KEY (owner_statement_id) REFERENCES owner_statements(id) ON DELETE SET NULL;

CREATE TABLE owner_statement_lines (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    statement_id           UUID NOT NULL REFERENCES owner_statements(id) ON DELETE CASCADE,
    line_type              owner_statement_line_type NOT NULL,
    label                  TEXT NOT NULL,
    property_id            UUID REFERENCES properties(id) ON DELETE SET NULL,
    unit_id                UUID REFERENCES units(id) ON DELETE SET NULL,
    lease_id               UUID REFERENCES leases(id) ON DELETE SET NULL,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE SET NULL,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    expense_id             UUID REFERENCES expenses(id) ON DELETE SET NULL,
    commission_id          UUID REFERENCES commissions(id) ON DELETE SET NULL,
    period_start           DATE,
    period_end             DATE,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    is_debit               BOOLEAN NOT NULL DEFAULT false,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    position               SMALLINT NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE owner_statement_lines IS 'Détail ligne à ligne d''un relevé de gérance, traçant chaque encaissement, honoraire et dépense.';
COMMENT ON COLUMN owner_statement_lines.is_debit IS 'true = ligne en déduction du net à reverser (honoraires, dépenses, TVA).';

CREATE INDEX owner_statement_lines_statement_idx ON owner_statement_lines (organization_id, statement_id, position);

CREATE TABLE owner_payouts (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    landlord_id            UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    statement_id           UUID REFERENCES owner_statements(id) ON DELETE SET NULL,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    reference              TEXT NOT NULL,
    status                 payout_status NOT NULL DEFAULT 'PENDING',
    method                 payment_method NOT NULL DEFAULT 'MOBILE_MONEY',
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    fee_amount             BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    fee_bearer             fee_bearer NOT NULL DEFAULT 'LANDLORD',
    net_amount             BIGINT NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    bank_account_id        UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    momo_transaction_id    UUID REFERENCES mobile_money_transactions(id) ON DELETE SET NULL,
    scheduled_date         DATE,
    approved_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at            TIMESTAMPTZ,
    paid_at                TIMESTAMPTZ,
    failure_reason         TEXT,
    proof_document_id      UUID,
    client_ref             TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT owner_payouts_reference_uk UNIQUE (organization_id, reference),
    CONSTRAINT owner_payouts_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE owner_payouts IS 'Reversement effectif du net de gérance au bailleur (virement, Mobile Money, espèces ou chèque).';
COMMENT ON COLUMN owner_payouts.fee_amount IS 'Frais de transfert en XAF, à la charge du bailleur ou de l''agence selon fee_bearer.';
COMMENT ON COLUMN owner_payouts.proof_document_id IS 'Justificatif du reversement (avis de virement, reçu Mobile Money).';

CREATE INDEX owner_payouts_landlord_idx ON owner_payouts (organization_id, landlord_id, scheduled_date DESC);
CREATE INDEX owner_payouts_pending_idx ON owner_payouts (organization_id, scheduled_date)
    WHERE status IN ('PENDING', 'APPROVED', 'PROCESSING');
