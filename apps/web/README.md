# @immodesk/web

Dashboard web Immodesk (agences, bailleurs, gestionnaires indépendants) — Next.js 15 (App Router),
TypeScript strict, Tailwind CSS, composants shadcn/ui « maison », TanStack Query 5.

Locale unique : **fr-CG**. Fuseau : **Africa/Brazzaville**. Devise : **XAF**, toujours en entier
(jamais de décimale).

## Prérequis

- Node.js ≥ 22, pnpm ≥ 9 (voir `packageManager` à la racine du monorepo).
- Installation des dépendances **depuis la racine du monorepo** : `pnpm install`.

## Variables d'environnement

Copier `.env.example` vers `.env.local` :

```
NEXT_PUBLIC_API_URL=http://localhost:3001/v1   # base de l'API, utilisée par le navigateur
API_INTERNAL_URL=http://localhost:3001/v1      # base de l'API, utilisée par les route handlers Next
```

## Scripts

Depuis `apps/web/` (ou via `pnpm --filter @immodesk/web <script>` depuis la racine) :

| Script | Rôle |
| :--- | :--- |
| `pnpm dev` | Lance le serveur de développement Next |
| `pnpm build` | Build de production |
| `pnpm start` | Sert le build de production |
| `pnpm lint` | ESLint (next + typescript + jsx-a11y) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Tests unitaires Vitest + Testing Library |
| `pnpm test:e2e` | Scénario Playwright contre un mock MSW de l'API (aucun backend requis) |

## Architecture

```
src/
  app/                    App Router : /login, /onboarding/organisation, /app/**, /invitations/[token],
                          /acces-refuse, error.tsx, not-found.tsx, /api/auth/* (BFF)
  components/
    ui/                   Primitives shadcn/ui (Radix + class-variance-authority)
    business/             Composants métier : MoneyXaf, MoneyInput, PhoneInput, StatusBadge,
                          EmptyState, PageHeader, DataTable (pagination par curseur)
    layout/                En-tête applicatif, sélecteur d'organisation
  lib/
    api/                   client.ts (fetch typé, Authorization + X-Organization-Id,
                          rafraîchissement automatique sur 401), types.ts (contrat phase 0),
                          hooks/ (TanStack Query par ressource)
    auth/                  Contexte d'authentification client, cookie httpOnly du refresh token
    money.ts, phone.ts     Formatage XAF et téléphone congolais
  mocks/                   Handlers MSW partagés (navigateur + serveur), utilisés en e2e uniquement
  styles/tokens.css        Design tokens (couleurs clair/sombre, rayon, palette sobre
                          vert/ocre inspirée du Congo-Brazzaville)
e2e/                       Scénario Playwright (login OTP → création d'organisation → invitation)
```

## Authentification

- OTP par téléphone (SMS), code à 6 chiffres, compte à rebours de renvoi de 60 s.
- Le refresh token est stocké dans un cookie **httpOnly** (`immodesk_refresh_token`), posé et lu
  uniquement par les route handlers `src/app/api/auth/*` qui relaient vers l'API. Il n'est jamais
  accessible au JavaScript du navigateur.
- L'access token vit uniquement en mémoire côté client (`src/lib/api/token-store.ts`) : perdu au
  rechargement de page, il est alors regénéré silencieusement via le refresh token.
- `middleware.ts` protège `/app/**` et `/onboarding/**` (présence du cookie de session uniquement ;
  l'autorisation réelle reste côté API et RLS PostgreSQL).

## Client API

`src/lib/api/client.ts` : base `NEXT_PUBLIC_API_URL`, injection automatique de `Authorization` et
`X-Organization-Id`, et rafraîchissement automatique du token sur 401 (une seule requête de
rafraîchissement en vol, les appels concurrents attendent la même promesse). Les erreurs suivent le
format stable du contrat `{ code, message, details? }` (`ApiError`).

`src/lib/api/types.ts` recopie le contrat `docs/api/phase0-contract.md` en attendant le client
généré depuis `openapi.json` dans `@immodesk/shared` (en cours de création par un autre chantier) :
ce fichier sera alors retiré au profit du client généré.

## Tests

- **Unitaires** (`pnpm test`, Vitest + Testing Library) : formatage XAF (`MoneyXaf`), saisie
  téléphone congolaise (`PhoneInput`), client API (`apiFetch`) incluant le rafraîchissement
  automatique de token et la déduplication des requêtes concurrentes en 401.
- **e2e** (`pnpm test:e2e`, Playwright) : parcours « connexion OTP → création d'organisation →
  invitation », entièrement mocké via MSW (`src/mocks/handlers.ts`), interceptée côté serveur
  (`msw/node`, activé dans `instrumentation.ts` quand `E2E_MOCK=1`). Les appels directs du
  navigateur vers l'API passent par le proxy same-origin `src/app/api/proxy/[...path]/route.ts`
  (actif uniquement quand `E2E_MOCK=1`, 404 sinon) afin de traverser le même process Next — et donc
  le même état mocké en mémoire — que les route handlers `/api/auth/*`. Aucune dépendance à un
  backend réel.

## Accessibilité et performance

- Composants basés sur Radix (rôles ARIA, focus, navigation clavier) ; labels associés à tous les
  champs, erreurs liées par `aria-describedby` et annoncées en `aria-live="polite"`.
- Server Components par défaut, `"use client"` réservé aux feuilles interactives.
- Pas de dépendance lourde superflue : composants d'UI écrits à la main sur les primitives Radix
  plutôt qu'un framework de composants complet.
