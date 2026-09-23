-- =====================================================================
-- 5_occupancy_permit — Renommage parcel_number → occupancy_permit
--
-- Le champ ne décrit pas un numéro de parcelle cadastrale (déjà couvert
-- par `land_title_reference`) mais un permis d'occuper, document foncier
-- congolais distinct. Le nom technique s'aligne sur le libellé affiché
-- côté application, « Permis d'occuper ».
-- =====================================================================

ALTER TABLE properties
    RENAME COLUMN parcel_number TO occupancy_permit;
