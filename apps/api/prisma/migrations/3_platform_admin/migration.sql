-- =====================================================================
-- 3_platform_admin — Extension hors contrat : drapeau d'administration
-- de la plateforme Immodesk sur `users`.
--
-- Contexte : le contrat de la phase 10 (docs/api/phase10-contract.md)
-- introduit des routes `/v1/admin/*` réservées à un « OWNER plateforme »,
-- sans jamais définir ce qu'est un administrateur de la plateforme — ce
-- concept n'existe nulle part dans `docs/schema/schema.sql` avant cette
-- migration (aucune colonne, aucune table, seul un rôle POSTGRES
-- `immodesk_admin` BYPASSRLS existe, pour l'accès direct à la base, pas
-- pour l'autorisation applicative HTTP).
--
-- Décision (à documenter dans le compte rendu de la tranche) : un simple
-- booléen sur `users`, plutôt qu'une table dédiée. `users` est déjà une
-- table GLOBALE hors RLS (comme le rappelle son commentaire), porte déjà
-- des booléens de ce type (`user_credentials.mfa_enabled`,
-- `subscription_plans.is_active`...), et le nombre de comptes plateforme
-- est trivialement petit (équipe interne Immodesk) : une table séparée
-- n'apporterait qu'une jointure supplémentaire pour aucun bénéfice
-- (pas d'historique de rôles à porter, pas de permissions graduées
-- demandées par le contrat — seulement un OWNER/non-OWNER plateforme).
-- =====================================================================

ALTER TABLE users
    ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.is_platform_admin IS 'Extension phase 10 (hors contrat DDL initial) : administrateur de la plateforme Immodesk, habilité aux routes /v1/admin/*. Ne se substitue à aucun rôle d''organisation ; ne concerne qu''un tout petit nombre de comptes internes, jamais accordé via une route publique.';
