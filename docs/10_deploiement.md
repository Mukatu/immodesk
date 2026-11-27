# Immodesk — Déploiement de l'environnement de recette (staging)

Ce guide met en ligne Immodesk sur un serveur loué, pour le pilote : l'application
mobile des démarcheurs (états des lieux et saisies hors ligne), le tableau de bord web
et l'API. Il est écrit pas à pas pour quelqu'un qui n'administre pas de serveurs
habituellement. Compter une demi-journée la première fois.

La même pile devient la production plus tard, en changeant quelques variables
(§ 16). Tout ce qui est installé est libre et gratuit ; seul le serveur est payant.

## 1. Ce qui va tourner

Un seul serveur, des conteneurs Docker décrits dans `infra/deploy/docker-compose.yml` :

| Service                              | Rôle                                                                        | Exposé sur Internet                |
| :----------------------------------- | :-------------------------------------------------------------------------- | :--------------------------------- |
| `caddy`                              | Reverse proxy : HTTPS automatique (Let's Encrypt), redirection HTTP → HTTPS | Oui, ports 80 et 443 seuls         |
| `immodesk-api`                       | API NestJS, tâches planifiées et files BullMQ (dans le même processus)      | Via Caddy                          |
| `immodesk-web`                       | Tableau de bord Next.js (et portails bailleur et locataire)                 | Via Caddy                          |
| `immodesk-garage`                    | Stockage des photos, signatures et PDF (Garage, compatible S3, ADR-014)     | Via Caddy, requêtes signées seules |
| `postgres`                           | Base PostgreSQL 16, sécurité par ligne (RLS)                                | Jamais                             |
| `redis`                              | Files de tâches et limites de débit                                         | Jamais                             |
| `migrate`, `db-roles`, `garage-init` | Tâches ponctuelles à chaque lancement : migrations, rôles de base, bucket   | Jamais                             |

Trois adresses publiques, toutes en HTTPS :

| Adresse                                    | Contenu                                                     |
| :----------------------------------------- | :---------------------------------------------------------- |
| `https://staging.immodesk.watuneed.fr`     | Tableau de bord web ; portail bailleur sous `/portail`      |
| `https://api.staging.immodesk.watuneed.fr` | API (`/v1/...`), appelée par le mobile et le web            |
| `https://s3.staging.immodesk.watuneed.fr`  | Envoi et lecture des photos par URL signées (durée limitée) |

Cloisonnement réseau. Aucun réseau Docker n'est partagé avec un autre projet :

| Réseau             | Qui s'y trouve                                     | Rôle                                        |
| :----------------- | :------------------------------------------------- | :------------------------------------------ |
| `public`           | Caddy                                              | Ports 80 et 443                             |
| `immodesk_edge`    | Caddy, `immodesk-api`, `immodesk-web`              | Seul chemin d'Internet vers l'API et le web |
| `immodesk_edge_s3` | Caddy, `immodesk-garage`                           | Seul chemin d'Internet vers le stockage     |
| `app`              | `immodesk-api`, `immodesk-web`                     | Appels serveur du web vers l'API            |
| `backend`          | API, PostgreSQL, Redis, Garage, tâches ponctuelles | Données, sans accès Internet                |
| `egress`           | `immodesk-api`                                     | Sortie vers Meta et OpenPay                 |

Le web n'a aucun chemin vers les bases ni vers le stockage. L'API n'est joignable que par Caddy (d'où
`TRUST_PROXY_HOPS=1`, `docs/09_exploitation.md` § 7) et par le web.

Pourquoi Garage passe par Caddy : le mobile envoie ses photos **directement** au
stockage, avec une URL signée fournie par l'API. Caddy ne laisse passer que les
requêtes **signées** d'objets du bucket (lecture, envoi, 15 Mo au plus) vers le port
S3 de Garage ; tout le reste répond 404. L'API d'administration de Garage (port 3903)
ne sert qu'à `garage-init` et n'est jamais relayée. Le bucket est privé : Garage
n'offre d'accès anonyme qu'en mode site web, ni activé ni configuré.

