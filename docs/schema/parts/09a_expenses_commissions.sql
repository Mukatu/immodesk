-- =====================================================================
-- Partie 09a : Gestion d'agence — dépenses et commissions
-- =====================================================================

CREATE TABLE expenses (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id            UUID REFERENCES properties(id) ON DELETE SET NULL,
    unit_id                UUID REFERENCES units(id) ON DELETE SET NULL,
    lease_id               UUID REFERENCES leases(id) ON DELETE SET NULL,
    landlord_id            UUID REFERENCES landlords(id) ON DELETE SET NULL,
    maintenance_request_id UUID,
    reference              TEXT NOT NULL,
    category               expense_category NOT NULL DEFAULT 'REPAIR',
    status                 expense_status NOT NULL DEFAULT 'DRAFT',
    borne_by               expense_bearer NOT NULL DEFAULT 'LANDLORD',
    label                  TEXT NOT NULL,
    description            TEXT,
    supplier_name          TEXT,
    supplier_phone         TEXT,
    supplier_niu           TEXT,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    vat_rate_bps           INTEGER NOT NULL DEFAULT 0 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    vat_amount             BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    expense_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_at                TIMESTAMPTZ,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    is_rebillable          BOOLEAN NOT NULL DEFAULT false,
    rebilled_invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
    is_deductible_from_rent BOOLEAN NOT NULL DEFAULT true,
    owner_statement_id     UUID,
    invoice_document_id    UUID,
    approved_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at            TIMESTAMPTZ,
    created_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    client_ref             TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT expenses_reference_uk UNIQUE (organization_id, reference),
    CONSTRAINT expenses_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE expenses IS 'Dépense engagée sur un bien : réparation, facture E2C/LCDE, taxe, gardiennage. Déduite du relevé de gérance ou refacturée au locataire.';
COMMENT ON COLUMN expenses.borne_by IS 'Partie supportant réellement la charge : bailleur, locataire (refacturation) ou agence.';
COMMENT ON COLUMN expenses.is_deductible_from_rent IS 'true = la dépense est déduite des loyers reversés au bailleur.';
COMMENT ON COLUMN expenses.rebilled_invoice_line_id IS 'Ligne de facture de refacturation au locataire, le cas échéant.';
COMMENT ON COLUMN expenses.supplier_niu IS 'Numéro d''Identification Unique du fournisseur, requis pour la déductibilité fiscale.';

CREATE INDEX expenses_org_date_idx ON expenses (organization_id, expense_date DESC);
CREATE INDEX expenses_property_idx ON expenses (organization_id, property_id, expense_date DESC);
CREATE INDEX expenses_pending_statement_idx ON expenses (organization_id, landlord_id)
    WHERE status = 'PAID' AND owner_statement_id IS NULL AND is_deductible_from_rent;

-- FK différée : invoice_lines.expense_id (déclarée en partie 05b).
ALTER TABLE invoice_lines
    ADD CONSTRAINT invoice_lines_expense_fk FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL;

CREATE TABLE commissions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mandate_id             UUID REFERENCES management_mandates(id) ON DELETE SET NULL,
    landlord_id            UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    lease_id               UUID REFERENCES leases(id) ON DELETE SET NULL,
    property_id            UUID REFERENCES properties(id) ON DELETE SET NULL,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    status                 commission_status NOT NULL DEFAULT 'PENDING',
    basis                  commission_basis NOT NULL DEFAULT 'RATE_BPS_ON_RENT_COLLECTED',
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    base_amount            BIGINT NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
    rate_bps               INTEGER CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
    flat_amount            BIGINT CHECK (flat_amount IS NULL OR flat_amount >= 0),
    amount                 BIGINT NOT NULL DEFAULT 0 CHECK (amount >= 0),
    vat_rate_bps           INTEGER NOT NULL DEFAULT 1800 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    vat_amount             BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    owner_statement_id     UUID,
    accrued_at             TIMESTAMPTZ,
    settled_at             TIMESTAMPTZ,
    reversal_of_id         UUID REFERENCES commissions(id) ON DELETE RESTRICT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT commissions_period_chk CHECK (period_start < period_end),
    CONSTRAINT commissions_value_chk CHECK (rate_bps IS NOT NULL OR flat_amount IS NOT NULL)
);
COMMENT ON TABLE commissions IS 'Honoraires de gestion dus à l''agence, calculés sur les loyers encaissés ou dus selon le mandat.';
COMMENT ON COLUMN commissions.base_amount IS 'Assiette de calcul en XAF (loyer encaissé ou appelé sur la période).';
COMMENT ON COLUMN commissions.rate_bps IS 'Taux appliqué en points de base ; alternative à flat_amount.';
COMMENT ON COLUMN commissions.amount IS 'Commission hors taxe en XAF.';
COMMENT ON COLUMN commissions.reversal_of_id IS 'Commission annulée par contre-passation (impayé régularisé, reversement erroné).';

CREATE INDEX commissions_landlord_period_idx ON commissions (organization_id, landlord_id, period_start DESC);
CREATE INDEX commissions_pending_statement_idx ON commissions (organization_id, landlord_id)
    WHERE status = 'ACCRUED' AND owner_statement_id IS NULL;
