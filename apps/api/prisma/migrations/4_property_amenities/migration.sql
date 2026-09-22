-- =====================================================================
-- 4_property_amenities — Équipements et mobilier des biens
--
-- Quatre colonnes sur `properties` (docs/schema/schema.sql, partie 03b) :
--   * `has_generator`, `has_solar_panels` : équipements d'autonomie
--     énergétique, à côté des `has_water` / `has_electricity` /
--     `has_borehole` déjà en place — utiles pour filtrer un portefeuille
--     lors des délestages SNE, fréquents à Brazzaville et Pointe-Noire.
--   * `is_furnished`, `furniture` : le bien peut être loué meublé dans son
--     ensemble (indépendamment du champ `units.is_furnished`, qui décrit
--     un lot précis). `furniture` est un tableau JSON de
--     `{ item, quantity? }` dont les codes d'`item` sont fermés (liste en
--     dur côté application, `apps/api/src/modules/portfolio/domain/
--     furniture.ts`) : un JSONB sans contrainte de forme laisserait passer
--     n'importe quelle chaîne, ce que l'application refuse à la création
--     et à la mise à jour.
--
-- Règle métier portée par l'application, pas par une contrainte SQL : un
-- bien non meublé (`is_furnished = false`) a toujours `furniture = '[]'`.
-- Un CHECK SQL équivalent est possible mais redondant avec la validation
-- applicative déjà en place pour les codes de mobilier ; il n'apporterait
-- de garantie que contre un accès direct à la base, hors périmètre ici.
-- =====================================================================

ALTER TABLE properties
    ADD COLUMN has_generator    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN has_solar_panels BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN is_furnished     BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN furniture        JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN properties.has_generator IS 'Groupe électrogène disponible pour le bien — délestages fréquents à Brazzaville comme à Pointe-Noire.';
COMMENT ON COLUMN properties.has_solar_panels IS 'Panneaux solaires installés, en appoint ou en remplacement du réseau SNE.';
COMMENT ON COLUMN properties.is_furnished IS 'Bien loué meublé dans son ensemble (hors inventaire par lot, voir units.is_furnished) ; conditionne le contenu de furniture.';
COMMENT ON COLUMN properties.furniture IS 'Inventaire du mobilier fourni, tableau JSON de {item, quantity?} ; toujours vide si is_furnished est faux.';
