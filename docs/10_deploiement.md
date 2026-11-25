# Immodesk — Déploiement de l'environnement de recette (staging)

Ce guide met en ligne Immodesk sur un serveur loué, pour le pilote : l'application
mobile des démarcheurs (états des lieux et saisies hors ligne), le tableau de bord web
et l'API. Il est écrit pas à pas pour quelqu'un qui n'administre pas de serveurs
habituellement. Compter une demi-journée la première fois.

La même pile devient la production plus tard, en changeant quelques variables
(§ 16). Tout ce qui est installé est libre et gratuit ; seul le serveur est payant.

## 1. Ce qui va tourner

Un seul serveur, sept conteneurs Docker décrits dans `infra/deploy/docker-compose.yml` :

| Service                             | Rôle                                                                        | Exposé sur Internet        |
| :---------------------------------- | :-------------------------------------------------------------------------- | :------------------------- |
| `caddy`                             | Reverse proxy : HTTPS automatique (Let's Encrypt), redirection HTTP → HTTPS | Oui, ports 80 et 443 seuls |
| `api`                               | API NestJS, tâches planifiées et files BullMQ (dans le même processus)      | Via Caddy                  |
| `web`                               | Tableau de bord Next.js (et portails bailleur et locataire)                 | Via Caddy                  |
| `minio`                             | Stockage des photos, signatures et PDF (compatible S3)                      | Via Caddy, API S3 seule    |
| `postgres`                          | Base PostgreSQL 16, sécurité par ligne (RLS)                                | Jamais                     |
| `redis`                             | Files de tâches et limites de débit                                         | Jamais                     |
| `migrate`, `db-roles`, `minio-init` | Tâches ponctuelles à chaque lancement : migrations, rôles de base, bucket   | Jamais                     |

Trois adresses publiques, toutes en HTTPS :

| Adresse                                    | Contenu                                                     |
| :----------------------------------------- | :---------------------------------------------------------- |
| `https://staging.immodesk.watuneed.fr`     | Tableau de bord web ; portail bailleur sous `/portail`      |
| `https://api.staging.immodesk.watuneed.fr` | API (`/v1/...`), appelée par le mobile et le web            |
| `https://s3.staging.immodesk.watuneed.fr`  | Envoi et lecture des photos par URL signées (durée limitée) |

Pourquoi MinIO passe par Caddy : le mobile envoie ses photos **directement** au
stockage, avec une URL signée fournie par l'API. Le stockage doit donc être joignable
depuis Internet. Le bucket reste privé : sans signature valide, toute lecture est
refusée (vérifié en local, § 13). La console d'administration de MinIO est désactivée.

Sécurité de la base : l'API se connecte avec le rôle `immodesk_app`, soumis à la
sécurité par ligne, et, pour les tâches transverses (crons, webhooks), avec
`immodesk_admin` (BYPASSRLS, sans superutilisateur). Le superutilisateur `immodesk`
ne sert qu'aux migrations et aux sauvegardes ; l'API ne connaît pas son mot de passe.

## 2. Louer le serveur (besoin C2)

Chez **Hetzner Cloud** (le moins cher) ou **OVHcloud VPS** :

| Réglage | Choix                                                                                                                                       |
| :------ | :------------------------------------------------------------------------------------------------------------------------------------------ |
| Région  | Europe de l'Ouest, au plus près de Paris : OVH a des centres en France ; Hetzner n'en a pas (Allemagne, latence voisine depuis Brazzaville) |
| Système | **Ubuntu 24.04 LTS**                                                                                                                        |
| Taille  | 2 vCPU, **4 Go de RAM** minimum, 40 Go de disque SSD ou plus                                                                                |
| Réseau  | IPv4 publique (indispensable) et IPv6 (offerte, à garder)                                                                                   |
| Accès   | **Clé SSH** (voir § 4), jamais de mot de passe root                                                                                         |
| Options | Sauvegardes du fournisseur : facultatives (les nôtres sont au § 15)                                                                         |

Exemples indicatifs : Hetzner CX22 (2 vCPU, 4 Go, environ 5 € par mois), OVH VPS-1
(environ 6 € par mois). Noter l'**adresse IPv4** et l'**adresse IPv6** du serveur une fois
créé : elles servent au DNS.

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

## 4. Première connexion SSH

Sur le poste Windows, dans PowerShell, créer une clé (une fois pour toutes) :

```powershell
ssh-keygen -t ed25519 -C "exploitation immodesk"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Coller la ligne affichée (clé **publique**, `ssh-ed25519 ...`) dans la console du
fournisseur au moment de créer le serveur (« SSH keys »). La clé privée
(`id_ed25519`, sans `.pub`) ne quitte jamais le poste ; la protéger par une phrase de
passe lors de `ssh-keygen`.

Première connexion, en root, le temps de la préparation :

```powershell
ssh root@ADRESSE_IPV4
```

Accepter l'empreinte affichée (`yes`). Après le § 5, root ne pourra plus se connecter.

## 5. Préparer le serveur

Toujours connecté en root, télécharger et lancer le script de préparation
(`infra/deploy/bootstrap.sh`, relançable sans risque) :

```bash
curl -fsSLO https://raw.githubusercontent.com/Mukatu/immodesk/main/infra/deploy/bootstrap.sh
less bootstrap.sh        # le lire avant de l'exécuter (q pour quitter)
bash bootstrap.sh deploy
```

Il installe les mises à jour, crée l'utilisateur `deploy` (il reprend la clé SSH de
root et demande un mot de passe, utilisé seulement par `sudo`), interdit la connexion
par mot de passe et la connexion root, active le pare-feu (ports 22, 80 et 443
seulement), fail2ban, les mises à jour de sécurité automatiques, Docker, un fichier
d'échange de 2 Go et le réseau Docker partagé `watuneed_edge`.

**Avant de fermer la session root**, ouvrir un second PowerShell et vérifier :

```powershell
ssh deploy@ADRESSE_IPV4
```

Si cela fonctionne, fermer la session root. Toutes les étapes suivantes se font en
`deploy`. Récupérer le code :

```bash
git clone https://github.com/Mukatu/immodesk.git /opt/immodesk
cd /opt/immodesk/infra/deploy
```

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
ailleurs). Renseigner aussi `ACME_EMAIL` (adresse qui recevra les avis de Let's
Encrypt). Laisser vides `OPENPAY_API_KEY` tant que le compte OpenPay n'est pas ouvert
(C4), et les variables WhatsApp et SMS tant que C1 et E1 n'existent pas.

Le fichier `.env` contient tous les secrets du serveur : il n'est jamais versionné, ne
s'envoie pas par messagerie et se sauvegarde à part (gestionnaire de mots de passe).
Sans lui, une sauvegarde de la base reste restaurable, mais il faudrait régénérer les
secrets (les sessions ouvertes seraient alors perdues).

## 7. Premier lancement

```bash
/opt/immodesk/infra/deploy/scripts/deploy.sh
```

La première fois, la construction des images prend 10 à 15 minutes. Le script
construit les images, applique les migrations de base (`migrate`), ouvre les rôles
(`db-roles`), prépare le stockage (`minio-init`), puis démarre l'API, le web et
Caddy. Caddy obtient alors les certificats HTTPS (le DNS du § 3 doit être propagé).

Installer ensuite la sauvegarde quotidienne (§ 15) :

```bash
sudo cp /opt/immodesk/infra/deploy/systemd/immodesk-backup.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now immodesk-backup.timer
```

## 8. Vérifications

```bash
cd /opt/immodesk/infra/deploy
docker compose ps                    # tout « Up (healthy) », tâches ponctuelles « Exited (0) »
docker compose logs migrate db-roles # « All migrations have been successfully applied »
curl -fsS https://api.staging.immodesk.watuneed.fr/v1/health
```

La santé doit répondre `"status":"ok"` avec `database`, `redis` et `storage` à `up`.
Depuis le poste, ouvrir `https://staging.immodesk.watuneed.fr` : le cadenas du
navigateur doit indiquer un certificat valide (Let's Encrypt), et la page de connexion
s'afficher. En cas d'échec des certificats : `docker compose logs caddy` (cause la plus
fréquente : DNS pas encore propagé, ou `AAAA` vers une IPv6 inactive).

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
  essais** et soumis aux limites de débit habituelles : rien ne change dans la
  vérification, seul l'acheminement est manuel ;
- personne ne peut lire un code sans accès SSH au serveur (clé seule, § 5) ; or un
  accès SSH donne de toute façon accès à toute la base. Il n'ajoute donc aucune
  surface d'attaque ;
- un code fixe (`OTP_DEV_CODE`) ou une liste blanche serait un mot de passe partagé
  et permanent, valable pour tout numéro, exposé sur Internet : refusé au démarrage
  sur tout serveur `NODE_ENV=production`, recette comprise ;
- la messagerie simulée est **interdite en production** : avec
  `DEPLOYMENT_ENV=production`, l'API refuse de démarrer tant que `WHATSAPP_PROVIDER` ou
  `SMS_PROVIDER` vaut `fake` (tests unitaires `config-staging.spec.ts`). Et
  `DEPLOYMENT_ENV=staging` n'est accepté que si les adresses publiques contiennent
  le libellé `staging` : un serveur de production ne peut pas basculer en recette par
  une simple variable.

Précautions : le journal de l'API contient les codes et le texte des messages (numéros
de téléphone compris). Il est limité à 30 Mo par conteneur (rotation) et ne doit pas
être copié hors du serveur. Les invitations (lien `/invitations/...`) et les messages
aux locataires apparaissent de la même façon : rien n'est envoyé à qui que ce soit.

## 10. Premier compte, organisation et démarcheurs

Il n'existe pas de compte créé d'avance : le compte naît à la première connexion
réussie, et l'organisation se crée depuis le web.

1. Ouvrir `https://staging.immodesk.watuneed.fr`, saisir son numéro, demander un code,
   le lire avec `codes-otp.sh` (§ 9) et le saisir.
2. Sans organisation, le web ouvre la création d'organisation : type (agence,
   bailleur indépendant, gestionnaire indépendant), raison sociale, ville, téléphone.
   Le créateur en devient propriétaire (`OWNER`).
