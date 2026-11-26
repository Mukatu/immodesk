#!/usr/bin/env bash
# Préparation d'un VPS Ubuntu 24.04 neuf pour Immodesk (OVH VPS : utilisateur
# initial « ubuntu » avec sudo). Deux temps, idempotents :
#
#   1. depuis la session « ubuntu » :     sudo bash bootstrap.sh [deploy]
#      mises à jour, utilisateur deploy (clés SSH reprises de ubuntu, sans
#      options), SSH par clé uniquement et sans root (vérifié par sshd -T),
#      pare-feu ufw 22/80/443, fail2ban, mises à jour de sécurité
#      automatiques, Docker, age, journaux limités à 7 jours, échange.
#   2. après avoir vérifié « ssh deploy@... », depuis la session deploy :
#                                          sudo bash bootstrap.sh --verrouiller ubuntu
#      le compte ubuntu (sudo sans mot de passe, mot de passe envoyé par
#      courriel) est verrouillé et perd sudo.
set -euo pipefail

log() { printf '\n== %s\n' "$*"; }
die() { echo "ERREUR : $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "à lancer avec sudo : sudo bash $0"
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "script prévu pour Ubuntu (trouvé : ${ID:-?})."
export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------
# Temps 2 : verrouiller le compte initial du fournisseur
# ---------------------------------------------------------------------
if [[ "${1:-}" == "--verrouiller" ]]; then
  target="${2:-ubuntu}"
  id "$target" >/dev/null 2>&1 || { echo "Compte $target absent : rien à faire."; exit 0; }
  [[ "${SUDO_USER:-}" != "$target" ]] \
    || die "lancer cette étape depuis la session deploy, pas depuis $target."
  log "Verrouillage du compte $target"
  usermod --lock --expiredate 1 "$target"     # ni mot de passe ni clé SSH
  gpasswd -d "$target" sudo >/dev/null 2>&1 || true
  rm -f /etc/sudoers.d/90-cloud-init-users    # sudo sans mot de passe de cloud-init
  home="$(getent passwd "$target" | cut -d: -f6)"
  [[ -f "$home/.ssh/authorized_keys" ]] && : >"$home/.ssh/authorized_keys"
  pkill -KILL -u "$target" 2>/dev/null || true
  echo "Compte $target verrouillé. Seul deploy peut se connecter."
  exit 0
fi

DEPLOY_USER="${1:-deploy}"
[[ "$DEPLOY_USER" =~ ^[a-z][a-z0-9_-]{0,30}$ ]] || die "nom d'utilisateur invalide : $DEPLOY_USER"

log "1. Mises à jour et paquets de base"
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q ca-certificates curl git gnupg ufw fail2ban unattended-upgrades age

log "2. Utilisateur $DEPLOY_USER"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG sudo "$DEPLOY_USER"
user_home="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$user_home/.ssh"
keys="$user_home/.ssh/authorized_keys"
if [[ ! -s "$keys" ]]; then
  source_user="${SUDO_USER:-root}"
  source_keys="$(getent passwd "$source_user" | cut -d: -f6)/.ssh/authorized_keys"
  [[ -s "$source_keys" ]] || die "aucune clé SSH dans $source_keys : ajouter la clé publique puis relancer."
  # Clés seules, SANS leurs options : cloud-init préfixe celles de root d'une
  # commande forcée (« Please login as the user ubuntu ») qui bloquerait deploy.
  grep -oE '(ssh-(ed25519|rsa)|ecdsa-sha2-nistp(256|384|521)|sk-[a-z0-9@.-]+) [A-Za-z0-9+/=]+( .*)?$' \
    "$source_keys" | sort -u >"$keys.tmp" || true
  [[ -s "$keys.tmp" ]] || die "aucune clé exploitable dans $source_keys."
  install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$keys.tmp" "$keys"
  rm -f "$keys.tmp"
fi
[[ -s "$keys" ]] || die "aucune clé SSH pour $DEPLOY_USER ($keys)."
# sudo demande un mot de passe : en définir un s'il n'existe pas encore.
if passwd -S "$DEPLOY_USER" | awk '{print $2}' | grep -qE '^(L|NP)$'; then
  echo "Choisir le mot de passe sudo de $DEPLOY_USER (il ne sert jamais à SSH) :"
  passwd "$DEPLOY_USER"
fi

log "3. SSH : clé uniquement, pas de root"
# sshd retient la PREMIÈRE valeur lue : ce fichier doit passer avant
# 50-cloud-init.conf, qui peut contenir « PasswordAuthentication yes ».
cat >/etc/ssh/sshd_config.d/00-immodesk.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
EOF
rm -f /etc/ssh/sshd_config.d/90-immodesk.conf
sshd -t
effective="$(sshd -T)"
for expected in 'passwordauthentication no' 'kbdinteractiveauthentication no' \
  'permitrootlogin no' 'pubkeyauthentication yes'; do
  grep -qx "$expected" <<<"$effective" || die "réglage SSH non appliqué : « $expected » (voir sshd -T)."
done
systemctl try-reload-or-restart ssh

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

log "7. Journaux : 7 jours au plus"
# Les conteneurs écrivent dans journald (docker-compose.yml) ; en recette, le
# journal de l'API contient les codes de connexion et les liens d'invitation.
mkdir -p /etc/systemd/journald.conf.d
cat >/etc/systemd/journald.conf.d/90-immodesk.conf <<'EOF'
[Journal]
Storage=persistent
MaxRetentionSec=7day
SystemMaxUse=1G
EOF
systemctl restart systemd-journald

log "8. Docker"
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
  "log-driver": "journald",
  "live-restore": true
}
EOF
  systemctl restart docker
fi
systemctl enable --now docker
# Le groupe docker équivaut à root : réservé à l'exploitant.
usermod -aG docker "$DEPLOY_USER"

log "9. Échange, dossiers"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi
sysctl -q -w vm.swappiness=10
echo 'vm.swappiness=10' >/etc/sysctl.d/90-immodesk.conf
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/immodesk
# Sauvegardes : propriété de deploy, qui les écrit (minuteur) et les relit (restauration).
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /var/backups/immodesk

log "Terminé"
echo "1. Ouvrir une NOUVELLE session et vérifier : ssh $DEPLOY_USER@<adresse du serveur>"
echo "2. Depuis cette session, verrouiller le compte initial :"
echo "     sudo bash bootstrap.sh --verrouiller ${SUDO_USER:-ubuntu}"
echo "3. Suivre docs/10_deploiement.md § 5 (cloner le dépôt dans /opt/immodesk)."