Sécurité de la base : l'API se connecte avec le rôle `immodesk_app`, soumis à la
sécurité par ligne, et, pour les tâches transverses (crons, webhooks), avec
`immodesk_admin` (BYPASSRLS, sans superutilisateur). Le superutilisateur `immodesk`
ne sert qu'aux migrations et aux sauvegardes ; l'API ne connaît pas son mot de passe.

Rendu des PDF : Chromium tourne sans JavaScript ni accès réseau (seules les images
incorporées au document sont admises).

## 2. Le serveur : OVH VPS-2 (besoin C2)

Choix retenu : **OVHcloud VPS-2**, Ubuntu 24.04, 4 vCores, **8 Go de RAM**,
centre de données en France, sauvegarde quotidienne OVH incluse.

| Réglage à la commande | Choix                                                                         |
| :-------------------- | :---------------------------------------------------------------------------- |
| Localisation          | France                                                                        |
| Système               | **Ubuntu 24.04**                                                              |
| Clé SSH               | Coller la clé publique du § 4 (sinon OVH envoie un mot de passe par courriel) |
| Options               | Garder la sauvegarde quotidienne incluse ; aucune autre option utile          |

Alternatives équivalentes si besoin : Hetzner Cloud (Allemagne, pas de centre en
France) ou InterServer. Le guide suppose OVH (utilisateur initial `ubuntu`) ; ailleurs,
remplacer `ubuntu` par l'utilisateur initial du fournisseur.

Noter l'**adresse IPv4** et l'**adresse IPv6** du serveur (espace client OVH, page du
VPS) : elles servent au DNS.

Mémoire : la pile Immodesk réserve environ 6 Go de limites (`mem_limit`), ce qui
laisse de la place au système et à un petit projet voisin (§ 11).

## 3. Créer les enregistrements DNS chez Hostinger (besoin C3)

Le domaine `watuneed.fr` est géré chez Hostinger. Dans **hPanel** :

1. Menu **Domaines**, cliquer sur `watuneed.fr`.
2. Ouvrir **DNS / Serveurs de noms**, onglet **Enregistrements DNS** (ou « Zone DNS »).
3. Pour chaque ligne du tableau ci-dessous, choisir le **Type**, saisir le **Nom** (la
   partie avant `.watuneed.fr`, sans le domaine), la **Valeur** (« Pointe vers ») et un
   **TTL** de 3600, puis **Ajouter l'enregistrement**.

| Type   | Nom                    | Pointe vers             |
| :----- | :--------------------- | :---------------------- |
| `A`    | `staging.immodesk`     | adresse IPv4 du serveur |
| `A`    | `api.staging.immodesk` | adresse IPv4 du serveur |
| `A`    | `s3.staging.immodesk`  | adresse IPv4 du serveur |
| `AAAA` | `staging.immodesk`     | adresse IPv6 du serveur |
| `AAAA` | `api.staging.immodesk` | adresse IPv6 du serveur |
| `AAAA` | `s3.staging.immodesk`  | adresse IPv6 du serveur |

- Ne créer les `AAAA` que si le serveur a bien une IPv6 active : un `AAAA` vers une
  adresse muette fait échouer les certificats et une partie des visiteurs.
- Ne pas toucher aux enregistrements existants (`@`, `www`, `MX` du courriel).
- Vérifier la propagation (quelques minutes à quelques heures) depuis un poste :
  `nslookup api.staging.immodesk.watuneed.fr` doit renvoyer l'adresse du serveur.
- Les certificats HTTPS ne s'obtiennent qu'**après** la propagation : faire le DNS en
  premier, puis le reste pendant qu'il se propage.

## 4. Clé SSH et première connexion

Sur le poste Windows, dans PowerShell, créer une clé (une fois pour toutes), protégée
par une phrase de passe :