3. Inviter chaque démarcheur depuis **Équipe** (rôle collecteur, ou gestionnaire). Le
   lien d'invitation apparaît dans `codes-otp.sh` (`.../invitations/...`, valable 7
   jours) : le transmettre au démarcheur, qui l'ouvre dans un navigateur, se connecte
   avec **son** numéro (code lu de la même façon) et accepte.
4. Le démarcheur installe ensuite l'APK (§ 12) et s'y connecte avec le même numéro.

L'habilitation d'administrateur de la plateforme n'est pas nécessaire au pilote ; si
besoin, elle s'accorde en SQL (`docs/09_exploitation.md` § 3), via
`docker compose exec postgres psql -U immodesk -d immodesk`.

## 11. Cohabiter avec d'autres projets sur le même serveur

Le serveur peut héberger d'autres projets, chacun sur son sous-domaine de
`watuneed.fr`. Règles simples :

- **Un seul Caddy pour tout le serveur.** Lui seul publie les ports 80 et 443 ; aucun
  autre conteneur, d'aucun projet, ne publie de port (sinon conflit, et Docker
  contourne le pare-feu ufw pour les ports publiés).
- **Un fichier d'hôtes par projet.** Le `Caddyfile` ne contient que les options
  globales et importe `/etc/caddy/sites/*.caddy`. Les hôtes Immodesk sont dans
  `infra/deploy/caddy/sites/immodesk.caddy`. Pour un deuxième projet : créer
  `/opt/caddy-sites/`, y copier `immodesk.caddy` et le fichier du nouveau projet, puis
  mettre `CADDY_SITES_DIR=/opt/caddy-sites` dans `.env` et relancer
  `docker compose up -d caddy`. Le Caddy d'Immodesk sert alors tous les projets.
