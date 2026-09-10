-- =====================================================================
-- Partie 11c : Technique — audit, feature flags — et SaaS (abonnements)
-- =====================================================================

CREATE TABLE audit_logs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_label            TEXT,
    actor_role             member_role,
    action                 audit_action NOT NULL,
    entity_type            TEXT NOT NULL,
    entity_id              UUID NOT NULL,
    previous_state         JSONB,
    new_state              JSONB,
    changed_fields         TEXT[],
    reason                 TEXT,
    ip_address             INET,
    user_agent             TEXT,
    request_id             TEXT,
    api_key_id             UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    occurred_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_logs IS 'Journal d''audit APPEND-ONLY : toute transition d''état de bail, facture, paiement ou remise y est tracée avec les états avant/après.';
COMMENT ON COLUMN audit_logs.previous_state IS 'Instantané JSONB de l''entité avant modification.';
COMMENT ON COLUMN audit_logs.new_state IS 'Instantané JSONB de l''entité après modification.';
COMMENT ON COLUMN audit_logs.request_id IS 'Corrélation avec la trace HTTP et les logs applicatifs (Sentry).';

CREATE INDEX audit_logs_entity_idx ON audit_logs (organization_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (organization_id, actor_user_id, occurred_at DESC);
CREATE INDEX audit_logs_occurred_idx ON audit_logs (organization_id, occurred_at DESC);

CREATE TABLE feature_flags (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key                    TEXT NOT NULL,
    description            TEXT,
    is_enabled             BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage     SMALLINT NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
    starts_at              TIMESTAMPTZ,
    ends_at                TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT feature_flags_period_chk CHECK (ends_at IS NULL OR starts_at IS NULL OR starts_at < ends_at)
);
COMMENT ON TABLE feature_flags IS 'Activation progressive de fonctionnalités. organization_id NULL = drapeau global appliqué à tous les tenants.';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Pourcentage de déploiement progressif quand le drapeau est global.';

CREATE UNIQUE INDEX feature_flags_org_key_uk ON feature_flags (organization_id, key) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX feature_flags_global_key_uk ON feature_flags (key) WHERE organization_id IS NULL;

CREATE TABLE subscription_plans (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                   TEXT NOT NULL,
    name                   TEXT NOT NULL,
    description            TEXT,
    billing_interval       billing_interval NOT NULL DEFAULT 'MONTHLY',
    base_price_amount      BIGINT NOT NULL DEFAULT 0 CHECK (base_price_amount >= 0),
    price_per_unit_amount  BIGINT NOT NULL DEFAULT 0 CHECK (price_per_unit_amount >= 0),
    included_units         INTEGER NOT NULL DEFAULT 0 CHECK (included_units >= 0),
    max_units              INTEGER CHECK (max_units IS NULL OR max_units >= 0),
    max_members            INTEGER CHECK (max_members IS NULL OR max_members >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    trial_days             SMALLINT NOT NULL DEFAULT 14 CHECK (trial_days >= 0),
    features               JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_public              BOOLEAN NOT NULL DEFAULT true,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    position               SMALLINT NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscription_plans_code_uk UNIQUE (code)
);
COMMENT ON TABLE subscription_plans IS 'Table GLOBALE (hors RLS) : catalogue des offres Immodesk, tarifées au lot géré.';
COMMENT ON COLUMN subscription_plans.price_per_unit_amount IS 'Prix en XAF par lot au-delà de included_units.';

CREATE TABLE subscriptions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id                UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status                 subscription_status NOT NULL DEFAULT 'TRIALING',
    billing_interval       billing_interval NOT NULL DEFAULT 'MONTHLY',
    units_count            INTEGER NOT NULL DEFAULT 0 CHECK (units_count >= 0),
    unit_price_amount      BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
    recurring_amount       BIGINT NOT NULL DEFAULT 0 CHECK (recurring_amount >= 0),
    discount_rate_bps      INTEGER NOT NULL DEFAULT 0 CHECK (discount_rate_bps BETWEEN 0 AND 10000),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    trial_ends_at          TIMESTAMPTZ,
    current_period_start   DATE NOT NULL DEFAULT CURRENT_DATE,
    current_period_end     DATE NOT NULL,
    next_billing_date      DATE,
    payment_method         payment_method NOT NULL DEFAULT 'MOBILE_MONEY',
    momo_msisdn            TEXT,
    auto_renew             BOOLEAN NOT NULL DEFAULT true,
    grace_days             SMALLINT NOT NULL DEFAULT 7 CHECK (grace_days >= 0),
    suspended_at           TIMESTAMPTZ,
    cancelled_at           TIMESTAMPTZ,
    cancellation_reason    TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscriptions_org_uk UNIQUE (organization_id),
    CONSTRAINT subscriptions_period_chk CHECK (current_period_start < current_period_end)
);
COMMENT ON TABLE subscriptions IS 'Abonnement SaaS d''une organisation : offre, volume de lots facturé, période en cours.';
COMMENT ON COLUMN subscriptions.units_count IS 'Nombre de lots actifs facturés sur la période, recalculé à chaque échéance.';
COMMENT ON COLUMN subscriptions.grace_days IS 'Jours de tolérance après échéance avant suspension de l''accès.';

CREATE INDEX subscriptions_billing_idx ON subscriptions (next_billing_date) WHERE status IN ('TRIALING', 'ACTIVE', 'PAST_DUE');

CREATE TABLE subscription_invoices (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id        UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
    invoice_number         TEXT NOT NULL,
    status                 invoice_status NOT NULL DEFAULT 'ISSUED',
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    issue_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date               DATE NOT NULL,
    units_count            INTEGER NOT NULL DEFAULT 0 CHECK (units_count >= 0),
    subtotal_amount        BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
    discount_amount        BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    vat_rate_bps           INTEGER NOT NULL DEFAULT 1800 CHECK (vat_rate_bps BETWEEN 0 AND 10000),
    vat_amount             BIGINT NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount            BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    momo_transaction_id    UUID REFERENCES mobile_money_transactions(id) ON DELETE SET NULL,
    document_id            UUID REFERENCES documents(id) ON DELETE SET NULL,
    paid_at                TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscription_invoices_number_uk UNIQUE (invoice_number),
    CONSTRAINT subscription_invoices_period_uk UNIQUE (subscription_id, period_start),
    CONSTRAINT subscription_invoices_period_chk CHECK (period_start < period_end)
);
COMMENT ON TABLE subscription_invoices IS 'Facture d''abonnement Immodesk adressée à l''organisation cliente, réglée par Mobile Money ou virement.';
COMMENT ON COLUMN subscription_invoices.vat_rate_bps IS 'TVA congolaise applicable (1800 bps = 18 %).';

CREATE INDEX subscription_invoices_status_idx ON subscription_invoices (organization_id, status, due_date);