```powershell
ssh-keygen -t ed25519 -C "exploitation immodesk"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Coller la ligne affichée (clé **publique**, `ssh-ed25519 ...`) dans la commande du VPS,
ou après coup dans l'espace client OVH (réinstallation avec clé). La clé privée
(`id_ed25519`, sans `.pub`) ne quitte jamais le poste.

Sur un VPS OVH Ubuntu, on se connecte avec l'utilisateur **`ubuntu`** (pas `root`) :

```powershell
ssh ubuntu@ADRESSE_IPV4
```

Accepter l'empreinte affichée (`yes`). Le compte `ubuntu` ne sert qu'à la préparation :
il est verrouillé à la fin du § 5.

## 5. Préparer le serveur

Connecté en `ubuntu`, télécharger et lancer le script de préparation
(`infra/deploy/bootstrap.sh`, relançable sans risque) :

```bash
curl -fsSLO https://raw.githubusercontent.com/Mukatu/immodesk/main/infra/deploy/bootstrap.sh
less bootstrap.sh        # le lire avant de l'exécuter (q pour quitter)
sudo bash bootstrap.sh deploy
```

Il installe les mises à jour et crée l'utilisateur `deploy`. Ce compte reprend la clé
SSH de `ubuntu`, débarrassée de toute option ; un mot de passe est demandé, qui ne sert
qu'à `sudo`.

Il configure aussi :

- SSH : connexion par mot de passe et connexion root interdites. Le fichier
  `00-immodesk.conf` passe avant celui de cloud-init, et le script vérifie le
  résultat avec `sshd -T` : il s'arrête en erreur si un réglage n'est pas appliqué.
- le pare-feu (ports 22, 80 et 443 seulement) et fail2ban ;
- les mises à jour de sécurité automatiques ;
- les journaux, gardés 7 jours au plus ;
- Docker, `age` (chiffrement des sauvegardes) et un fichier d'échange de 2 Go.

**Avant de fermer la session `ubuntu`**, ouvrir un second PowerShell et vérifier :

```powershell
ssh deploy@ADRESSE_IPV4
```

Si cela fonctionne, toutes les étapes suivantes se font en `deploy`. Récupérer le
code, puis verrouiller le compte initial **depuis la session deploy** :

```bash
git clone https://github.com/Mukatu/immodesk.git /opt/immodesk
sudo bash /opt/immodesk/infra/deploy/bootstrap.sh --verrouiller ubuntu
cd /opt/immodesk/infra/deploy
```

`ubuntu` perd alors son mot de passe, sa clé et `sudo` (il avait un `sudo` sans mot de
passe). Fermer l'ancienne session.

## 6. Remplir le fichier de configuration

```bash
cp .env.staging.example .env
chmod 600 .env
nano .env
```

Chaque ligne vide est à remplir. Pour **chaque** secret, générer une valeur neuve :

```bash
openssl rand -hex 32
```

et la coller après le `=` (une valeur différente par ligne, jamais réutilisée
ailleurs). Renseigner aussi :

- `ACME_EMAIL` : adresse qui recevra les avis de Let's Encrypt ;
- `BACKUP_AGE_RECIPIENT` : la clé **publique** de chiffrement des sauvegardes. La paire
  se crée **sur le poste**, jamais sur le serveur. Sous Windows :
  `winget install FiloSottile.age`, puis `age-keygen -o immodesk-sauvegardes.key`. Le
  fichier contient la clé privée ; la ligne `Public key: age1...` affichée est la clé
  publique, à coller ici. Ranger la clé privée dans le gestionnaire de mots de passe,
  avec une seconde copie (clé USB au coffre). Sans elle, les sauvegardes sont
  illisibles ;
- `ALERT_NTFY_URL` (facultatif) : une adresse ntfy pour être prévenu sur le téléphone
  si une sauvegarde échoue (§ 15).

Laisser vide `OPENPAY_API_KEY` tant que le compte OpenPay n'est pas ouvert (C4), ainsi
que les variables WhatsApp et SMS tant que C1 et E1 n'existent pas.

Le fichier `.env` contient tous les secrets du serveur. Il n'est jamais versionné et ne
s'envoie pas par messagerie ; en garder une copie dans le gestionnaire de mots de
passe.

## 7. Premier lancement

```bash
/opt/immodesk/infra/deploy/scripts/deploy.sh
```

La première fois, la construction des images prend 10 à 15 minutes. Le script
télécharge les images tierces épinglées puis construit l'API et le web. Il applique
ensuite les migrations (`migrate`), ouvre les rôles (`db-roles`) et prépare le
stockage (`garage-init` : rôle du nœud Garage, bucket privé, clé de l'API limitée à ce
bucket ; idempotent). Enfin, il démarre l'API, le web et Caddy, qui obtient alors
les certificats HTTPS : le DNS du § 3 doit être propagé.

Installer ensuite la sauvegarde quotidienne et son alerte (§ 15) :

```bash
sudo cp /opt/immodesk/infra/deploy/systemd/immodesk-* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now immodesk-backup.timer
sudo systemctl start immodesk-backup.service   # première sauvegarde, pour vérifier
```

## 8. Vérifications

```bash
cd /opt/immodesk/infra/deploy
docker compose ps                    # tout « Up (healthy) », tâches ponctuelles « Exited (0) »
docker compose logs migrate db-roles # « All migrations have been successfully applied »
curl -fsS https://api.staging.immodesk.watuneed.fr/v1/health
```

La santé doit répondre `"status":"ok"`, avec `database`, `redis` et `storage` à `up`.

Depuis le poste, ouvrir `https://staging.immodesk.watuneed.fr`. Le cadenas du
navigateur doit indiquer un certificat valide (Let's Encrypt), et la page de connexion
doit s'afficher.

En cas d'échec des certificats, lire `docker compose logs caddy`. Les causes les plus
fréquentes sont un DNS pas encore propagé, ou un `AAAA` qui pointe vers une IPv6
inactive.

Le journal de l'API doit afficher au démarrage :
`DEPLOYMENT_ENV=staging : serveur de recette. Messagerie simulée ...`

## 9. Se connecter sans WhatsApp ni SMS

Immodesk n'a pas de mot de passe : on se connecte avec son numéro de téléphone et un
code à usage unique, envoyé par WhatsApp (C1) ou par SMS (E1). Tant que ni l'un ni
l'autre n'existe, la recette fonctionne en **messagerie simulée** : l'API n'envoie
rien et écrit le message, code compris, dans son propre journal. L'exploitant le lit
et le transmet à la personne.

1. La personne saisit son numéro dans l'application (mobile ou web) et demande un code.
2. L'exploitant, connecté en SSH, affiche les derniers messages :

   ```bash
   /opt/immodesk/infra/deploy/scripts/codes-otp.sh        # 15 dernières minutes
   ```

   Exemple : `[WHATSAPP SIMULÉ] TEMPLATE vers +242066000001 : Votre code de connexion Immodesk est 036929. ...`

3. Il vérifie que le numéro est bien celui de la personne (appel, présence physique),
   puis lui communique le code, valable 5 minutes.

Une session dure ensuite 30 jours sans nouveau code (renouvellement automatique) : en
pratique, un démarcheur ne redemande un code qu'en changeant de téléphone.

Pourquoi ce mécanisme, et pas un code fixe ou une liste de numéros autorisés :

- les codes restent **aléatoires, à usage unique, valables 5 minutes, limités à 5
  essais** et soumis aux limites de débit habituelles. Rien ne change dans la
  vérification : seul l'acheminement est manuel ;
- lire un code exige un accès au journal, donc un accès SSH par clé au serveur (§ 5) ou
  l'appartenance au groupe `docker`. Ces accès donnent de toute façon toute la base ; le
  risque est donc concentré sur la protection de ces accès (voir les précautions) ;
- un code fixe (`OTP_DEV_CODE`) ou une liste blanche serait un mot de passe partagé et
  permanent, valable pour tout numéro et exposé sur Internet. Il est refusé au
  démarrage sur tout serveur `NODE_ENV=production`, recette comprise ;
- la messagerie simulée est **interdite en production**. Avec
  `DEPLOYMENT_ENV=production`, l'API refuse de démarrer tant que `WHATSAPP_PROVIDER` ou
  `SMS_PROVIDER` vaut `fake` (tests unitaires `config-staging.spec.ts`) ;
- `DEPLOYMENT_ENV=staging` n'est accepté que si les adresses publiques contiennent le
  libellé `staging` : un serveur de production ne peut pas basculer en recette par une
  simple variable.

Précautions :

- le journal de l'API contient les codes et le texte des messages, numéros de
  téléphone compris. Il est gardé **7 jours au plus** (journald) et ne doit pas être
  copié hors du serveur ;
- les liens d'invitation (`/invitations/...`) y figurent aussi et restent utilisables
  pendant leur validité de 7 jours ;
- le journal d'accès de Caddy, lui, ne contient ni chaîne de requête, ni jeton, ni
  segment secret (filtre de `immodesk.caddy`) ;
- aucun conteneur d'un autre projet ne doit monter `/var/run/docker.sock` (Portainer,
  Watchtower, Dozzle…) : ce montage donne la lecture de tous les journaux, et bien plus.

