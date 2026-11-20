-- =====================================================================
-- 13_momo_payout_execute_marker — Marqueur « ordre d'exécution envoyé »
--
-- Un retrait programmé OpenPay approuvé est exécuté par un appel
-- `POST /scheduled-cashout/:reference/execute`, qui déclenche un virement réel.
-- L'appel ne doit JAMAIS être émis deux fois (rattrapage, callback et route
-- manuelle peuvent se croiser ; une transaction annulée après l'envoi ne
-- doit pas provoquer un second envoi). Le marqueur est posé par un UPDATE
-- atomique, commité AVANT l'appel HTTP : s'il existe, l'exécution n'est plus
-- relancée automatiquement (décision humaine).
-- =====================================================================

ALTER TABLE mobile_money_transactions ADD COLUMN payout_execute_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN mobile_money_transactions.payout_execute_sent_at IS 'Horodatage de l''ordre d''exécution d''un retrait programmé (reversement OpenPay), posé avant l''appel au fournisseur : s''il est renseigné, l''exécution n''est jamais relancée automatiquement.';
COMMENT ON COLUMN mobile_money_transactions.aggregator IS 'Nom de l''agrégateur (CINETPAY, OPENPAY, PAWAPAY) ; NULL pour une transaction déclarée. OPENPAY : aggregator_transaction_id porte la référence PTXN d''un encaissement, ou l''UUID v4 (external_reference) d''un retrait programmé.';
