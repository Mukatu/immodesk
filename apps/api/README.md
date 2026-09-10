# `@immodesk/api` — API Immodesk (phase 0)

Backend NestJS 11 de la plateforme Immodesk (gestion immobilière,
Congo-Brazzaville). Monolithe modulaire en Clean Architecture, multi-tenant
par Row Level Security PostgreSQL, authentification par téléphone + OTP.

Périmètre de la phase 0 : socle technique, isolation multi-tenant prouvée par
tests, authentification OTP, organisations / membres / invitations, contrat
OpenAPI 3.1 publié.

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

| Adresse | Contenu |
| :--- | :--- |
| `http://localhost:3000/v1` | Racine de l'API |
| `http://localhost:3000/v1/health` | Sonde base / Redis / stockage |
| `http://localhost:3000/v1/docs` | Documentation interactive |
| `http://localhost:3000/v1/openapi.json` | Contrat OpenAPI 3.1 |

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

| Variable | Rôle |
| :--- | :--- |
| `DATABASE_URL` | Rôle applicatif `immodesk_app`, **soumis à la RLS**. Utilisé par tout le code métier. |
| `DATABASE_ADMIN_URL` | Rôle `immodesk` (BYPASSRLS). Migrations, seed, et uniquement les trois lectures transverses de `TenantDirectoryService`. |
| `REDIS_URL` | Compteurs de limitation de débit (partagés entre instances). |
| `JWT_ALGORITHM` | `HS256` en local, `RS256` en déploiement (renseigner alors la paire de clés). |
| `OTP_PEPPER` | Poivre du hachage SHA-256 des codes OTP. Vit hors base : à régénérer par environnement. |
| `OTP_DEV_CODE` | Code fixe accepté hors production. Le démarrage **échoue** si `NODE_ENV=production` et que la variable est définie. Une valeur vide vaut « non défini ». |
| `CURSOR_SECRET` | Signature HMAC des curseurs de pagination (empêche de forger une position). |

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

| Rôle | Droits | Usage |
| :--- | :--- | :--- |
| `immodesk_app` | LOGIN, ni SUPERUSER ni BYPASSRLS | Runtime. **Toutes** les policies s'appliquent. |
| `immodesk_admin` | NOLOGIN, BYPASSRLS | Back-office plateforme (programme d'apport d'affaires). |
| `immodesk` | Propriétaire, BYPASSRLS | Migrations, seed, administration. |

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
  appartient à plusieurs organisations et se connecte *avant* d'en choisir
  une. L'autorisation y est purement applicative.
- **`TenantDirectoryService`** — seul composant du runtime connecté avec
  `DATABASE_ADMIN_URL`. Il répond aux trois questions qui, par nature,
  précèdent la connaissance de l'organisation : « à quelles organisations cet
  utilisateur appartient-il ? » (`GET /v1/me`), « à quelle organisation ce
  jeton d'invitation se rapporte-t-il ? », « ce slug est-il libre ? ».
  Aucune écriture, aucun accès générique.

---

## 5. Authentification

| Étape | Règle |
| :--- | :--- |
| Demande | Code à 6 chiffres, haché **SHA-256 avec poivre**, expiration **5 min**, `max_attempts = 5`. Renvoi possible après **60 s**. |
| Débit | **3 demandes / 10 min par numéro**, **20 / h par IP** (`@nestjs/throttler` sur Redis) → `429 IAM.RATE_LIMITED`. |
| Vérification | Création du compte au premier succès. Consommation **atomique** du code. |
| Jetons | JWT d'accès **15 min** + refresh token opaque **30 j**, stocké haché, avec `family_id`. |
| Verrouillage | 5e erreur → code invalidé, entrée `OTP_LOCKED` dans `audit_logs`, `429 IAM.OTP_LOCKED`. |
| Rotation | Systématique. Rejeu d'un jeton révoqué → **révocation de toute la famille** + `401 IAM.REFRESH_REVOKED`. |

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
    ├── notifications/       # SmsProvider, WhatsAppProvider, templates, message_logs
    ├── audit/               # audit_logs, fonction audit()
    └── platform/            # santé, idempotence, OpenAPI, configuration
```

Chaque module suit les quatre couches, la dépendance allant **vers
l'intérieur** :

```text
presentation ──▶ application ──▶ domain ◀── infrastructure
```

| Couche | Contient | Ne contient jamais |
| :--- | :--- | :--- |
| `domain/` | Entités, règles, machines à états, ports | `@nestjs/*`, `@prisma/client` — testable sans base |
| `application/` | Cas d'usage, orchestration transactionnelle | SQL, HTTP, décorateurs Swagger |
| `infrastructure/` | Implémentations Prisma, clients HTTP, mappers | Règle métier |
| `presentation/` | Contrôleurs, DTO, décorateurs OpenAPI | Accès direct à Prisma |

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

- Montants : **BigInt XAF**, jamais de `number`, jamais de décimale
  (`src/shared/money/amount.ts`). Sérialisation JSON en **chaîne**.
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

## 11. Limites connues de la phase 0

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
