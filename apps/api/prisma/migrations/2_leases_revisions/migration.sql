-- =====================================================================
-- 2_leases_revisions — Baux : anti-chevauchement garanti en base,
-- historique des révisions de loyer, numérotation des baux.
--
-- Aligne la base sur `docs/schema/schema.sql` (parties 01, 04a et 11a),
-- qui reste la source de vérité. `0_init` avait été figé avant que ces
-- trois objets n'y soient ajoutés :
--
--   1. l'extension `btree_gist`, indispensable pour combiner `uuid WITH =`
--      et `daterange WITH &&` dans une même contrainte d'exclusion ;
--   2. la contrainte `leases_no_overlap_excl` : un lot ne peut porter
--      qu'un seul bail en cours à la fois — règle garantie par le moteur,
--      et non par une vérification applicative que deux transactions
--      concurrentes contourneraient ;
--   3. la table `lease_rent_revisions` : historique daté des révisions de
--      loyer, pour que les factures déjà émises restent inchangées ;
--   4. l'étiquette `LEASE` de l'énumération `sequence_kind`, qui alimente
--      la référence `BAIL-{YYYY}-{seq}` via `next_sequence()`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extension btree_gist.
--
-- GiST ne sait pas indexer nativement l'égalité d'un `uuid` : sans cette
-- extension, `unit_id WITH =` est refusé (« data type uuid has no default
-- operator class for access method gist »).
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- 2. Anti-chevauchement des baux sur un même lot.
--
-- Copie exacte de docs/schema/parts/04a_mandates_leases.sql.
-- `end_date` NULL vaut durée indéterminée, représentée par la borne
-- ouverte 9999-12-31 ; l'intervalle est semi-ouvert `[)` pour qu'un bail
-- se terminant le 1er juin n'entre pas en conflit avec celui qui commence
-- le même jour. Le prédicat restreint la contrainte aux baux réellement
-- en cours : brouillons, annulés, résiliés et supprimés logiquement ne
-- bloquent personne.
-- ---------------------------------------------------------------------
ALTER TABLE leases ADD CONSTRAINT leases_no_overlap_excl
    EXCLUDE USING gist (
        unit_id WITH =,
        daterange(start_date, COALESCE(end_date, DATE '9999-12-31'), '[)') WITH &&
    )
    WHERE (status IN ('ACTIVE', 'NOTICE_GIVEN') AND deleted_at IS NULL);

COMMENT ON CONSTRAINT leases_no_overlap_excl ON leases IS
    'Un lot ne peut porter qu''un bail ACTIVE ou NOTICE_GIVEN à la fois. La violation remonte en SQLSTATE 23P01, traduite par l''API en LEASES.OVERLAP.';

-- ---------------------------------------------------------------------
-- 3. Révisions de loyer : historique daté.
--
-- Le loyer applicable à une date est la dernière révision effective à
-- cette date, sinon le loyer initial du bail. Les montants précédents
-- sont figés dans la ligne : recalculer l'historique à partir de l'état
-- courant du bail réécrirait le passé.
-- ---------------------------------------------------------------------
CREATE TABLE lease_rent_revisions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lease_id                 UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    effective_date           DATE NOT NULL,
    previous_rent_amount     BIGINT NOT NULL CHECK (previous_rent_amount >= 0),
    new_rent_amount          BIGINT NOT NULL CHECK (new_rent_amount >= 0),
    previous_charges_amount  BIGINT NOT NULL DEFAULT 0 CHECK (previous_charges_amount >= 0),
    new_charges_amount       BIGINT NOT NULL DEFAULT 0 CHECK (new_charges_amount >= 0),
    currency                 CHAR(3) NOT NULL DEFAULT 'XAF',
    reason                   TEXT,
    document_id              UUID,
    created_by_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT lease_rent_revisions_uk UNIQUE (lease_id, effective_date)
);
COMMENT ON TABLE lease_rent_revisions IS 'Révisions de loyer et de charges d''un bail, datées ; le loyer applicable à une date est la dernière révision effective à cette date, sinon le loyer initial du bail. Une révision ne peut pas être antérieure à une période déjà facturée.';

CREATE INDEX lease_rent_revisions_lease_idx ON lease_rent_revisions (lease_id, effective_date DESC);

-- FK différée vers `documents` (docs/schema/parts/11a_documents.sql) :
-- l'avenant signé justifiant la révision, facultatif.
ALTER TABLE lease_rent_revisions
    ADD CONSTRAINT lease_rent_revisions_document_fk
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 4. RLS : la table porte `organization_id NOT NULL`, elle doit donc être
-- isolée comme toutes les autres. La partie 13 du DDL applique la policy
-- par une boucle sur `information_schema` ; ici, la table est créée après
-- coup et reçoit la même policy, mot pour mot.
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON lease_rent_revisions TO immodesk_app;

ALTER TABLE lease_rent_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_rent_revisions FORCE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON lease_rent_revisions
    AS PERMISSIVE FOR ALL TO immodesk_app
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- `updated_at` : le DDL pose un déclencheur générique sur toute table qui
-- porte la colonne (partie 12). La table étant créée ici, le déclencheur
-- est attaché explicitement.
CREATE TRIGGER trg_lease_rent_revisions_set_updated_at
    BEFORE UPDATE ON lease_rent_revisions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Énumération `sequence_kind` : ajout de LEASE.
--
-- Le type n'est porté par aucune colonne (`sequences.kind` est un TEXT,
-- volontairement, pour que `next_sequence(uuid, text, text)` reste
-- appelable sans transtypage). `ALTER TYPE ... ADD VALUE` suffit donc :
-- aucun index ni contrainte à reconstruire. La nouvelle étiquette n'est
-- pas utilisée dans cette même transaction, ce que PostgreSQL interdirait.
-- ---------------------------------------------------------------------
ALTER TYPE sequence_kind ADD VALUE IF NOT EXISTS 'LEASE' BEFORE 'CASH_RECEIPT';