- **Un réseau par projet, plus le réseau partagé.** Chaque projet garde son réseau
  interne (bases, files) et ne branche sur le réseau partagé `watuneed_edge` que les
  services que Caddy doit joindre, avec un **alias préfixé** par le nom du projet
  (Immodesk : `immodesk-api`, `immodesk-web`, `immodesk-minio`) pour éviter les
  collisions de noms. Dans le compose de l'autre projet :

  ```yaml
  services:
    app:
      networks:
        default: {}
        edge:
          aliases: [autreprojet-app]
  networks:
    edge:
      name: watuneed_edge
      external: true
  ```

  et dans son fichier `.caddy` : `autreprojet.watuneed.fr { reverse_proxy autreprojet-app:8080 }`.

- **Ressources.** Immodesk réserve environ 3,4 Go de limites mémoire (`mem_limit`) :
  sur 4 Go, il ne reste de place que pour un petit projet. Ajouter un projet sérieux
  demande de passer à 8 Go, ou de réduire `PDF_WORKER_CONCURRENCY` et les limites.
  Surveiller `docker stats` et `df -h`. Chaque projet a ses propres sauvegardes.
- Si un jour Caddy doit vivre hors d'Immodesk (le projet est arrêté, par exemple),
  déplacer le service `caddy` dans un compose dédié (`/opt/edge`) avec les mêmes
  volumes : rien d'autre ne change.

