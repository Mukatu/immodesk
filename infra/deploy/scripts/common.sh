#!/usr/bin/env bash
# Réglages communs aux scripts d'exploitation (sourcé, jamais exécuté seul).
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
# Fichiers compose : la pile de recette, plus des surcharges éventuelles
# (COMPOSE_FILES="docker-compose.yml docker-compose.local.yml" en local).
COMPOSE_FILES="${COMPOSE_FILES:-docker-compose.yml}"
COMPOSE_ARGS=()
for f in $COMPOSE_FILES; do COMPOSE_ARGS+=(-f "$DEPLOY_DIR/$f"); done

compose() {
  docker compose --project-directory "$DEPLOY_DIR" "${COMPOSE_ARGS[@]}" "$@"
}

require_env_file() {
  if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
    echo "Fichier $DEPLOY_DIR/.env absent : copier .env.staging.example puis le remplir." >&2
    exit 1
  fi
}

ensure_edge_network() {
  local name
  name="$(grep -E '^EDGE_NETWORK=' "$DEPLOY_DIR/.env" | cut -d= -f2- || true)"
  name="${name:-watuneed_edge}"
  docker network inspect "$name" >/dev/null 2>&1 || docker network create "$name" >/dev/null
}
