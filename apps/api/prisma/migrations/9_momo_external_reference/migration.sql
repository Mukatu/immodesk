-- =====================================================================
-- 9_momo_external_reference — Clé fournisseur Mobile Money globalement unique
--
-- `merchant_reference` (`MMA-AAAAMM-NNNNN`, `REV-AAAAMM-NNNNN`) est numérotée
-- PAR ORGANISATION (`momo_merchant_ref_uk` porte sur `organization_id`), alors
-- qu'elle servait aussi de clé chez l'agrégateur : `transaction_id` CinetPay,
-- clé du statut interrogé par `getStatus`, et seule donnée permettant de
-- rattacher un webhook entrant à une organisation. Deux organisations
-- pouvaient donc partager la même clé fournisseur : webhook attribué à la
-- mauvaise organisation, statut d'un tiers lu comme le sien, ou événement
-- écarté comme doublon.
--
-- `external_reference` est désormais la SEULE clé transmise au fournisseur
-- (l'identifiant UUID de la transaction pour toute nouvelle initiation),
-- unique sur toute la table. `merchant_reference` reste le numéro lisible,
-- par organisation, inchangé.
--
-- Reprise de l'existant (canal AGGREGATOR uniquement) : la clé réellement
-- connue du fournisseur est `aggregator_transaction_id` si l'initiation a
-- répondu, sinon `merchant_reference`. Elle n'est recopiée que si elle est
-- unique sur toute la table. Les transactions en collision restent à NULL :
-- un webhook qui les cite est mis de côté (jamais rattaché au hasard), et la
-- migration les signale par un WARNING. Pour les lister après déploiement :
--   SELECT id, organization_id, merchant_reference, aggregator_transaction_id, status
--     FROM mobile_money_transactions
--    WHERE channel = 'AGGREGATOR' AND external_reference IS NULL;
--
-- Numérotation : 9, après 7_rls_empty_guc et 8_rls_global_rows_readonly
-- (PR en attente), pour que l'ordre reste correct une fois celles-ci
-- fusionnées. Aucune politique RLS n'est ajoutée ni modifiée : la colonne
-- hérite de celles de la table.
-- =====================================================================

ALTER TABLE mobile_money_transactions ADD COLUMN external_reference TEXT;

WITH keyed AS (
    SELECT id, coalesce(aggregator_transaction_id, merchant_reference) AS provider_key
      FROM mobile_money_transactions
     WHERE channel = 'AGGREGATOR'
), counted AS (
    SELECT id, provider_key, count(*) OVER (PARTITION BY provider_key) AS n
      FROM keyed
)
UPDATE mobile_money_transactions m
   SET external_reference = c.provider_key
  FROM counted c
 WHERE m.id = c.id AND c.n = 1;

DO $$
DECLARE
    collisions INTEGER;
    sample TEXT;
BEGIN
    SELECT count(*), string_agg(DISTINCT coalesce(aggregator_transaction_id, merchant_reference), ', ')
      INTO collisions, sample
      FROM mobile_money_transactions
     WHERE channel = 'AGGREGATOR' AND external_reference IS NULL;
    IF collisions > 0 THEN
        RAISE WARNING '9_momo_external_reference : % transaction(s) Mobile Money partagent une clé fournisseur avec une autre organisation (%). external_reference laissée à NULL : leurs webhooks seront mis de côté pour revue.',
            collisions, left(sample, 2000);
    END IF;
END $$;

ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT momo_external_ref_uk UNIQUE (external_reference);