## 10. Premier compte, organisation et démarcheurs

Il n'existe pas de compte créé d'avance : le compte naît à la première connexion
réussie, et l'organisation se crée depuis le web.

1. Ouvrir `https://staging.immodesk.watuneed.fr`, saisir son numéro, demander un code,
   le lire avec `codes-otp.sh` (§ 9) et le saisir.
2. Sans organisation, le web ouvre la création d'organisation : type (agence,
   bailleur indépendant, gestionnaire indépendant), raison sociale, ville, téléphone.
   Le créateur en devient propriétaire (`OWNER`).
3. Inviter chaque démarcheur depuis **Équipe**, avec le rôle collecteur ou
   gestionnaire. Le lien d'invitation (`.../invitations/...`, valable 7 jours) apparaît
   dans `codes-otp.sh`. Le transmettre au démarcheur : il l'ouvre dans un navigateur, se
   connecte avec **son** numéro (code lu de la même façon) et accepte.
4. Le démarcheur installe ensuite l'APK (§ 12) et s'y connecte avec le même numéro.

L'habilitation d'administrateur de la plateforme n'est pas nécessaire au pilote. Si
besoin, elle s'accorde en SQL (`docs/09_exploitation.md` § 3), via
`docker compose exec postgres psql -U immodesk -d immodesk`.

