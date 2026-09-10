-- =====================================================================
-- Partie 10c : Communication — relances (dunning)
-- =====================================================================

CREATE TABLE dunning_rules (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                   TEXT NOT NULL,
    step_order             SMALLINT NOT NULL DEFAULT 1 CHECK (step_order >= 1),
    trigger_type           dunning_trigger NOT NULL DEFAULT 'DAYS_AFTER_DUE',
    offset_days            SMALLINT NOT NULL DEFAULT 0,
    channel                notification_channel NOT NULL DEFAULT 'WHATSAPP',
    fallback_channel       notification_channel,
    template_id            UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    min_balance_amount     BIGINT NOT NULL DEFAULT 0 CHECK (min_balance_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    notify_landlord        BOOLEAN NOT NULL DEFAULT false,
    notify_collector       BOOLEAN NOT NULL DEFAULT false,
    apply_penalty          BOOLEAN NOT NULL DEFAULT false,
    penalty_rule_id        UUID REFERENCES penalty_rules(id) ON DELETE SET NULL,
    escalate_to_legal      BOOLEAN NOT NULL DEFAULT false,
    send_hour_local        SMALLINT NOT NULL DEFAULT 9 CHECK (send_hour_local BETWEEN 0 AND 23),
    skip_weekends          BOOLEAN NOT NULL DEFAULT false,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT dunning_rules_step_uk UNIQUE (organization_id, step_order)
);
COMMENT ON TABLE dunning_rules IS 'Scénario de relance impayés : palier, déclencheur, canal, modèle et pénalité éventuelle.';
COMMENT ON COLUMN dunning_rules.offset_days IS 'Décalage en jours par rapport à l''échéance ; négatif pour un rappel avant terme.';
COMMENT ON COLUMN dunning_rules.min_balance_amount IS 'Seuil d''impayé en XAF sous lequel la relance n''est pas déclenchée.';
COMMENT ON COLUMN dunning_rules.fallback_channel IS 'Canal de secours si le canal principal échoue (WhatsApp non délivré, bascule SMS).';
COMMENT ON COLUMN dunning_rules.send_hour_local IS 'Heure d''envoi en Africa/Brazzaville, pour éviter les envois nocturnes.';

CREATE INDEX dunning_rules_active_idx ON dunning_rules (organization_id, step_order) WHERE is_active;

CREATE TABLE dunning_runs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rule_id                UUID NOT NULL REFERENCES dunning_rules(id) ON DELETE RESTRICT,
    invoice_id             UUID REFERENCES rent_invoices(id) ON DELETE CASCADE,
    lease_id               UUID REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    step_order             SMALLINT NOT NULL CHECK (step_order >= 1),
    status                 dunning_step_status NOT NULL DEFAULT 'PENDING',
    run_date               DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_at            TIMESTAMPTZ,
    days_overdue           SMALLINT NOT NULL DEFAULT 0,
    balance_amount         BIGINT NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    channel                notification_channel NOT NULL,
    notification_id        UUID REFERENCES notifications(id) ON DELETE SET NULL,
    message_log_id         UUID REFERENCES message_logs(id) ON DELETE SET NULL,
    penalty_applied        BOOLEAN NOT NULL DEFAULT false,
    penalty_amount         BIGINT NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
    penalty_invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
    skip_reason            TEXT,
    error_message          TEXT,
    job_id                 TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT dunning_runs_uk UNIQUE (organization_id, rule_id, invoice_id, run_date)
);
COMMENT ON TABLE dunning_runs IS 'Exécution d''un palier de relance sur une facture impayée : message envoyé, pénalité éventuellement appliquée.';
COMMENT ON COLUMN dunning_runs.days_overdue IS 'Jours de retard au moment de l''exécution ; négatif pour un rappel avant échéance.';
COMMENT ON COLUMN dunning_runs.skip_reason IS 'Motif de non-envoi (paiement intervenu, opt-out du locataire, seuil non atteint).';

CREATE INDEX dunning_runs_pending_idx ON dunning_runs (organization_id, scheduled_at)
    WHERE status IN ('PENDING', 'RUNNING');
CREATE INDEX dunning_runs_invoice_idx ON dunning_runs (organization_id, invoice_id, step_order);
CREATE INDEX dunning_runs_tenant_idx ON dunning_runs (organization_id, tenant_id, run_date DESC);
