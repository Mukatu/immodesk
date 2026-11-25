#!/usr/bin/env bash
# Ouvre la connexion des rôles applicatifs, après `prisma migrate deploy`.
# Exécuté par le service ponctuel `db-roles` (image postgres:16), à chaque
# lancement de la pile : idempotent, et applique un changement de mot de passe.
#
#   immodesk_app   : rôle de l'API, soumis à la RLS (jamais superutilisateur).
#   immodesk_admin : BYPASSRLS pour les tâches transverses (cron, webhooks),
#                    sans SUPERUSER ni propriété des tables.
# Les rôles sont créés NOLOGIN par la migration 0_init ; s'ils manquent (base
# restaurée sur un serveur neuf), ils sont créés ici avec les mêmes attributs.
set -euo pipefail

: "${IMMODESK_APP_PASSWORD:?IMMODESK_APP_PASSWORD manquant}"
: "${IMMODESK_ADMIN_PASSWORD:?IMMODESK_ADMIN_PASSWORD manquant}"

# Les mots de passe sont lus dans l'environnement par `\getenv` (psql 16), puis
# insérés par des variables psql (:'nom') : ils n'apparaissent ni sur la ligne
# de commande (ps), ni dans le texte SQL, ni dans un journal.
psql -v ON_ERROR_STOP=1 <<'SQL'
\getenv app_password IMMODESK_APP_PASSWORD
\getenv admin_password IMMODESK_ADMIN_PASSWORD
SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'immodesk_app') AS creer_app \gset
\if :creer_app
  CREATE ROLE immodesk_app NOLOGIN;
\endif
SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'immodesk_admin') AS creer_admin \gset
\if :creer_admin
  CREATE ROLE immodesk_admin NOLOGIN BYPASSRLS;
\endif
ALTER ROLE immodesk_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
  PASSWORD :'app_password';
ALTER ROLE immodesk_admin WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS
  PASSWORD :'admin_password';
SQL

echo "db-roles : immodesk_app et immodesk_admin prêts."
