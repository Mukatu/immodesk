#!/usr/bin/env bash
# Prépare MinIO pour l'API : bucket privé et compte d'accès restreint à ce
# bucket. Exécuté par le service ponctuel `minio-init` ; idempotent.
set -euo pipefail

: "${S3_ACCESS_KEY:?S3_ACCESS_KEY manquant}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY manquant}"
BUCKET="${S3_BUCKET:-immodesk}"
POLICY_FILE="$(mktemp)"

mc alias set local http://immodesk-minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb --ignore-existing "local/$BUCKET"
# Aucun accès anonyme : tout passe par des URL signées de durée limitée.
mc anonymous set none "local/$BUCKET"

cat >"$POLICY_FILE" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::$BUCKET"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::$BUCKET/*"]
    }
  ]
}
JSON

mc admin policy create local immodesk-api "$POLICY_FILE" >/dev/null
# `user add` sur un compte existant met simplement à jour son secret.
mc admin user add local "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
mc admin policy attach local immodesk-api --user "$S3_ACCESS_KEY" >/dev/null 2>&1 || true
rm -f "$POLICY_FILE"

echo "minio-init : bucket $BUCKET privé, compte $S3_ACCESS_KEY limité à ce bucket."
