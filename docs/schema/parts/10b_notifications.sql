-- =====================================================================
-- Partie 10b : Communication — modèles, notifications, journal des messages
-- =====================================================================

CREATE TABLE notification_templates (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code                   TEXT NOT NULL,
    channel                notification_channel NOT NULL,
    locale                 TEXT NOT NULL DEFAULT 'fr-CG',
    name                   TEXT NOT NULL,
    subject                TEXT,
    body                   TEXT NOT NULL,
    provider_template_name TEXT,
    provider_template_lang TEXT,
    variables              JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    is_system              BOOLEAN NOT NULL DEFAULT false,
    approved_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notification_templates_uk UNIQUE (organization_id, code, channel, locale)
);
COMMENT ON TABLE notification_templates IS 'Modèle de message par canal et par langue (quittance, relance, échéance, confirmation de paiement).';
COMMENT ON COLUMN notification_templates.provider_template_name IS 'Nom du template approuvé côté WhatsApp Cloud API, obligatoire hors fenêtre de 24 h.';
COMMENT ON COLUMN notification_templates.variables IS 'Liste ordonnée des variables attendues par le modèle ({{1}}, {{2}}...).';

CREATE TABLE notifications (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id            UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    channel                notification_channel NOT NULL,
    status                 notification_status NOT NULL DEFAULT 'SCHEDULED',
    recipient_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
    recipient_landlord_id  UUID REFERENCES landlords(id) ON DELETE SET NULL,
    recipient_address      TEXT NOT NULL,
    subject                TEXT,
    body                   TEXT NOT NULL,
    payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_entity_type    TEXT,
    related_entity_id      UUID,
    scheduled_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at                TIMESTAMPTZ,
    failed_at              TIMESTAMPTZ,
    attempts               SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts           SMALLINT NOT NULL DEFAULT 3,
    last_error             TEXT,
    job_id                 TEXT,
    dedupe_key             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notifications_dedupe_uk UNIQUE (organization_id, dedupe_key)
);
COMMENT ON TABLE notifications IS 'Notification planifiée ou envoyée à un tiers, indépendamment du canal effectif.';
COMMENT ON COLUMN notifications.recipient_address IS 'Adresse de destination : numéro E.164 (SMS/WhatsApp), courriel ou jeton push.';
COMMENT ON COLUMN notifications.related_entity_type IS 'Entité déclenchante (rent_invoice, receipt, maintenance_request, lease).';
COMMENT ON COLUMN notifications.dedupe_key IS 'Clé anti-doublon : empêche deux relances identiques le même jour.';

CREATE INDEX notifications_pending_idx ON notifications (organization_id, scheduled_at)
    WHERE status IN ('SCHEDULED', 'QUEUED');
CREATE INDEX notifications_recipient_idx ON notifications (organization_id, recipient_tenant_id, scheduled_at DESC);
CREATE INDEX notifications_entity_idx ON notifications (organization_id, related_entity_type, related_entity_id);

CREATE TABLE message_logs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    notification_id        UUID REFERENCES notifications(id) ON DELETE SET NULL,
    channel                notification_channel NOT NULL,
    status                 message_status NOT NULL DEFAULT 'QUEUED',
    provider               TEXT NOT NULL,
    provider_message_id    TEXT,
    direction              TEXT NOT NULL DEFAULT 'OUTBOUND',
    from_address           TEXT,
    to_address             TEXT NOT NULL,
    template_code          TEXT,
    content_preview        TEXT,
    segments_count         SMALLINT NOT NULL DEFAULT 1 CHECK (segments_count >= 0),
    cost_amount            BIGINT NOT NULL DEFAULT 0 CHECK (cost_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    queued_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at                TIMESTAMPTZ,
    delivered_at           TIMESTAMPTZ,
    read_at                TIMESTAMPTZ,
    failed_at              TIMESTAMPTZ,
    error_code             TEXT,
    error_message          TEXT,
    raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_entity_type    TEXT,
    related_entity_id      UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT message_logs_provider_msg_uk UNIQUE (provider, provider_message_id)
);
COMMENT ON TABLE message_logs IS 'Journal technique des messages WhatsApp/SMS/e-mail, avec accusés de livraison et de lecture.';
COMMENT ON COLUMN message_logs.segments_count IS 'Nombre de segments SMS facturés par la passerelle.';
COMMENT ON COLUMN message_logs.cost_amount IS 'Coût unitaire du message en XAF, pour le suivi budgétaire des relances.';
COMMENT ON COLUMN message_logs.raw_payload IS 'Réponse brute du fournisseur et webhooks de statut associés.';

CREATE INDEX message_logs_org_status_idx ON message_logs (organization_id, status, queued_at DESC);
CREATE INDEX message_logs_to_idx ON message_logs (organization_id, to_address, queued_at DESC);
CREATE INDEX message_logs_entity_idx ON message_logs (organization_id, related_entity_type, related_entity_id);

-- FK différée : receipts.message_log_id (déclarée en partie 08b).
ALTER TABLE receipts
    ADD CONSTRAINT receipts_message_log_fk FOREIGN KEY (message_log_id) REFERENCES message_logs(id) ON DELETE SET NULL;
