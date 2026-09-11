# Immodesk Mobile

Application Flutter d'Immodesk (`cg.immodesk`) : démarcheurs, bailleurs et
gestionnaires indépendants.

- **Phase 0** : authentification OTP, sélection d'organisation, coquille
  d'accueil et écran de diagnostic. Voir `docs/04_plan_de_phases.md` (§0.6)
  et `docs/api/phase0-contract.md`.
- **Phase 1** : navigation par onglets (Accueil / Immeubles / Locataires /
  Plus), consultation en lecture seule du portefeuille (immeubles, lots,
  locataires) avec cache local et recherche, fiche locataire (appel /
  WhatsApp), prise de photo d'un lot avec envoi direct ou mise en attente
  hors ligne. Voir `docs/04_plan_de_phases.md` (§1.6) et
  `docs/api/phase1-contract.md`.
- **Phase 2** : consultation en lecture seule des baux (liste avec filtre par
  statut, détail avec parties et dépôt de garantie), lié aux lots et
  locataires existants, avec cache local (Drift), documents du bail
  (téléchargement et partage). Voir `docs/04_plan_de_phases.md` (§2.x) et
  `docs/api/phase2-contract.md`.

## Prérequis

- Flutter 3.41.6 (stable) / Dart 3.11.
- Un émulateur Android démarré (ou un appareil connecté), ou un simulateur
  iOS sur macOS.
- L'API Immodesk (`apps/api`) démarrée localement sur `http://localhost:3000`
  (le port par défaut, exposé à l'émulateur Android via `10.0.2.2`).
- Prise de photo (feature `documents`) : autorisation caméra déclarée dans
  `android/app/src/main/AndroidManifest.xml` (`CAMERA`) et
  `ios/Runner/Info.plist` (`NSCameraUsageDescription`) ; l'appareil ou
  l'émulateur/simulateur doit disposer d'une caméra (émulateur Android :
  activer une caméra virtuelle dans l'AVD Manager).

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

- Tests unitaires : formatage XAF et normalisation de téléphone/texte de
  recherche (`test/core/format`), compression d'image aux dimensions
  cibles (`test/core/media`), machine à états OTP
  (`test/features/auth/domain`), mapping JSON des modèles portefeuille
  (`test/features/portfolio/domain`), recherche locale de locataires
  (`test/features/portfolio/presentation/tenants_search_test.dart`), mapping
  JSON des entités bail/dépôt et calcul du solde du dépôt de garantie
  (`test/features/leases/domain`).
- Tests de widget (avec `dio` mocké via `mocktail` et une base Drift en
  mémoire, `AppDatabase.forTesting(NativeDatabase.memory())`) : parcours
  connexion (`test/features/auth/presentation`), liste des immeubles avec
  taux d'occupation et bandeau hors ligne, fiche locataire avec boutons
  Appeler / WhatsApp, prise de photo hors ligne ajoutée à l'outbox
  (`test/features/portfolio/presentation`, `test/features/documents/presentation`),
  fiche bail affichée depuis un lot/locataire et liste des documents du bail
  avec action de partage (`test/features/leases/presentation`).
- **Total** : 77 tests (59 + 18 leases), tous au vert (`flutter analyze` : 0 erreur).

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
- `lib/features/portfolio` : consultation en lecture seule des immeubles
  (liste avec taux d'occupation, détail avec lots et statuts), des lots
  (caractéristiques, loyer de référence XAF, photos) et des locataires
  (liste avec recherche locale par nom/téléphone insensible aux accents,
  fiche avec boutons Appeler/WhatsApp). Rafraîchit le réseau à l'ouverture
  et bascule automatiquement sur le cache Drift (`CachedProperties`,
  `CachedUnits`, `CachedTenants`) en cas d'échec, avec un bandeau
  « Données du … ».
- `lib/features/documents` : prise de photo d'un lot (`image_picker`,
  compression 1600 px / qualité 80 en Dart pur via le paquet `image`),
  demande d'URL signée, envoi direct (PUT) et enregistrement du document
  (`kind: PROPERTY_PHOTO`, `relatedEntityType: unit`), galerie via
  URL de téléchargement signée. Hors ligne, la photo compressée est
  stockée localement et ajoutée à la table `outbox` existante
  (`client_ref` ULID généré sur l'appareil, sans dépendance externe —
  `lib/core/sync/ulid.dart`) ; le rejeu automatique est déclenché au retour
  du réseau (`OutboxConnectivityWatcher`). Mécanisme volontairement simple :
  le `SyncEngine` complet arrive en phase 5.
- `lib/features/leases` : consultation en lecture seule des baux du
  portefeuille. Bail actif affiché depuis les fiches `UnitDetailScreen` et
  `TenantDetailScreen` (statut, référence, loyer et charges XAF, dates).
  Liste complète avec filtre par statut (`LeasesListScreen`, onglet « Plus »)
  et fiche détail (`LeaseDetailScreen`) affichant les parties du bail et le
  dépôt de garantie (montants requis, encaissé, retenu, restitué). Cache
  local Drift (`CachedLeases`, schéma v3). Documents du bail (contrat généré,
  contrat signé) téléchargeables via endpoint `download-url`, puis partages
  ou ouverts via `share_plus` et `open_filex`, avec indicateur de progression
  et gestion d'absence de connexion. Périmètre volontairement lecture seule
  (aucune création/modification).
- `lib/features/more` : onglet « Plus » (diagnostic, déconnexion, accès aux
  baux).
- `lib/shared/widgets` : composants réutilisables (`MoneyXafText`,
  `PhoneField`, `OtpField`, `StatusBadge`, `EmptyState`,
  `OfflineDataBanner`, `AppBottomNavShell`).

Navigation par onglets bas (`StatefulShellRoute.indexedStack` de
`go_router`) : Accueil / Immeubles / Locataires / Plus, accessibles à tous
les rôles (`COLLECTOR` inclus) — la feature `portfolio` est entièrement en
lecture seule en phase 1.

État applicatif géré par Riverpod (`riverpod_annotation` + génération de
code). Modèles `freezed` / `json_serializable`. Base locale Drift déclarée
avec `app_settings` (clé/valeur), `outbox` (idempotence via `client_ref`,
utilisée par la feature `documents`) et le cache de référentiels
(`cached_properties`, `cached_units`, `cached_tenants`, `cached_leases`,
schéma v3 avec migration). **Le chiffrement SQLCipher n'est pas encore
activé** — voir le commentaire dans `lib/core/db/app_database.dart` ; prévu
à l'activation du mode offline complet (phase 5, `docs/02_architecture_technique.md` §10.9).

## Ce qui reste (hors périmètre phase 1)

- Chiffrement SQLCipher de la base locale (phase 5).
- `SyncEngine` complet et rejeu générique de l'outbox (phase 5) — seul le
  rejeu des photos de lot est câblé pour l'instant.
- Rattachement d'un locataire à un lot (aucun bail n'existe encore côté API
  en phase 1 ; voir `docs/api/phase1-contract.md`).
- Pagination des listes immeubles/locataires (une seule page, `limit=100`,
  suffisante pour la consultation terrain de la phase 1).
- Client Dart généré depuis `openapi.json` (actuellement, les appels HTTP
  sont écrits à la main contre les contrats `docs/api/phase0-contract.md`
  et `docs/api/phase1-contract.md` ; à remplacer dès que l'OpenAPI de l'API
  est publié).
- Invitations et gestion des membres d'organisation (Epic 0.D, non couvert
  par les écrans mobiles selon `docs/04_plan_de_phases.md`).
