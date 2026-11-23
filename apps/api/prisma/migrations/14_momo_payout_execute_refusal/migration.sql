-- =====================================================================
-- 14_momo_payout_execute_refusal — Refus d'exécution et alerte unique
--
-- Un ordre d'exécution (`POST /scheduled-cashout/:reference/execute`) refusé
-- définitivement par OpenPay (HTTP 400 : solde plateforme ou opérateur
-- insuffisant, retrait pas encore approuvé ; 404) prouve qu'AUCUN virement n'est
-- parti : le marqueur `payout_execute_sent_at` est alors levé et la relance est
-- espacée par `payout_execute_refused_at`.
-- `payout_alert_code` mémorise la dernière nature d'alerte d'exploitation émise
-- pour la transaction (REFUSED : ordre refusé ; BLOCKED : issue incertaine) : une
-- alerte n'est journalisée qu'une fois par nature et par transaction (sinon elle
-- se répéterait à chaque rattrapage).
-- =====================================================================

ALTER TABLE mobile_money_transactions ADD COLUMN payout_execute_refused_at TIMESTAMPTZ;
ALTER TABLE mobile_money_transactions ADD COLUMN payout_alert_code TEXT;

COMMENT ON COLUMN mobile_money_transactions.payout_execute_refused_at IS 'Dernier refus définitif (HTTP 400/404) de l''ordre d''exécution d''un retrait par le fournisseur : aucun virement émis, marqueur levé, relance espacée à partir de cette date.';
COMMENT ON COLUMN mobile_money_transactions.payout_alert_code IS 'Dernière nature d''alerte d''exploitation journalisée pour ce décaissement (REFUSED ou BLOCKED) : une seule alerte par nature et par transaction.';
