-- =====================================================================
-- Partie 08a : Rapprochement — relevés bancaires importés
-- =====================================================================

CREATE TABLE bank_statements (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_account_id        UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    format                 statement_format NOT NULL DEFAULT 'CSV',
    status                 bank_statement_status NOT NULL DEFAULT 'UPLOADED',
    statement_reference    TEXT,
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    opening_balance        BIGINT NOT NULL DEFAULT 0,
    closing_balance        BIGINT NOT NULL DEFAULT 0,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    lines_count            INTEGER NOT NULL DEFAULT 0 CHECK (lines_count >= 0),
    matched_lines_count    INTEGER NOT NULL DEFAULT 0 CHECK (matched_lines_count >= 0),
    total_credit_amount    BIGINT NOT NULL DEFAULT 0 CHECK (total_credit_amount >= 0),
    total_debit_amount     BIGINT NOT NULL DEFAULT 0 CHECK (total_debit_amount >= 0),
    document_id            UUID,
    file_checksum_sha256   TEXT,
    imported_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    imported_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    parsed_at              TIMESTAMPTZ,
    reconciled_at          TIMESTAMPTZ,
    parse_error            TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_statements_period_chk CHECK (period_start < period_end),
    CONSTRAINT bank_statements_checksum_uk UNIQUE (organization_id, bank_account_id, file_checksum_sha256)
);
COMMENT ON TABLE bank_statements IS 'Relevé bancaire importé (CSV, MT940, CAMT.053) servant de base au rapprochement des virements et chèques.';
COMMENT ON COLUMN bank_statements.opening_balance IS 'Solde d''ouverture en XAF ; peut être négatif (découvert), donc sans CHECK >= 0.';
COMMENT ON COLUMN bank_statements.file_checksum_sha256 IS 'Empreinte du fichier : bloque le double import du même relevé.';
COMMENT ON COLUMN bank_statements.matched_lines_count IS 'Nombre de lignes rapprochées, pour le suivi du taux de rapprochement.';

CREATE INDEX bank_statements_account_idx ON bank_statements (organization_id, bank_account_id, period_start DESC);
CREATE INDEX bank_statements_status_idx ON bank_statements (organization_id, status);

CREATE TABLE bank_statement_lines (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    statement_id           UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    bank_account_id        UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    line_number            INTEGER NOT NULL CHECK (line_number >= 0),
    direction              statement_line_direction NOT NULL,
    operation_date         DATE NOT NULL,
    value_date             DATE,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    running_balance        BIGINT,
    label                  TEXT NOT NULL,
    counterparty_name      TEXT,
    counterparty_account   TEXT,
    bank_reference         TEXT,
    end_to_end_reference   TEXT,
    operation_code         TEXT,
    is_matched             BOOLEAN NOT NULL DEFAULT false,
    matched_amount         BIGINT NOT NULL DEFAULT 0 CHECK (matched_amount >= 0),
    is_ignored             BOOLEAN NOT NULL DEFAULT false,
    ignore_reason          TEXT,
    normalized_label       TEXT,
    raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_statement_lines_uk UNIQUE (statement_id, line_number),
    CONSTRAINT bank_statement_lines_matched_chk CHECK (matched_amount <= amount)
);
COMMENT ON TABLE bank_statement_lines IS 'Écriture unitaire d''un relevé bancaire, candidate au rapprochement avec un paiement ou une déclaration de virement.';
COMMENT ON COLUMN bank_statement_lines.running_balance IS 'Solde progressif en XAF après l''écriture ; peut être négatif.';
COMMENT ON COLUMN bank_statement_lines.end_to_end_reference IS 'Référence de bout en bout du virement, clé de rapprochement la plus fiable.';
COMMENT ON COLUMN bank_statement_lines.normalized_label IS 'Libellé normalisé (majuscules, sans accents ni ponctuation) pour le rapprochement approximatif.';
COMMENT ON COLUMN bank_statement_lines.raw_payload IS 'Ligne source brute (champs CSV ou tags MT940) conservée pour audit.';

CREATE INDEX bank_statement_lines_statement_idx ON bank_statement_lines (organization_id, statement_id, line_number);
CREATE INDEX bank_statement_lines_unmatched_idx ON bank_statement_lines (organization_id, operation_date DESC)
    WHERE NOT is_matched AND NOT is_ignored AND direction = 'CREDIT';
CREATE INDEX bank_statement_lines_amount_idx ON bank_statement_lines (organization_id, amount, operation_date);
CREATE INDEX bank_statement_lines_label_idx ON bank_statement_lines (organization_id, normalized_label);

-- FK différée : bank_transfer_declarations.matched_statement_line_id (déclarée en partie 07).
ALTER TABLE bank_transfer_declarations
    ADD CONSTRAINT bank_transfer_declarations_line_fk
    FOREIGN KEY (matched_statement_line_id) REFERENCES bank_statement_lines(id) ON DELETE SET NULL;