## 11. Cohabiter avec d'autres projets sur le même serveur

Le serveur peut héberger d'autres projets, chacun sur son sous-domaine de
`watuneed.fr`. Règles :

- **Un seul Caddy pour tout le serveur**, celui de `infra/deploy`. Lui seul publie les
  ports 80 et 443. Aucun autre conteneur, d'aucun projet, ne publie de port : ce serait
  un conflit, et Docker contourne le pare-feu ufw pour les ports publiés.
- **Un réseau « edge » par projet, que seul Caddy rejoint.** Immodesk a
  `immodesk_edge`. Un projet `autreprojet` crée le sien, `autreprojet_edge`, interne,
  et n'y branche que les services que Caddy doit servir. Immodesk en a deux
  (`immodesk_edge`, `immodesk_edge_s3`). Jamais deux projets sur le
  même réseau : un projet ne peut ni joindre l'API d'un autre en contournant Caddy, ni
  intercepter ses appels internes par un nom de service identique.
- **Des noms préfixés** sur ce réseau (`autreprojet-app`), puisque Caddy les voit
  tous : deux « api » sur deux réseaux de Caddy seraient ambigus.

Dans le compose de l'autre projet :

```yaml
services:
  autreprojet-app:
    networks: [default, edge]
networks:
  edge:
    name: autreprojet_edge
    internal: true
```

Côté Immodesk, Caddy rejoint ce réseau par une surcharge propre au serveur,
`infra/deploy/docker-compose.override.yml`. Ce fichier n'est pas versionné ;
`deploy.sh` le prend en compte automatiquement :

```yaml
services:
  caddy:
    networks: [public, edge, edge_s3, autreprojet_edge]
networks:
  autreprojet_edge:
    external: true
```

Les hôtes de l'autre projet se déclarent dans son propre fichier, placé dans le dossier
`CADDY_EXTRA_SITES_DIR` (par exemple `/opt/caddy-sites/autreprojet.caddy`) :

```
autreprojet.watuneed.fr {
	reverse_proxy autreprojet-app:8080
}
```

Les hôtes d'Immodesk restent dans le dépôt (`caddy/sites/immodesk.caddy`, monté tel
quel) : chaque mise à jour du dépôt s'y applique sans copie à resynchroniser. Relancer
ensuite `infra/deploy/scripts/deploy.sh`.

