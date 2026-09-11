# `@immodesk/api` — API Immodesk (phases 0 à 3)

Backend NestJS 11 de la plateforme Immodesk (gestion immobilière,
Congo-Brazzaville). Monolithe modulaire en Clean Architecture, multi-tenant
par Row Level Security PostgreSQL, authentification par téléphone + OTP.

Périmètre de la **phase 0** : socle technique, isolation multi-tenant prouvée
par tests, authentification OTP, organisations / membres / invitations,
contrat OpenAPI 3.1 publié.

Périmètre de la **phase 1** : tiers et patrimoine — bailleurs, locataires,
garants, canaux de contact, immeubles, lots (création en série), comptes de
règlement et pièces jointes sur stockage objet compatible S3.

Périmètre de la **phase 2** : baux et dépôts de garantie — cycle de vie du
bail (machine à états explicite, anti-chevauchement garanti en base),
parties, révisions de loyer datées, dépôts de garantie à mouvements
append-only, numérotation `BAIL-{AAAA}-{seq}`, génération du contrat en PDF
par un worker BullMQ Puppeteer, et cron quotidien des échéances.

Périmètre de la **phase 3** : facturation et espèces — factures de loyer
générées par le cron quotidien `billing-daily` (J-N avant l'échéance,
idempotent), campagnes manuelles, pénalités plafonnées, paiements imputés
« plus ancienne facture d'abord » avec avoir sur trop-perçu, contre-passation
miroir, reçus de caisse signés et numérotés par démarcheur, remises d'espèces
contrôlées avec écart audité, quittances PDF (A5) à QR de vérification
publique, et messagerie WhatsApp d'abord, SMS en repli, suivie par webhooks.

---

## 1. Démarrage rapide

```bash
# 1. Pile locale (PostgreSQL 16, Redis, MinIO) — depuis la racine du monorepo
pnpm db:up

# 2. Dépendances
pnpm install

# 3. Configuration
cp apps/api/.env.example apps/api/.env

# 4. Client Prisma + données de démonstration
pnpm --filter @immodesk/api prisma:generate
pnpm --filter @immodesk/api seed

# 5. Démarrage
pnpm --filter @immodesk/api dev
```

| Adresse                                 | Contenu                       |
| :-------------------------------------- | :---------------------------- |
| `http://localhost:3000/v1`              | Racine de l'API               |
| `http://localhost:3000/v1/health`       | Sonde base / Redis / stockage |
| `http://localhost:3000/v1/docs`         | Documentation interactive     |
| `http://localhost:3000/v1/openapi.json` | Contrat OpenAPI 3.1           |

### Se connecter en développement

```bash
# 1. Demander un code (il est journalisé par FakeSmsProvider, aucun SMS réel)
curl -X POST http://localhost:3000/v1/auth/otp/request \
  -H 'Content-Type: application/json' -d '{"phone":"+242066000001"}'

# 2. Vérifier avec le code lu dans les logs, ou avec OTP_DEV_CODE
curl -X POST http://localhost:3000/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+242066000001","code":"000000"}'
```

> Les ports hôtes de la pile Docker sont définis par
> `infra/docker/docker-compose.yml` et peuvent différer si d'autres projets
> occupent les ports par défaut. Alignez `DATABASE_URL` et `REDIS_URL` sur ce
> que publie `docker compose ps`.

---

## 2. Variables d'environnement

Toutes les variables sont validées au démarrage par **zod**
(`src/shared/config/config.schema.ts`) : une valeur manquante ou incohérente
empêche le processus de démarrer, plutôt que de produire une panne différée.
`.env.example` documente chaque entrée ; les points saillants :

| Variable             | Rôle                                                                                                                                                              |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Rôle applicatif `immodesk_app`, **soumis à la RLS**. Utilisé par tout le code métier.                                                                             |
| `DATABASE_ADMIN_URL` | Rôle `immodesk` (BYPASSRLS). Migrations, seed, les trois lectures transverses de `TenantDirectoryService` et la recherche de candidats de `DocumentPurgeService`. |
| `REDIS_URL`          | Compteurs de limitation de débit (partagés entre instances).                                                                                                      |
| `JWT_ALGORITHM`      | `HS256` en local, `RS256` en déploiement (renseigner alors la paire de clés).                                                                                     |
| `OTP_PEPPER`         | Poivre du hachage SHA-256 des codes OTP. Vit hors base : à régénérer par environnement.                                                                           |
| `OTP_DEV_CODE`       | Code fixe accepté hors production. Le démarrage **échoue** si `NODE_ENV=production` et que la variable est définie. Une valeur vide vaut « non défini ».          |
| `CURSOR_SECRET`      | Signature HMAC des curseurs de pagination (empêche de forger une position).                                                                                       |

### Stockage objet (phase 1)

Les pièces jointes vivent dans un stockage compatible S3 — **MinIO
auto-hébergé** en pilote, Cloudflare R2 si le volume l'exige. Le fichier ne
transite **jamais** par l'API : il part du navigateur ou du téléphone vers le
stockage par une URL signée, et revient de même.

