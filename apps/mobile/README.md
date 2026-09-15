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
- **Phase 3** : tournée du démarcheur (`feature collection`) — factures dues
  regroupées par immeuble (cache local Drift pour la lecture hors ligne),
  encaissement en espèces (signature tactile ou photo du reçu papier,
  idempotence par `clientRef` ULID), confirmation avec partage du reçu PDF et
  renvoi WhatsApp/SMS. Caisse du démarcheur (`feature cash`) — encours avec
  alerte de plafond, remise des reçus (coupures optionnelles), suivi des
  remises. L'encaissement reste exclu du hors ligne (message clair, l'outbox
  de collecte arrive en phase 5). Voir `docs/04_plan_de_phases.md` (§3.x) et
  `docs/api/phase3-contract.md`.
- **Phase 4** : depuis une facture de la tournée, choix du mode de paiement
  numérique (`feature payments`) selon les instructions de paiement de la
  facture — Mobile Money déclaré, virement bancaire déclaré, et Mobile Money
  par agrégateur si disponible (double verrou plateforme/organisation).
  Déclaration Mobile Money (numéro de réception choisi parmi les comptes du
  bailleur puis de l'organisation, opérateur, numéro payeur, référence de
  transaction, montant, capture d'écran facultative) : message « en attente
  de validation par l'agence » après envoi, sans jamais créer de paiement
  côté mobile (arbitrage du contrat : seule la validation web le fait).
  Déclaration de virement (montant, date, banque et nom du payeur, référence
  de facture pré-remplie et copiable, preuve obligatoire par photo ou
  fichier). Mobile Money par agrégateur : numéro payeur avec opérateur
  détecté (06 MTN, 05 Airtel), devis affiché avant validation (montant,
  frais, total débité), écran d'attente avec compte à rebours et
  interrogation du statut toutes les 3 secondes, résultats succès (avec
  quittance), échec (motif lisible) ou expiration (nouvelle tentative avec
  un nouveau `clientRef`). Tous ces modes sont en ligne uniquement (message
  « connexion requise », comme l'encaissement en espèces). Voir
  `docs/04_plan_de_phases.md` (§4.6) et `docs/api/phase4-contract.md`
  (section « Arbitrages »).
- **Phase 5** : mode hors ligne complet du démarcheur. Base locale Drift
  chiffrée par défaut (SQLCipher, clé de 256 bits générée à la première
  ouverture et conservée dans `flutter_secure_storage`, voir « Base locale
  chiffrée » ci-dessous). Outbox généralisée (`CASH_RECEIPT`, `DOCUMENT`)
  rejouée par lots via `SyncEngine` (`lib/core/sync`) : `batchRef` conservé
  et rejoué à l'identique après une coupure, repli exponentiel plafonné à 5
  minutes, reprise automatique au retour du réseau, respect des dépendances
  (`dependsOn`) entre une pièce jointe et l'encaissement qui la référence.
  L'encaissement en espèces fonctionne désormais hors ligne (signature ou
  photo stockées localement, téléversées à la synchronisation, plus de
  message bloquant) ; les paiements numériques (Mobile Money, virement)
  restent en ligne uniquement, comme en phase 4. Préchargement de la
  tournée (`GET /v1/sync/pull`, curseur mémorisé) avec purge des seules
  données de référence après `retentionHours` sans synchronisation
  réussie — l'outbox n'est **jamais** purgée automatiquement. Indicateur
  permanent (badge) et écran « File d'attente » (`feature sync`) listant
  chaque élément, son statut, un détail et une nouvelle tentative ; un
  conflit reste visible avec une explication et ne peut être tranché que
  par un gestionnaire côté dashboard. Mode démarcheur restreint : un
  `COLLECTOR` ne voit que sa tournée, ses reçus et sa caisse (onglets
  Immeubles/Locataires et liste des baux masqués). Voir
  `docs/04_plan_de_phases.md` (§5.x) et `docs/api/phase5-contract.md`.
- **Phase 7** : espace bailleur en lecture seule (`feature
  landlord_portal`) — après connexion par code, un compte rattaché à un
  `landlord` (rôle dérivé `LANDLORD_PORTAL`, sans appartenance à
  `organization_members`) est aiguillé vers un espace distinct de celui de
  l'agence : accueil (solde à percevoir, dernier relevé, dernier
  reversement, bandeau diaspora avec mode de reversement et délai estimé),
  relevés de gérance (téléchargement du PDF et partage), reversements
  perçus, encaissements confirmés et quittances. Aucune action d'écriture
  n'y est jamais proposée, et toute réponse de refus de l'API est affichée
  en français. Onboarding du gestionnaire indépendant (`feature
  onboarding`) : quatre écrans brefs (organisation, premier bailleur,
  premier immeuble, premier mandat avec la commission de 10 % pré-remplie),
  un seul appel réseau final
  (`POST /organizations/independent-manager/onboarding`). Invitation du
  bailleur depuis la fiche du mandat (`feature mandates`) : envoi par
  WhatsApp et statut affiché (non invité / envoyée / activée). Voir
  `docs/04_plan_de_phases.md` (§7.x) et `docs/api/phase7-contract.md`.

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
  (`test/features/leases/domain`), regroupement des factures dues par
  immeuble et aperçu d'imputation (plus ancienne facture d'abord) et calcul
  d'encours du démarcheur (`test/features/collection/domain`,
  `test/features/cash/domain`), détection de l'opérateur Mobile Money et
  calcul du total affiché à partir du devis
  (`test/features/payments/domain`) ; conservation du `clientRef` entre deux
  tentatives de déclaration Mobile Money, testée directement au niveau du
  contrôleur avec un `ProviderContainer`
  (`test/features/payments/presentation/momo_declaration_client_ref_test.dart`).