Ressources : Immodesk réserve environ 6 Go sur 8. Un projet voisin léger tient dans le
reste ; au-delà, réduire `PDF_WORKER_CONCURRENCY` et les `mem_limit`, ou passer à une
offre supérieure. Surveiller `docker stats` et `df -h`. Chaque projet garde ses propres
sauvegardes.

Interdits : monter `/var/run/docker.sock` dans un conteneur (§ 9), et brancher un
service d'un autre projet sur `immodesk_edge` ou `immodesk_edge_s3`.

## 12. Construire et installer l'APK

**Créer d'abord le keystore définitif** (`docs/08_publication_mobile.md` § 1 et 2).
Android n'accepte une mise à jour que signée par la **même** clé. Changer de clé plus
tard oblige à désinstaller l'application, ce qui **efface les données hors ligne non
synchronisées** (états des lieux, encaissements saisis sans réseau). Sauvegarder le
keystore en deux endroits et ne plus jamais le changer.

Sur le poste de développement (Flutter installé dans `C:\flutter\bin`), dans Git Bash :

```bash
export PATH="/c/flutter/bin:$PATH"
cd apps/mobile
flutter pub get
scripts/build-apk-staging.sh
```

Le fichier produit est `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`. Le
script :

- refuse de construire sans `android/key.properties`. L'option `--cle-debug` autorise
  la clé de débogage pour un simple essai local, mais un tel APK ne doit **jamais** être
  distribué ;
- refuse une URL d'API qui n'est pas en `https` ;
- ne transmet jamais `OTP_DEV_CODE` ;
- échoue si le manifeste de release est introuvable ou autorise le trafic en clair.
  Seul le manifeste de debug l'autorise, pour l'émulateur.

Commande équivalente, sans les contrôles :
`flutter build apk --release --dart-define=API_BASE_URL=https://api.staging.immodesk.watuneed.fr/v1`.

Installation sur un téléphone Android : copier l'APK (câble, lien de téléchargement),
l'ouvrir, et autoriser l'installation depuis cette source quand Android le demande.

Pour une mise à jour, installer le nouvel APK par-dessus : les données sont conservées
tant que la clé est la même. Avant toute mise à jour, demander aux démarcheurs de
synchroniser (indicateur de synchronisation à zéro).

## 13. Vérifier la pile sur un poste de développement

Avant un déploiement risqué, la même pile se lance en local, sans toucher à la pile de
développement (`infra/docker`) :

- nom de projet `immodesk-staging-local` et réseau `immodesk_local_edge` ;
- Caddy sur `127.0.0.1:8480` et `127.0.0.1:8453` seulement ;
- certificats de l'autorité interne de Caddy (`infra/deploy/caddy/Caddyfile.local`).

```bash
cd infra/deploy
cp .env.staging.example .env      # remplir comme au § 6, puis ajouter LOG_DRIVER=json-file
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Les noms d'hôtes restent ceux de la recette. `curl --connect-to` les dirige vers le
Caddy local (`-k` : autorité interne) :

```bash
C="--connect-to ::127.0.0.1:8453 -k"
curl $C https://api.staging.immodesk.watuneed.fr/v1/health
curl $C -H 'Content-Type: application/json' -d '{"phone":"066000001"}' \
  https://api.staging.immodesk.watuneed.fr/v1/auth/otp/request
