#!/usr/bin/env bash
# Premier lancement et mises à jour de la pile de recette.
#   infra/deploy/scripts/deploy.sh [--sans-cache]
# Met à jour les images tierces épinglées (correctifs publiés sous la même
# étiquette), reconstruit l'API et le web, applique les migrations (`migrate`),
# ouvre les rôles (`db-roles`), puis (re)démarre les services. Une sauvegarde
# précède toute mise à jour. `--sans-cache` reconstruit tout depuis zéro (à
# faire chaque mois : correctifs de Chromium et des paquets Debian).
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_env_file

build_args=(--pull)
case "${1:-}" in
  "") ;;
  --sans-cache) build_args+=(--no-cache) ;;
  *) echo "Usage : deploy.sh [--sans-cache]" >&2; exit 2 ;;
esac

if compose ps --status running --services 2>/dev/null | grep -qx postgres; then
  echo "== Sauvegarde préalable"
  "$DEPLOY_DIR/scripts/backup.sh"
fi

echo "== Images tierces (PostgreSQL, Redis, MinIO, Caddy)"
compose pull --ignore-buildable

echo "== Construction de l'API et du web"
compose build "${build_args[@]}"

echo "== Démarrage (migrations et rôles d'abord)"
compose up -d --remove-orphans

echo "== Résultat des tâches ponctuelles"
compose logs --no-log-prefix migrate db-roles minio-init | tail -n 20
compose ps
