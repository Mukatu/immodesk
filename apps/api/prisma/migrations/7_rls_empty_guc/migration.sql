-- =====================================================================
-- 7_rls_empty_guc — Policies RLS tolérantes à un contexte vidé
--
-- Une fois `app.current_organization_id` (ou `app.current_user_id`)
-- positionné par `set_config(..., true)` sur une connexion, PostgreSQL le
-- ramène à une chaîne VIDE (et non à NULL) à la fin de la transaction.
-- Sur une connexion de pool réutilisée, `current_setting(..., true)::uuid`
-- levait alors `invalid input syntax for type uuid: ""` pour toute requête
-- sans contexte, y compris la lecture des drapeaux globaux.
--
-- Chaque occurrence de `current_setting('app.x', true)::uuid` dans les
-- policies devient `NULLIF(current_setting('app.x', true), '')::uuid` :
-- un contexte absent ou vide donne NULL, donc aucune ligne (ou seulement
-- les lignes globales) — jamais une erreur.
-- =====================================================================

DO $$
DECLARE
    r RECORD;
    v_qual TEXT;
    v_check TEXT;
    v_sql TEXT;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (qual LIKE '%current_setting(''app.%' OR with_check LIKE '%current_setting(''app.%')
    LOOP
        v_qual := regexp_replace(
            r.qual,
            '\(current_setting\(''(app\.[a-z_]+)''::text, true\)\)::uuid',
            'NULLIF(current_setting(''\1''::text, true), ''''::text)::uuid',
            'g');
        v_check := regexp_replace(
            r.with_check,
            '\(current_setting\(''(app\.[a-z_]+)''::text, true\)\)::uuid',
            'NULLIF(current_setting(''\1''::text, true), ''''::text)::uuid',
            'g');

        v_sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        IF v_qual IS NOT NULL THEN
            v_sql := v_sql || ' USING (' || v_qual || ')';
        END IF;
        IF v_check IS NOT NULL THEN
            v_sql := v_sql || ' WITH CHECK (' || v_check || ')';
        END IF;
        EXECUTE v_sql;
    END LOOP;
END
$$;
