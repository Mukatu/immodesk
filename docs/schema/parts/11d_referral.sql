-- =====================================================================
-- Partie 11d : Programme d'apport d'affaires (parrainage)
-- Tables GLOBALES gérées par la plateforme Immodesk : elles ne portent
-- PAS de organization_id d'isolation et ne sont donc pas soumises à la
-- policy générique org_isolation (voir partie 13). Le cloisonnement se
-- fait par partenaire (app.current_user_id) ; l'administration passe par
-- le rôle immodesk_admin (BYPASSRLS).
-- Montants en BIGINT XAF, taux en points de base (bps, 10000 = 100 %).
-- =====================================================================

CREATE TABLE referral_programs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                   TEXT NOT NULL,
    name                   TEXT NOT NULL,
    description            TEXT,
    rate_bps               INTEGER NOT NULL DEFAULT 2000 CHECK (rate_bps BETWEEN 0 AND 10000),
    duration_months        SMALLINT NOT NULL DEFAULT 12 CHECK (duration_months > 0),
    min_payout_amount      BIGINT NOT NULL DEFAULT 5000 CHECK (min_payout_amount >= 0),
    monthly_cap_amount     BIGINT CHECK (monthly_cap_amount IS NULL OR monthly_cap_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    valid_from             DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to               DATE,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referral_programs_code_uk UNIQUE (code),
    CONSTRAINT referral_programs_validity_chk CHECK (valid_to IS NULL OR valid_from < valid_to)
);
COMMENT ON TABLE referral_programs IS 'Table GLOBALE : barèmes du programme d''apport d''affaires définis par la plateforme (taux, durée, plafond). Un referral est figé sur le programme en vigueur à son rattachement.';
COMMENT ON COLUMN referral_programs.code IS 'Code lisible du barème (ex. DEMARCHEUR_2026), unique et stable : sert de référence dans les CGU partenaires.';
COMMENT ON COLUMN referral_programs.rate_bps IS 'Taux de commission en points de base appliqué au montant encaissé de chaque subscription_invoice (2000 bps = 20 %).';
COMMENT ON COLUMN referral_programs.duration_months IS 'Durée en mois pendant laquelle les factures d''abonnement du filleul génèrent une commission, à compter de la qualification.';
COMMENT ON COLUMN referral_programs.min_payout_amount IS 'Seuil minimum de versement en XAF : les commissions APPROVED s''accumulent tant que le total reste sous ce seuil.';
COMMENT ON COLUMN referral_programs.monthly_cap_amount IS 'Plafond mensuel de commission par partenaire en XAF (règle anti-abus) ; NULL = pas de plafond.';
COMMENT ON COLUMN referral_programs.valid_to IS 'Dernier jour d''éligibilité de nouveaux parrainages ; les referrals déjà rattachés vont au terme de leur durée.';

CREATE INDEX referral_programs_active_idx ON referral_programs (is_active, valid_from DESC);

