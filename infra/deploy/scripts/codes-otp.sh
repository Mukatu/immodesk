#!/usr/bin/env bash
# Recette uniquement : affiche les derniers messages simulés (codes de
# connexion, liens d'invitation) écrits par l'API dans son journal.
#   infra/deploy/scripts/codes-otp.sh [durée, défaut 15m]
# Transmettre un code à une seule personne, par téléphone ou en main propre,
# après avoir vérifié que le numéro est bien le sien.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
SINCE="${1:-15m}"
compose logs --no-log-prefix --since "$SINCE" api \
  | grep -E 'SIMUL' \
  | sed -E 's/.*"msg":"([^"]*)".*/\1/' \
  || echo "Aucun message simulé depuis $SINCE."