| Variable                           | Rôle                                                                                       |
| :--------------------------------- | :----------------------------------------------------------------------------------------- |
| `S3_ENDPOINT`                      | `http://localhost:9010` en local ; console MinIO sur `9011`.                               |
| `S3_BUCKET`                        | `immodesk`.                                                                                |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`  | Identifiants du stockage. Le démarrage **échoue** si l'un manque.                          |
| `S3_REGION`                        | `us-east-1` par défaut : MinIO l'ignore, mais le SDK AWS en exige une pour signer.         |
| `S3_UPLOAD_URL_TTL_SECONDS`        | Validité de l'URL d'envoi (600 s). Le téléchargement est figé à **10 min** par le contrat. |
| `DOCUMENTS_PURGE_ENABLED`          | Active la purge différée des objets supprimés (inactive d'office en `NODE_ENV=test`).      |
| `DOCUMENTS_PURGE_INTERVAL_SECONDS` | Période de passage de la tâche (3600 s).                                                   |
| `DOCUMENTS_PURGE_GRACE_HOURS`      | Délai de rétractation avant destruction irréversible (24 h).                               |
| `DOCUMENTS_PURGE_BATCH_SIZE`       | Objets traités par passage (50).                                                           |

`forcePathStyle` est activé : l'adressage par sous-domaine (`bucket.host`)
suppose un DNS générique que `localhost` n'a pas.

### Files BullMQ et worker PDF (phase 2)

| Variable                    | Rôle                                                                                                  |
| :-------------------------- | :---------------------------------------------------------------------------------------------------- |
| `QUEUE_PREFIX`              | Préfixe des clés Redis (`immodesk`). Deux environnements partageant un Redis ne se volent pas un job. |
| `LEASES_CRON_ENABLED`       | Active le cron quotidien des baux (inactif d'office en `NODE_ENV=test`).                              |
| `LEASES_CRON_PATTERN`       | Motif cron, `0 2 * * *` par défaut.                                                                   |
| `LEASES_CRON_TIMEZONE`      | `Africa/Brazzaville`.                                                                                 |
| `PDF_WORKER_ENABLED`        | Démarre le worker `lease-contract`.                                                                   |
| `PDF_WORKER_CONCURRENCY`    | Rendus simultanés (**2**). Ce sont des onglets du même Chromium, pas des processus.                   |
| `PDF_JOB_TIMEOUT_MS`        | Verrou d'un job de rendu (60 s).                                                                      |
| `PDF_JOB_ATTEMPTS`          | Tentatives avant échec définitif (3), avec délai exponentiel.                                         |
| `PUPPETEER_EXECUTABLE_PATH` | Navigateur de rendu. Voir ci-dessous.                                                                 |
| `PUPPETEER_LAUNCH_ARGS`     | Arguments de lancement séparés par des virgules (`--no-sandbox,--disable-dev-shm-usage`).             |

**Le Chromium empaqueté n'est pas toujours téléchargé.** Le script
d'installation de Puppeteer (≈ 180 Mo) est bloqué par la politique pnpm de ce
dépôt sur les scripts de paquets, et il l'est aussi derrière bien des réseaux
d'entreprise. L'API le prend en compte : elle cherche un navigateur dans cet
ordre —

1. `PUPPETEER_EXECUTABLE_PATH` ;
2. le Chromium empaqueté, s'il a bien été téléchargé ;
3. les Chrome, Chromium puis Edge installés sur la machine.

Les candidats sont **essayés l'un après l'autre** jusqu'à ce que l'un démarre :
qu'un exécutable existe ne prouve pas qu'il se lance. Edge, présent sur tout
poste Windows, se termine immédiatement avec certaines versions de Puppeteer ;
il reste donc en dernier recours, derrière Chrome.

Si aucun navigateur ne démarre, **l'API démarre quand même** : seule la
génération répond `503 LEASES.CONTRACT_UNAVAILABLE`, et la prévisualisation
HTML (`GET /v1/leases/{id}/contract/preview`) continue de fonctionner. Le test
d'intégration `phase2-contract-pdf.int-spec.ts` se **saute proprement** dans
ce cas, avec un avertissement explicite plutôt qu'un échec muet.

En conteneur, installer `google-chrome-stable` (ou `chromium`) et pointer
`PUPPETEER_EXECUTABLE_PATH` dessus est plus léger et plus reproductible que de
laisser Puppeteer télécharger son propre binaire à chaque build.

> Puppeteer n'est plus publié qu'en **ESM** depuis la v23, alors que l'API est
> compilée en CommonJS. Le paquet est donc chargé par
> `src/modules/pdf/infrastructure/puppeteer-loader.ts`, qui passe par le
> `createRequire` **natif** obtenu via `process.getBuiltinModule('module')` :
> c'est le seul chemin qui fonctionne à la fois sous Node et dans le runtime
> CommonJS de Jest 29, lequel ne sait charger ni un module ESM ni un
> `import()` dynamique sans `--experimental-vm-modules`.

### Facturation, messagerie et liens publics (phase 3)

| Variable                                             | Rôle                                                                                               |
| :--------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| `BILLING_CRON_ENABLED` / `_PATTERN` / `_TIMEZONE`    | Cron `billing-daily` : `0 3 * * *`, `Africa/Brazzaville` (inactif d'office en `NODE_ENV=test`).    |
| `RECEIPT_PDF_FORMAT`                                 | `A5` (défaut) ou `A4` : format des quittances et reçus de caisse.                                  |
| `WHATSAPP_PROVIDER`                                  | `fake` (développement, tests) ou `meta` (Cloud API en direct).                                     |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` | Identifiant du numéro et jeton système Meta. Obligatoires si `meta`.                               |
| `WHATSAPP_APP_SECRET`                                | Secret de l'application Meta : vérifie `X-Hub-Signature-256` des webhooks.                         |
| `WHATSAPP_VERIFY_TOKEN`                              | Jeton choisi par l'exploitant, rejoué par Meta lors de la vérification `GET` du webhook.           |
| `WHATSAPP_API_VERSION` / `WHATSAPP_API_BASE_URL`     | `v21.0`, `https://graph.facebook.com`.                                                             |
| `SMS_PROVIDER`                                       | `fake` ou `android_gateway` (SMS Gateway for Android, open source).                                |
| `SMS_GATEWAY_URL` / `_USERNAME` / `_PASSWORD`        | Adresse et identifiants Basic de la passerelle. Obligatoires si `android_gateway`.                 |
| `SMS_GATEWAY_WEBHOOK_SECRET`                         | Clé partagée des webhooks de la passerelle (`X-Signature` + `X-Timestamp`, ou `X-Webhook-Secret`). |
| `NOTIFICATIONS_WORKER_ENABLED` / `_CONCURRENCY`      | Worker BullMQ `notifications` (4 envois simultanés).                                               |
| `PUBLIC_WEB_BASE_URL`                                | Page de vérification : `{PUBLIC_WEB_BASE_URL}/verifier/{token}` (QR et SMS).                       |
| `PUBLIC_API_BASE_URL`                                | Racine publique de l'API, pour les liens courts de PDF envoyés par SMS.                            |
| `DOCUMENT_LINK_TTL_SECONDS`                          | Validité des liens de PDF joints aux messages : 604 800 s (7 jours, plafond SigV4).                |
| `LINK_SIGNING_SECRET`                                | Signature HMAC des liens courts `/v1/public/d/{token}`.                                            |
| `RATE_LIMIT_PUBLIC_PER_MINUTE`                       | Débit des routes publiques (vérification, liens courts) : 30 / min / IP.                           |

#### Configurer Meta WhatsApp Cloud API

1. Dans le gestionnaire Meta Business, créer une application de type
   « Business », y ajouter le produit **WhatsApp** et associer le numéro dédié.
2. Relever l'**identifiant du numéro** (`WHATSAPP_PHONE_NUMBER_ID`), créer un
   **utilisateur système** avec un jeton permanent (`WHATSAPP_ACCESS_TOKEN`,
   permissions `whatsapp_business_messaging` et `whatsapp_business_management`),
   et copier le **secret de l'application** (`WHATSAPP_APP_SECRET`).
3. Soumettre les modèles de `notification_templates` (canal `WHATSAPP`) sous
   les noms indiqués (`receipt_ready_fr`, `cash_receipt_fr`,
   `rent_due_reminder_fr`, `otp_code_fr`), langue `fr`, catégorie
   « Utility » (« Authentication » pour `otp_code_fr`). Le modèle de quittance
   porte un en-tête **Document**. Les paramètres suivent l'ordre de la
   colonne `variables`.
4. Déclarer le webhook : URL `https://<api>/v1/webhooks/whatsapp`, jeton de
   vérification = `WHATSAPP_VERIFY_TOKEN`, abonnement au champ `messages`.
   Meta appelle d'abord `GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…` ;
   l'API rend le challenge si le jeton concorde.
5. Passer `WHATSAPP_PROVIDER=meta`. Le démarrage échoue si l'identifiant ou le
   jeton manquent.

#### Configurer la passerelle SMS Android

1. Installer **SMS Gateway for Android** (capcom6, open source) sur le
   téléphone dédié équipé de la SIM MTN au forfait illimité ; activer le
   serveur local (ou le mode cloud privé) et noter l'adresse, l'utilisateur et
   le mot de passe affichés.
2. Renseigner `SMS_GATEWAY_URL` (par exemple `http://192.168.1.50:8080`),
   `SMS_GATEWAY_USERNAME`, `SMS_GATEWAY_PASSWORD`, puis `SMS_PROVIDER=android_gateway`.
   L'API envoie `POST {SMS_GATEWAY_URL}/message` avec `{ message, phoneNumbers }`.
3. Enregistrer les webhooks `sms:sent`, `sms:delivered` et `sms:failed` vers
   `https://<api>/v1/webhooks/sms`, avec la clé de signature =
   `SMS_GATEWAY_WEBHOOK_SECRET`. Une requête non signée est refusée en 401.
4. Garder le téléphone sur secteur, en Wi-Fi fixe, l'optimisation de batterie
   désactivée pour l'application : un téléphone en veille ne remet rien.

---

