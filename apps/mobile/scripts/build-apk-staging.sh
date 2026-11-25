#!/usr/bin/env bash
# APK Android de release pointant sur l'API de recette, à distribuer aux pilotes.
#
#   apps/mobile/scripts/build-apk-staging.sh [--cle-debug] [URL de l'API, préfixe /v1 inclus]
#
# Défaut : https://api.staging.immodesk.watuneed.fr/v1
# Résultat : apps/mobile/build/app/outputs/flutter-apk/app-release.apk
#
# Garde-fous :
#   - l'URL doit être en https (le HTTP en clair est de toute façon refusé par
#     Android en release : seul le manifeste de debug l'autorise) ;
#   - OTP_DEV_CODE n'est jamais transmis à l'application ;
#   - sans android/key.properties, la construction est REFUSÉE : un APK signé
#     avec la clé de débogage ne doit jamais être distribué (docs/08, docs/10
#     § 12). `--cle-debug` l'autorise explicitement, pour un essai local ;
#   - le contrôle du trafic en clair échoue (au lieu d'être sauté) si le
#     manifeste de release est introuvable.
set -euo pipefail

allow_debug_key=0
API_BASE_URL="https://api.staging.immodesk.watuneed.fr/v1"
for arg in "$@"; do
  case "$arg" in
    --cle-debug) allow_debug_key=1 ;;
    -*) echo "Option inconnue : $arg" >&2; exit 2 ;;
    *) API_BASE_URL="$arg" ;;
  esac
done
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$API_BASE_URL" != https://* ]]; then
  echo "Refus : l'URL de l'API doit commencer par https:// ($API_BASE_URL)." >&2
  exit 1
fi
if [[ "$API_BASE_URL" != */v1 ]]; then
  echo "Refus : l'URL de l'API doit se terminer par /v1 ($API_BASE_URL)." >&2
  exit 1
fi

if [[ -f "$MOBILE_DIR/android/key.properties" ]]; then
  echo "Signature : keystore définitif (android/key.properties)."
elif [[ $allow_debug_key -eq 1 ]]; then
  echo "ATTENTION : clé de DÉBOGAGE (--cle-debug). APK d'essai, à ne JAMAIS distribuer."
else
  echo "Refus : android/key.properties absent. Créer le keystore définitif" >&2
  echo "(docs/08_publication_mobile.md), ou --cle-debug pour un simple essai local." >&2
  exit 1
fi

cd "$MOBILE_DIR"
# Seule API_BASE_URL est définie : OTP_DEV_CODE reste vide dans l'application.
flutter build apk --release --dart-define=API_BASE_URL="$API_BASE_URL"

# Contrôle : le manifeste fusionné de la release n'autorise pas le HTTP en clair.
manifest="$(find build/app/intermediates -path '*release*' -name AndroidManifest.xml   -path '*merged_manifest*' 2>/dev/null | head -n 1)"
if [[ -z "$manifest" ]]; then
  echo "ERREUR : manifeste de release introuvable, contrôle du trafic en clair impossible." >&2
  exit 1
fi
if grep -q 'usesCleartextTraffic="true"' "$manifest"; then
  echo "ERREUR : le manifeste de release autorise le trafic en clair ($manifest)." >&2
  exit 1
fi
echo "Contrôle : trafic en clair non autorisé ($manifest)."

echo "APK prêt : $MOBILE_DIR/build/app/outputs/flutter-apk/app-release.apk"
