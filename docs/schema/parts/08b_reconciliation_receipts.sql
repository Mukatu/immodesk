-- =====================================================================
-- Partie 08b : Rapprochement bancaire et quittances
-- =====================================================================

CREATE TABLE reconciliation_matches (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    statement_line_id        UUID NOT NULL REFERENCES bank_statement_lines(id) ON DELETE RESTRICT,
    payment_id               UUID REFERENCES payments(id) ON DELETE RESTRICT,
    declaration_id           UUID REFERENCES bank_transfer_declarations(id) ON DELETE RESTRICT,
    bank_check_id            UUID REFERENCES bank_checks(id) ON DELETE RESTRICT,
    remittance_id            UUID REFERENCES cash_remittances(id) ON DELETE RESTRICT,
    match_type               match_type NOT NULL DEFAULT 'SUGGESTED',
    status                   match_status NOT NULL DEFAULT 'PROPOSED',
    matched_amount           BIGINT NOT NULL CHECK (matched_amount >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    confidence_score         SMALLINT NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
    match_criteria           JSONB NOT NULL DEFAULT '{}'::jsonb,
    matched_by_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at             TIMESTAMPTZ,
    confirmed_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at              TIMESTAMPTZ,
    rejection_reason         TEXT,
    reversed_at              TIMESTAMPTZ,
    reversal_of_id           UUID REFERENCES reconciliation_matches(id) ON DELETE RESTRICT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reconciliation_matches_target_chk CHECK (
        num_nonnulls(payment_id, declaration_id, bank_check_id, remittance_id) >= 1)
);
COMMENT ON TABLE reconciliation_matches IS 'Rapprochement d''une ligne de relevé avec un paiement, une déclaration de virement, un chèque ou un reversement d''espèces.';
COMMENT ON COLUMN reconciliation_matches.match_type IS 'EXACT (référence et montant), SUGGESTED (score), MANUAL, PARTIAL, SPLIT (une ligne pour plusieurs paiements).';
COMMENT ON COLUMN reconciliation_matches.confidence_score IS 'Score de confiance 0-100 du moteur de rapprochement automatique.';
COMMENT ON COLUMN reconciliation_matches.match_criteria IS 'Critères ayant produit la suggestion (référence, montant, date, nom du payeur).';

CREATE UNIQUE INDEX reconciliation_matches_confirmed_line_uk
    ON reconciliation_matches (statement_line_id, coalesce(payment_id, declaration_id, bank_check_id, remittance_id))
    WHERE status = 'CONFIRMED';
CREATE INDEX reconciliation_matches_line_idx ON reconciliation_matches (organization_id, statement_line_id);
CREATE INDEX reconciliation_matches_pending_idx ON reconciliation_matches (organization_id, confidence_score DESC)
    WHERE status = 'PROPOSED';

CREATE TABLE receipts (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id               UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    invoice_id               UUID REFERENCES rent_invoices(id) ON DELETE RESTRICT,
    lease_id                 UUID REFERENCES leases(id) ON DELETE RESTRICT,
    tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    landlord_id              UUID REFERENCES landlords(id) ON DELETE RESTRICT,
    unit_id                  UUID REFERENCES units(id) ON DELETE RESTRICT,
    receipt_number           TEXT NOT NULL,
    status                   receipt_status NOT NULL DEFAULT 'DRAFT',
    period_start             DATE,
    period_end               DATE,
    issue_date               DATE NOT NULL DEFAULT CURRENT_DATE,
    rent_amount              BIGINT NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
    charges_amount           BIGINT NOT NULL DEFAULT 0 CHECK (charges_amount >= 0),
    penalty_amount           BIGINT NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
    total_amount             BIGINT NOT NULL CHECK (total_amount >= 0),
    remaining_balance_amount BIGINT NOT NULL DEFAULT 0,
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    verification_token       TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    verification_url         TEXT,
    qr_payload               TEXT,
    content_hash             TEXT,
    document_id              UUID,
    generated_at             TIMESTAMPTZ,
    generated_by_job         TEXT,
    sent_at                  TIMESTAMPTZ,
    sent_channel             notification_channel,
    message_log_id           UUID,
    cancelled_at             TIMESTAMPTZ,
    cancellation_reason      TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT receipts_number_uk UNIQUE (organization_id, receipt_number),
    CONSTRAINT receipts_token_uk UNIQUE (verification_token),
    CONSTRAINT receipts_period_chk CHECK (period_start IS NULL OR period_end IS NULL OR period_start < period_end)
);
COMMENT ON TABLE receipts IS 'Quittance de loyer QUI-{YYYYMM}-{seq} au format PDF, vérifiable publiquement par QR code. APPEND-ONLY.';
COMMENT ON COLUMN receipts.verification_token IS 'Jeton aléatoire du QR code permettant à un tiers de vérifier l''authenticité de la quittance sans authentification.';
COMMENT ON COLUMN receipts.verification_url IS 'URL publique de vérification incorporant verification_token.';
COMMENT ON COLUMN receipts.qr_payload IS 'Contenu exact encodé dans le QR code imprimé sur le PDF.';
COMMENT ON COLUMN receipts.content_hash IS 'Empreinte SHA-256 des données quittancées, contrôlée lors de la vérification publique.';
COMMENT ON COLUMN receipts.remaining_balance_amount IS 'Solde du bail après ce règlement ; peut être négatif (avoir), donc sans CHECK >= 0.';

CREATE INDEX receipts_tenant_idx ON receipts (organization_id, tenant_id, issue_date DESC);
CREATE INDEX receipts_payment_idx ON receipts (organization_id, payment_id);
CREATE INDEX receipts_pending_send_idx ON receipts (organization_id, status) WHERE status IN ('DRAFT', 'GENERATING', 'ISSUED');
