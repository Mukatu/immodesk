#!/usr/bin/env bash
# Sauvegarde quotidienne : base PostgreSQL (pg_dump, format custom) et objets
# MinIO (photos, signatures, PDF), avec rotation.
#   infra/deploy/scripts/backup.sh
# Lancé chaque nuit par le minuteur systemd immodesk-backup.timer.
# Variables : BACKUP_DIR (défaut /var/backups/immodesk), KEEP_DAYS (défaut 14).
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/immodesk}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
umask 077
mkdir -p "$BACKUP_DIR"

db_file="$BACKUP_DIR/immodesk-db-$STAMP.pgdump"
objects_file="$BACKUP_DIR/immodesk-objets-$STAMP.tar.gz"

# Écriture dans un fichier temporaire puis renommage : une sauvegarde
# interrompue ne laisse jamais un fichier tronqué à l'apparence valide.
compose exec -T postgres pg_dump -U immodesk -d immodesk -Fc >"$db_file.partiel"
mv "$db_file.partiel" "$db_file"

compose exec -T minio tar -C /bitnami/minio/data -czf - . >"$objects_file.partiel"
mv "$objects_file.partiel" "$objects_file"

# Contrôle minimal : le fichier de base doit être relisible par pg_restore.
compose exec -T postgres pg_restore --list >/dev/null <"$db_file"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'immodesk-*' -mtime +"$KEEP_DAYS" -delete

echo "Sauvegarde terminée : $db_file ($(du -h "$db_file" | cut -f1)), $objects_file ($(du -h "$objects_file" | cut -f1))."
