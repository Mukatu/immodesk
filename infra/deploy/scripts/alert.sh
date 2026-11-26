#!/usr/bin/env bash
# Alerte d'échec d'un service systemd Immodesk (OnFailure=immodesk-alerte@%n).
#   infra/deploy/scripts/alert.sh <nom du service>
# Écrit toujours une ligne d'erreur dans le journal système, et pousse une
# notification si ALERT_NTFY_URL est renseignée dans .env (ntfy : logiciel
# libre, auto-hébergeable, appli Android gratuite).
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
unit="${1:-inconnu}"
message="Immodesk : échec de $unit sur $(hostname) — voir journalctl -u $unit"
logger -p user.err -t immodesk-alerte "$message"
url="$(env_value ALERT_NTFY_URL)"
if [[ -n "$url" ]]; then
  curl -fsS -m 20 -H "Priority: high" -d "$message" "$url" >/dev/null \
    || logger -p user.err -t immodesk-alerte "Notification ntfy impossible ($url)"
fi
