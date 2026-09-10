-- =====================================================================
-- Partie 11b : Technique — webhooks, idempotence, synchronisation offline
-- =====================================================================

CREATE TABLE webhook_events (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source                 webhook_source NOT NULL,
    event_type             TEXT NOT NULL,
    status                 webhook_status NOT NULL DEFAULT 'RECEIVED',
    external_event_id      TEXT,
    signature_header       TEXT,
    signature_valid        BOOLEAN,
    http_method            TEXT NOT NULL DEFAULT 'POST',
    request_path           TEXT,
    source_ip              INET,
    headers                JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    received_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at           TIMESTAMPTZ,
    processing_attempts    SMALLINT NOT NULL DEFAULT 0 CHECK (processing_attempts >= 0),
    error_message          TEXT,
    related_entity_type    TEXT,
    related_entity_id      UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT webhook_events_external_uk UNIQUE (source, external_event_id)
);
COMMENT ON TABLE webhook_events IS 'Notification entrante d''un partenaire (agrégateur Mobile Money, WhatsApp, passerelle SMS). Le payload brut est conservé pour audit et rejeu.';
COMMENT ON COLUMN webhook_events.organization_id IS 'Nullable : certains webhooks arrivent avant résolution du tenant ; renseigné dès identification.';
COMMENT ON COLUMN webhook_events.signature_valid IS 'Résultat de la vérification HMAC ; un webhook non signé ne confirme jamais un paiement.';
COMMENT ON COLUMN webhook_events.raw_payload IS 'Corps brut intégral reçu du partenaire.';

CREATE INDEX webhook_events_pending_idx ON webhook_events (source, received_at) WHERE status IN ('RECEIVED', 'PROCESSING');
CREATE INDEX webhook_events_org_idx ON webhook_events (organization_id, source, received_at DESC);
CREATE INDEX webhook_events_payload_gin ON webhook_events USING GIN (raw_payload jsonb_path_ops);

-- FK différée : mobile_money_transactions.webhook_event_id (déclarée en partie 07).
ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT momo_webhook_event_fk FOREIGN KEY (webhook_event_id) REFERENCES webhook_events(id) ON DELETE SET NULL;

CREATE TABLE idempotency_keys (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key                    TEXT NOT NULL,
    scope                  TEXT NOT NULL,
    user_id                UUID REFERENCES users(id) ON DELETE SET NULL,
    request_method         TEXT NOT NULL,
    request_path           TEXT NOT NULL,
    request_hash           TEXT NOT NULL,
    response_status        SMALLINT CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599),
    response_body          JSONB,
    resource_type          TEXT,
    resource_id            UUID,
    locked_at              TIMESTAMPTZ,
    completed_at           TIMESTAMPTZ,
    expires_at             TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT idempotency_keys_uk UNIQUE (organization_id, scope, key)
);
COMMENT ON TABLE idempotency_keys IS 'Registre des clés d''idempotence des écritures API (client_ref mobile, en-tête Idempotency-Key) et de la réponse rejouée.';
COMMENT ON COLUMN idempotency_keys.request_hash IS 'Empreinte du corps de requête : un même clé avec un corps différent est rejetée.';
COMMENT ON COLUMN idempotency_keys.response_body IS 'Réponse mémorisée, restituée telle quelle en cas de rejeu.';

CREATE INDEX idempotency_keys_expiry_idx ON idempotency_keys (expires_at);

CREATE TABLE sync_batches (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id              TEXT NOT NULL,
    device_platform        TEXT,
    app_version            TEXT,
    batch_ref              TEXT NOT NULL,
    status                 sync_batch_status NOT NULL DEFAULT 'RECEIVED',
    operations_count       INTEGER NOT NULL DEFAULT 0 CHECK (operations_count >= 0),
    applied_count          INTEGER NOT NULL DEFAULT 0 CHECK (applied_count >= 0),
    rejected_count         INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
    conflicts_count        INTEGER NOT NULL DEFAULT 0 CHECK (conflicts_count >= 0),
    client_generated_at    TIMESTAMPTZ,
    received_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_at             TIMESTAMPTZ,
    payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
    result                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message          TEXT,
    offline_duration_minutes INTEGER CHECK (offline_duration_minutes IS NULL OR offline_duration_minutes >= 0),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sync_batches_ref_uk UNIQUE (organization_id, device_id, batch_ref)
);
COMMENT ON TABLE sync_batches IS 'Lot d''opérations remontées par l''application mobile hors ligne (Drift/SQLite) et son résultat d''application.';
COMMENT ON COLUMN sync_batches.batch_ref IS 'ULID du lot généré sur l''appareil, clé d''idempotence de la synchronisation.';
COMMENT ON COLUMN sync_batches.conflicts_count IS 'Nombre d''opérations en conflit avec l''état serveur, à arbitrer manuellement.';
COMMENT ON COLUMN sync_batches.payload IS 'Opérations brutes envoyées par l''appareil, conservées pour rejeu et diagnostic.';

CREATE INDEX sync_batches_org_status_idx ON sync_batches (organization_id, status, received_at DESC);
CREATE INDEX sync_batches_device_idx ON sync_batches (organization_id, device_id, received_at DESC);
CREATE INDEX sync_batches_user_idx ON sync_batches (organization_id, user_id, received_at DESC);

-- FK différées vers sync_batches (colonnes sync_batch_id des parties 03c, 04c, 06a, 06b, 10a).
ALTER TABLE meter_readings ADD CONSTRAINT meter_readings_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
ALTER TABLE inspections ADD CONSTRAINT inspections_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
ALTER TABLE payments ADD CONSTRAINT payments_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
ALTER TABLE cash_receipts ADD CONSTRAINT cash_receipts_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_sync_fk FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;
