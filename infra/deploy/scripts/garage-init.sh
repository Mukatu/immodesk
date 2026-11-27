#!/bin/sh
# Prépare Garage pour l'API, par son API d'administration (v2) : rôle du nœud
# unique, bucket privé et clé d'accès limitée à ce bucket. Idempotent : chaque
# étape déjà faite est sautée. Shell POSIX et curl seuls (image curlimages/curl,
# poste de développement, CI).
#
# Variables : GARAGE_ADMIN_URL (défaut http://immodesk-garage:3903),
# GARAGE_ADMIN_TOKEN, S3_BUCKET (défaut immodesk), S3_ACCESS_KEY, S3_SECRET_KEY,
# GARAGE_CAPACITY (poids du nœud en octets, défaut 100 Go : un seul nœud, la
# valeur ne borne pas l'espace disque).
set -eu

ADMIN="${GARAGE_ADMIN_URL:-http://immodesk-garage:3903}"
: "${GARAGE_ADMIN_TOKEN:?GARAGE_ADMIN_TOKEN manquant}"
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY manquant}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY manquant}"
BUCKET="${S3_BUCKET:-immodesk}"
CAPACITY="${GARAGE_CAPACITY:-100000000000}"
OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT

# api MÉTHODE CHEMIN [CORPS JSON] : écrit la réponse dans $OUT, affiche le code HTTP.
api() {
  if [ $# -ge 3 ]; then
    curl -sS -o "$OUT" -w '%{http_code}' -X "$1" -H "Authorization: Bearer $GARAGE_ADMIN_TOKEN" \
      -H 'Content-Type: application/json' --data "$3" "$ADMIN$2"
  else
    curl -sS -o "$OUT" -w '%{http_code}' -X "$1" -H "Authorization: Bearer $GARAGE_ADMIN_TOKEN" \
      "$ADMIN$2"
  fi
}

# champ NOM : première valeur textuelle ou numérique du champ dans $OUT.
champ() {
  grep -o "\"$1\": *\"\{0,1\}[^\",}]*" "$OUT" | head -n 1 | sed 's/^[^:]*: *"\{0,1\}//'
}

echec() {
  echo "garage-init : $1" >&2
  cat "$OUT" >&2 2>/dev/null || true
  exit 1
}

# 1. Attente de l'API d'administration.
i=0
until [ "$(api GET /v2/GetClusterStatus 2>/dev/null || true)" = 200 ]; do
  i=$((i + 1))
  [ "$i" -le 30 ] || echec "API d'administration injoignable ($ADMIN)."
  sleep 2
done

# 2. Rôle du nœud (une seule fois) : sans lui, Garage ne stocke rien.
if grep -q '"role": *null' "$OUT"; then
  node="$(grep -o '"id": *"[0-9a-f]\{64\}"' "$OUT" | head -n 1 | grep -o '[0-9a-f]\{64\}')"
  version="$(champ layoutVersion)"
  [ -n "$node" ] && [ -n "$version" ] || echec "état du cluster illisible."
  code="$(api POST /v2/UpdateClusterLayout \
    "{\"roles\":[{\"id\":\"$node\",\"zone\":\"dc1\",\"capacity\":$CAPACITY,\"tags\":[]}]}")"
  [ "$code" = 200 ] || echec "attribution du rôle refusée (HTTP $code)."
  code="$(api POST /v2/ApplyClusterLayout "{\"version\":$((version + 1))}")"
  [ "$code" = 200 ] || echec "application de la disposition refusée (HTTP $code)."
  echo "garage-init : rôle attribué au nœud $(echo "$node" | cut -c1-16)."
fi

# 3. Attente d'un cluster sain (disposition propagée).
i=0
until [ "$(curl -s -o /dev/null -w '%{http_code}' "$ADMIN/health" || true)" = 200 ]; do
  i=$((i + 1))
  [ "$i" -le 30 ] || echec "cluster toujours indisponible."
  sleep 1
done

# 4. Bucket privé : Garage n'offre aucun accès anonyme hors mode site web,
# qui n'est ni activé sur le bucket ni configuré ([s3_web] absent).
code="$(api GET "/v2/GetBucketInfo?globalAlias=$BUCKET")"
if [ "$code" = 404 ]; then
  code="$(api POST /v2/CreateBucket "{\"globalAlias\":\"$BUCKET\"}")"
  [ "$code" = 200 ] || echec "création du bucket $BUCKET refusée (HTTP $code)."
elif [ "$code" != 200 ]; then
  echec "lecture du bucket $BUCKET en échec (HTTP $code)."
fi
bucket_id="$(champ id)"
[ -n "$bucket_id" ] || echec "identifiant du bucket illisible."

# 5. Clé de l'API. Garage ne modifie jamais le secret d'une clé existante :
# un secret différent dans .env est une erreur explicite (rotation : docs/10).
code="$(api GET "/v2/GetKeyInfo?id=$S3_ACCESS_KEY&showSecretKey=true")"
if [ "$code" = 200 ]; then
  [ "$(champ secretAccessKey)" = "$S3_SECRET_KEY" ] ||
    { : >"$OUT"; echec "la clé $S3_ACCESS_KEY existe avec un autre secret : choisir un nouvel S3_ACCESS_KEY."; }
else
  code="$(api POST /v2/ImportKey \
    "{\"accessKeyId\":\"$S3_ACCESS_KEY\",\"secretAccessKey\":\"$S3_SECRET_KEY\",\"name\":\"immodesk-api\"}")"
  [ "$code" = 200 ] || echec "import de la clé $S3_ACCESS_KEY refusé (HTTP $code)."
fi

# 6. Droits de la clé : lecture et écriture sur ce bucket seul, sans « owner »
# (ni configuration du bucket, ni création d'autres buckets).
code="$(api POST /v2/AllowBucketKey \
  "{\"bucketId\":\"$bucket_id\",\"accessKeyId\":\"$S3_ACCESS_KEY\",\"permissions\":{\"read\":true,\"write\":true,\"owner\":false}}")"
[ "$code" = 200 ] || echec "attribution des droits refusée (HTTP $code)."

echo "garage-init : bucket $BUCKET privé, clé $S3_ACCESS_KEY limitée à ce bucket."