## 12. Construire et installer l'APK

Sur le poste de développement (Flutter installé dans `C:\flutter\bin`), dans Git Bash :

```bash
export PATH="/c/flutter/bin:$PATH"
cd apps/mobile
flutter pub get
scripts/build-apk-staging.sh
```

Équivalent sans le script :
`flutter build apk --release --dart-define=API_BASE_URL=https://api.staging.immodesk.watuneed.fr/v1`.
Le fichier produit est `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`.

Le script refuse une URL qui n'est pas en `https`, ne transmet jamais `OTP_DEV_CODE`,
et vérifie que le manifeste de release n'autorise pas le trafic en clair (seul le
manifeste de debug l'autorise, pour l'émulateur).

**Keystore définitif avant le premier APK distribué.** Sans `android/key.properties`,
l'APK est signé avec la clé de débogage du poste. Android n'accepte une mise à jour que
signée par la **même** clé : changer de clé plus tard oblige à désinstaller
l'application, ce qui **efface les données hors ligne non synchronisées** (états des
lieux, encaissements saisis sans réseau). Créer donc le keystore **avant** de
distribuer quoi que ce soit (`docs/08_publication_mobile.md` § 1 et 2), le sauvegarder
en deux endroits, et ne plus jamais le changer.

Installation sur un téléphone Android : copier l'APK (câble, lien de téléchargement),
l'ouvrir, autoriser l'installation depuis cette source quand Android le demande.
Pour une mise à jour, installer le nouvel APK par-dessus : les données sont conservées
tant que la clé est la même. Avant toute mise à jour, demander aux démarcheurs de
synchroniser (indicateur de synchronisation à zéro).

## 13. Vérifier la pile sur un poste de développement

Avant un déploiement risqué, la même pile se lance en local, sans toucher à la pile de
développement (`infra/docker`) : nom de projet `immodesk-staging-local`, Caddy sur
`127.0.0.1:8480` et `127.0.0.1:8453` seulement, certificats de l'autorité interne de
Caddy (`infra/deploy/caddy/Caddyfile.local`).

```bash
cd infra/deploy
cp .env.staging.example .env      # remplir comme au § 6 ; EDGE_NETWORK=immodesk_local_edge
docker network create immodesk_local_edge
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Les noms d'hôtes restent ceux de la recette ; `curl --connect-to` les dirige vers le
Caddy local (`-k` : autorité interne) :

```bash
C="--connect-to ::127.0.0.1:8453 -k"
curl $C https://api.staging.immodesk.watuneed.fr/v1/health
curl $C -H 'Content-Type: application/json' -d '{"phone":"066000001"}' \
  https://api.staging.immodesk.watuneed.fr/v1/auth/otp/request
