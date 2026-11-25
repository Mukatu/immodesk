#!/usr/bin/env bash
# Préparation d'un VPS Ubuntu LTS neuf (24.04 conseillé) pour Immodesk.
#
#   sudo bash bootstrap.sh [nom de l'utilisateur, défaut : deploy]
#
# Idempotent : peut être relancé sans dommage. Étapes :
#   1. mises à jour et paquets de base ;
#   2. utilisateur non root avec sudo, qui reprend les clés SSH de root ;
#   3. SSH par clé uniquement, connexion root interdite ;
#   4. pare-feu ufw : 22, 80 et 443 seulement ;
#   5. fail2ban sur SSH ;
#   6. mises à jour de sécurité automatiques ;
#   7. Docker (dépôt officiel), journaux limités en taille ;
#   8. fichier d'échange de 2 Go, réseau Docker partagé, dossiers.
set -euo pipefail

DEPLOY_USER="${1:-deploy}"
EDGE_NETWORK="${EDGE_NETWORK:-watuneed_edge}"

log() { printf '\n== %s\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "À lancer en root : sudo bash $0" >&2; exit 1; }
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || { echo "Script prévu pour Ubuntu (trouvé : ${ID:-?})." >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive

log "1. Mises à jour et paquets de base"
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q ca-certificates curl git gnupg ufw fail2ban unattended-upgrades

log "2. Utilisateur $DEPLOY_USER"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG sudo "$DEPLOY_USER"
user_home="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$user_home/.ssh"
keys="$user_home/.ssh/authorized_keys"
if [[ ! -s "$keys" && -s /root/.ssh/authorized_keys ]]; then
  install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /root/.ssh/authorized_keys "$keys"
fi
# Sans clé, couper les mots de passe enfermerait l'exploitant dehors.
if [[ ! -s "$keys" ]]; then
  echo "Aucune clé SSH pour $DEPLOY_USER ($keys) : ajouter la clé publique puis relancer." >&2
  exit 1
fi
# sudo demande un mot de passe : en définir un s'il n'existe pas encore.
if passwd -S "$DEPLOY_USER" | awk '{print $2}' | grep -qE '^(L|NP)$'; then
  echo "Choisir le mot de passe sudo de $DEPLOY_USER (il ne sert pas à SSH) :"
  passwd "$DEPLOY_USER"
fi

log "3. SSH : clé uniquement, pas de root"
cat >/etc/ssh/sshd_config.d/90-immodesk.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
EOF
sshd -t
systemctl reload ssh 2>/dev/null || systemctl reload sshd

log "4. Pare-feu ufw"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (certificats, redirection)'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 443/udp comment 'HTTP/3'
ufw --force enable

log "5. fail2ban (SSH)"
cat >/etc/fail2ban/jail.d/sshd-immodesk.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

log "6. Mises à jour de sécurité automatiques"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades

log "7. Docker"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
mkdir -p /etc/docker
if [[ ! -f /etc/docker/daemon.json ]]; then
  cat >/etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
EOF
  systemctl restart docker
fi
systemctl enable --now docker
# Le groupe docker équivaut à root : réservé à l'exploitant.
usermod -aG docker "$DEPLOY_USER"

log "8. Échange, réseau partagé, dossiers"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi
sysctl -q -w vm.swappiness=10
echo 'vm.swappiness=10' >/etc/sysctl.d/90-immodesk.conf
docker network inspect "$EDGE_NETWORK" >/dev/null 2>&1 || docker network create "$EDGE_NETWORK"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/immodesk
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /var/backups/immodesk

log "Terminé"
echo "Ouvrir une NOUVELLE session pour vérifier avant de fermer celle-ci :"
echo "  ssh $DEPLOY_USER@<adresse du serveur>"
echo "Puis suivre docs/10_deploiement.md § 5 (cloner le dépôt dans /opt/immodesk)."
