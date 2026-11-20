-- =====================================================================
-- 12_openpay_aggregator_reference — Référence OpenPay unique par transaction
--
-- OpenPay renvoie sa propre référence (`PTXN...`) à l'initiation d'un
-- encaissement ; pour un retrait programmé, la référence est l'UUID fourni par
-- Immodesk. Elle est stockée dans `aggregator_transaction_id` et sert à
-- retrouver la transaction à la réception d'un callback NON signé : elle ne
-- doit donc jamais désigner deux transactions.
--
-- Index unique PARTIEL (aggregator, aggregator_transaction_id) restreint à
-- OpenPay : aucune ligne OPENPAY n'existe avant ce déploiement, alors que les
-- lignes CinetPay et simulateur historiques peuvent partager une clé (voir
-- 9_momo_external_reference) et feraient échouer un index global.
-- `momo_provider_tx_uk` (provider, provider_transaction_id) ne convient pas : il
-- porte sur l'opérateur (MTN/Airtel), pas sur l'agrégateur.
-- =====================================================================

CREATE UNIQUE INDEX momo_openpay_ref_uk
    ON mobile_money_transactions (aggregator, aggregator_transaction_id)
 WHERE aggregator = 'OPENPAY' AND aggregator_transaction_id IS NOT NULL;