COMPOSE_FILES="docker-compose.yml docker-compose.local.yml" scripts/codes-otp.sh
```

Sous Git Bash (Windows), préfixer les scripts par
`MSYS_NO_PATHCONV=1 DEPLOY_DIR=$(pwd -W)`. Pour tout arrêter et effacer :
`docker compose -f docker-compose.yml -f docker-compose.local.yml down -v` puis
`docker network rm immodesk_local_edge`.

## 14. Mettre à jour

```bash
cd /opt/immodesk
git pull
infra/deploy/scripts/deploy.sh
```

Le script fait d'abord une sauvegarde (§ 15), reconstruit les images, applique les
nouvelles migrations, puis redémarre les services modifiés. Pendant les quelques
secondes de redémarrage de l'API, le mobile continue hors ligne et synchronise ensuite.

En cas de problème après une mise à jour : revenir au commit précédent
(`git checkout <commit>` puis `deploy.sh`). Une migration déjà appliquée ne se défait
pas ainsi : restaurer alors la sauvegarde faite juste avant (§ 15).

## 15. Sauvegardes et restauration

Chaque nuit à 04:30 UTC (après les traitements planifiés), `immodesk-backup.timer`
lance `scripts/backup.sh` :

- base : `pg_dump` au format custom, relu par `pg_restore --list` pour contrôle ;
- objets MinIO (photos, signatures, PDF) : archive `tar.gz` ;
- dans `/var/backups/immodesk` (droits 700), conservées **14 jours** (`KEEP_DAYS`).

```bash
sudo systemctl list-timers immodesk-backup.timer     # prochaine exécution
sudo journalctl -u immodesk-backup.service -n 20     # dernier résultat
ls -lh /var/backups/immodesk
```

Ces sauvegardes restent sur le même serveur : elles protègent d'une erreur, pas de la
perte du serveur. Les copier régulièrement ailleurs, par exemple sur le poste :

```powershell
scp -r deploy@ADRESSE_IPV4:/var/backups/immodesk C:\Sauvegardes\immodesk
```

Restauration (remplace la base actuelle ; arrête l'API et le web pendant l'opération) :

```bash
cd /opt/immodesk/infra/deploy
scripts/restore.sh /var/backups/immodesk/immodesk-db-AAAAMMJJTHHMMSSZ.pgdump \
  /var/backups/immodesk/immodesk-objets-AAAAMMJJTHHMMSSZ.tar.gz
```

Le script demande de taper `RESTAURER`, recrée la base, recrée les rôles s'ils
manquent (serveur neuf), restaure la base puis les objets, et redémarre tout. Procédure
testée sur la pile locale du § 13 : une écriture faite après la sauvegarde disparaît,
l'organisation et les objets sont retrouvés, la santé repasse à `ok`.

Sur un serveur neuf : bootstrap (§ 5), clone, `.env` **d'origine** (§ 6), `deploy.sh`,
puis `restore.sh`.

## 16. Passer de la recette à la production

Quand C1 (WhatsApp), E1 (passerelle SMS) et C4 (OpenPay) sont prêts :

1. Dans `.env` : `DEPLOYMENT_ENV=production`, `WHATSAPP_PROVIDER=meta` avec ses
   identifiants, `SMS_PROVIDER=android_gateway` avec ses identifiants,
   `OPENPAY_API_KEY`.
2. Changer les hôtes (`WEB_HOST=immodesk.watuneed.fr`, `API_HOST=api.immodesk.watuneed.fr`,
   `S3_HOST=s3.immodesk.watuneed.fr`), créer les enregistrements DNS correspondants,
   reconstruire l'APK avec la nouvelle URL d'API (nouvelle compilation, même keystore).
3. Retirer `X-Robots-Tag "noindex"` de `immodesk.caddy`.
4. `deploy.sh`. L'API refuse de démarrer si un réglage de production manque : lire
   `docker compose logs api`, qui nomme chaque variable en cause.

## 17. Points ouverts

- **Image MinIO.** MinIO ne publie plus d'images en accès libre : la pile utilise
  l'image Bitnami archivée (`bitnamilegacy/minio`, juillet 2025), la même que la CI,
  sans mises à jour de sécurité. Avant la production : construire MinIO depuis ses
  sources ou passer à une alternative libre compatible S3 (Garage, SeaweedFS).
- **Sauvegardes hors site** : copie manuelle (§ 15) ; à automatiser vers un second
  fournisseur, chiffrée (`age`), comme prévu par `docs/02` § 14.7.
- **Limite d'OTP par IP côté web** : les demandes de code faites depuis le web passent
  par le serveur Next, que l'API voit comme une seule adresse. La limite par IP
  (20 par heure) est donc commune à toutes les connexions web ; sans effet au pilote,
  à corriger avant la production (transmettre l'IP du client par le BFF).
- **Portail bailleur** : servi sous `/portail` du site web ; l'hôte distinct
  `portail.immodesk.watuneed.fr` prévu au besoin C3 n'est pas encore câblé.
- **Type de fichier des envois** : l'URL signée ne signe que l'hôte, pas le
  `Content-Type` (constaté en local) ; l'affirmation du code « le client DOIT envoyer
  le même en-tête » n'est pas tenue par MinIO. À traiter dans le module documents.
