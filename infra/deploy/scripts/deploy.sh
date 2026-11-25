#!/usr/bin/env bash
# Premier lancement et mises à jour de la pile de recette.
#   infra/deploy/scripts/deploy.sh
# Construit les images depuis le code présent sur le serveur, applique les
# migrations (service `migrate`), ouvre les rôles (service `db-roles`), puis
# (re)démarre l'API, le web et Caddy. Une sauvegarde précède toute mise à jour.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_env_file
ensure_edge_network

if compose ps --status running --services 2>/dev/null | grep -qx postgres; then
  echo "== Sauvegarde préalable"
  "$DEPLOY_DIR/scripts/backup.sh"
fi

echo "== Construction des images"
compose build --pull

echo "== Démarrage (migrations et rôles d'abord)"
compose up -d --remove-orphans

echo "== Résultat des tâches ponctuelles"
compose logs --no-log-prefix migrate db-roles minio-init | tail -n 20
compose ps
