# `@immodesk/api` — API Immodesk (phases 0 et 1)

Backend NestJS 11 de la plateforme Immodesk (gestion immobilière,
Congo-Brazzaville). Monolithe modulaire en Clean Architecture, multi-tenant
par Row Level Security PostgreSQL, authentification par téléphone + OTP.

Périmètre de la **phase 0** : socle technique, isolation multi-tenant prouvée
par tests, authentification OTP, organisations / membres / invitations,
contrat OpenAPI 3.1 publié.

Périmètre de la **phase 1** : tiers et patrimoine — bailleurs, locataires,
garants, canaux de contact, immeubles, lots (création en série), comptes de
règlement et pièces jointes sur stockage objet compatible S3.

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
    ├── audit/               # audit_logs, fonction audit()
    └── platform/            # santé, idempotence, OpenAPI, configuration
```

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
