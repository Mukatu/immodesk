-- =====================================================================
-- 11_openpay_enum — Valeur OPENPAY pour les fournisseurs Mobile Money
--
-- OpenPay remplace CinetPay (non disponible au Congo). Seule la valeur d'enum
-- est ajoutée ici : aucune implémentation du fournisseur dans cette migration.
-- `webhook_source` OTHER ne doit plus servir qu'aux sources sans parseur
-- (simulateur) : OPENPAY donne à OpenPay sa propre source de webhook.
--
-- Placée avant OTHER pour que l'ordre des valeurs reste « fournisseurs puis
-- OTHER » (même ordre dans docs/schema/schema.sql). Aucune table ni policy RLS
-- n'est touchée.
-- =====================================================================

ALTER TYPE momo_provider ADD VALUE IF NOT EXISTS 'OPENPAY' BEFORE 'OTHER';
ALTER TYPE webhook_source ADD VALUE IF NOT EXISTS 'OPENPAY' BEFORE 'OTHER';
