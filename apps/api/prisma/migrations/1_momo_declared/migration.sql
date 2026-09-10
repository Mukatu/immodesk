-- =====================================================================
-- 1_momo_declared — Mobile Money « paiement déclaré »
--
-- Aligne `mobile_money_transactions` sur docs/schema/schema.sql après la
-- décision du 10 septembre 2026 : deux modes de règlement Mobile Money
-- coexistent, l'agrégateur (CinetPay, PawaPay) et le paiement DÉCLARÉ —
-- le locataire verse directement sur le numéro du bailleur et saisit la
-- référence de transaction de l'opérateur, qu'un gestionnaire vérifie.
--
-- Conséquences sur le schéma :
--   * nouvelle colonne `channel` (AGGREGATOR | DECLARED) ;
--   * `aggregator` devient facultatif : une transaction déclarée n'en a pas ;
--   * traçabilité de la déclaration et de sa vérification ;
--   * deux états supplémentaires : DECLARED (en attente de contrôle) et
--     REJECTED (contrôle négatif).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Enum `momo_status` : ajout de DECLARED et REJECTED.
--
-- `ALTER TYPE ... ADD VALUE` ne peut pas être suivi, dans la MÊME
-- transaction, d'une utilisation de la nouvelle étiquette — or l'index
-- partiel et la contrainte CHECK ci-dessous s'en servent. Le type est donc
-- reconstruit puis substitué, ce qui reste transactionnel et préserve
-- l'ordre des étiquettes du DDL.
--
-- L'index partiel `momo_pending_recheck_idx` porte des littéraux transtypés
-- vers l'ancien type dans son prédicat : PostgreSQL les conserverait tels
-- quels lors du changement de type de la colonne et échouerait
-- (« operator does not exist: momo_status = momo_status_old »). Il est donc
-- déposé puis recréé à l'identique.
-- ---------------------------------------------------------------------
DROP INDEX momo_pending_recheck_idx;

ALTER TYPE momo_status RENAME TO momo_status_old;

CREATE TYPE momo_status AS ENUM (
    'INITIATED', 'PENDING', 'DECLARED', 'SUCCEEDED',
    'FAILED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'REFUNDED');

ALTER TABLE mobile_money_transactions
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE momo_status USING status::text::momo_status,
    ALTER COLUMN status SET DEFAULT 'INITIATED';

DROP TYPE momo_status_old;

CREATE INDEX momo_pending_recheck_idx
    ON mobile_money_transactions (status_checked_at)
    WHERE status IN ('INITIATED', 'PENDING');

-- ---------------------------------------------------------------------
-- 2. Enum `momo_channel` : canal de la transaction.
-- ---------------------------------------------------------------------
CREATE TYPE momo_channel AS ENUM ('AGGREGATOR', 'DECLARED');

-- ---------------------------------------------------------------------
-- 3. Colonnes du mode déclaré.
--
-- `channel` prend la valeur par défaut AGGREGATOR : toutes les lignes
-- existantes ont été créées par un agrégateur, la reprise est donc exacte
-- sans mise à jour de données.
-- ---------------------------------------------------------------------
ALTER TABLE mobile_money_transactions
    ADD COLUMN channel             momo_channel NOT NULL DEFAULT 'AGGREGATOR',
    ADD COLUMN declared_by_user_id UUID,
    ADD COLUMN proof_document_id   UUID,
    ADD COLUMN verified_by_user_id UUID,
    ADD COLUMN verified_at         TIMESTAMPTZ,
    ADD COLUMN rejection_reason    TEXT;

ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_declared_by_user_id_fkey
    FOREIGN KEY (declared_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT mobile_money_transactions_verified_by_user_id_fkey
    FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 4. `aggregator` devient facultatif.
--
-- La valeur par défaut 'CINETPAY' est retirée : la remettre ferait passer
-- une transaction déclarée pour une transaction d'agrégateur, et la
-- contrainte `momo_channel_chk` la refuserait à l'insertion suivante.
-- ---------------------------------------------------------------------
ALTER TABLE mobile_money_transactions
    ALTER COLUMN aggregator DROP NOT NULL,
    ALTER COLUMN aggregator DROP DEFAULT;

-- ---------------------------------------------------------------------
-- 5. Cohérence canal / identifiants.
--
-- AGGREGATOR exige le nom de l'agrégateur ; DECLARED exige la référence
-- de transaction de l'opérateur saisie par le locataire — sans elle, la
-- déclaration est invérifiable et n'a aucune valeur probante.
-- ---------------------------------------------------------------------
ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT momo_channel_chk CHECK (
        (channel = 'AGGREGATOR' AND aggregator IS NOT NULL)
     OR (channel = 'DECLARED'   AND provider_transaction_id IS NOT NULL));

-- ---------------------------------------------------------------------
-- 6. File de contrôle des paiements déclarés.
-- ---------------------------------------------------------------------
CREATE INDEX momo_declared_pending_idx
    ON mobile_money_transactions (organization_id, initiated_at DESC)
    WHERE channel = 'DECLARED' AND status = 'DECLARED';

-- ---------------------------------------------------------------------
-- 7. Documentation des colonnes (le DDL fait foi, les commentaires aussi).
-- ---------------------------------------------------------------------
COMMENT ON COLUMN mobile_money_transactions.channel IS
    'AGGREGATOR : initiée via MobileMoneyProvider ; DECLARED : transfert direct vers le numéro du bailleur déclaré par le locataire (référence opérateur saisie), à vérifier manuellement ou par relevé opérateur.';
COMMENT ON COLUMN mobile_money_transactions.aggregator IS
    'Nom de l''agrégateur (CINETPAY, PAWAPAY) ; NULL pour une transaction déclarée.';
COMMENT ON COLUMN mobile_money_transactions.declared_by_user_id IS
    'Utilisateur ayant saisi la déclaration (locataire depuis le portail, ou gestionnaire pour son compte).';
COMMENT ON COLUMN mobile_money_transactions.proof_document_id IS
    'Capture d''écran facultative du transfert (documents), mode déclaré.';
COMMENT ON COLUMN mobile_money_transactions.verified_by_user_id IS
    'Gestionnaire ayant validé ou rejeté la déclaration après contrôle.';
COMMENT ON COLUMN mobile_money_transactions.verified_at IS
    'Instant du contrôle : une déclaration non vérifiée ne vaut jamais encaissement.';
COMMENT ON COLUMN mobile_money_transactions.rejection_reason IS
    'Motif de rejet du contrôle, restitué au locataire.';
