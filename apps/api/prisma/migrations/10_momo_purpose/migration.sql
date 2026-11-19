-- =====================================================================
-- 10_momo_purpose — Type d'usage d'une transaction Mobile Money
--
-- Les webhooks Mobile Money arrivent tous chez le même fournisseur, quelle
-- que soit l'URL configurée : rien ne distinguait une transaction de loyer,
-- d'abonnement ou de reversement. Un webhook d'abonnement reçu sur la route
-- des loyers passait la transaction à SUCCEEDED sans payer la facture, et
-- inversement. `purpose` porte ce discriminant de façon durable
-- (`subscription_invoices.momo_transaction_id` est écrasé à chaque nouvelle
-- tentative, et `direction` ne sépare que les reversements).
--
-- Reprise de l'existant :
--   OUTBOUND                                  -> OWNER_PAYOUT
--   facture d'abonnement liée, ou transaction AGGREGATOR sans paiement,
--   locataire, bail ni facture de loyer       -> SUBSCRIPTION
--   tout le reste                             -> RENT_COLLECTION
-- Le décompte par valeur est signalé par un NOTICE : le contrôler après
-- déploiement.
--
-- Déploiement en un seul lot (migration + code) : la colonne est NOT NULL
-- sans DEFAULT, l'ancien code ne peut plus créer de transaction ensuite.
--
-- Nettoyage : les événements de webhook NON signés ne sont jamais rattachés
-- à une organisation (un tiers pouvait forger un corps citant une vraie
-- référence et polluer le journal d'une organisation). Aucune politique RLS
-- n'est ajoutée ni modifiée : la colonne hérite de celles de la table.
-- =====================================================================

CREATE TYPE momo_purpose AS ENUM ('RENT_COLLECTION', 'SUBSCRIPTION', 'OWNER_PAYOUT');

ALTER TABLE mobile_money_transactions ADD COLUMN purpose momo_purpose;

UPDATE mobile_money_transactions SET purpose = 'OWNER_PAYOUT' WHERE direction = 'OUTBOUND';

UPDATE mobile_money_transactions m
   SET purpose = 'SUBSCRIPTION'
 WHERE m.purpose IS NULL
   AND m.direction = 'INBOUND'
   AND (
        EXISTS (SELECT 1 FROM subscription_invoices si WHERE si.momo_transaction_id = m.id)
        OR (m.channel = 'AGGREGATOR' AND m.payment_id IS NULL AND m.tenant_id IS NULL
            AND m.invoice_id IS NULL AND m.lease_id IS NULL)
   );

UPDATE mobile_money_transactions SET purpose = 'RENT_COLLECTION' WHERE purpose IS NULL;

ALTER TABLE mobile_money_transactions ALTER COLUMN purpose SET NOT NULL;

ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT momo_purpose_direction_ck
    CHECK ((purpose = 'OWNER_PAYOUT') = (direction = 'OUTBOUND'));
ALTER TABLE mobile_money_transactions
    ADD CONSTRAINT momo_purpose_subscription_ck
    CHECK (purpose <> 'SUBSCRIPTION' OR (payment_id IS NULL AND tenant_id IS NULL));

COMMENT ON COLUMN mobile_money_transactions.purpose IS 'Usage de la transaction : RENT_COLLECTION (loyer encaissé), SUBSCRIPTION (abonnement Immodesk réglé par une organisation), OWNER_PAYOUT (reversement à un bailleur). Route les webhooks, le rejeu et le rattrapage vers le bon traitement.';

DO $$
DECLARE
    summary TEXT;
BEGIN
    SELECT string_agg(purpose::text || '=' || n, ', ' ORDER BY purpose::text)
      INTO summary
      FROM (SELECT purpose, count(*) AS n FROM mobile_money_transactions GROUP BY purpose) t;
    RAISE NOTICE '10_momo_purpose : transactions par purpose (%)', coalesce(summary, 'aucune');
END $$;

UPDATE webhook_events
   SET organization_id = NULL
 WHERE signature_valid = false
   AND organization_id IS NOT NULL
   AND source IN ('CINETPAY', 'OTHER');
