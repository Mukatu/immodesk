-- =====================================================================
-- Partie 07 : Encaissement — virements déclarés, chèques, Mobile Money
-- =====================================================================

CREATE TABLE bank_transfer_declarations (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id               UUID REFERENCES leases(id) ON DELETE RESTRICT,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    status                 declaration_status NOT NULL DEFAULT 'SUBMITTED',
    declared_amount        BIGINT NOT NULL CHECK (declared_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    transfer_date          DATE NOT NULL,
    transfer_reference     TEXT,
    payer_name             TEXT NOT NULL,
    payer_bank_code        TEXT,
    payer_bank_name        TEXT,
    payer_account_number   TEXT,
    beneficiary_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    proof_document_id      UUID,
    submitted_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at            TIMESTAMPTZ,
    rejection_reason       TEXT,
    matched_statement_line_id UUID,
    client_ref             TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_transfer_declarations_client_ref_uk UNIQUE (organization_id, client_ref)
);
COMMENT ON TABLE bank_transfer_declarations IS 'Déclaration de virement par le locataire, preuve à l''appui, en attente de confirmation par le relevé bancaire.';
COMMENT ON COLUMN bank_transfer_declarations.transfer_reference IS 'Libellé ou référence de l''ordre de virement, utilisé comme clé de rapprochement.';
COMMENT ON COLUMN bank_transfer_declarations.proof_document_id IS 'Photo ou PDF de l''avis de virement téléversé par le locataire.';
COMMENT ON COLUMN bank_transfer_declarations.matched_statement_line_id IS 'Ligne de relevé confirmant l''encaissement (FK ajoutée en partie 08).';

CREATE INDEX bank_transfer_declarations_status_idx ON bank_transfer_declarations (organization_id, status, transfer_date DESC);
CREATE INDEX bank_transfer_declarations_ref_idx ON bank_transfer_declarations (organization_id, transfer_reference);

CREATE TABLE bank_checks (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id               UUID REFERENCES leases(id) ON DELETE RESTRICT,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    status                 check_status NOT NULL DEFAULT 'RECEIVED',
    check_number           TEXT NOT NULL,
    drawer_name            TEXT NOT NULL,
    drawer_bank_code       TEXT NOT NULL,
    drawer_bank_name       TEXT NOT NULL,
    drawer_account_number  TEXT,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    issue_date             DATE NOT NULL,
    received_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deposit_date           DATE,
    deposit_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    clearing_date          DATE,
    cleared_at             TIMESTAMPTZ,
    bounced_at             TIMESTAMPTZ,
    bounce_reason          TEXT,
    bounce_fee_amount      BIGINT NOT NULL DEFAULT 0 CHECK (bounce_fee_amount >= 0),
    image_document_id      UUID,
    received_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bank_checks_number_uk UNIQUE (organization_id, drawer_bank_code, check_number),
    CONSTRAINT bank_checks_dates_chk CHECK (deposit_date IS NULL OR issue_date <= deposit_date)
);
COMMENT ON TABLE bank_checks IS 'Chèque remis par un locataire : réception, remise en banque, compensation ou rejet.';
COMMENT ON COLUMN bank_checks.drawer_bank_code IS 'Code de la banque tirée (libre : BGFI, LCB, ECOBANK, UBA, BSCA...).';
COMMENT ON COLUMN bank_checks.clearing_date IS 'Date de compensation prévue ou constatée.';
COMMENT ON COLUMN bank_checks.bounce_fee_amount IS 'Frais de rejet en XAF refacturés au locataire.';

CREATE INDEX bank_checks_status_idx ON bank_checks (organization_id, status, deposit_date);
CREATE INDEX bank_checks_tenant_idx ON bank_checks (organization_id, tenant_id);

CREATE TABLE mobile_money_transactions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id             UUID REFERENCES payments(id) ON DELETE SET NULL,
    tenant_id              UUID REFERENCES tenants(id) ON DELETE RESTRICT,
    lease_id               UUID REFERENCES leases(id) ON DELETE RESTRICT,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE SET NULL,
    provider               momo_provider NOT NULL,
    aggregator             TEXT NOT NULL DEFAULT 'CINETPAY',
    direction              payment_direction NOT NULL DEFAULT 'INBOUND',
    status                 momo_status NOT NULL DEFAULT 'INITIATED',
    provider_transaction_id TEXT,
    aggregator_transaction_id TEXT,
    merchant_reference     TEXT NOT NULL,
    payer_msisdn           TEXT NOT NULL,
    payee_msisdn           TEXT,
    amount                 BIGINT NOT NULL CHECK (amount >= 0),
    fee_amount             BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    fee_bearer             fee_bearer NOT NULL DEFAULT 'TENANT',
    net_amount             BIGINT NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    initiated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at           TIMESTAMPTZ,
    expires_at             TIMESTAMPTZ,
    status_checked_at      TIMESTAMPTZ,
    status_check_count     SMALLINT NOT NULL DEFAULT 0 CHECK (status_check_count >= 0),
    failure_code           TEXT,
    failure_message        TEXT,
    raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    webhook_event_id       UUID,
    idempotency_key        TEXT,
    client_ref             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT momo_merchant_ref_uk UNIQUE (organization_id, merchant_reference),
    CONSTRAINT momo_provider_tx_uk UNIQUE (provider, provider_transaction_id),
    CONSTRAINT momo_msisdn_chk CHECK (payer_msisdn ~ '^\+[1-9][0-9]{7,14}$')
);
COMMENT ON TABLE mobile_money_transactions IS 'Transaction Mobile Money via agrégateur (CinetPay, PawaPay) ou opérateur direct (MTN MoMo, Airtel Money).';
COMMENT ON COLUMN mobile_money_transactions.merchant_reference IS 'Référence marchande envoyée à l''agrégateur, clé d''idempotence de la demande de paiement.';
COMMENT ON COLUMN mobile_money_transactions.payer_msisdn IS 'Numéro du portefeuille débité, format E.164.';
COMMENT ON COLUMN mobile_money_transactions.fee_amount IS 'Frais opérateur en XAF prélevés sur la transaction.';
COMMENT ON COLUMN mobile_money_transactions.status_check_count IS 'Nombre de re-interrogations de statut : un webhook seul ne vaut jamais confirmation.';
COMMENT ON COLUMN mobile_money_transactions.raw_payload IS 'Payload brut de l''agrégateur conservé intégralement pour audit et rejeu.';

CREATE INDEX momo_status_idx ON mobile_money_transactions (organization_id, status, initiated_at DESC);
CREATE INDEX momo_pending_recheck_idx ON mobile_money_transactions (status_checked_at)
    WHERE status IN ('INITIATED', 'PENDING');
CREATE INDEX momo_payer_idx ON mobile_money_transactions (organization_id, payer_msisdn);
CREATE INDEX momo_payload_gin ON mobile_money_transactions USING GIN (raw_payload jsonb_path_ops);
