-- =====================================================================
-- 8_rls_global_rows_readonly — Lignes globales en lecture seule pour le
-- rôle applicatif
--
-- `feature_flags` et `webhook_events` ont un `organization_id` NULLABLE :
-- une ligne à NULL est « globale » (drapeau système, webhook non encore
-- rattaché à un tenant). La policy `org_isolation` (FOR ALL) y autorisait
-- `organization_id IS NULL OR organization_id = <contexte>` en lecture ET en
-- écriture : le rôle `immodesk_app` pouvait donc INSERT un drapeau global
-- (ex. `read_only_mode`, le gel global), et modifier ou supprimer les
-- webhooks globaux. Les policies RESTRICTIVE de feature_flags ne couvraient
-- que UPDATE/DELETE.
--
-- Nouvelle règle :
--   * feature_flags : SELECT = lignes globales + lignes du tenant courant
--     (ReadOnlyService et FeatureFlagsService lisent les drapeaux globaux) ;
--     INSERT/UPDATE/DELETE = lignes du tenant courant uniquement.
--   * webhook_events : aucune ligne globale pour le rôle applicatif (le
--     journal est lu par organisation ; l'ingestion et le rattachement des
--     lignes globales passent par immodesk_admin, BYPASSRLS).
-- Toute écriture d'une ligne globale se fait donc via le client admin.
-- =====================================================================

-- feature_flags -------------------------------------------------------
DROP POLICY IF EXISTS global_flags_readonly ON feature_flags;
DROP POLICY IF EXISTS global_flags_no_delete ON feature_flags;
DROP POLICY IF EXISTS org_isolation ON feature_flags;

CREATE POLICY org_isolation_select ON feature_flags
    AS PERMISSIVE FOR SELECT TO immodesk_app
    USING (organization_id IS NULL
           OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
CREATE POLICY org_isolation_insert ON feature_flags
    AS PERMISSIVE FOR INSERT TO immodesk_app
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
CREATE POLICY org_isolation_update ON feature_flags
    AS PERMISSIVE FOR UPDATE TO immodesk_app
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
CREATE POLICY org_isolation_delete ON feature_flags
    AS PERMISSIVE FOR DELETE TO immodesk_app
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

COMMENT ON POLICY org_isolation_select ON feature_flags IS
    'Lecture des drapeaux globaux (organization_id NULL) et de ceux du tenant courant. Les lignes globales ne sont écrites que par immodesk_admin.';

-- webhook_events ------------------------------------------------------
DROP POLICY IF EXISTS org_isolation ON webhook_events;

CREATE POLICY org_isolation ON webhook_events
    AS PERMISSIVE FOR ALL TO immodesk_app
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

COMMENT ON POLICY org_isolation ON webhook_events IS
    'Isolation multi-tenant stricte : les lignes globales (organization_id NULL) sont invisibles du rôle applicatif ; ingestion et rattachement via immodesk_admin.';
