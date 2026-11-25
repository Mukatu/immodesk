#!/usr/bin/env bash
# APK Android de release pointant sur l'API de recette, à distribuer aux pilotes.
#
#   apps/mobile/scripts/build-apk-staging.sh [URL de l'API, préfixe /v1 inclus]
#
# Défaut : https://api.staging.immodesk.watuneed.fr/v1
# Résultat : apps/mobile/build/app/outputs/flutter-apk/app-release.apk
#
# Garde-fous :
#   - l'URL doit être en https (le HTTP en clair est de toute façon refusé par
#     Android en release : seul le manifeste de debug l'autorise) ;
#   - OTP_DEV_CODE n'est jamais transmis à l'application ;
#   - sans android/key.properties, l'APK est signé avec la clé de DÉBOGAGE :
#     bon pour un essai, à ne JAMAIS distribuer (voir docs/08 et docs/10 § 12).
set -euo pipefail

API_BASE_URL="${1:-https://api.staging.immodesk.watuneed.fr/v1}"
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
else
  echo "ATTENTION : android/key.properties absent, APK signé avec la clé de DÉBOGAGE."
  echo "            Ne pas distribuer : créer d'abord le keystore (docs/08_publication_mobile.md)."
fi

cd "$MOBILE_DIR"
# Seule API_BASE_URL est définie : OTP_DEV_CODE reste vide dans l'application.
flutter build apk --release --dart-define=API_BASE_URL="$API_BASE_URL"

# Contrôle : le manifeste fusionné de la release n'autorise pas le HTTP en clair.
manifest="$(find build/app/intermediates -path '*release*' -name AndroidManifest.xml \
  -path '*merged_manifest*' 2>/dev/null | head -n 1)"
if [[ -n "$manifest" ]] && grep -q 'usesCleartextTraffic="true"' "$manifest"; then
  echo "ERREUR : le manifeste de release autorise le trafic en clair ($manifest)." >&2
  exit 1
fi

echo "APK prêt : $MOBILE_DIR/build/app/outputs/flutter-apk/app-release.apk"
