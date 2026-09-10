#!/bin/sh
# Chargement du schéma consolidé Immodesk au premier démarrage du conteneur
# PostgreSQL (volume de données vide). Exécuté automatiquement par l'image
# officielle postgres car ce script vit dans /docker-entrypoint-initdb.d.
#
# Le fichier docs/schema/schema.sql (monté en lecture seule dans
# /docker-entrypoint-initdb.d-source/) crée déjà :
#   - les rôles immodesk_app (NOLOGIN) et immodesk_admin (NOLOGIN BYPASSRLS)
#   - les 71 tables, ~60 types enum, vues, policies RLS
#   - tous les GRANT nécessaires à immodesk_app et immodesk_admin
# Il ne reste donc qu'à donner un mot de passe et le droit de LOGIN à
# immodesk_app pour que l'application puisse s'y connecter.
set -e

echo "01-schema.sh: chargement de docs/schema/schema.sql..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -f /docker-entrypoint-initdb.d-source/schema.sql

echo "01-schema.sh: activation du LOGIN pour le rôle immodesk_app..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -c "ALTER ROLE immodesk_app WITH LOGIN PASSWORD '${IMMODESK_APP_PASSWORD}';"

echo "01-schema.sh: terminé."
