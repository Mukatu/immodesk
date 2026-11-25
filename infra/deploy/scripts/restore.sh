#!/usr/bin/env bash
# Restauration complète de la base (et, en option, des objets MinIO).
#   infra/deploy/scripts/restore.sh <fichier .pgdump> [fichier objets .tar.gz] [--oui]
# DESTRUCTIF : la base actuelle est remplacée. Faire d'abord une sauvegarde.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_env_file

db_file="${1:?Usage : restore.sh <fichier .pgdump> [fichier objets .tar.gz] [--oui]}"
objects_file=""
confirm="${!#}"
if [[ $# -ge 2 && "$2" != "--oui" ]]; then objects_file="$2"; fi
[[ -f "$db_file" ]] || { echo "Fichier introuvable : $db_file" >&2; exit 1; }

if [[ "$confirm" != "--oui" ]]; then
  read -r -p "La base actuelle va être REMPLACÉE par $db_file. Taper RESTAURER : " answer
  [[ "$answer" == "RESTAURER" ]] || { echo "Abandon."; exit 1; }
fi

echo "== Arrêt de l'API et du web (plus aucune écriture)"
compose stop api web

echo "== Recréation de la base"
compose exec -T postgres dropdb -U immodesk --if-exists --force immodesk
compose exec -T postgres createdb -U immodesk immodesk
# Les rôles doivent exister avant les droits (GRANT) contenus dans la sauvegarde.
compose run --rm --no-deps db-roles
compose exec -T postgres pg_restore -U immodesk -d immodesk --no-owner --exit-on-error <"$db_file"

if [[ -n "$objects_file" ]]; then
  echo "== Restauration des objets MinIO"
  compose stop minio
  # En root le temps de l'extraction (la racine du volume appartient à root),
  # puis les fichiers sont rendus à l'utilisateur de MinIO (uid 1001).
  compose run --rm --no-deps -T --user 0 --entrypoint sh minio -c \
    'find /bitnami/minio/data -mindepth 1 -delete \
     && tar -C /bitnami/minio/data -xzf - \
     && chown -R 1001:0 /bitnami/minio/data' \
    <"$objects_file"
fi

echo "== Redémarrage"
compose up -d
echo "Restauration terminée. Vérifier : curl -fsS https://\$API_HOST/v1/health"
