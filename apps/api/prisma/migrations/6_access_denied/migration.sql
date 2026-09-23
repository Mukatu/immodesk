-- =====================================================================
-- 6_access_denied — Nouvelle valeur d'énumération pour le journal d'audit
--
-- Un refus d'accès est une ligne d'`audit_logs` à part entière : le centre
-- de sécurité de la phase 11 expose un journal des refus, et rien ne doit
-- pouvoir le supprimer. L'énumération `audit_action` ne portait aucune
-- valeur décrivant un refus ; `LOGIN` était le repli documenté, au prix de
-- la lisibilité du journal.
--
-- C'est la seule extension du DDL de la phase 11 : aucune table, aucune
-- colonne, aucune contrainte, aucun rôle et aucune politique RLS ne sont
-- ajoutés ni modifiés (contrat de la phase 11, « Extension minimale »).
--
-- `ADD VALUE` est idempotent grâce à `IF NOT EXISTS`. PostgreSQL l'autorise
-- dans une transaction depuis la version 12 tant que la valeur n'est pas
-- consommée dans la même transaction, ce qui est le cas ici : aucune
-- insertion ne l'utilise avant la fin de la migration.
-- =====================================================================

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ACCESS_DENIED';
