#!/usr/bin/env bash
# Sauvegarde chiffrée : base PostgreSQL (pg_dump, format custom) et objets
# MinIO (photos, signatures, PDF), avec rotation.
#   infra/deploy/scripts/backup.sh
# Lancé chaque nuit par immodesk-backup.timer, sous l'utilisateur deploy.
#
# Chiffrement age : seule la clé PUBLIQUE (BACKUP_AGE_RECIPIENT dans .env) est
# sur le serveur ; la clé privée reste hors du serveur (docs/10 § 15). Sans
# clé publique, aucune sauvegarde n'est écrite : jamais de copie en clair.
# Variables : BACKUP_DIR (défaut /var/backups/immodesk), KEEP_DAYS (défaut 14),
# AGE_BIN (défaut age).
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_env_file

BACKUP_DIR="${BACKUP_DIR:-/var/backups/immodesk}"
KEEP_DAYS="${KEEP_DAYS:-14}"
AGE_BIN="${AGE_BIN:-age}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
recipient="$(env_value BACKUP_AGE_RECIPIENT)"
if [[ "$recipient" != age1* ]]; then
  echo "BACKUP_AGE_RECIPIENT absent ou invalide dans .env : sauvegarde refusée (pas de copie en clair)." >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_DIR"
work="$(mktemp -d "$BACKUP_DIR/.en-cours.XXXXXX")"
minio_paused=0
cleanup() {
  if [[ $minio_paused -eq 1 ]]; then compose unpause immodesk-minio >/dev/null 2>&1 || true; fi
  rm -rf "$work"
}
trap cleanup EXIT

echo "== Base"
compose exec -T postgres pg_dump -U immodesk -d immodesk -Fc >"$work/db.pgdump"
# Contrôle avant chiffrement : l'archive doit être relisible par pg_restore.
compose exec -T postgres pg_restore --list <"$work/db.pgdump" >/dev/null

echo "== Objets (MinIO suspendu quelques secondes : archive cohérente)"
compose pause immodesk-minio >/dev/null
minio_paused=1
compose run --rm --no-deps -T --entrypoint tar immodesk-minio \
  -C /bitnami/minio/data -czf - . >"$work/objets.tar.gz"
compose unpause immodesk-minio >/dev/null
minio_paused=0
tar -tzf - <"$work/objets.tar.gz" >/dev/null

echo "== Chiffrement"
db_file="$BACKUP_DIR/immodesk-db-$STAMP.pgdump.age"
objects_file="$BACKUP_DIR/immodesk-objets-$STAMP.tar.gz.age"
# Fichier temporaire puis renommage : jamais de sauvegarde tronquée d'aspect valide.
"$AGE_BIN" -r "$recipient" <"$work/db.pgdump" >"$db_file.partiel"
"$AGE_BIN" -r "$recipient" <"$work/objets.tar.gz" >"$objects_file.partiel"
mv "$db_file.partiel" "$db_file"
mv "$objects_file.partiel" "$objects_file"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'immodesk-*.age' -mtime +"$KEEP_DAYS" -delete

echo "Sauvegarde terminée : $db_file ($(du -h "$db_file" | cut -f1)), $objects_file ($(du -h "$objects_file" | cut -f1))."