- Tests de widget (avec `dio` mocké via `mocktail` et une base Drift en
  mémoire, `AppDatabase.forTesting(NativeDatabase.memory())`) : parcours
  connexion (`test/features/auth/presentation`), liste des immeubles avec
  taux d'occupation et bandeau hors ligne, fiche locataire avec boutons
  Appeler / WhatsApp, prise de photo hors ligne ajoutée à l'outbox
  (`test/features/portfolio/presentation`, `test/features/documents/presentation`),
  fiche bail affichée depuis un lot/locataire et liste des documents du bail
  avec action de partage (`test/features/leases/presentation`), tournée
  regroupée par immeuble, encaissement (double appui ne déclenchant qu'un
  seul appel réseau, `clientRef` conservé après un échec), ma caisse et
  soumission d'une remise (`test/features/collection/presentation`,
  `test/features/cash/presentation`), déclaration Mobile Money (double appui
  ne déclenchant qu'un seul appel réseau), Mobile Money par agrégateur
  (attente puis succès, attente puis expiration avec nouvelle tentative)
  (`test/features/payments/presentation`) ; génération et unicité des ULID
  (`test/core/sync/ulid_test.dart`), chiffrement/déchiffrement de la clé de
  base locale et réinitialisation (`test/core/db/db_encryption_test.dart`),
  sérialisation de l'outbox, ordre de rejeu selon `dependsOn`, conservation
  du `batchRef` entre deux tentatives, blocage de la relance d'un conflit
  (`test/core/sync/outbox_repository_test.dart`), repli exponentiel plafonné
  à 5 minutes (`test/core/sync/backoff_test.dart`), traitement des
  résultats `APPLIED`/`REJECTED`/`CONFLICT`/`SKIPPED` par le `SyncEngine`
  (`test/core/sync/sync_engine_test.dart`), purge des référentiels qui
  épargne l'outbox (`test/core/db/purge_reference_data_test.dart`).
- Tests de widget complémentaires (phase 5) : encaissement créé en mode
  avion versé à l'outbox sans appel réseau
  (`test/features/collection/presentation/encaissement_offline_test.dart`),
  badge d'attente masqué/affiché selon le contenu de l'outbox
  (`test/features/more/presentation/more_screen_outbox_badge_test.dart`),
  écran Outbox (liste, détail, nouvelle tentative, explication d'un
  conflit sans bouton de relance)
  (`test/features/sync/presentation/outbox_screen_test.dart`).
- Tests unitaires (phase 7) : mapping JSON des relevés de gérance, de leurs
  lignes et des reversements, calcul du solde affiché en accueil bailleur
  (`outstandingBalance`, report — jamais d'appel de fonds sur un solde
  négatif) et détection d'un bailleur hors du Congo
  (`test/features/landlord_portal/domain`).
- Tests de widget (phase 7, avec `dio` mocké) : espace bailleur sans aucune
  action d'écriture (accueil, bandeau diaspora,
  `test/features/landlord_portal/presentation`), invitation du bailleur
  depuis la fiche du mandat avec statut envoyée/activée
  (`test/features/mandates/presentation`), parcours d'onboarding du
  gestionnaire indépendant en quatre écrans se terminant par un seul appel
  réseau (`test/features/onboarding/presentation`).
