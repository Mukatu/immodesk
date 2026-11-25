#!/usr/bin/env bash
# Réglages communs aux scripts d'exploitation (sourcé, jamais exécuté seul).
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
# Fichiers compose : la pile de recette, la surcharge locale du serveur si elle
# existe (docker-compose.override.yml, non versionnée : réseaux des autres
# projets pour Caddy, docs/10 § 11), ou une liste explicite (COMPOSE_FILES).
if [[ -z "${COMPOSE_FILES:-}" ]]; then
  COMPOSE_FILES="docker-compose.yml"
  [[ -f "$DEPLOY_DIR/docker-compose.override.yml" ]] && COMPOSE_FILES+=" docker-compose.override.yml"
fi
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

# Valeur d'une variable du fichier .env (sans l'exécuter comme du shell).
env_value() {
  grep -E "^$1=" "$DEPLOY_DIR/.env" 2>/dev/null | tail -n 1 | cut -d= -f2- || true
}