CREATE TABLE referral_partners (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    partner_code           TEXT NOT NULL,
    status                 referral_partner_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    organization_id        UUID REFERENCES organizations(id) ON DELETE SET NULL,
    display_name           TEXT,
    id_document_type       id_document_type,
    id_document_number     TEXT,
    id_document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,
    payout_momo_provider   momo_provider,
    payout_msisdn          TEXT,
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    verified_at            TIMESTAMPTZ,
    verified_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    suspended_at           TIMESTAMPTZ,
    suspension_reason      TEXT,
    total_accrued_amount   BIGINT NOT NULL DEFAULT 0 CHECK (total_accrued_amount >= 0),
    total_paid_amount      BIGINT NOT NULL DEFAULT 0 CHECK (total_paid_amount >= 0),
    accepted_terms_at      TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referral_partners_user_uk UNIQUE (user_id),
    CONSTRAINT referral_partners_code_uk UNIQUE (partner_code),
    CONSTRAINT referral_partners_code_chk CHECK (partner_code ~ '^IMD-[A-Z0-9]{6}$'),
    CONSTRAINT referral_partners_msisdn_chk CHECK (payout_msisdn IS NULL OR payout_msisdn ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT referral_partners_payout_chk CHECK (
        (payout_msisdn IS NULL AND payout_momo_provider IS NULL) OR
        (payout_msisdn IS NOT NULL AND payout_momo_provider IS NOT NULL)),
    CONSTRAINT referral_partners_verified_chk CHECK (
        status <> 'ACTIVE' OR (verified_at IS NOT NULL AND payout_msisdn IS NOT NULL)),
    CONSTRAINT referral_partners_totals_chk CHECK (total_paid_amount <= total_accrued_amount)
);
COMMENT ON TABLE referral_partners IS 'Table GLOBALE : apporteur d''affaires (démarcheur en priorité) identifié par un code unique. Un compte utilisateur = au plus un partenaire. Vérification d''identité légère (CNI + numéro Mobile Money) obligatoire avant tout versement.';
COMMENT ON COLUMN referral_partners.user_id IS 'Compte utilisateur global du partenaire ; unique (un utilisateur ne peut détenir qu''un seul code).';
COMMENT ON COLUMN referral_partners.partner_code IS 'Code de parrainage communiqué aux prospects, format IMD-XXXXXX (6 caractères A-Z0-9, sans ambiguïté visuelle).';
COMMENT ON COLUMN referral_partners.organization_id IS 'Organisation propre du partenaire (son espace gestionnaire INDEPENDENT_MANAGER) quand il en a une. Sert la règle anti-abus : il ne peut pas parrainer sa propre organisation.';
COMMENT ON COLUMN referral_partners.id_document_number IS 'Numéro de la pièce d''identité, contrôlé manuellement par la plateforme avant passage en ACTIVE.';
COMMENT ON COLUMN referral_partners.payout_momo_provider IS 'Opérateur Mobile Money de versement (MTN MoMo, Airtel Money) ou agrégateur.';
COMMENT ON COLUMN referral_partners.payout_msisdn IS 'Numéro Mobile Money de versement au format E.164 (+242...), au nom du partenaire.';
COMMENT ON COLUMN referral_partners.verified_by_user_id IS 'Administrateur plateforme ayant validé la pièce d''identité et le numéro de versement.';
COMMENT ON COLUMN referral_partners.total_accrued_amount IS 'Cumul en XAF des commissions constatées (dénormalisation de referral_commissions, recalculée par lot de contrôle).';
COMMENT ON COLUMN referral_partners.total_paid_amount IS 'Cumul en XAF des commissions effectivement versées par Mobile Money.';

CREATE INDEX referral_partners_status_idx ON referral_partners (status, created_at DESC);
CREATE INDEX referral_partners_org_idx ON referral_partners (organization_id) WHERE organization_id IS NOT NULL;

CREATE TABLE referrals (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id                UUID NOT NULL REFERENCES referral_partners(id) ON DELETE RESTRICT,
    referred_organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    referred_property_id      UUID REFERENCES properties(id) ON DELETE SET NULL,
    program_id                UUID NOT NULL REFERENCES referral_programs(id) ON DELETE RESTRICT,
    source                    referral_source NOT NULL DEFAULT 'CODE_AT_SIGNUP',
    status                    referral_status NOT NULL DEFAULT 'PENDING',
    code_used                 TEXT,
    confirmed_by_otp_at       TIMESTAMPTZ,
    qualified_at              TIMESTAMPTZ,
    activated_at              TIMESTAMPTZ,
    expires_at                TIMESTAMPTZ,
    cancelled_at              TIMESTAMPTZ,
    cancellation_reason       TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referrals_org_uk UNIQUE (referred_organization_id),
    CONSTRAINT referrals_otp_chk CHECK (
        source <> 'PARTNER_REGISTERED_PROPERTY'
        OR status IN ('PENDING', 'CANCELLED')
        OR confirmed_by_otp_at IS NOT NULL),
    CONSTRAINT referrals_qualified_chk CHECK (
        status NOT IN ('QUALIFIED', 'ACTIVE', 'EXPIRED') OR qualified_at IS NOT NULL),
    CONSTRAINT referrals_cancelled_chk CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
);
COMMENT ON TABLE referrals IS 'Table GLOBALE : rattachement d''une organisation cliente à un apporteur d''affaires. Une organisation n''a qu''UN SEUL parrain (contrainte referrals_org_uk) et le parrainage est définitif.';
COMMENT ON COLUMN referrals.referred_organization_id IS 'Organisation filleule (bailleur ou gestionnaire). UNIQUE : une organisation ne peut être parrainée qu''une fois, à vie.';
COMMENT ON COLUMN referrals.referred_property_id IS 'Immeuble enregistré par le partenaire quand source = PARTNER_REGISTERED_PROPERTY ; sert de preuve de l''apport.';
COMMENT ON COLUMN referrals.program_id IS 'Barème figé au rattachement : une modification ultérieure de referral_programs ne rétroagit pas.';
COMMENT ON COLUMN referrals.code_used IS 'Code saisi par le filleul à l''inscription, conservé tel quel (traçabilité même si le partenaire change de code).';
COMMENT ON COLUMN referrals.confirmed_by_otp_at IS 'Confirmation du bailleur par OTP quand l''apport résulte d''un immeuble enregistré par le partenaire : obligatoire avant qualification.';
COMMENT ON COLUMN referrals.qualified_at IS 'Date de qualification (filleul confirmé) : point de départ de la fenêtre de commissionnement.';
COMMENT ON COLUMN referrals.activated_at IS 'Date de la première facture d''abonnement réellement encaissée.';
COMMENT ON COLUMN referrals.expires_at IS 'Fin de la fenêtre de commissionnement = qualified_at + programme.duration_months.';
COMMENT ON CONSTRAINT referrals_org_uk ON referrals IS 'Règle anti-abus : une organisation n''a qu''un seul parrain.';

-- Règle anti-auto-parrainage : referred_organization_id ne doit jamais être
-- égal à referral_partners.organization_id du parrain. Cette vérification est
-- inter-tables, donc impossible en CHECK (non déterministe) : elle est portée
-- par le trigger forbid_self_referral() (partie 12) et doublée d'un contrôle
-- applicatif à l'inscription.

CREATE INDEX referrals_partner_status_idx ON referrals (partner_id, status);
CREATE INDEX referrals_org_idx ON referrals (referred_organization_id);
CREATE INDEX referrals_program_idx ON referrals (program_id, status);
CREATE INDEX referrals_expiry_idx ON referrals (expires_at) WHERE status IN ('QUALIFIED', 'ACTIVE');

CREATE TABLE referral_commissions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id              UUID NOT NULL REFERENCES referrals(id) ON DELETE RESTRICT,
    partner_id               UUID NOT NULL REFERENCES referral_partners(id) ON DELETE RESTRICT,
    subscription_invoice_id  UUID NOT NULL REFERENCES subscription_invoices(id) ON DELETE RESTRICT,
    base_amount              BIGINT NOT NULL CHECK (base_amount >= 0),
    rate_bps                 INTEGER NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
    commission_amount        BIGINT NOT NULL CHECK (commission_amount >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    status                   referral_commission_status NOT NULL DEFAULT 'ACCRUED',
    period_month             DATE,
    accrued_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at              TIMESTAMPTZ,
    approved_by_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    paid_at                  TIMESTAMPTZ,
    payout_id                UUID,
    reversal_of_id           UUID REFERENCES referral_commissions(id) ON DELETE RESTRICT,
    reason                   TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referral_commissions_reversal_chk CHECK (reversal_of_id IS NULL OR reversal_of_id <> id),
    CONSTRAINT referral_commissions_approved_chk CHECK (status <> 'APPROVED' OR approved_at IS NOT NULL),
    CONSTRAINT referral_commissions_paid_chk CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND payout_id IS NOT NULL))
);
COMMENT ON TABLE referral_commissions IS 'Table GLOBALE et FINANCIÈRE : commission due à un partenaire sur une facture d''abonnement RÉELLEMENT ENCAISSÉE. Colonnes financières verrouillées et DELETE interdit (trigger guard_financial_row) ; toute correction se fait par contre-passation (reversal_of_id).';
COMMENT ON COLUMN referral_commissions.subscription_invoice_id IS 'Facture d''abonnement encaissée qui déclenche la commission. Une seule commission d''origine par facture (index unique partiel) ; la contre-passation référence la même facture.';
COMMENT ON COLUMN referral_commissions.base_amount IS 'Assiette en XAF = montant hors taxe réellement encaissé de la facture d''abonnement.';
COMMENT ON COLUMN referral_commissions.rate_bps IS 'Taux figé au moment de la constatation, recopié du programme du referral.';
COMMENT ON COLUMN referral_commissions.commission_amount IS 'base_amount * rate_bps / 10000, arrondi à l''unité XAF inférieure. Négatif impossible : une contre-passation porte le même montant avec status REVERSED.';
COMMENT ON COLUMN referral_commissions.period_month IS 'Premier jour du mois d''imputation, utilisé pour le plafond mensuel du programme.';
COMMENT ON COLUMN referral_commissions.payout_id IS 'Versement Mobile Money qui a réglé cette commission ; renseigné au passage en PAID (colonne de workflow, modifiable).';
COMMENT ON COLUMN referral_commissions.reversal_of_id IS 'Commission d''origine contre-passée lorsque la facture d''abonnement est remboursée ou annulée.';
COMMENT ON COLUMN referral_commissions.reason IS 'Motif de l''annulation, de la contre-passation ou du rejet (plafond mensuel atteint, fraude constatée).';