- **Total** : 157 tests, tous au vert (`flutter analyze` : 0 erreur, 0 info).

## Architecture

Clean Architecture par fonctionnalité (`lib/features/<feature>/{domain,data,presentation}`) :

- `lib/core` : configuration (`--dart-define`), thème Material 3, routage
  `go_router`, client HTTP `dio` (intercepteur d'authentification avec
  rafraîchissement automatique et file d'attente sur 401), erreurs typées
  `{code, message}`, formatage XAF et téléphone, base locale Drift chiffrée
  par SQLCipher (`lib/core/db/app_database.dart`, voir « Base locale
  chiffrée » ci-dessous), `lib/core/sync` (outbox généralisée, `SyncEngine`,
  préchargement/purge — voir `feature sync`).
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
  du réseau (`OutboxConnectivityWatcher`). Mécanisme volontairement simple,
  conservé tel quel : le `SyncEngine` généralisé (phase 5, `lib/core/sync`)
  gère séparément les opérations `CASH_RECEIPT`/`DOCUMENT`.
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
- `lib/features/collection` : « Ma tournée » (`GET /invoices` filtré aux
  lots du démarcheur, regroupé par immeuble, trié par montant dû
  décroissant ; cache local Drift `CachedInvoices` pour la lecture hors
  ligne — bascule automatique avec bandeau « Données du … », jamais
  utilisée pour encaisser). Écran d'encaissement : locataire/bail
  pré-remplis, sélection des factures à solder avec aperçu d'imputation
  (plus ancienne facture d'abord), montant XAF, signature tactile
  (`signature`, export PNG base64) ou photo du reçu papier, `clientRef`
  ULID généré avant l'appel et conservé jusqu'à la réponse (une nouvelle
  tentative après échec rejoue le même `clientRef`), bouton « Valider »
  verrouillé dès le premier appui. Écran de confirmation (numéro de reçu,
  partage du PDF via `download-url` + `share_plus`, renvoi WhatsApp/SMS).
  Depuis la phase 5, l'encaissement fonctionne hors ligne : bandeau
  informatif (non bloquant) quand la tournée provient du cache, mise en
  attente dans l'outbox généralisée (`core/sync`) à la validation —
  signature encodée en base64 comme en ligne, photo de reçu papier
  envoyée en opération `DOCUMENT` séparée rattachée par `dependsOn` — puis
  retour à la tournée avec confirmation. Seul l'encaissement en espèces est
  concerné : Mobile Money et virement restent en ligne uniquement.
- `lib/features/cash` : « Ma caisse » (encours du démarcheur via
  `GET /cash/collectors/{userId}/balance`, alerte si le plafond
  d'organisation est dépassé, liste des reçus non remis triés du plus
  ancien au plus récent). Création d'une remise (sélection des reçus,
  montant déclaré, coupures optionnelles, soumission directe en
  `SUBMITTED`) et suivi des remises (statuts, écart constaté par l'agence
  à la vérification).
- `lib/features/payments` : modes de paiement numériques de la phase 4,
  ouverts depuis une facture de la tournée (écran de choix selon les
  instructions de paiement de la facture). Déclaration Mobile Money et
  déclaration de virement (preuve téléversée via le module `documents`
  existant, `clientRef` ULID conservé entre deux tentatives, bouton
  verrouillé dès le premier appui, comme l'encaissement). Mobile Money par
  agrégateur : devis (`POST /payments/mobile-money/quote`), initiation
  (`POST /payments/mobile-money/initiate`), écran d'attente interrogeant
  `GET /payments/mobile-money/transactions/{id}` toutes les 3 secondes
  (`MomoPollingCoordinator`, intervalle surchargeable en test), jamais de
  confirmation sur la seule foi d'un webhook côté mobile non plus. Aucun
  cache local : ces écritures sont en ligne uniquement (`PaymentsOfflineMessage`).
- `lib/features/sync` (phase 5) : écran Outbox (`OutboxScreen`, liste
  triée par date de création, détail par élément avec message d'erreur en
  français, nouvelle tentative pour un échec, explication non actionnable
  pour un conflit — « seul un gestionnaire peut trancher »). Badge
  permanent (nombre d'éléments en attente/en cours, couleur d'alerte si un
  échec ou un conflit existe) affiché dans l'onglet « Plus » et sur l'onglet
  bas correspondant.
- `lib/features/landlord_portal` (phase 7) : espace bailleur, distinct de
  l'espace agence (`LandlordBottomNavShell`, atteint via `/bailleur` depuis
  `SplashScreen`/`OtpVerificationScreen` lorsque `GET /v1/portal/me`
  répond, c'est-à-dire lorsque la liste des organisations de l'utilisateur
  est vide et que le compte est rattaché à un `landlord`). Toutes les
  routes sont en lecture seule (`LandlordPortalRepository` ne porte aucune
  méthode d'écriture) : accueil, relevés de gérance (téléchargement/partage
  du PDF via `GET /portal/statements/{id}/pdf`), reversements,
  encaissements confirmés et quittances (URL de téléchargement déjà
  signée). Aucun `X-Organization-Id` sur ces routes (rôle dérivé
  `LANDLORD_PORTAL`, sans appartenance à `organization_members`).
- `lib/features/mandates` (phase 7) : fiche mandat minimale (référence,
  statut, commission, bailleur) et invitation du bailleur par WhatsApp
  (`POST /management-mandates/{id}/landlord-invitation`), avec statut
  affiché (non invité / envoyée / activée) dérivé de
  `MandateDetail.landlordPortal`. Périmètre volontairement restreint à ce
  besoin mobile ; la liste et la création des mandats restent des écrans
  web.
- `lib/features/onboarding` (phase 7) : parcours du gestionnaire
  indépendant en quatre écrans brefs (`ManagerOnboardingScreen`),
  atteignable depuis l'écran de sélection d'organisation lorsque
  l'utilisateur n'appartient à aucune organisation. Un seul appel réseau à
  la validation (`POST /organizations/independent-manager/onboarding`),
  transaction unique côté API ; redirige vers la fiche du mandat créé pour
  enchaîner directement sur l'invitation du bailleur.
- `lib/features/more` : onglet « Plus » (diagnostic, déconnexion, accès à
  la tournée, à la caisse et à la file d'attente Outbox). L'accès aux baux
  est masqué en mode démarcheur restreint (voir ci-dessous).
- `lib/shared/widgets` : composants réutilisables (`MoneyXafText`,
  `PhoneField`, `OtpField`, `StatusBadge`, `EmptyState`,
  `OfflineDataBanner`, `AppBottomNavShell`).

Navigation par onglets bas (`StatefulShellRoute.indexedStack` de
`go_router`) : Accueil / Immeubles / Locataires / Plus pour les rôles
`OWNER`/`MANAGER`/`ACCOUNTANT`/`VIEWER` (la feature `portfolio` reste en
lecture seule). Depuis la phase 5, le mode démarcheur restreint
(`isCollectorModeProvider`, dérivé du rôle dans l'organisation courante)
réduit la barre à Accueil/Plus pour un `COLLECTOR` — les onglets
Immeubles/Locataires et l'accès aux baux, qui parcourent tout le
portefeuille de l'organisation, lui sont masqués ; un lien profond vers un
onglet masqué le ramène automatiquement à l'accueil.

État applicatif géré par Riverpod (`riverpod_annotation` + génération de
code). Modèles `freezed` / `json_serializable`. Base locale Drift déclarée
avec `app_settings` (clé/valeur, dont le curseur de synchronisation),
`outbox` (idempotence via `client_ref`, généralisée en phase 5 — type
d'opération, `batch_ref`, dernier message d'erreur) et le cache de
référentiels (`cached_properties`, `cached_units`, `cached_tenants`,
`cached_leases`, `cached_invoices`, `cached_cash_receipts`,
`cached_remittances`, schéma v5 avec migrations). **Chiffrement SQLCipher
activé par défaut** depuis la phase 5 (`sqlcipher_flutter_libs`, clé de
256 bits générée à la première ouverture et conservée dans
`flutter_secure_storage` — jamais dans la base). Voir « Base locale
chiffrée » et « Réinitialisation de la base locale » ci-dessous.

## Base locale chiffrée (SQLCipher)

- Chaque appareil génère un aléa de 256 bits (`DbEncryption._generateHexKey`,
  `lib/core/db/app_database.dart`) à la première ouverture, conservé sous
  la clé `immodesk.db_encryption_key_v1` dans `flutter_secure_storage`
  (trousseau iOS / Keystore Android) et jamais écrit dans la base.
- `NativeDatabase.createInBackground` ouvre le fichier avec
  `PRAGMA key = "x'<clé hex>'";` puis `PRAGMA cipher_compatibility = 4;` ;
  `sqlcipher_flutter_libs` fournit les bibliothèques natives SQLCipher (au
  lieu du SQLite en clair) sur Android/iOS/macOS/Linux/Windows.
- Si aucune clé n'est connue (première migration depuis une base en clair
  des phases 0 à 4, ou perte de la clé) alors qu'un fichier existe déjà, il
  est **supprimé** plutôt que migré, conformément au contrat : une nouvelle
  clé est générée et un préchargement complet est nécessaire.

### Réinitialisation de la base locale

En cas de perte de la clé (désinstallation partielle, restauration d'une
sauvegarde du trousseau sans celle de l'application, ou anomalie) :

1. Écran « À propos / diagnostic » → « Réinitialiser la base locale »
   (confirmation demandée). Cet appel supprime le fichier chiffré et la clé
   (`DbEncryption.resetDatabaseAndKey`), puis force la recréation d'une
   base vide avec une nouvelle clé au prochain accès.
2. L'utilisateur relance ensuite un préchargement complet (« Précharger ma
   tournée », même écran, ou automatiquement au prochain retour en ligne) :
   `GET /v1/sync/pull` sans curseur renvoie le périmètre entier.
3. L'`outbox` n'est **jamais** touchée par cette procédure : les
   encaissements créés hors ligne mais non encore synchronisés restent en
   base et seront rejoués normalement dès que la clé — donc la base — est
   de nouveau lisible. Si la base elle-même est irrémédiablement
   inaccessible (fichier corrompu), les écritures qu'elle contenait sont
   perdues comme n'importe quel fichier local endommagé : c'est pourquoi la
   synchronisation doit être déclenchée dès que possible en fin de tournée.

## Ce qui reste (hors périmètre phase 5)

- Exécution réelle en tâche de fond du `SyncEngine` (WorkManager / BGTask) :
  la reprise au retour du réseau et la minuterie périodique
  (`syncIntervalSeconds`) ne fonctionnent aujourd'hui que tant que
  l'application est au premier plan (`SyncCoordinator`,
  `lib/core/sync/sync_providers.dart`).
- États des lieux, relevés de compteur et maintenance (`inspections`,
  `meter_readings`, `maintenance_requests`) : hors périmètre du contrat de
  phase 5 (« le plan cite ces entités, mais elles n'arrivent qu'en phase 8 »,
  `docs/api/phase5-contract.md`, arbitrage 1).
- Écran de préchargement de tournée dédié avec sélection explicite du
  périmètre : le préchargement (phase 5) est déclenché depuis l'écran
  diagnostic ; un écran de confirmation dédié en amont de la tournée reste
  à faire.
- Rattachement d'un locataire à un lot (aucun bail n'existe encore côté API
  en phase 1 ; voir `docs/api/phase1-contract.md`).
- Pagination des listes immeubles/locataires (une seule page, `limit=100`,
  suffisante pour la consultation terrain de la phase 1).
- Client Dart généré depuis `openapi.json` (actuellement, les appels HTTP
  sont écrits à la main contre les contrats `docs/api/phase0-contract.md`
  à `docs/api/phase5-contract.md` ; à remplacer dès que l'OpenAPI de l'API
  est publié).
- Invitations et gestion des membres d'organisation (Epic 0.D, non couvert
  par les écrans mobiles selon `docs/04_plan_de_phases.md`).
- Gestion complète des mandats (liste, création, modification, suspension,
  résiliation), des dépenses et des commissions, et détail d'un relevé de
  gérance avec ses lignes côté agence : hors périmètre de ce lot mobile
  (`docs/api/phase7-contract.md`), qui couvre uniquement le portail
  bailleur en lecture seule, l'onboarding du gestionnaire indépendant et
  l'invitation depuis la fiche du mandat. Ces écrans restent web.
- Le mandat créé par l'onboarding est activé par défaut côté API
  (contrat : statut initial `DRAFT`, activation explicite) ; aucun écran
  mobile d'activation n'existe encore, l'invitation du bailleur reste donc
  possible dès la création dans ce lot.