## 3. Base de données et migrations

### Le DDL SQL est la source de vérité

`docs/schema/schema.sql` (71 tables, ~60 types énumérés, vues, triggers,
policies RLS) fait foi. Il est recopié tel quel dans
`prisma/migrations/0_init/migration.sql`, et `prisma/schema.prisma` en est
**dérivé par introspection** — jamais l'inverse.

Les noms de modèles Prisma restent ceux des tables (`organization_members`,
`otp_codes`, ...). C'est assumé en phase 0 : la couche `infrastructure/` de
chaque module isole ce détail du reste du code.

### Migrations livrées

| Migration            | Contenu                                                                                                                                                                |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0_init`             | Le DDL complet, recopié de `docs/schema/schema.sql`.                                                                                                                   |
| `1_momo_declared`    | Mobile Money « paiement déclaré » : canal, colonnes de déclaration, statuts `DECLARED` / `REJECTED`.                                                                   |
| `2_leases_revisions` | Extension `btree_gist`, contrainte `leases_no_overlap_excl`, table `lease_rent_revisions` (policy RLS et déclencheur `updated_at` compris), `sequence_kind` + `LEASE`. |

### Faire évoluer le schéma

```bash
# 1. Modifier docs/schema/schema.sql, recharger la base, puis :
pnpm --filter @immodesk/api prisma:pull       # réintrospection
pnpm --filter @immodesk/api prisma:generate   # régénération du client
```

### Marquer la migration initiale comme appliquée

Sur une base déjà chargée par `docs/schema/schema.sql` (c'est le cas de la
pile Docker locale, dont le script d'init exécute le DDL au premier
démarrage), Prisma doit être informé que `0_init` est **déjà en place**,
faute de quoi il tenterait de la rejouer :

```bash
cd apps/api
pnpm exec prisma migrate resolve --applied 0_init
```

Cette commande n'exécute aucun SQL : elle insère simplement la ligne
correspondante dans `_prisma_migrations`. Sur une base vierge, utilisez au
contraire `pnpm exec prisma migrate deploy`, qui appliquera `0_init`.

Le bloc `datasource` déclare `directUrl = env("DATABASE_ADMIN_URL")` : les
commandes de migration et d'introspection passent par le rôle
d'administration, tandis que le runtime utilise `url` (le rôle applicatif).
`immodesk_app` n'a en effet pas le droit de créer `_prisma_migrations` — et
ne doit pas l'avoir. `DATABASE_ADMIN_URL` est donc requis pour toute commande
`prisma`, y compris `generate`.

### Rôles PostgreSQL

| Rôle             | Droits                           | Usage                                                   |
| :--------------- | :------------------------------- | :------------------------------------------------------ |
| `immodesk_app`   | LOGIN, ni SUPERUSER ni BYPASSRLS | Runtime. **Toutes** les policies s'appliquent.          |
| `immodesk_admin` | NOLOGIN, BYPASSRLS               | Back-office plateforme (programme d'apport d'affaires). |
| `immodesk`       | Propriétaire, BYPASSRLS          | Migrations, seed, administration.                       |

Le DDL crée `immodesk_app` en `NOLOGIN` et pose tous les GRANT nécessaires.
Le script `infra/docker/init/01-schema.sh` lui attribue ensuite un mot de
passe et le droit de connexion. En dehors de Docker :

```sql
ALTER ROLE immodesk_app WITH LOGIN PASSWORD 'immodesk_app';
```

### Données de démonstration

`pnpm --filter @immodesk/api seed` — déterministe et idempotent :

- organisation **Agence Mpila Immo** (`AGENCY`, Brazzaville, slug `agence-mpila-immo`) ;
- `+242066000001` — OWNER, `+242066000002` — COLLECTOR ;
- paramètres par défaut : échéance le **5**, `Africa/Brazzaville`, **XAF** ;
- trois modèles de message : `auth.otp_login`, `org.invitation`, `user.welcome` ;
- un drapeau de démonstration `demo.banner`.

Portefeuille de la phase 1 (`prisma/seed-portfolio*.ts`), quartiers réels de
Brazzaville :

- **2 bailleurs** : Célestin Nkodia (personne physique, Moungali) et **SCI Les
  Manguiers** (personne morale avec RCCM, Mpila) ;
- **1 immeuble** « Résidence Mpila » (6e arrondissement Talangaï, repère
  « derrière l'école Nganga Édouard ») et ses **12 lots A1..A12** — 4 studios
  au rez-de-chaussée, 8 appartements aux étages, 4 occupés : taux
  d'occupation **3333 bps** ;
- **3 locataires** (Poto-Poto, Bacongo, Makélékélé), chacun avec son garant et
  ses canaux de contact mobile / WhatsApp / e-mail ;
- **2 comptes de règlement** : compte courant **BGFI** de l'agence et
  portefeuille **MTN Mobile Money** de la SCI.

Baux de la phase 2 (`prisma/seed-leases.ts`) :

- **2 baux ACTIFS** sur les lots **A1** et **A2**, référencés
  `BAIL-{AAAA}-{seq}` par la fonction SQL `next_sequence`, avec leur locataire
  principal dans `lease_parties` ;
- leurs **dépôts partiellement encaissés** — 100 000 et 75 000 FCFA sur
  150 000 attendus, statut `PARTIALLY_PAID` : c'est le cas courant sur le
  terrain, la caution se versant en deux ou trois fois ;
- **1 bail en BROUILLON** sur le lot **A3**, sans référence attribuée ;
- **1 révision de loyer future** sur le bail A1 (1er janvier suivant,
  +5 000 FCFA), que le cron quotidien appliquera à sa date d'effet ;
- le **gabarit de contrat par défaut** (« bail à usage d'habitation,
  Congo-Brazzaville ») dans `organization_settings.settings_json`.

Facturation de la phase 3 (`prisma/seed-billing.ts`) :

- la **règle de pénalité par défaut** « Retard standard — 5 % par mois »
  (tolérance 5 jours, plafond 20 %, 4 mois au plus), reprise dans
  `billing.defaultPenaltyRuleId` ;
- les **8 modèles système** (`RECEIPT_ISSUED`, `CASH_RECEIPT_ISSUED`,
  `INVOICE_ISSUED`, `OTP_CODE`, chacun en WhatsApp et en SMS) ;
- la facture du **mois courant de A1**, ÉMISE ;
- la facture du **mois courant de A2**, PARTIELLEMENT RÉGLÉE : loyer, charges
  et une refacturation de serrure (125 000 FCFA), dont 100 000 encaissés en
  espèces par le COLLECTOR `+242066000002` — reçu `CASH-AMI-…-000001` ;
- la facture du **mois précédent de A1**, RÉGLÉE par Mobile Money, avec sa
  **quittance ÉMISE** (`QUI-{YYYYMM}-00001`, jeton de vérification publique) ;
- une **remise SOUMISE** (`REM-{YYYYMM}-00001`) regroupant le reçu de caisse.

Relancer le seed ne crée rien de plus (factures retrouvées par bail et
période, paiements par `client_ref`).

---

## 4. Isolation multi-tenant

### Le mécanisme

1. `JwtAuthGuard` authentifie le porteur du jeton (`Authorization: Bearer`).
2. `OrganizationGuard` lit l'en-tête **`X-Organization-Id`**, vérifie
   l'adhésion **ACTIVE** dans `organization_members` et résout le rôle
   effectif — relu en base à chaque requête, jamais repris du jeton.
3. `TenantContextInterceptor` ouvre le contexte `AsyncLocalStorage`.
4. `PrismaService.withTenant(orgId, userId, fn)` ouvre une transaction et y
   exécute `set_config('app.current_organization_id', …, true)` et
   `set_config('app.current_user_id', …, true)` **avant** tout travail. Le
   troisième argument `true` équivaut à `SET LOCAL` : le réglage meurt avec
   la transaction, ce qui est indispensable avec un pool de connexions.

Toute route d'organisation passe par `withTenant` : c'est le seul endroit du
code qui active la RLS.

### Rôles et hiérarchie

`OWNER > MANAGER > ACCOUNTANT = COLLECTOR > VIEWER`

`ACCOUNTANT` et `COLLECTOR` ont le **même rang mais ne se substituent pas**
l'un à l'autre : leurs périmètres sont disjoints (lecture financière contre
encaissement terrain). Une exigence `@Roles('COLLECTOR')` n'est donc pas
satisfaite par un `ACCOUNTANT`, et réciproquement.

```ts
@Get(':id/settings')
@Roles('MANAGER')          // MANAGER et OWNER passent ; COLLECTOR non
async getSettings() { … }
```

### 404, jamais 403

Une ressource appartenant à une autre organisation doit être **indiscernable
d'une ressource inexistante** : la RLS la rend invisible, et l'API répond
`404`. Répondre `403` révélerait son existence.

### Les deux exceptions documentées

- **Tables globales** — `users`, `user_credentials`, `otp_codes`,
  `refresh_tokens` ne portent pas `organization_id` : un utilisateur
  appartient à plusieurs organisations et se connecte _avant_ d'en choisir
  une. L'autorisation y est purement applicative.
- **`TenantDirectoryService`** — seul composant du runtime connecté avec
  `DATABASE_ADMIN_URL`. Il répond aux trois questions qui, par nature,
  précèdent la connaissance de l'organisation : « à quelles organisations cet
  utilisateur appartient-il ? » (`GET /v1/me`), « à quelle organisation ce
  jeton d'invitation se rapporte-t-il ? », « ce slug est-il libre ? ».
  Aucune écriture, aucun accès générique.

---

## 5. Authentification

| Étape        | Règle                                                                                                                       |
| :----------- | :-------------------------------------------------------------------------------------------------------------------------- |
| Demande      | Code à 6 chiffres, haché **SHA-256 avec poivre**, expiration **5 min**, `max_attempts = 5`. Renvoi possible après **60 s**. |
| Débit        | **3 demandes / 10 min par numéro**, **20 / h par IP** (`@nestjs/throttler` sur Redis) → `429 IAM.RATE_LIMITED`.             |
| Vérification | Création du compte au premier succès. Consommation **atomique** du code.                                                    |
| Jetons       | JWT d'accès **15 min** + refresh token opaque **30 j**, stocké haché, avec `family_id`.                                     |
| Verrouillage | 5e erreur → code invalidé, entrée `OTP_LOCKED` dans `audit_logs`, `429 IAM.OTP_LOCKED`.                                     |
| Rotation     | Systématique. Rejeu d'un jeton révoqué → **révocation de toute la famille** + `401 IAM.REFRESH_REVOKED`.                    |

La réponse de `/v1/auth/otp/request` est identique que le numéro existe ou
non : l'API ne permet pas d'énumérer les comptes.

> La révocation de famille est validée **avant** la levée de l'erreur : si
> elle était faite dans la transaction que le `throw` annule, le vol de
> session resterait sans conséquence. Un test d'intégration verrouille ce
> comportement.

---

## 6. Erreurs

Enveloppe stable, figée par `docs/api/phase0-contract.md` :

```json
{
  "code": "IAM.OTP_INVALID",
  "message": "Code incorrect.",
  "details": { "remainingAttempts": 3 }
}
```

Le catalogue vit dans `src/shared/errors/error-codes.ts`. **Le code est un
contrat public** : le message peut évoluer, l'identifiant et le statut HTTP
jamais. Un test unitaire fige les statuts des codes de la phase 0.

Les messages sont en français (fr-CG) et ne révèlent ni organisation, ni
montant, ni existence de compte.

---

## 7. Tests

```bash
pnpm --filter @immodesk/api lint
pnpm --filter @immodesk/api typecheck
pnpm --filter @immodesk/api test              # unitaires, aucune dépendance
pnpm --filter @immodesk/api test:integration  # nécessite la pile Docker
pnpm --filter @immodesk/api build
```

### Unitaires (`test/unit/`)

Pur domaine, sans base ni Redis : hachage / expiration / comptage de
tentatives des OTP, rotation et détection de rejeu des refresh tokens,
hiérarchie des rôles, protection du dernier OWNER, normalisation E.164,
montants BigInt, curseurs signés, catalogue d'erreurs.

### Intégration (`test/integration/`)

Contre la vraie base PostgreSQL — **aucun mock de la base** : la RLS ne peut
se vérifier que sur un vrai serveur.

- `auth-flow.int-spec.ts` — cycle complet OTP → appel authentifié → rotation
  → rejeu → déconnexion, verrouillage à la 5e tentative, limitation de débit,
  normalisation du numéro.
- `organizations.int-spec.ts` — création d'organisation, paramètres,
  invitation → acceptation → visibilité partagée, protection du dernier
  OWNER, 404 sur l'organisation d'autrui, drapeaux de fonctionnalité.
- `phase1-parties.int-spec.ts` — normalisation E.164 à la création, recherche
  sans accent, **avertissement de doublon de téléphone puis confirmation par
  `confirmDuplicatePhone`**, garant et canaux de contact, bailleur « self »
  créé et protégé, suppression logique.
- `phase1-portfolio.int-spec.ts` — **12 lots A1..A12 en une transaction**,
  **rollback complet si un seul code est en doublon**, taux d'occupation
  recalculé, **refus de suppression d'un lot dont le bail ACTIF est inséré
  directement en SQL**, 404 cross-organisation.
- `phase1-documents.int-spec.ts` — **contre MinIO réel** : URL signée d'envoi,
  PUT effectif, enregistrement après vérification HEAD, refus d'une clé
  d'une autre organisation, téléchargement signé, **404 pour l'organisation
  B**, **expiration effective d'une URL signée à 1 seconde**, purge différée.
- `phase2-leases.int-spec.ts` — activation atomique et son **rollback complet
  quand l'insertion du dépôt échoue**, transition invalide refusée,
  chevauchement rejeté par le service puis **par la contrainte, en SQL brut**,
  **100 activations concurrentes : série de références contiguë, sans trou ni
  doublon**.
- `phase2-deposits.int-spec.ts` — le Gherkin complet (300 000 encaissés,
  45 000 retenus, 255 000 restitués, aucun mouvement modifié), refus d'une
  restitution sur bail ouvert et d'un montant supérieur au solde,
  contre-passation, révisions de loyer et `rent-at`, **cron quotidien rejoué
  sans effet**.
- `phase2-contract-pdf.int-spec.ts` — **contre un vrai Chromium et un vrai
  MinIO** : prévisualisation HTML, génération asynchrone, PDF téléchargeable,
  **empreinte identique sur deux rendus du même bail**, version suivante après
  révision, **v1 inchangée**, gabarit personnalisable. Se saute proprement si
  aucun navigateur n'est installé.
- `phase3-billing.int-spec.ts` — paramètres `billing` / `cash` / `messaging`
  fusionnés, **campagne sur 500 baux en moins de 60 s** (≈ 6 s mesurées),
  numérotation `LOY` continue, **relance sans doublon**, facture manuelle
  (brouillon sans numéro, lignes, émission, annulation), passage en retard et
  **une seule pénalité par jour**.
- `phase3-payments.int-spec.ts` — paiement partiel, **trop-perçu → avoir**
  (invariant imputations + avoir = montant vérifié en SQL), imputation de
  l'avoir sans nouveau paiement, **idempotence `clientRef` et
  `Idempotency-Key`** (deux appels → un paiement, 200 au rejeu), confirmation
  et rejet, **contre-passation** (ligne d'origine identique octet pour octet),
  **UPDATE de montant et DELETE refusés en SQL brut**.
- `phase3-cash.int-spec.ts` — signature exigée, reçu signé (sha256) et
  rejoué, **50 encaissements simultanés d'un démarcheur → série 000001..000050
  sans trou**, encours et plafond, **remise 750 000 / 720 000 : écart −30 000
  audité** avec contrôleur et démarcheur, rejet de remise, reçu annulé par la
  contre-passation, UPDATE / DELETE refusés sur `cash_receipts`.
- `phase3-receipts.int-spec.ts` — modèles semés à la création, **Gherkin
  paiement partiel puis solde → quittance QUI + `message_logs`**, vérification
  publique (jeton valide, **jeton altéré → 404**, aucune donnée personnelle),
  **PDF réel avec QR décodable** (sauté sans navigateur), contre-passation
  complète, **webhooks WhatsApp signé / non signé** et idempotents, **repli SMS
  sur échec WhatsApp**, webhook SMS signé, numéro en `…99` → double échec et
  relance.
- `rls-isolation.int-spec.ts` — **suite d'isolation, bloquante**.

### La suite d'isolation RLS

Elle lit `information_schema` pour énumérer **toutes** les tables portant
`organization_id` (hors `referral%`, globales par conception), puis pour
chacune :

1. insère une ligne minimale pour l'organisation A et pour l'organisation B ;
2. vérifie qu'une lecture sous le contexte A ne retourne **jamais** de ligne
   de B, y compris par accès direct à l'identifiant ;
3. vérifie qu'une écriture sous A portant `organization_id = B` est rejetée
   **par la clause `WITH CHECK` de la policy**, et non par le code applicatif ;
4. vérifie qu'un `UPDATE` croisé n'affecte aucune ligne.

Elle vérifie en outre que le rôle applicatif n'est ni `SUPERUSER` ni
`BYPASSRLS`, que `RLS` **et** `FORCE RLS` sont actifs sur chaque table
concernée, et qu'aucune ne reste sans policy.

Une table dont les colonnes obligatoires ne peuvent pas être satisfaites
génériquement (clé étrangère vers une entité non ancrée, contrainte `CHECK`
métier) est **sautée proprement**, avec sa raison affichée dans le compte
rendu. Un saut n'est pas un échec de la RLS mais une limite du générateur de
données ; la couverture des tables de la phase 0 est en revanche
**obligatoire** et vérifiée par une assertion dédiée.

Pour élargir la couverture, ajoutez une ancre dans `createFixture` ou une
entrée dans `TABLE_HINTS` (`test/integration/rls-matrix.ts`).

La couverture des **8 tables de la phase 1** — `landlords`, `tenants`,
`guarantors`, `contact_channels`, `properties`, `units`, `bank_accounts`,
`documents` — est vérifiée par une assertion dédiée, au même titre que celles
de la phase 0. `bank_accounts` a exigé une entrée dans `TABLE_HINTS`
(`bank_accounts_identifier_chk` réclame un numéro de compte, un IBAN ou un
numéro Mobile Money), et `mobile_money_transactions` une autre depuis que
`aggregator` est facultatif (migration `1_momo_declared`).

Les **6 tables de la phase 2** — `leases`, `lease_parties`,
`lease_rent_revisions`, `lease_documents`, `deposits`, `deposit_movements` —
sont couvertes par la même assertion dédiée. Trois ancres supplémentaires ont
été ajoutées à `createFixture` (un bail, un dépôt, un document) et une entrée
**dynamique** à `DYNAMIC_TABLE_HINTS` : `lease_parties_target_chk` exige un
`tenant_id` de la **même** organisation, valeur qu'une table de constantes ne
peut pas fournir. Le bail d'ancrage et celui qui porte le dépôt d'ancrage sont
distincts, `deposits_lease_uk` n'admettant qu'un dépôt par bail.

Les **13 tables de la phase 3** — `rent_invoices`, `invoice_lines`,
`penalty_rules`, `payments`, `payment_allocations`, `tenant_credits`,
`cash_receipts`, `cash_remittances`, `cash_remittance_items`, `receipts`,
`notifications`, `sequences`, `webhook_events` — rejoignent l'assertion
dédiée (47 tables couvertes au total). Quatre ancres de plus dans
`createFixture` (facture, paiement, reçu de caisse, remise SOUMISE pour
laisser libre l'index « une remise OPEN par démarcheur ») et trois entrées
d'indices : période croissante de `rent_invoices`, taux de `penalty_rules`,
cible unique de `payment_allocations`. Le nettoyage neutralise aussi les
déclencheurs `guard_financial_row`, sans quoi la cascade de suppression d'une
organisation de test échouerait silencieusement.

> Une requête émise **sans** contexte de tenant ne retourne jamais de ligne.
> Selon l'état de la connexion, elle renvoie un ensemble vide (connexion
> neuve : le paramètre vaut `NULL`) ou lève une erreur (connexion ayant déjà
> porté un contexte : PostgreSQL ramène le paramètre personnalisé à la chaîne
> vide, et `''::uuid` échoue). Les deux issues sont sûres ; seule une fuite
> serait un défaut.

---

## 8. Contrat OpenAPI

```bash
pnpm --filter @immodesk/api openapi:export   # écrit docs/api/openapi.json
```

Le document est en **OpenAPI 3.1**. Une fois publié, il devient la source de
vérité du contrat et remplace `docs/api/phase0-contract.md`. C'est ce fichier
qui alimente la génération des clients TypeScript (web) et Dart (mobile).

---

## 9. Structure et ajout d'un module

```text
src/
├── main.ts                  # point d'entrée
├── bootstrap.ts             # construction de l'app (partagée avec les tests)
├── app.module.ts            # assemblage, gardes et intercepteurs globaux
├── shared/                  # briques transverses
│   ├── auth/                # contrats de jeton, garde JWT, décorateurs
│   ├── config/              # schéma zod, service de configuration
│   ├── errors/              # DomainError, catalogue, filtre d'exception
│   ├── ids/                 # UUID v7, jetons opaques
│   ├── logger/              # pino (expurgation des secrets)
│   ├── money/               # montants BigInt XAF
│   ├── pagination/          # curseurs signés
│   ├── phone/               # normalisation E.164 (+242)
│   ├── prisma/              # PrismaService, TenantDirectoryService
│   ├── redis/               # client partagé
│   ├── tenant/              # contexte ALS, garde d'organisation, rôles
│   ├── throttler/           # stockage Redis de limitation de débit
│   └── validation/          # pipe zod
└── modules/
    ├── identity/            # users, credentials, otp_codes, refresh_tokens, api_keys
    ├── organizations/       # organizations, settings, members, invitations, feature_flags
    ├── parties/             # landlords, tenants, guarantors, contact_channels
    ├── portfolio/           # properties, units, taux d'occupation
    ├── banking/             # bank_accounts (banques locales et Mobile Money)
    ├── documents/           # documents, stockage S3/MinIO, URL signées, purge différée
    ├── notifications/       # SmsProvider, WhatsAppProvider, templates, message_logs
    ├── leases/              # leases, lease_parties, lease_rent_revisions, lease_documents, cron
    ├── deposits/            # deposits, deposit_movements (append-only)
    ├── numbering/           # sequences, next_sequence / format_sequence_number
    ├── pdf/                 # worker BullMQ Puppeteer, gabarits contrat, quittance, reçu, facture
    ├── billing/             # rent_invoices, invoice_lines, penalty_rules, cron billing-daily
    ├── payments/            # payments, payment_allocations, tenant_credits, contre-passation
    ├── cash/                # cash_receipts, cash_remittances, cash_remittance_items
    ├── receipts/            # receipts, vérification publique, pipeline des documents financiers
    ├── audit/               # audit_logs, fonction audit()
    └── platform/            # santé, idempotence, OpenAPI, configuration
