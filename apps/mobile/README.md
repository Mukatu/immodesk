# Immodesk Mobile

Application Flutter d'Immodesk (`cg.immodesk`) : démarcheurs, bailleurs et
gestionnaires indépendants. Phase 0 : authentification OTP, sélection
d'organisation, coquille d'accueil et écran de diagnostic. Voir
`docs/04_plan_de_phases.md` (§0.6) et `docs/api/phase0-contract.md`.

## Prérequis

- Flutter 3.41.6 (stable) / Dart 3.11.
- Un émulateur Android démarré (ou un appareil connecté), ou un simulateur
  iOS sur macOS.
- L'API Immodesk (`apps/api`) démarrée localement sur `http://localhost:3000`
  (le port par défaut, exposé à l'émulateur Android via `10.0.2.2`).

## Installation

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
```

La génération de code (`build_runner`) est nécessaire après tout changement
de modèle `freezed` / `json_serializable`, de provider `riverpod_annotation`
ou de schéma Drift.

## Lancement sur émulateur

```bash
flutter run
```

Par défaut, l'application pointe vers `http://10.0.2.2:3000/v1`, qui
correspond à `http://localhost:3000/v1` depuis le poste hôte lorsqu'on est
sur l'émulateur Android. Sur un simulateur iOS, `localhost` fonctionne
directement ; sur un appareil physique, utilisez l'adresse IP de votre
machine sur le réseau local.

### Configuration par environnement (`--dart-define`)

| Variable | Rôle | Défaut |
| :--- | :--- | :--- |
| `API_BASE_URL` | URL de base de l'API (préfixe `/v1` inclus) | `http://10.0.2.2:3000/v1` |
| `OTP_DEV_CODE` | Code OTP fixe accepté en développement (voir `FakeSmsProvider` côté API) | vide |

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.42:3000/v1
```

## Tests

```bash
flutter analyze
flutter test
```

- Tests unitaires : formatage XAF (`test/core/format`), normalisation de
  téléphone (`test/core/format`), machine à états OTP
  (`test/features/auth/domain`).
- Tests de widget : parcours connexion (numéro puis code), avec `dio` mocké
  via `mocktail` (`test/features/auth/presentation`).

## Architecture

Clean Architecture par fonctionnalité (`lib/features/<feature>/{domain,data,presentation}`) :

- `lib/core` : configuration (`--dart-define`), thème Material 3, routage
  `go_router`, client HTTP `dio` (intercepteur d'authentification avec
  rafraîchissement automatique et file d'attente sur 401), erreurs typées
  `{code, message}`, formatage XAF et téléphone, base locale Drift.
- `lib/features/auth` : demande/vérification OTP, session, stockage du
  jeton de rafraîchissement dans `flutter_secure_storage` (jeton d'accès en
  mémoire uniquement).
- `lib/features/organizations` : liste des organisations de l'utilisateur,
  sélection persistée (table Drift `app_settings`), création minimale
  (`AGENCY` / `INDEPENDENT_LANDLORD` / `INDEPENDENT_MANAGER`).
- `lib/features/diagnostics` : écran « à propos / diagnostic » (version,
  état réseau via `connectivity_plus`, URL de l'API, test `/v1/health`).
  Coquille phase 0, enrichie en phase 5 (synchronisation).
- `lib/shared/widgets` : composants réutilisables (`MoneyXafText`,
  `PhoneField`, `OtpField`, `StatusBadge`, `EmptyState`).

État applicatif géré par Riverpod (`riverpod_annotation` + génération de
code). Modèles `freezed` / `json_serializable`. Base locale Drift déclarée
avec deux tables : `app_settings` (clé/valeur) et `outbox` (vide, prête pour
la synchronisation offline de la phase 5). **Le chiffrement SQLCipher n'est
pas encore activé** — voir le commentaire dans
`lib/core/db/app_database.dart` ; prévu à l'activation du mode offline
(phase 5, `docs/02_architecture_technique.md` §10.9).

## Ce qui reste (hors périmètre phase 0)

- Chiffrement SQLCipher de la base locale (phase 5).
- Outbox et moteur de synchronisation (phase 5).
- Client Dart généré depuis `openapi.json` (actuellement, les appels HTTP
  sont écrits à la main contre `docs/api/phase0-contract.md` ; à remplacer
  dès que l'OpenAPI de l'API est publié).
- Invitations et gestion des membres d'organisation (Epic 0.D, non couvert
  par les écrans mobiles de la phase 0 selon `docs/04_plan_de_phases.md`).
