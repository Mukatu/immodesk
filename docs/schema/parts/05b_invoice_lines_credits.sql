-- =====================================================================
-- Partie 05b : Facturation — lignes de facture et avoirs locataires
-- =====================================================================

CREATE TABLE invoice_lines (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id           UUID NOT NULL REFERENCES rent_invoices(id) ON DELETE CASCADE,
    line_type            invoice_line_type NOT NULL,
    label                TEXT NOT NULL,
    description          TEXT,
    quantity             NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit_price_amount    BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
    amount               BIGINT NOT NULL DEFAULT 0 CHECK (amount >= 0),
    vat_rate_bps         INTEGER NOT NULL DEFAULT 0 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    vat_amount           BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    is_credit            BOOLEAN NOT NULL DEFAULT false,
    meter_reading_id     UUID REFERENCES meter_readings(id) ON DELETE SET NULL,
    expense_id           UUID,
    penalty_rule_id      UUID REFERENCES penalty_rules(id) ON DELETE SET NULL,
    period_start         DATE,
    period_end           DATE,
    position             SMALLINT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT invoice_lines_period_chk CHECK (period_start IS NULL OR period_end IS NULL OR period_start < period_end)
);
COMMENT ON TABLE invoice_lines IS 'Détail d''une facture : loyer, charges eau/électricité, pénalités, refacturations, remises.';
COMMENT ON COLUMN invoice_lines.amount IS 'Montant hors taxe de la ligne en XAF ; toujours positif, le sens est porté par is_credit.';
COMMENT ON COLUMN invoice_lines.is_credit IS 'true = ligne en diminution (remise, avoir) déduite du total de la facture.';
COMMENT ON COLUMN invoice_lines.meter_reading_id IS 'Relevé de compteur source pour les lignes de charges refacturées.';
COMMENT ON COLUMN invoice_lines.expense_id IS 'Dépense refacturée au locataire (FK ajoutée en partie 09).';

CREATE INDEX invoice_lines_invoice_idx ON invoice_lines (organization_id, invoice_id, position);
CREATE INDEX invoice_lines_type_idx ON invoice_lines (organization_id, line_type);

-- FK différée : meter_readings.invoice_line_id (déclarée en partie 03c).
ALTER TABLE meter_readings
    ADD CONSTRAINT meter_readings_invoice_line_fk FOREIGN KEY (invoice_line_id) REFERENCES invoice_lines(id) ON DELETE SET NULL;

CREATE TABLE tenant_credits (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id             UUID REFERENCES leases(id) ON DELETE SET NULL,
    status               credit_status NOT NULL DEFAULT 'OPEN',
    origin               TEXT NOT NULL DEFAULT 'OVERPAYMENT',
    amount               BIGINT NOT NULL CHECK (amount >= 0),
    used_amount          BIGINT NOT NULL DEFAULT 0 CHECK (used_amount >= 0),
    remaining_amount     BIGINT NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    source_payment_id    UUID,
    source_invoice_id    UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    expires_at           DATE,
    refunded_at          TIMESTAMPTZ,
    reason               TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tenant_credits_used_chk CHECK (used_amount <= amount)
);
COMMENT ON TABLE tenant_credits IS 'Avoir locataire issu d''un trop-perçu, d''une annulation de facture ou d''un geste commercial ; imputable sur les factures suivantes.';
COMMENT ON COLUMN tenant_credits.origin IS 'OVERPAYMENT, INVOICE_CANCELLATION, DEPOSIT_TRANSFER, GOODWILL, ADJUSTMENT.';
COMMENT ON COLUMN tenant_credits.remaining_amount IS 'Solde disponible en XAF = amount - used_amount.';
COMMENT ON COLUMN tenant_credits.source_payment_id IS 'Paiement à l''origine du trop-perçu (FK ajoutée en partie 06).';

CREATE INDEX tenant_credits_open_idx ON tenant_credits (organization_id, tenant_id)
    WHERE status IN ('OPEN', 'PARTIALLY_USED');