COMPOSE_FILES="docker-compose.yml docker-compose.local.yml" scripts/codes-otp.sh
```

Sous Git Bash (Windows), préfixer les scripts par
`MSYS_NO_PATHCONV=1 DEPLOY_DIR=$(pwd -W)`.

Pour tout arrêter et effacer :
`docker compose -f docker-compose.yml -f docker-compose.local.yml down -v`.

## 14. Mettre à jour

```bash
cd /opt/immodesk
git pull
infra/deploy/scripts/deploy.sh
```

Le script commence par une sauvegarde (§ 15). Il récupère ensuite les correctifs des
images tierces (mêmes versions épinglées), reconstruit l'API et le web, applique les
nouvelles migrations et redémarre les services modifiés. Pendant les quelques secondes
de redémarrage de l'API, le mobile continue hors ligne et synchronise ensuite.

Une fois par mois, lancer `deploy.sh --sans-cache`. Les images sont alors reconstruites
depuis zéro, avec les correctifs de Chromium et des paquets Debian. Monter de version
(PostgreSQL, Redis, Caddy, Garage) se fait en changeant l'étiquette dans
`docker-compose.yml`, par une PR.

En cas de problème après une mise à jour, revenir au commit précédent
(`git checkout <commit>` puis `deploy.sh`). Une migration déjà appliquée ne se défait
pas ainsi : restaurer alors la sauvegarde faite juste avant (§ 15).

## 15. Sauvegardes, alertes et restauration

Chaque nuit à 04:30 UTC (après les traitements planifiés), `immodesk-backup.timer`
lance `scripts/backup.sh` sous l'utilisateur `deploy` :

- base : `pg_dump`, contrôlé par `pg_restore --list` ;
- stockage Garage (métadonnées SQLite et blocs : photos, signatures, PDF) : archive
  `tar.gz` des deux volumes, prise pendant une suspension de Garage de quelques
  secondes, pour une archive cohérente. La restauration rend aussi l'identité du nœud,
  le bucket et la clé de l'API ;
- les deux fichiers sont **chiffrés avec age** pour `BACKUP_AGE_RECIPIENT`. Le serveur
  ne détient que la clé publique : un vol du disque ou des sauvegardes ne livre rien.
  Rien n'est jamais écrit en clair, et sans clé publique la sauvegarde échoue ;
- les fichiers `immodesk-*.age` vont dans `/var/backups/immodesk` (droits 700, propriété
  de `deploy`) et sont conservés **14 jours** (`KEEP_DAYS`).

En cas d'échec, `OnFailure=` lance `immodesk-alerte@.service`. Celui-ci écrit une
erreur dans le journal système et, si `ALERT_NTFY_URL` est renseignée, envoie une
notification ntfy. ntfy est un logiciel libre ; l'application Android est gratuite.
Pour s'abonner, choisir un nom de sujet long et aléatoire.

```bash
systemctl list-timers immodesk-backup.timer         # prochaine exécution
systemctl status immodesk-backup.service            # dernier résultat
journalctl -t immodesk-alerte -n 20                 # alertes passées
ls -lh /var/backups/immodesk
```

**Copie hors site, au moins chaque semaine.** Les sauvegardes du serveur protègent
d'une erreur, pas de la perte du serveur. La sauvegarde quotidienne OVH du VPS-2 est un
filet supplémentaire, chez le même fournisseur. Copier les fichiers chiffrés vers le
poste, ou vers un second serveur, par SSH :

```powershell
scp deploy@ADRESSE_IPV4:/var/backups/immodesk/*.age C:\Sauvegardes\immodesk\
```

Depuis Linux ou WSL, `rsync` ne copie que les nouveaux fichiers :
`rsync -av -e ssh deploy@ADRESSE_IPV4:/var/backups/immodesk/ ~/sauvegardes-immodesk/`.

Ces fichiers restent chiffrés une fois copiés. Ne jamais les déchiffrer sur un poste
partagé.

**Restauration.** La clé privée age doit être déposée **temporairement** sur le
serveur, puis effacée :

```bash
# depuis le poste :  scp immodesk-sauvegardes.key deploy@ADRESSE_IPV4:~/
cd /opt/immodesk/infra/deploy
chmod 600 ~/immodesk-sauvegardes.key
scripts/restore.sh --cle ~/immodesk-sauvegardes.key \
  /var/backups/immodesk/immodesk-db-AAAAMMJJTHHMMSSZ.pgdump.age \
  /var/backups/immodesk/immodesk-objets-AAAAMMJJTHHMMSSZ.tar.gz.age
shred -u ~/immodesk-sauvegardes.key
```

Le script travaille dans un ordre sûr :

1. il déchiffre et vérifie les deux fichiers (`pg_restore --list`, `tar -t`) **avant**
   de toucher à quoi que ce soit, puis affiche la date de la sauvegarde ;
2. il demande de taper `RESTAURER` ;
3. il fait une **sauvegarde de sécurité** de l'état actuel ;
4. alors seulement, il arrête l'API et le web, recrée la base et les rôles, restaure la
   base puis les objets, et redémarre tout.

Une option inconnue est refusée.

Procédure testée sur la pile locale du § 13 : une écriture faite après la sauvegarde
disparaît, l'organisation et les objets sont retrouvés, et la santé repasse à `ok`.

Sur un serveur neuf, enchaîner : préparation (§ 5), clone, `.env` **d'origine** (§ 6),
`deploy.sh`, puis `restore.sh`.

## 16. Passer de la recette à la production

Quand C1 (WhatsApp), E1 (passerelle SMS) et C4 (OpenPay) sont prêts :

1. Dans `.env`, renseigner :
   - `DEPLOYMENT_ENV=production` ;
   - `WHATSAPP_PROVIDER=meta`, avec ses identifiants ;
   - `SMS_PROVIDER=android_gateway`, avec ses identifiants ;
   - `OPENPAY_API_KEY`.
2. Changer les hôtes : `WEB_HOST=immodesk.watuneed.fr`, `API_HOST=api.immodesk.watuneed.fr`,
   `S3_HOST=s3.immodesk.watuneed.fr`. Créer les enregistrements DNS correspondants.
3. Reconstruire l'APK avec la nouvelle URL d'API : nouvelle compilation, même keystore.
4. Retirer `X-Robots-Tag "noindex"` de `immodesk.caddy`.
5. Lancer `deploy.sh`. L'API refuse de démarrer si un réglage de production manque ;
   lire `docker compose logs immodesk-api`, qui nomme chaque variable en cause.

## 17. Points ouverts

- **Stockage objet : Garage remplace MinIO** (ADR-014). L'image `bitnamilegacy/minio`,
  archivée et sans correctifs, a été remplacée avant le pilote par l'image officielle
  de Garage, épinglée (`dxflrs/garage:v2.5.0`). Rien n'était déployé : aucune donnée
  à migrer. Suivre ses versions (notes de version sur `git.deuxfleurs.fr`) comme celles
  de PostgreSQL ; Garage interdit de revenir à une version antérieure une fois un
  nœud mis à jour : sauvegarder avant.
  - Rotation de la clé de l'API : Garage ne change jamais le secret d'une clé. Mettre
    un **nouvel** `S3_ACCESS_KEY` et un nouveau `S3_SECRET_KEY` dans `.env`, lancer
    `deploy.sh` (garage-init crée la clé et ses droits), puis supprimer l'ancienne :
    `docker compose exec immodesk-garage /garage key delete --yes ANCIENNE_CLE`.
    Garder l'ancienne valeur avec un nouveau secret fait échouer `garage-init`, exprès.
- **Envoi depuis le navigateur** : le web envoie les pièces en `PUT` direct vers
  l'URL signée, depuis une autre origine. Le navigateur fait d'abord une requête
  `OPTIONS` (CORS), que Caddy refuse (404) et que le bucket n'autorise pas : seul le
  mobile peut envoyer en recette. À traiter : règle CORS du bucket limitée à l'origine
  du web, et `OPTIONS` admis par Caddy sur le chemin du bucket.
- **Copie hors site automatique** : la copie est manuelle (§ 15) et reste à automatiser
  vers un second fournisseur.
- **Limite d'OTP par IP côté web** : les demandes de code faites depuis le web passent
  par le serveur Next, que l'API voit comme une seule adresse. La limite par IP
  (20 par heure) est donc commune à toutes les connexions web. Sans effet au pilote, à
  corriger avant la production : transmettre l'IP du client par le BFF.
- **Portail bailleur** : il est servi sous `/portail` du site web ; l'hôte distinct
  `portail.immodesk.watuneed.fr` prévu au besoin C3 n'est pas encore câblé.
- **Taille des envois** : l'URL signée signe l'hôte et le `Content-Type` (un autre
  type que celui déclaré est refusé en 403 par Garage), pas la taille. Caddy plafonne
  chaque envoi à 15 Mo, et l'API relit la taille réelle (HEAD) avant d'enregistrer
  le document. Les PDF de plus de 15 Mo, admis par l'API jusqu'à 25 Mo, sont donc
  refusés par Caddy en recette.
