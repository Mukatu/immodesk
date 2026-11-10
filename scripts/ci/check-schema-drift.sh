#!/usr/bin/env bash
# Verifie la concordance entre apps/api/prisma/migrations et docs/schema/schema.sql.
#
# Usage :
#   scripts/ci/check-schema-drift.sh drift     # compare les deux schemas (pg_dump normalise)
#   scripts/ci/check-schema-drift.sh nullif    # garde-fou : current_setting( sans NULLIF( dans les policies
#
# En local (Docker Postgres sur localhost:5440) :
#   PGHOST=localhost PGPORT=5440 PGUSER=immodesk PGPASSWORD=immodesk PGDATABASE=immodesk \
#     scripts/ci/check-schema-drift.sh drift
#
# Variables : PGHOST/PGPORT/PGUSER/PGPASSWORD (defauts CI : localhost:5432, immodesk/immodesk),
# PGDATABASE (base de maintenance pour CREATE DATABASE, defaut postgres). Deux bases jetables
# (drift_migrations_<pid>, drift_schema_<pid>) sont creees puis supprimees ;
# la base de developpement n'est jamais modifiee. Table _prisma_migrations exclue.
set -euo pipefail

MODE="${1:-drift}"
export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-immodesk}" PGPASSWORD="${PGPASSWORD:-immodesk}"
export PGCLIENTENCODING=UTF8
MAINT_DB="${PGDATABASE:-postgres}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_MIG="drift_migrations_$$"
DB_REF="drift_schema_$$"
TMP="$(mktemp -d)"

psql_admin() { psql -X -q -v ON_ERROR_STOP=1 -d "$MAINT_DB" "$@"; }

cleanup() {
  psql_admin -c "DROP DATABASE IF EXISTS $DB_MIG WITH (FORCE)" >/dev/null 2>&1 || true
  psql_admin -c "DROP DATABASE IF EXISTS $DB_REF WITH (FORCE)" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

psql_admin -c "CREATE DATABASE $DB_MIG" -c "CREATE DATABASE $DB_REF"

# Migrations appliquees dans l'ordre numerique (0_init, 1_..., 10_...).
while read -r dir; do
  echo "migration: $(basename "$dir")"
  psql -X -q -v ON_ERROR_STOP=1 -d "$DB_MIG" -f "$dir/migration.sql" >/dev/null
done < <(for d in "$ROOT"/apps/api/prisma/migrations/*/; do d="${d%/}"; n="$(basename "$d")"; echo "${n%%_*} $d"; done | sort -n | cut -d' ' -f2-)

echo "schema.sql"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB_REF" -f "$ROOT/docs/schema/schema.sql" >/dev/null

if [ "$MODE" = "nullif" ]; then
  # Une policy avec current_setting( non enveloppe dans NULLIF( leve
  # "invalid input syntax for type uuid" quand le GUC est vide (connexion poolee reutilisee).
  fail=0
  for db in "$DB_MIG" "$DB_REF"; do
    out="$(psql -X -At -d "$db" -c "
      SELECT tablename || ' | ' || policyname FROM pg_policies
      WHERE (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~* 'current_setting\('
        AND (coalesce(qual,'') || ' ' || coalesce(with_check,'')) !~* 'nullif\(\s*current_setting\('
      ORDER BY 1")"
    if [ -n "$out" ]; then
      echo "::error::Policies sans NULLIF(current_setting(...)) dans la base $db :"
      echo "$out"
      fail=1
    fi
  done
  if [ "$fail" -eq 0 ]; then echo "OK : toutes les policies enveloppent current_setting dans NULLIF."; fi
  exit "$fail"
fi

dump() {
  pg_dump --schema-only --no-owner --no-privileges --no-comments -d "$1" \
    --exclude-table='_prisma_migrations' \
    | grep -v -E '^(--|SET |SELECT pg_catalog.set_config|\\restrict|\\unrestrict)' \
    | sed -E '/^\s*$/d' \
    | normalize_tables
}

# ALTER TABLE ADD COLUMN ajoute en fin de table alors que schema.sql declare
# les colonnes en ligne : l'ordre des colonnes n'est pas un ecart. On trie donc
# les lignes de chaque CREATE TABLE (virgules finales retirees).
normalize_tables() {
  awk '
    /^CREATE TABLE .*\($/ { print; inb=1; n=0; next }
    inb && /^\);/ {
      for (i=1;i<=n;i++) for (j=i+1;j<=n;j++) if (l[j] < l[i]) { t=l[i]; l[i]=l[j]; l[j]=t }
      for (i=1;i<=n;i++) print l[i]
      print; inb=0; next }
    inb { sub(/,$/, ""); l[++n]=$0; next }
    { print }'
}
dump "$DB_MIG" > "$TMP/migrations.sql"
dump "$DB_REF" > "$TMP/schema.sql"

# Policies aussi via le catalogue (independant de la forme du dump).
psql -X -At -d "$DB_MIG" -c "SELECT tablename, policyname, cmd, roles, qual, with_check FROM pg_policies ORDER BY 1,2" > "$TMP/migrations.policies"
psql -X -At -d "$DB_REF" -c "SELECT tablename, policyname, cmd, roles, qual, with_check FROM pg_policies ORDER BY 1,2" > "$TMP/schema.policies"

status=0
diff -u --label "migrations (appliquees)" --label "docs/schema/schema.sql" "$TMP/migrations.sql" "$TMP/schema.sql" || status=1
diff -u --label "policies migrations" --label "policies schema.sql" "$TMP/migrations.policies" "$TMP/schema.policies" || status=1
if [ "$status" -eq 0 ]; then
  echo "OK : migrations et schema.sql concordent."
else
  echo "::error::Derive detectee entre prisma/migrations et docs/schema/schema.sql"
fi
exit "$status"
