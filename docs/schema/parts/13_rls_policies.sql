-- =====================================================================
-- Partie 13 : Row Level Security — isolation multi-tenant
-- L'API positionne `SET LOCAL app.current_organization_id = '<uuid>'`
-- au début de chaque transaction, sous le rôle immodesk_app.
-- =====================================================================

-- Droits du rôle applicatif.
GRANT USAGE ON SCHEMA public TO immodesk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO immodesk_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO immodesk_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO immodesk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO immodesk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO immodesk_app;

-- Activation du RLS et policy org_isolation sur toute table portant organization_id.
DO $$
DECLARE
    r RECORD;
    v_using TEXT;
BEGIN
    FOR r IN
        SELECT c.table_name, c.is_nullable
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND c.column_name = 'organization_id'
          AND t.table_type = 'BASE TABLE'
          -- Les tables du programme d'apport d'affaires sont GLOBALES : leur
          -- éventuel organization_id désigne l'organisation propre du
          -- partenaire, pas un tenant propriétaire de la ligne. Elles portent
          -- leurs propres policies (partner_self) plus bas.
          AND c.table_name NOT LIKE 'referral%'
        ORDER BY c.table_name
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.table_name);

        -- Les tables dont organization_id est nullable portent aussi des lignes
        -- globales (drapeaux système, webhooks non encore rattachés à un tenant).
        IF r.is_nullable = 'YES' THEN
            v_using := '(organization_id IS NULL OR organization_id = current_setting(''app.current_organization_id'', true)::uuid)';
        ELSE
            v_using := '(organization_id = current_setting(''app.current_organization_id'', true)::uuid)';
        END IF;

        EXECUTE format(
            'CREATE POLICY org_isolation ON %I
                 AS PERMISSIVE FOR ALL TO immodesk_app
                 USING %s WITH CHECK %s',
            r.table_name, v_using, v_using);
    END LOOP;
END;
$$;

-- organizations ne porte pas de colonne organization_id : l'isolation se fait
-- sur sa clé primaire.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON organizations
    AS PERMISSIVE FOR ALL TO immodesk_app
    USING (id = current_setting('app.current_organization_id', true)::uuid)
    WITH CHECK (id = current_setting('app.current_organization_id', true)::uuid);
COMMENT ON POLICY org_isolation ON organizations IS
    'Isolation multi-tenant : une transaction ne voit que l''organisation positionnée dans app.current_organization_id.';

-- Tables globales : pas de organization_id, donc pas de RLS d'isolation.
-- users, user_credentials, otp_codes, refresh_tokens et subscription_plans
-- restent accessibles au rôle applicatif, l'autorisation étant assurée
-- par la couche applicative (JWT + organization_members).

-- feature_flags : lecture des drapeaux globaux autorisée à tous les tenants,
-- écriture réservée aux drapeaux du tenant courant.
CREATE POLICY global_flags_readonly ON feature_flags
    AS RESTRICTIVE FOR UPDATE TO immodesk_app
    USING (organization_id IS NOT NULL);
CREATE POLICY global_flags_no_delete ON feature_flags
    AS RESTRICTIVE FOR DELETE TO immodesk_app
    USING (organization_id IS NOT NULL);

COMMENT ON POLICY org_isolation ON organization_settings IS
    'Isolation multi-tenant : une transaction ne voit que les lignes de l''organisation positionnée dans app.current_organization_id.';

-- =====================================================================
-- Programme d'apport d'affaires : tables GLOBALES, cloisonnées par partenaire
-- L'API positionne `SET LOCAL app.current_user_id = '<uuid>'` en plus de
-- app.current_organization_id. Le partenaire ne voit que SES lignes ; toute
-- opération d'administration (constatation, approbation, versement,
-- vérification d'identité, gestion des barèmes) passe par immodesk_admin.
-- =====================================================================

