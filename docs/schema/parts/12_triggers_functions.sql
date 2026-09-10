-- =====================================================================
-- Partie 12 : Fonctions et déclencheurs
-- =====================================================================

-- ---------------------------------------------------------------------
-- Horodatage automatique
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION set_updated_at() IS 'Positionne updated_at à now() avant chaque UPDATE. Attaché à toutes les tables portant updated_at.';

-- Attachement générique : une fois pour toutes les tables du schéma public
-- possédant une colonne updated_at.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND c.column_name = 'updated_at'
          AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_set_updated_at BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()', r.table_name);
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- Tables append-only (écritures financières et audit)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_update_delete() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'Table % en append-only : % interdit. Toute correction passe par une écriture de contre-passation.',
        TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$;
COMMENT ON FUNCTION forbid_update_delete() IS 'Interdit UPDATE et DELETE sur les tables financières et d''audit : la correction se fait par contre-passation (reversal_of_id).';

CREATE TRIGGER trg_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();

CREATE TRIGGER trg_payment_allocations_append_only
    BEFORE UPDATE OR DELETE ON payment_allocations
    FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();

-- ---------------------------------------------------------------------
-- Tables financières à colonnes verrouillées (payments, receipts, cash_receipts)
-- DELETE interdit. UPDATE autorisé uniquement sur les colonnes de workflow
-- (statut, dates de confirmation/rejet/annulation, montants imputés, liens
-- vers documents et remises). Les colonnes financières listées en argument
-- du trigger sont « set-once » : une fois non nulles, elles ne changent plus.
-- Toute correction d'un montant passe par une contre-passation (reversal_of_id).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_financial_row() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_col TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Table % : DELETE interdit. Toute correction passe par une contre-passation.',
            TG_TABLE_NAME
            USING ERRCODE = 'restrict_violation';
    END IF;

    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);

    FOREACH v_col IN ARRAY TG_ARGV LOOP
        IF (v_old -> v_col) IS NOT NULL
           AND jsonb_typeof(v_old -> v_col) <> 'null'
           AND (v_old -> v_col) IS DISTINCT FROM (v_new -> v_col) THEN
            RAISE EXCEPTION
                'Table % : la colonne % est verrouillée (valeur financière). Correction par contre-passation uniquement.',
                TG_TABLE_NAME, v_col
                USING ERRCODE = 'restrict_violation';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION guard_financial_row() IS 'Interdit DELETE et verrouille (set-once) les colonnes financières passées en argument ; les colonnes de workflow restent modifiables.';

CREATE TRIGGER trg_payments_guard
    BEFORE UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION guard_financial_row(
        'organization_id', 'tenant_id', 'lease_id', 'landlord_id', 'direction',
        'method', 'reference', 'amount', 'currency', 'payment_date',
        'received_by_user_id', 'client_ref', 'reversal_of_id', 'created_at');

CREATE TRIGGER trg_receipts_guard
    BEFORE UPDATE OR DELETE ON receipts
    FOR EACH ROW EXECUTE FUNCTION guard_financial_row(
        'organization_id', 'payment_id', 'invoice_id', 'tenant_id', 'receipt_number',
        'period_start', 'period_end', 'issue_date', 'rent_amount', 'charges_amount',
        'penalty_amount', 'total_amount', 'currency', 'verification_token',
        'content_hash', 'created_at');

-- Commissions d'apport d'affaires : même régime financier que payments.
-- Colonnes de workflow restant modifiables : status, approved_at,
-- approved_by_user_id, paid_at, payout_id, period_month, reason, updated_at.
CREATE TRIGGER trg_referral_commissions_guard
    BEFORE UPDATE OR DELETE ON referral_commissions
    FOR EACH ROW EXECUTE FUNCTION guard_financial_row(
        'referral_id', 'partner_id', 'subscription_invoice_id', 'base_amount',
        'rate_bps', 'commission_amount', 'accrued_at', 'reversal_of_id', 'created_at');

CREATE TRIGGER trg_cash_receipts_guard
    BEFORE UPDATE OR DELETE ON cash_receipts
    FOR EACH ROW EXECUTE FUNCTION guard_financial_row(
        'organization_id', 'payment_id', 'lease_id', 'tenant_id', 'collector_user_id',
        'receipt_number', 'amount', 'currency', 'received_at', 'payer_name',
        'signature_document_id', 'signature_hash', 'client_ref', 'reversal_of_id',
        'created_at');

-- ---------------------------------------------------------------------
-- Numérotation séquentielle atomique
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_sequence(p_org UUID, p_kind TEXT, p_period TEXT DEFAULT '')
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    v_next BIGINT;
BEGIN
    IF p_org IS NULL OR p_kind IS NULL THEN
        RAISE EXCEPTION 'next_sequence : organisation et nature obligatoires'
            USING ERRCODE = 'null_value_not_allowed';
    END IF;

    INSERT INTO sequences (organization_id, kind, period, last_value)
    VALUES (p_org, p_kind, coalesce(p_period, ''), 1)
    ON CONFLICT (organization_id, kind, period)
    DO UPDATE SET last_value = sequences.last_value + 1,
                  updated_at = now()
    RETURNING last_value INTO v_next;

    RETURN v_next;
END;
$$;
COMMENT ON FUNCTION next_sequence(UUID, TEXT, TEXT) IS
    'Réserve atomiquement le numéro suivant pour (organisation, nature, période) via INSERT ... ON CONFLICT DO UPDATE RETURNING. Alimente LOY-{YYYYMM}-{seq}, QUI-{YYYYMM}-{seq}, CASH-{org}-{collector}-{seq}.';

-- ---------------------------------------------------------------------
-- Formatage d'un numéro de document à partir de la séquence
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION format_sequence_number(p_prefix TEXT, p_period TEXT, p_value BIGINT, p_padding SMALLINT DEFAULT 5)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT concat_ws('-', p_prefix, nullif(p_period, ''), lpad(p_value::TEXT, greatest(p_padding, 1), '0'));
$$;
COMMENT ON FUNCTION format_sequence_number(TEXT, TEXT, BIGINT, SMALLINT) IS
    'Compose un numéro de document lisible : format_sequence_number(''LOY'', ''202603'', 42, 5) -> LOY-202603-00042.';

-- ---------------------------------------------------------------------
-- Apport d'affaires : interdiction de l'auto-parrainage
-- Un partenaire ne peut pas parrainer sa propre organisation. La règle est
-- inter-tables (referrals -> referral_partners.organization_id), donc hors
-- de portée d'une contrainte CHECK : elle est portée par ce déclencheur.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_self_referral() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_partner_org UUID;
    v_partner_code TEXT;
BEGIN
    SELECT p.organization_id, p.partner_code
      INTO v_partner_org, v_partner_code
      FROM referral_partners p
     WHERE p.id = NEW.partner_id;

    IF v_partner_org IS NOT NULL AND v_partner_org = NEW.referred_organization_id THEN
        RAISE EXCEPTION
            'Auto-parrainage interdit : le partenaire % ne peut pas parrainer sa propre organisation (%).',
            coalesce(v_partner_code, NEW.partner_id::TEXT), NEW.referred_organization_id
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$;
COMMENT ON FUNCTION forbid_self_referral() IS 'Règle anti-abus : rejette tout referral dont l''organisation filleule est l''organisation propre du partenaire.';

CREATE TRIGGER trg_referrals_no_self_referral
    BEFORE INSERT OR UPDATE OF partner_id, referred_organization_id ON referrals
    FOR EACH ROW EXECUTE FUNCTION forbid_self_referral();