```

### Les modules de la phase 3

| Module          | Responsabilité                                                                                                     |
| :-------------- | :----------------------------------------------------------------------------------------------------------------- |
| `billing`       | Factures, lignes, machine à états, cron `billing-daily`, campagnes (rapport Redis 7 j), pénalités, tableau de bord |
| `payments`      | Paiements, imputation « plus ancienne facture d'abord », avoirs, contre-passation miroir, relevé locataire         |
| `cash`          | Reçus de caisse signés, séries par démarcheur, encours et plafond, remises contrôlées                              |
| `receipts`      | Quittances QUI, jeton et route publique de vérification, pipeline PDF (quittance, reçu, facture)                   |
| `notifications` | Pipeline BullMQ WhatsApp → SMS, Meta Cloud API, passerelle Android, modèles, journal, webhooks                     |

Les échanges passent par des ports `Symbol`, comme aux phases 1 et 2 :

| Port                             | Déclaré dans           | Implémenté par                | Sert à                                        |
| :------------------------------- | :--------------------- | :---------------------------- | :-------------------------------------------- |
| `RECEIPT_ISSUER`                 | `payments/domain`      | `ReceiptIssuerService`        | Quittance à la facture soldée, annulation     |
| `CASH_RECEIPT_CANCELLER`         | `payments/domain`      | `CashReceiptsService`         | Annuler le reçu d'un paiement contre-passé    |
| `CASH_RECEIPT_PUBLISHER`         | `cash/domain`          | `FinancialDocumentsPipeline`  | PDF et envoi d'un reçu de caisse après COMMIT |
| `NOTIFICATION_ENQUEUER`          | `notifications/domain` | `NotificationPipelineService` | Mettre un message en file                     |
| `NOTIFICATION_OUTCOME_LISTENERS` | `notifications/domain` | `ReceiptDeliveryListener`     | Passer une quittance à SENT                   |
| `ORGANIZATION_SETUP_LISTENERS`   | `organizations/domain` | `TemplateSeeder`              | Semer les modèles système à la création       |

**Montant payé DÉRIVÉ, jamais saisi.** `rent_invoices.paid_amount`,
`balance_amount` et le statut d'encaissement ne sont écrits que par
`InvoiceLedgerService`, dans la transaction qui écrit les
`payment_allocations`. Les verrous se prennent toujours dans le même ordre
(série PAY, factures, série QUI, série du démarcheur) : cinquante
encaissements simultanés s'alignent sans interblocage.

**Trois lectures transverses documentées de plus** (connexion
d'administration, comme `TenantDirectoryService`) : la liste des
organisations à facturer par le cron, la vérification publique d'une
quittance (une ligne, colonnes fermées) et la résolution d'un webhook par
l'identifiant fournisseur du message. Toute écriture repasse par `withTenant`.

### Les quatre modules de la phase 2

| Module      | Responsabilité                                                                                   |
| :---------- | :----------------------------------------------------------------------------------------------- |
| `leases`    | Cycle de vie du bail, parties, révisions, résiliation, contrôle de chevauchement, cron quotidien |
| `deposits`  | `deposits` et `deposit_movements`, soldes recalculés, statut dérivé, solde restituable           |
| `numbering` | `sequences` et les fonctions SQL `next_sequence` / `format_sequence_number`                      |
| `pdf`       | Worker BullMQ Puppeteer, gabarit Handlebars A4, empreinte, archivage dans le stockage objet      |

`leases` et `deposits` se lisent mutuellement — l'activation crée le dépôt, un
mouvement vérifie l'état du bail. Le cycle est levé par des ports `Symbol`,
comme en phase 1 :

| Port                    | Déclaré dans      | Implémenté par          | Sert à                                     |
| :---------------------- | :---------------- | :---------------------- | :----------------------------------------- |
| `DEPOSIT_WRITER`        | `leases/domain`   | `DepositsService`       | Créer le dépôt à l'activation              |
| `LEASE_READER`          | `deposits/domain` | `LeasesService`         | Vérifier l'état du bail avant un mouvement |
| `LEASE_CONTRACT_SOURCE` | `pdf/domain`      | `LeaseDetailsService`   | Jeu de données du contrat                  |
| `LEASE_DOCUMENT_WRITER` | `pdf/domain`      | `LeaseDocumentsService` | Archiver une version de contrat            |

`pdf` est la **feuille** du graphe : il consomme `leases` et n'est consommé
par personne. C'est ce qui permet de faire tourner l'API sans navigateur de
rendu sans que le cycle de vie du bail en souffre.

### Machine à états du bail

La table des transitions (`leases/domain/lease-status.ts`) est **déclarative
et exhaustive** : toute transition absente est refusée par
`409 LEASES.INVALID_TRANSITION`, avec `details.from` et `details.to`. Un test
unitaire éprouve les **49 couples** d'états, pas seulement ceux auxquels on
pense.

```text
DRAFT ──▶ PENDING_SIGNATURE ──▶ ACTIVE ──▶ NOTICE_GIVEN ──▶ TERMINATED
  │               │               │  │
  └───ACTIVATE────┘               │  └──────EXPIRE──────▶ EXPIRED
  └───CANCEL──▶ CANCELLED ◀───────┘         (cron)
                                  └──────TERMINATE─────▶ TERMINATED