-- Rôle d'administration plateforme : hors RLS (BYPASSRLS), réservé aux
-- travaux de back-office Immodesk et aux jobs de commissionnement.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'immodesk_admin') THEN
        CREATE ROLE immodesk_admin NOLOGIN BYPASSRLS;
    END IF;
END
$$;
COMMENT ON ROLE immodesk_admin IS 'Rôle back-office Immodesk : BYPASSRLS, utilisé par la console d''administration et les jobs de commissionnement / versement du programme d''apport d''affaires.';

GRANT USAGE ON SCHEMA public TO immodesk_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO immodesk_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO immodesk_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO immodesk_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO immodesk_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO immodesk_admin;

ALTER TABLE referral_programs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_partners    ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts     ENABLE ROW LEVEL SECURITY;

-- Barèmes : lecture publique des programmes actifs, écriture réservée à
-- immodesk_admin (aucune policy INSERT/UPDATE/DELETE pour immodesk_app).
CREATE POLICY active_programs_readonly ON referral_programs
    AS PERMISSIVE FOR SELECT TO immodesk_app
    USING (is_active AND valid_from <= CURRENT_DATE
           AND (valid_to IS NULL OR valid_to >= CURRENT_DATE));
COMMENT ON POLICY active_programs_readonly ON referral_programs IS
    'Lecture publique des barèmes en vigueur (affichage des conditions du programme) ; toute écriture passe par immodesk_admin.';

-- Fiche partenaire : chaque utilisateur ne voit et ne gère que la sienne.
CREATE POLICY partner_self ON referral_partners
    AS PERMISSIVE FOR ALL TO immodesk_app
    USING (user_id = current_setting('app.current_user_id', true)::uuid)
    WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);
COMMENT ON POLICY partner_self ON referral_partners IS
    'Un utilisateur ne voit que sa propre fiche partenaire. La vérification d''identité (verified_at, status ACTIVE) est appliquée par immodesk_admin.';

-- Parrainages : visibles et créés par le partenaire lui-même (saisie du code
-- à l'inscription du filleul, enregistrement d'un immeuble apporté).
CREATE POLICY partner_self ON referrals
    AS PERMISSIVE FOR ALL TO immodesk_app
    USING (partner_id = (SELECT id FROM referral_partners
                          WHERE user_id = current_setting('app.current_user_id', true)::uuid))
    WITH CHECK (partner_id = (SELECT id FROM referral_partners
                               WHERE user_id = current_setting('app.current_user_id', true)::uuid));
COMMENT ON POLICY partner_self ON referrals IS
    'Cloisonnement par partenaire : un apporteur ne voit que ses filleuls. L''unicité du parrain et l''interdiction d''auto-parrainage sont assurées par referrals_org_uk et le trigger forbid_self_referral.';

-- Commissions : LECTURE SEULE pour le partenaire. Constatation, approbation
-- et contre-passation sont des écritures financières réservées à immodesk_admin.
CREATE POLICY partner_self ON referral_commissions
    AS PERMISSIVE FOR SELECT TO immodesk_app
    USING (partner_id = (SELECT id FROM referral_partners
                          WHERE user_id = current_setting('app.current_user_id', true)::uuid));
COMMENT ON POLICY partner_self ON referral_commissions IS
    'Le partenaire consulte ses commissions ; il ne peut ni les créer ni les modifier (écritures financières réservées à immodesk_admin, colonnes verrouillées par guard_financial_row).';

-- Versements : LECTURE SEULE pour le partenaire (suivi de ses paiements MoMo).
CREATE POLICY partner_self ON referral_payouts
    AS PERMISSIVE FOR SELECT TO immodesk_app
    USING (partner_id = (SELECT id FROM referral_partners
                          WHERE user_id = current_setting('app.current_user_id', true)::uuid));
COMMENT ON POLICY partner_self ON referral_payouts IS
    'Le partenaire suit ses versements Mobile Money ; l''ordonnancement et l''exécution des paiements relèvent d''immodesk_admin.';
