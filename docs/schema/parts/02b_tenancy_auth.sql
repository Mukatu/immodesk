-- =====================================================================
-- Partie 02b : Tenancy & sécurité — credentials, OTP, sessions, membres
-- =====================================================================

CREATE TABLE user_credentials (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash          TEXT,
    password_algo          TEXT NOT NULL DEFAULT 'argon2id',
    password_updated_at    TIMESTAMPTZ,
    pin_hash               TEXT,
    totp_secret_encrypted  BYTEA,
    mfa_enabled            BOOLEAN NOT NULL DEFAULT false,
    failed_attempts        SMALLINT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    locked_until           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_credentials_user_key UNIQUE (user_id)
);
COMMENT ON TABLE user_credentials IS 'Table GLOBALE : secrets d''authentification. Mot de passe optionnel (web) ; l''auth principale est téléphone + OTP.';
COMMENT ON COLUMN user_credentials.pin_hash IS 'Code PIN court utilisé par l''app démarcheur en mode hors ligne.';
COMMENT ON COLUMN user_credentials.locked_until IS 'Verrouillage temporaire après trop de tentatives échouées.';

CREATE TABLE otp_codes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_e164     TEXT NOT NULL,
    purpose        otp_purpose NOT NULL,
    delivery       otp_delivery NOT NULL DEFAULT 'SMS',
    code_hash      TEXT NOT NULL,
    attempts       SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts   SMALLINT NOT NULL DEFAULT 5,
    expires_at     TIMESTAMPTZ NOT NULL,
    consumed_at    TIMESTAMPTZ,
    request_ip     INET,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT otp_codes_phone_e164_chk CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);
COMMENT ON TABLE otp_codes IS 'Table GLOBALE : codes à usage unique envoyés par SMS ou WhatsApp. Le code clair n''est jamais stocké.';
COMMENT ON COLUMN otp_codes.code_hash IS 'Hash du code (pgcrypto), jamais le code en clair.';

CREATE INDEX otp_codes_phone_purpose_idx ON otp_codes (phone_e164, purpose, created_at DESC);
CREATE INDEX otp_codes_active_idx ON otp_codes (expires_at) WHERE consumed_at IS NULL;

CREATE TABLE refresh_tokens (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash         TEXT NOT NULL,
    family_id          UUID NOT NULL DEFAULT gen_random_uuid(),
    parent_token_id    UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    device_id          TEXT,
    device_label       TEXT,
    user_agent         TEXT,
    ip_address         INET,
    issued_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    revoked_reason     TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT refresh_tokens_hash_key UNIQUE (token_hash)
);
COMMENT ON TABLE refresh_tokens IS 'Table GLOBALE : refresh tokens rotatifs (30 j). Une famille compromise est révoquée en bloc.';
COMMENT ON COLUMN refresh_tokens.family_id IS 'Chaîne de rotation : la réutilisation d''un token révoqué invalide toute la famille.';

CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE organization_members (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                 member_role NOT NULL,
    status               member_status NOT NULL DEFAULT 'ACTIVE',
    job_title            TEXT,
    employee_ref         TEXT,
    collector_zone       TEXT,
    cash_limit_amount    BIGINT NOT NULL DEFAULT 0 CHECK (cash_limit_amount >= 0),
    currency             CHAR(3) NOT NULL DEFAULT 'XAF',
    invited_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT organization_members_uk UNIQUE (organization_id, user_id)
);
COMMENT ON TABLE organization_members IS 'Rattachement d''un utilisateur à une organisation avec son rôle (OWNER, MANAGER, COLLECTOR, ACCOUNTANT, VIEWER).';
COMMENT ON COLUMN organization_members.collector_zone IS 'Zone/quartier de tournée du démarcheur (COLLECTOR).';
COMMENT ON COLUMN organization_members.cash_limit_amount IS 'Encaisse maximale autorisée avant reversement obligatoire ; 0 = illimité.';

CREATE INDEX organization_members_org_role_idx ON organization_members (organization_id, role) WHERE status = 'ACTIVE';

CREATE TABLE invitations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_e164         TEXT,
    email              TEXT,
    role               member_role NOT NULL,
    token_hash         TEXT NOT NULL,
    status             invitation_status NOT NULL DEFAULT 'PENDING',
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at         TIMESTAMPTZ NOT NULL,
    accepted_at        TIMESTAMPTZ,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT invitations_token_key UNIQUE (token_hash),
    CONSTRAINT invitations_target_chk CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL)
);
COMMENT ON TABLE invitations IS 'Invitation d''un collaborateur à rejoindre une organisation (lien signé + OTP).';

CREATE INDEX invitations_org_status_idx ON invitations (organization_id, status);

CREATE TABLE api_keys (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    key_prefix         TEXT NOT NULL,
    key_hash           TEXT NOT NULL,
    scopes             TEXT[] NOT NULL DEFAULT '{}',
    status             api_key_status NOT NULL DEFAULT 'ACTIVE',
    allowed_ips        INET[],
    last_used_at       TIMESTAMPTZ,
    expires_at         TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT api_keys_hash_key UNIQUE (key_hash),
    CONSTRAINT api_keys_prefix_key UNIQUE (key_prefix)
);
COMMENT ON TABLE api_keys IS 'Clés d''API machine-to-machine par organisation (intégrations, exports comptables).';
COMMENT ON COLUMN api_keys.key_prefix IS 'Préfixe public affichable (8 caractères) permettant d''identifier la clé sans la révéler.';