```

TERMINATED, EXPIRED et CANCELLED sont **terminaux** : reprendre une location
avec le même locataire sur le même lot, c'est un NOUVEAU bail.

### Anti-chevauchement garanti EN BASE

La contrainte d'exclusion GiST `leases_no_overlap_excl` (migration
`2_leases_revisions`) interdit deux baux `ACTIVE` ou `NOTICE_GIVEN` sur un
même lot à des périodes qui se croisent. Le service vérifie AUSSI le
chevauchement pour produire un message utile, mais c'est la contrainte qui
ferme la fenêtre entre ce contrôle et le `COMMIT`, qu'exploiteraient deux
activations concurrentes. L'erreur SQL `23P01` est traduite en
`409 LEASES.OVERLAP` par `leases/infrastructure/sql-errors.ts`.

### Activation : tout ou rien

Cinq écritures indissociables dans une seule transaction — bail `ACTIVE`, lot
`OCCUPIED`, référence `BAIL-{AAAA}-{seq}` réservée, locataire principal ajouté
aux parties, ligne `deposits` créée. Un test d'intégration fait échouer
l'insertion du dépôt par un déclencheur et vérifie que **les quatre autres
écritures sont annulées**, compteur de numérotation compris.

### Cron quotidien des baux

Job répétable BullMQ (`lease-daily`, 02:00 `Africa/Brazzaville`) :

- `NOTICE_GIVEN → TERMINATED` à la date d'effet, lot libéré, dépôt daté ;
- `ACTIVE → EXPIRED` au terme si `autoRenew = false`, sinon reconduction
  d'une durée **égale à la durée initiale** ;
- application des révisions de loyer devenues effectives.

**Idempotent par construction** : chaque requête ne sélectionne que les lignes
qui ne sont pas déjà dans l'état voulu. Rejouer un passage n'écrit rien —
c'est la seule garantie tenable pour une tâche de fond, un verrou distribué
pouvant expirer. L'identifiant de planification est fixe, si bien que N
instances de l'API n'en créent qu'une.

### Contrat PDF : ce que mesure l'empreinte

`lease_documents.signature_hash` est le **SHA-256 du HTML source**, date de
génération exclue — celle-ci est imprimée par le pied de page de Chromium,
hors du document rendu. Un PDF porte sa date de création dans ses métadonnées :
deux rendus du même bail produisent des octets différents, et une empreinte
calculée dessus ne prouverait rien. L'empreinte des octets reste stockée dans
`documents.checksum_sha256`, pour l'intégrité du fichier.

Une version est **immuable** : régénérer crée la version suivante et laisse la
précédente intacte, avec son empreinte et son PDF.

### Les quatre modules de la phase 1 et leurs ports

`parties` a besoin des biens (`portfolio`), des comptes (`banking`) et des
pièces jointes (`documents`) pour composer ses fiches détaillées ; à
l'inverse, `portfolio` a besoin de `parties` pour vérifier un bailleur, et
`organizations` a besoin de `parties` pour provisionner le bailleur « self ».

Ces échanges passent tous par des **ports** — un jeton `Symbol` et une
interface minimale, comme `ACCESS_TOKEN_VERIFIER` ou `SMS_PROVIDER` en
phase 0 :

| Port                               | Déclaré dans           | Implémenté par    | Sert à                                             |
| :--------------------------------- | :--------------------- | :---------------- | :------------------------------------------------- |
| `ORGANIZATION_LIFECYCLE_LISTENERS` | `organizations/domain` | `parties`         | Bailleur « self » à la création d'une organisation |
| `PROPERTY_READER`                  | `parties/domain`       | `portfolio`       | Biens d'un bailleur dans sa fiche                  |
| `BANK_ACCOUNT_READER`              | `parties/domain`       | `banking`         | Comptes d'un bailleur dans sa fiche                |
| `DOCUMENT_READER`                  | `parties/domain`       | `documents`       | Pièces jointes d'un locataire ou d'un lot          |
| `OBJECT_STORAGE`                   | `documents/domain`     | `S3ObjectStorage` | MinIO aujourd'hui, R2 demain                       |

Les quatre modules sont donc déclarés `@Global()` : un jeu d'imports croisés
produirait un cycle de **modules** là où il n'existe aucun cycle entre les
**classes** (seul `PartyDetailsService` consomme les ports de lecture, et rien
ne dépend de lui). Aucun `forwardRef` n'est nécessaire.

L'événement `OrganizationCreatedEvent` est émis **dans** la transaction de
création : un abonné en échec annule la création, plutôt que de laisser une
organisation `INDEPENDENT_LANDLORD` sans son bailleur.

### Purge différée des documents

`DELETE /v1/documents/{id}` est une suppression **logique**. L'objet stocké
est détruit plus tard par `DocumentPurgeService`, après
`DOCUMENTS_PURGE_GRACE_HOURS`. Deux choix assumés :

- **Pas de BullMQ pour l'instant.** BullMQ est la file tranchée du projet,
  mais aucun worker n'est déployé avant la phase 3 (quittances PDF) : la
  tâche est un `setInterval` `unref()`, et `runOnce()` est public pour que
  l'exploitation, un test ou un futur job répétable l'appellent tel quel. La
  bascule ne touchera pas la logique.
- **La ligne `documents` n'est jamais supprimée.** `lease_documents` et
  `inspection_photos` la référencent en `ON DELETE RESTRICT`. Seul l'objet
  disparaît ; la fiche reste en pierre tombale, horodatée dans
  `metadata.purgedAt`, et l'opération est tracée dans `audit_logs`.

### Recherche `q` sans `unaccent`

L'extension PostgreSQL `unaccent` n'est pas installée : elle exige un
`CREATE EXTENSION` privilégié qu'on ne veut pas rendre obligatoire pour
déployer. Le pliage des accents se fait donc avec `translate()`, fonction du
cœur, sur la même table de correspondance des deux côtés de la comparaison —
`src/shared/search/search-text.ts` côté application, l'expression SQL côté
base. Un test unitaire vérifie que les deux tables restent alignées : un
décalage d'un caractère ferait silencieusement correspondre « é » à « d ».
Le jour où le `LIKE` ne suffira plus, l'index attendu est un GIN trigramme
sur la même expression — la requête n'aura pas à changer.

Chaque module suit les quatre couches, la dépendance allant **vers
l'intérieur** :

```text
presentation ──▶ application ──▶ domain ◀── infrastructure
```

| Couche            | Contient                                      | Ne contient jamais                                 |
| :---------------- | :-------------------------------------------- | :------------------------------------------------- |
| `domain/`         | Entités, règles, machines à états, ports      | `@nestjs/*`, `@prisma/client` — testable sans base |
| `application/`    | Cas d'usage, orchestration transactionnelle   | SQL, HTTP, décorateurs Swagger                     |
| `infrastructure/` | Implémentations Prisma, clients HTTP, mappers | Règle métier                                       |
| `presentation/`   | Contrôleurs, DTO, décorateurs OpenAPI         | Accès direct à Prisma                              |

### Ajouter un module

1. `src/modules/<module>/{domain,application,infrastructure,presentation}/`.
2. Écrire d'abord le **domaine** : règles pures, testables sans base.
3. La couche `application/` orchestre et ouvre la transaction via
   `prisma.withTenant(...)`.
4. Les contrôleurs portent `@Roles(...)` (qui implique le contexte
   d'organisation) ou `@Public()`.
5. Toute transition d'état écrit dans `audit_logs` via `audit(...)`, **dans
   la même transaction** que l'opération décrite.
6. Déclarer le module dans `app.module.ts`.
7. **Étendre la suite d'isolation RLS** si le module apporte de nouvelles
   tables : elle est bloquante et doit croître à chaque phase.

### Règles non négociables

- Montants : **BigInt XAF** en base, dans Prisma et dans tout le domaine —
  jamais de `number`, jamais de décimale (`src/shared/money/amount.ts`).
  **La conversion en entier JSON se fait à la seule frontière de
  présentation**, par `toJsonAmount()` / `toJsonAmountOrNull()` dans les
  mappers (`*-views.ts`), plus un filet global sur `BigInt.prototype.toJSON`
  installé par `bootstrap.ts`.

  Pourquoi un `number` et non une chaîne : les contrats d'API le typent ainsi
  (`baseRentAmount: number`), et un montant en XAF reste très loin de
  `Number.MAX_SAFE_INTEGER` — 9,007 × 10^15, soit plus de neuf millions de
  milliards de francs CFA. La conversion n'est jamais faite sans garde : au
  delà de cette borne, `toJsonAmount()` **lève** au lieu de transmettre une
  valeur arrondie. Mieux vaut une 500 tracée qu'un loyer faux chez le client.

  En entrée, les DTO acceptent un entier (`@Type(() => Number) @IsInt()
@Min(0)`), converti en BigInt par la couche `application/`. Dans
  `openapi.json`, ces champs sont des `integer` / `format: int64`.
  `serializeAmount()` reste la représentation textuelle exacte, réservée à
  `audit_logs` et aux journaux.

- Identifiants : **UUID v7** générés par l'application (`newId()`).
- Codes d'erreur stables, messages en français.
- Pagination par **curseur signé**, jamais d'`OFFSET`.
- `audit_logs` et `payment_allocations` sont strictement append-only.

---

## 10. Image Docker

Le contexte de build est la **racine du monorepo** :

```bash
docker build -f apps/api/Dockerfile -t immodesk/api:local .

docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgresql://immodesk_app:immodesk_app@host.docker.internal:5440/immodesk' \
  -e REDIS_URL='redis://host.docker.internal:6390' \
  -e JWT_ACCESS_SECRET='...' -e OTP_PEPPER='...' -e CURSOR_SECRET='...' \
  immodesk/api:local
```

L'image est multi-étapes (dépendances → build → dépendances de production →
exécution), tourne sous l'utilisateur `node`, utilise `tini` pour la
transmission des signaux et expose une `HEALTHCHECK` sur `/v1/health`.

---

## 11. Écarts et limites connues

### Phase 3

- **Imputation d'un avoir en deux lignes.** `payment_allocations_target_chk`
  n'admet qu'une cible par ligne : l'imputation écrit, sur le paiement source,
  une contre-imputation de l'avoir (`is_reversal`, `tenant_credit_id`) et une
  imputation de la facture. Aucun paiement n'est créé, et la somme nette des
  imputations du paiement reste égale à son montant.
- **Le paiement d'origine reste strictement intact** lors d'une
  contre-passation, colonnes de workflow comprises : `reversedAt` et
  `reversalReason` de son détail sont dérivés de l'écriture miroir.
- **Échéance d'une première période proratisée** ramenée à son premier jour
  facturé quand le jour d'échéance du mois la précède (bail signé le 12,
  échéance au 5).
- **Plancher de facturation** : aucune période achevée avant le mois de
  création du bail dans Immodesk n'est proposée par le cron — un bail repris
  d'un registre papier n'émet pas d'arriérés. Une période d'un seul jour est
  fusionnée avec sa voisine (`period_start < period_end` en base).
- **Pénalité** : elle court après la plus tardive des deux tolérances (bail,
  règle) ; `capRateBps` porte sur le principal nominal (loyer, et charges si
  la règle s'y applique), pour que le plafond ne rétrécisse pas à mesure des
  paiements.
- **Quittance SENT dès l'acceptation** par un canal ; les webhooks font
  ensuite avancer `message_logs` (DELIVERED, READ).
- **Lien de PDF des SMS** : une URL signée S3 ne tient pas dans deux
  segments. Le SMS porte un lien court signé `/v1/public/d/{token}` (7 jours)
  qui redirige vers une URL de dix minutes — variables ajoutées
  `PUBLIC_API_BASE_URL` et `LINK_SIGNING_SECRET`. Le jeton du QR, lui, ne
  donne jamais accès au PDF.
- **`POST /v1/payments` admet aussi l'ACCOUNTANT** (virement confirmé par la
  comptabilité) ; le contrat ne cite que COLLECTOR.
- **Rejeu `Idempotency-Key`** : une création mémorisée (201) est rendue en
  200, comme le rejeu par `clientRef`.
- **OTP** : les modèles `OTP_CODE` sont semés, mais la connexion de la phase 0
  reste envoyée par SMS ; la bascule WhatsApp d'abord suivra avec les
  modèles « Authentication » approuvés.
- **Heures de silence et plafonds de fréquence** (§ 12.5) non appliqués : ils
  relèvent des relances de la phase 9 ; quittances et reçus sont
  transactionnels.
- Les montants des états d'audit sont sérialisés en nombres JSON (filet
  `BigInt.prototype.toJSON`), comme en phase 2.

### Phase 2

- **Un brouillon porte une référence technique `BROUILLON-{uuid}`**, rendue
  `null` par l'API. `leases.reference` est `NOT NULL` au DDL, et numéroter un
  brouillon consommerait un numéro pour un contrat qui ne verra peut-être
  jamais le jour — ce qui viderait de son sens le contrôle d'une série sans
  trou.
- **`POST /v1/leases/{id}/contract` sans `regenerate` rend la version déjà
  produite** au lieu d'en empiler une identique. Le contrat ne le précise pas ;
  sans cela, `regenerate` n'aurait aucun effet observable et chaque clic
  créerait une version de plus dans le bucket.
- **`GET /v1/leases/{id}/parties` est ajouté** au contrat : la fiche web en a
  besoin sans recharger tout le `LeaseDetail`.
- **Le gabarit de contrat n'a pas encore été validé juridiquement.** Les
  clauses par défaut sont un point de départ opérationnel, pas un avis
  juridique ; le plan de phases prévoit leur relecture par un conseil local
  (§ 2.8). Chaque organisation peut d'ici là tout réécrire.
- **Le bloc OHADA s'active aussi automatiquement** lorsque le lot est `SHOP`,
  `OFFICE` ou `WAREHOUSE`, même si l'organisation ne l'a pas coché : un bail de
  boutique y est soumis, que le gestionnaire y ait pensé ou non.
- **`DEPOSITS.LEASE_NOT_CLOSED` ne bloque que la restitution**, pas la retenue :
  une retenue peut être constatée avant la clôture (impayé imputé sur la
  caution), la restitution non.
- **La reconduction tacite prolonge d'une durée égale en JOURS**
  (`end_date + (end_date - start_date)`), et non en mois : convertir en mois
  ferait glisser l'échéance d'un ou deux jours à chaque reconduction.

### Phase 1

- **`DELETE /v1/bank-accounts/{id}` désactive** (`isActive: false`) au lieu de
  supprimer : `bank_accounts` n'a pas de `deleted_at` et ses lignes sont
  citées par des paiements passés. C'est ce que dit le contrat, explicité ici.
- **`contact_channels` est supprimée physiquement** : le DDL ne lui donne pas
  de `deleted_at` — c'est une coordonnée, pas une entité de référence. La
  suppression reste tracée dans `audit_logs` avec l'état supprimé.
- **`GET /v1/landlords/{id}` ajoute `contactChannels`** au `LandlordDetail` du
  contrat : la fiche web en a besoin et l'omettre imposerait un second appel.
- **La vérification HEAD fait autorité sur la taille** déclarée à
  l'enregistrement d'un document : un client ne peut pas sous-déclarer.
- Correction transverse : `OrganizationGuard` ne comparait l'en-tête
  `X-Organization-Id` au paramètre de route `:id` que pour les routes
  `/organizations/:id`. Le contrôle s'appliquait à **toute** route portant un
  `:id` et aurait renvoyé 404 sur `/landlords/{id}`, `/units/{id}`, etc.

### Phase 0

- `PATCH /v1/me` ne persiste pas `timezone` : `users` ne porte pas cette
  colonne, le fuseau vient des paramètres de l'organisation principale.
- `organization_settings.receiptFooterText` est adossé à
  `receipt_verification_base_url`, faute de colonne dédiée dans le DDL.
- `message_logs` et `audit_logs` portent `organization_id NOT NULL` : un
  événement d'authentification concernant un utilisateur sans aucune
  organisation (toute première connexion) ne peut pas y être tracé. Il ne
  laisse alors qu'une trace applicative structurée.
- `audit_logs.action` est une énumération SQL fermée ; le nom métier fin de
  l'opération (`OTP_LOCKED`, `MEMBER_ROLE_CHANGED`, ...) est porté par la
  colonne `reason` et repris dans `new_state.operation`.
- `api_keys` : la table est modélisée et son isolation testée, mais aucune
  route d'administration de clés n'est exposée en phase 0.
- Seules les passerelles simulées (`FakeSmsProvider`, `FakeWhatsAppProvider`)
  sont branchées ; les implémentations réelles se substitueront derrière les
  mêmes jetons `SMS_PROVIDER` / `WHATSAPP_PROVIDER`.