CREATE UNIQUE INDEX referral_commissions_invoice_uk
    ON referral_commissions (subscription_invoice_id) WHERE reversal_of_id IS NULL;
CREATE UNIQUE INDEX referral_commissions_reversal_uk
    ON referral_commissions (reversal_of_id) WHERE reversal_of_id IS NOT NULL;
CREATE INDEX referral_commissions_partner_status_idx ON referral_commissions (partner_id, status, accrued_at DESC);
CREATE INDEX referral_commissions_invoice_idx ON referral_commissions (subscription_invoice_id);
CREATE INDEX referral_commissions_referral_idx ON referral_commissions (referral_id, accrued_at DESC);
CREATE INDEX referral_commissions_payout_idx ON referral_commissions (payout_id) WHERE payout_id IS NOT NULL;

CREATE TABLE referral_payouts (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id             UUID NOT NULL REFERENCES referral_partners(id) ON DELETE RESTRICT,
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    total_amount           BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency               CHAR(3) NOT NULL DEFAULT 'XAF',
    status                 payout_status NOT NULL DEFAULT 'PENDING',
    momo_provider          momo_provider,
    msisdn                 TEXT,
    external_reference     TEXT,
    momo_transaction_id    UUID REFERENCES mobile_money_transactions(id) ON DELETE SET NULL,
    requested_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at            TIMESTAMPTZ,
    approved_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    paid_at                TIMESTAMPTZ,
    failure_reason         TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT referral_payouts_period_chk CHECK (period_start <= period_end),
    CONSTRAINT referral_payouts_msisdn_chk CHECK (msisdn IS NULL OR msisdn ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT referral_payouts_paid_chk CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND msisdn IS NOT NULL)),
    CONSTRAINT referral_payouts_failed_chk CHECK (status <> 'FAILED' OR failure_reason IS NOT NULL)
);
COMMENT ON TABLE referral_payouts IS 'Table GLOBALE : versement Mobile Money d''un lot de commissions APPROVED à un partenaire, sur une période. Déclenché quand le cumul atteint referral_programs.min_payout_amount.';
COMMENT ON COLUMN referral_payouts.period_start IS 'Début de la période couverte par le lot de commissions réglées.';
COMMENT ON COLUMN referral_payouts.total_amount IS 'Somme en XAF des commission_amount rattachées (referral_commissions.payout_id).';
COMMENT ON COLUMN referral_payouts.msisdn IS 'Numéro Mobile Money crédité, au format E.164, recopié de referral_partners.payout_msisdn au moment de la demande.';
COMMENT ON COLUMN referral_payouts.external_reference IS 'Référence de la transaction chez l''opérateur ou l''agrégateur, pour rapprochement et contestation.';
COMMENT ON COLUMN referral_payouts.momo_transaction_id IS 'Transaction Mobile Money sortante associée, quand le versement passe par l''agrégateur intégré.';
COMMENT ON COLUMN referral_payouts.failure_reason IS 'Motif d''échec renvoyé par l''opérateur (numéro inconnu, compte plafonné, solde émetteur insuffisant).';

CREATE INDEX referral_payouts_partner_status_idx ON referral_payouts (partner_id, status, requested_at DESC);
CREATE INDEX referral_payouts_period_idx ON referral_payouts (period_start, period_end);

-- FK différée : referral_commissions.payout_id (déclarée plus haut, la table
-- referral_payouts n'existant pas encore à ce moment).
ALTER TABLE referral_commissions
    ADD CONSTRAINT referral_commissions_payout_fk
    FOREIGN KEY (payout_id) REFERENCES referral_payouts(id) ON DELETE SET NULL;
