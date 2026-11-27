#!/usr/bin/env bash
# Restauration complète de la base (et, en option, du stockage Garage) depuis
# des sauvegardes chiffrées par backup.sh.
#
#   restore.sh --cle <clé privée age> <base .pgdump.age> [objets .tar.gz.age] [--oui]
#
# Ordre de sûreté : tout est déchiffré et vérifié (pg_restore --list, tar -t)
# AVANT de toucher à quoi que ce soit ; puis confirmation explicite ; puis
# sauvegarde de sécurité de l'état actuel ; alors seulement la base actuelle
# est remplacée. Variables : BACKUP_DIR, AGE_BIN (comme backup.sh).
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_env_file

usage() {
  echo "Usage : restore.sh --cle <clé privée age> <base .pgdump.age> [objets .tar.gz.age] [--oui]" >&2
  exit 2
}

key_file="" confirmed=0 files=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cle) [[ $# -ge 2 ]] || usage; key_file="$2"; shift 2 ;;
    --oui) confirmed=1; shift ;;
    -*) echo "Option inconnue : $1" >&2; usage ;;
    *) files+=("$1"); shift ;;
  esac
done
[[ -n "$key_file" && ${#files[@]} -ge 1 && ${#files[@]} -le 2 ]] || usage
db_file="${files[0]}"
objects_file="${files[1]:-}"
for f in "$key_file" "$db_file" ${objects_file:+"$objects_file"}; do
  [[ -r "$f" ]] || { echo "Fichier absent ou illisible pour $(id -un) : $f" >&2; exit 1; }
done

BACKUP_DIR="${BACKUP_DIR:-/var/backups/immodesk}"
AGE_BIN="${AGE_BIN:-age}"
umask 077
mkdir -p "$BACKUP_DIR"
work="$(mktemp -d "$BACKUP_DIR/.restauration.XXXXXX")"
trap 'rm -rf "$work"' EXIT

echo "== 1. Déchiffrement et vérification (rien n'est encore modifié)"
"$AGE_BIN" -d -i "$key_file" <"$db_file" >"$work/db.pgdump"
compose exec -T postgres pg_restore --list <"$work/db.pgdump" >"$work/contenu.txt"
echo "   Base : $(grep -m1 'Archive created at' "$work/contenu.txt" | sed 's/^; *//')," \
  "$(grep -c ' TABLE DATA ' "$work/contenu.txt") tables."
if [[ -n "$objects_file" ]]; then
  "$AGE_BIN" -d -i "$key_file" <"$objects_file" >"$work/objets.tar.gz"
  echo "   Objets : $(tar -tzf - <"$work/objets.tar.gz" | wc -l) entrées lisibles."
fi

echo "== 2. Confirmation"
if [[ $confirmed -ne 1 ]]; then
  read -r -p "La base actuelle${objects_file:+ et les objets} vont être REMPLACÉS. Taper RESTAURER : " answer
  [[ "$answer" == "RESTAURER" ]] || { echo "Abandon : rien n'a été modifié."; exit 1; }
fi

echo "== 3. Sauvegarde de sécurité de l'état actuel"
"$DEPLOY_DIR/scripts/backup.sh"

echo "== 4. Arrêt de l'API et du web (plus aucune écriture)"
compose stop immodesk-api immodesk-web

echo "== 5. Recréation et restauration de la base"
compose exec -T postgres dropdb -U immodesk --if-exists --force immodesk
compose exec -T postgres createdb -U immodesk immodesk
# Les rôles doivent exister avant les droits (GRANT) contenus dans la sauvegarde.
compose run --rm --no-deps db-roles
compose exec -T postgres pg_restore -U immodesk -d immodesk --no-owner --exit-on-error \
  <"$work/db.pgdump"

if [[ -n "$objects_file" ]]; then
  echo "== 6. Restauration du stockage Garage (métadonnées, clés et objets)"
  compose stop immodesk-garage
  # Les deux volumes sont vidés puis remplis depuis la même archive : l'identité
  # du nœud, sa disposition, le bucket et la clé de l'API reviennent avec les
  # objets. garage-init, relancé par `up`, constate que tout est en place.
  compose run --rm --no-deps -T garage-archive \
    'find /garage/meta /garage/data -mindepth 1 -delete && tar -C /garage -xzf -' \
    <"$work/objets.tar.gz"
fi

echo "== 7. Redémarrage"
compose up -d
echo "Restauration terminée. La sauvegarde de sécurité de l'état précédent est dans $BACKUP_DIR."
