-- =====================================================================
-- Partie 05a : Facturation — séquences, règles de pénalité, factures
-- =====================================================================

CREATE TABLE sequences (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind              TEXT NOT NULL,
    period            TEXT NOT NULL DEFAULT '',
    last_value        BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0),
    prefix            TEXT,
    padding           SMALLINT NOT NULL DEFAULT 5 CHECK (padding BETWEEN 1 AND 12),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sequences_uk UNIQUE (organization_id, kind, period)
);
COMMENT ON TABLE sequences IS 'Compteurs de numérotation atomiques par organisation, nature et période. Alimente next_sequence().';
COMMENT ON COLUMN sequences.kind IS 'Nature du document : CASH_RECEIPT, RENT_INVOICE, RECEIPT, OWNER_STATEMENT, REMITTANCE, EXPENSE, PAYOUT.';
COMMENT ON COLUMN sequences.period IS 'Période de remise à zéro, typiquement YYYYMM ; chaîne vide pour une séquence continue.';
COMMENT ON COLUMN sequences.padding IS 'Longueur du numéro complété par des zéros (LOY-202603-00042).';

CREATE TABLE penalty_rules (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    basis                penalty_basis NOT NULL DEFAULT 'RATE_BPS_PER_MONTH',
    rate_bps             INTEGER CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
    flat_amount          BIGINT CHECK (flat_amount IS NULL OR flat_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    grace_days           SMALLINT NOT NULL DEFAULT 5 CHECK (grace_days BETWEEN 0 AND 60),
    cap_amount           BIGINT CHECK (cap_amount IS NULL OR cap_amount >= 0),
    cap_rate_bps         INTEGER CHECK (cap_rate_bps IS NULL OR cap_rate_bps BETWEEN 0 AND 10000),
    max_periods          SMALLINT CHECK (max_periods IS NULL OR max_periods >= 0),
    applies_to_charges   BOOLEAN NOT NULL DEFAULT false,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    is_default           BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT penalty_rules_name_uk UNIQUE (organization_id, name),
    CONSTRAINT penalty_rules_value_chk CHECK (rate_bps IS NOT NULL OR flat_amount IS NOT NULL)
);
COMMENT ON TABLE penalty_rules IS 'Barème de pénalités de retard : taux en points de base ou montant forfaitaire, plafonné.';
COMMENT ON COLUMN penalty_rules.rate_bps IS 'Taux en points de base appliqué au montant impayé (500 = 5 %).';
COMMENT ON COLUMN penalty_rules.flat_amount IS 'Pénalité forfaitaire en XAF, alternative au taux.';
COMMENT ON COLUMN penalty_rules.cap_rate_bps IS 'Plafond exprimé en points de base du principal impayé.';
COMMENT ON COLUMN penalty_rules.max_periods IS 'Nombre maximal de périodes pénalisables.';

CREATE UNIQUE INDEX penalty_rules_default_uk ON penalty_rules (organization_id) WHERE is_default AND is_active;

-- FK différées vers penalty_rules.
ALTER TABLE leases
    ADD CONSTRAINT leases_penalty_rule_fk FOREIGN KEY (penalty_rule_id) REFERENCES penalty_rules(id) ON DELETE SET NULL;
ALTER TABLE organization_settings
    ADD CONSTRAINT organization_settings_penalty_rule_fk FOREIGN KEY (default_penalty_rule_id) REFERENCES penalty_rules(id) ON DELETE SET NULL;

CREATE TABLE rent_invoices (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id               UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_id                UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    property_id            UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    landlord_id            UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
    invoice_number         TEXT NOT NULL,
    status                 invoice_status NOT NULL DEFAULT 'DRAFT',
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    issue_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date               DATE NOT NULL,
    grace_until_date       DATE,
    rent_amount            BIGINT NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
    charges_amount         BIGINT NOT NULL DEFAULT 0 CHECK (charges_amount >= 0),
    penalty_amount         BIGINT NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
    other_amount           BIGINT NOT NULL DEFAULT 0 CHECK (other_amount >= 0),
    discount_amount        BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount            BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance_amount         BIGINT NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    penalty_rule_id        UUID REFERENCES penalty_rules(id) ON DELETE SET NULL,
    last_penalty_run_date  DATE,
    issued_at              TIMESTAMPTZ,
    paid_at                TIMESTAMPTZ,
    cancelled_at           TIMESTAMPTZ,
    cancellation_reason    TEXT,
    document_id            UUID,
    generated_by_job       TEXT,
    client_ref             TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rent_invoices_number_uk UNIQUE (organization_id, invoice_number),
    CONSTRAINT rent_invoices_period_uk UNIQUE (lease_id, period_start),
    CONSTRAINT rent_invoices_client_ref_uk UNIQUE (organization_id, client_ref),
    CONSTRAINT rent_invoices_period_chk CHECK (period_start < period_end),
    CONSTRAINT rent_invoices_paid_chk CHECK (paid_amount <= total_amount)
);
COMMENT ON TABLE rent_invoices IS 'Facture de loyer d''un bail pour une période. Générée par cron J-N avant échéance. Une seule facture par (bail, période).';
COMMENT ON COLUMN rent_invoices.invoice_number IS 'Numéro séquentiel LOY-{YYYYMM}-{seq} produit par next_sequence().';
COMMENT ON COLUMN rent_invoices.grace_until_date IS 'due_date + grace_days du bail : bascule en OVERDUE au-delà.';
COMMENT ON COLUMN rent_invoices.balance_amount IS 'Reste dû en XAF = total_amount - paid_amount, recalculé à chaque affectation de paiement.';
COMMENT ON COLUMN rent_invoices.last_penalty_run_date IS 'Dernière exécution du calcul de pénalités, pour éviter les doubles applications.';

CREATE INDEX rent_invoices_org_status_idx ON rent_invoices (organization_id, status, due_date);
CREATE INDEX rent_invoices_lease_period_idx ON rent_invoices (organization_id, lease_id, period_start DESC);
CREATE INDEX rent_invoices_overdue_idx ON rent_invoices (organization_id, due_date, balance_amount DESC)
    WHERE status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE') AND balance_amount > 0;
CREATE INDEX rent_invoices_tenant_open_idx ON rent_invoices (organization_id, tenant_id)
    WHERE status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE');
