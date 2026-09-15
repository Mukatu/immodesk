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

| Script           | Rôle                                                                   |
| :--------------- | :--------------------------------------------------------------------- |
| `pnpm dev`       | Lance le serveur de développement Next                                 |
| `pnpm build`     | Build de production                                                    |
| `pnpm start`     | Sert le build de production                                            |
| `pnpm lint`      | ESLint (next + typescript + jsx-a11y)                                  |
| `pnpm typecheck` | `tsc --noEmit`                                                         |
| `pnpm test`      | Tests unitaires Vitest + Testing Library                               |
| `pnpm test:e2e`  | Scénario Playwright contre un mock MSW de l'API (aucun backend requis) |

## Architecture

```
src/
  app/                    App Router : /login, /onboarding/organisation, /app/**, /invitations/[token],
                          /acces-refuse, error.tsx, not-found.tsx, /api/auth/* (BFF), phase 1 :
                          /app/bailleurs, /app/bailleurs/[id], /app/locataires,
                          /app/locataires/[id], /app/locataires/nouveau, /app/immeubles,
                          /app/immeubles/[id], /app/immeubles/nouveau, /app/lots/[id], phase 2 :
                          /app/baux, /app/baux/nouveau, /app/baux/[id], /app/baux/[id]/contrat,
                          /app/depots, /app/parametres/contrat, phase 3 : /app (tableau de bord
                          d'encaissement du mois), /app/factures, /app/factures/[id],
                          /app/factures/nouvelle, /app/facturation/campagnes, /app/paiements,
                          /app/paiements/nouveau, /app/paiements/[id], /app/caisse,
                          /app/caisse/remises, /app/caisse/remises/[id], /app/caisse/recus,
                          /app/quittances, /app/quittances/[id], /app/messages,
                          /app/parametres/facturation, /app/parametres/messages,
                          /verifier/[token] (page publique, sans authentification), phase 4 :
                          /app/parametres/paiements, /app/parametres/webhooks,
                          /app/paiements/declarations, /app/paiements/mobile-money, phase 5 :
                          /app/synchronisation, /app/synchronisation/conflits,
                          /app/synchronisation/appareils
  components/
    ui/                   Primitives shadcn/ui (Radix + class-variance-authority)
    business/             Composants métier : MoneyXaf, MoneyInput, PhoneInput, StatusBadge,
                          EmptyState, PageHeader, DataTable (pagination par curseur), PhoneDisplay,
                          OccupancyBadge, AddressBlock, BankAccountCard, EnumSelect,
                          DocumentUploader/DocumentList (glisser-déposer, aperçu, progression),
                          LeaseStatusBadge, DepositStatusBadge, DepositBalance, RentRevisionTimeline,
                          PartyList, ContractJobStatus, InvoiceStatusBadge, PaymentStatusBadge,
                          RemittanceStatusBadge, MessageStatusBadge, AllocationPreview,
                          CashHoldingGauge, PeriodPicker, StatementTable (phase 3),
                          MomoStatusBadge, DeclarationStatusBadge, WebhookStatusBadge, OperatorBadge,
                          PaymentInstructionsCard, MomoWaitingPanel (phase 4), SyncBatchStatusBadge,
                          SyncOutcomeBadge, ConflictResolutionDialog, DeviceFreshnessIndicator (phase 5)
    layout/                En-tête applicatif, sélecteur d'organisation
  lib/
    api/                   client.ts (fetch typé, Authorization + X-Organization-Id,
                          rafraîchissement automatique sur 401), types.ts (phase 0 & 1),
                          hooks/ (TanStack Query par ressource : landlords, tenants, guarantors,
                          contact-channels, properties, units, bank-accounts, documents, leases,
                          lease-parties, rent-revisions, lease-documents, contract-jobs, deposits,
                          contract-template, invoices, billing-runs, billing-dashboard,
                          penalty-rules, payments, tenant-credits, tenant-statement, cash-receipts,
                          cash-collectors, cash-remittances, receipts, notification-templates,
                          message-logs, payment-methods, payment-instructions,
                          mobile-money-declarations, mobile-money-transactions,
                          bank-transfer-declarations, webhook-events, sync-batches,
                          sync-conflicts, sync-devices, mobile-config)
    auth/                  Contexte d'authentification client, cookie httpOnly du refresh token
    money.ts, phone.ts     Formatage XAF et téléphone congolais
    enum-labels.ts         Labels pour énumérations (statuts, types, genres)
    bank-reference.ts      Référentiel des banques congolaises (BGFI, LCB, Ecobank, UBA)
  mocks/                   Handlers MSW partagés (navigateur + serveur), utilisés en e2e uniquement
  styles/tokens.css        Design tokens (couleurs clair/sombre, rayon, palette sobre
                          vert/ocre inspirée du Congo-Brazzaville)
e2e/                       Scénarios Playwright : phase 0 (login OTP → création d'organisation
                          → invitation), phase 1 (création bailleur → immeuble → 12 lots →
                          locataire + garant → téléversement pièce d'identité), phase 2 (bail →
                          activation → contrat → résiliation → restitution), phase 3 (facture
                          émise → encaissement partiel → second encaissement → quittance →
                          message → vérification publique), phase 4 (déclaration Mobile Money
                          validée, déclaration virement rejetée), phase 5 (conflit de
                          synchronisation résolu en appliquant sur une autre facture)
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

`src/lib/api/types.ts` recopie les contrats `docs/api/phase0-contract.md` (phase 0) et
`docs/api/phase1-contract.md` (phase 1 : tiers, patrimoine) en attendant le client généré depuis
`openapi.json` dans `@immodesk/shared` : ce fichier sera alors retiré au profit du client généré.

### Tiers & patrimoine (phase 1)

Module couvrant la gestion complète des ressources indépendamment du cycle locatif : **bailleurs**
(propriétaires), **locataires** (demandeurs de location), **garants** (tiers caution), **canaux de
contact** (téléphone, email, WhatsApp par défaut), **immeubles** (immeuble complet avec adresse,
référence cadastrale), **lots** (création en série avec formule de numérotation),
**comptes bancaires** (IBAN/nombre de compte par banque), et composant transverse de
**téléversement de documents** (glisser-déposer, URL signée S3, PUT direct, barre de progression,
aperçu image/PDF, limites : 15 Mo images JPEG/PNG/WebP/HEIC, 25 Mo PDF). Les parties et biens
sont isolés en tant que ressources du domaine et n'interfèrent pas avec les scénarios transactionnels
(location, versement).

### Baux, dépôts de garantie et contrats (phase 2)

Cycle complet du bail : **baux** (brouillon, actif, préavis, résiliation), **parties au bail**
(bailleur, locataire(s), tiers présents), **révisions de loyer** (ajustements périodiques avec
historique), **dépôts de garantie** (mouvements : consignation, retenue, restitution) avec **statut
dérivé** (bloqué, réclamé, disponible, en restitution). **Génération de contrat** asynchrone :
job avec suivi de statut (QUEUED → RUNNING → DONE), aperçu HTML imprimable, rattachement du contrat
signé. **Gabarit de contrat** personnalisable par organisation (clauses, dates, montants).

### Facturation, paiements, caisse et quittances (phase 3)

Moteur de facturation : **factures** (6 statuts : brouillon, émise, partiellement payée, payée,
en retard, annulée), lignes de facture typées, **campagnes de facturation** (déclenchement manuel,
rapport créées/ignorées/erreurs), **tableau de bord d'encaissement** par période (attendu, encaissé,
reste, en retard, par immeuble, par mode de paiement), **règles de pénalité**. **Paiements** :
saisie au comptoir avec **affectation assistée** (règle : plus ancienne facture d'abord, reliquat en
**crédit locataire**), confirmation/rejet/**contre-passation** avec motif (écriture miroir,
append-only). **Caisse** : encours par démarcheur avec alerte de plafond, **remises d'espèces**
(file à contrôler, écart compté/attendu, rejet, dépôt en banque), **reçus de caisse** numérotés.
**Quittances** PDF générées automatiquement au règlement complet, envoyées par WhatsApp/SMS,
**journal des messages** (statut envoyé/remis/lu/échec) et **page publique de vérification**
(`/verifier/[token]`, sans authentification, 404 stylée si le jeton est inconnu). Paramètres
étendus : facturation (délai d'émission, pénalités), caisse (plafond, signature), messagerie
(ordre des canaux) et **gabarits de notification** (WhatsApp/SMS, test d'envoi).

### Paiements Mobile Money, virements et webhooks (phase 4)

**Domaine Mobile Money & virements** : **paiements Mobile Money** (déclarés et via agrégateur),
**virements bancaires** (déclarés), **webhooks** (ingestion événementielle asynchrone).

**Écrans** : `/app/parametres/paiements` (configuration modes de paiement, prise en charge des frais,
bornes de montant, fenêtre d'expiration, stratégie confirmOnApproval), `/app/parametres/webhooks`
(journal technique réservé OWNER, rejeu), `/app/paiements/declarations` (onglets Mobile Money/Virement,
file triée par ancienneté, alerte 72h+, actions validation/rejet/prise en charge),
`/app/paiements/mobile-money` (journal transactions, filtres, re-interrogation agrégateur).

**Intégration facture** : bloc **Instructions de paiement** (déclaration Mobile Money, déclaration
virement, demande via agrégateur), **devis e-paiement** (écran d'attente avec compte à rebours,
règles de rechargement), **bandeau paiement en attente de confirmation bancaire** (état post-validé,
avant notification de tiers). Règle métier centrale : une déclaration ne crée un paiement que postérieure
à sa validation.

**Composants** : `MomoStatusBadge`, `DeclarationStatusBadge`, `WebhookStatusBadge`, `OperatorBadge`,
`PaymentInstructionsCard`, `MomoWaitingPanel`.

**Hooks** : `use-payment-methods`, `use-payment-instructions`, `use-mobile-money-declarations`,
`use-mobile-money-transactions`, `use-bank-transfer-declarations`, `use-webhook-events`.

**Mocks MSW** : `mobile-money-handlers.ts`, `bank-transfer-handlers.ts`, `payment-methods-handlers.ts`,
`webhook-events-handlers.ts`, `payments-phase4-seed.ts`. Simulateur Mobile Money piloté par suffixe
numéro payeur (…01 succès, …02 échec, …03 expiration), rejeu événementiel webhooks.

### Synchronisation hors ligne (phase 5)

**Domaine** : lots de synchronisation envoyés par les appareils démarcheurs hors ligne
(`docs/api/phase5-contract.md`, périmètre volontairement réduit à trois écrans). Le protocole est
générique ; un seul type d'opération réel en phase 5 (`CASH_RECEIPT`, plus `DOCUMENT` pour les
pièces jointes). Aucune table de conflits côté API : un conflit est une opération rejetée pour
changement côté serveur (ex. facture annulée pendant l'absence de connexion), agrégée depuis
`sync_batches.result`.

**Écrans** : `/app/synchronisation` (file des lots avec appareil, démarcheur, date de réception,
statut, compteurs reçus/appliqués/rejetés/en conflit, filtres démarcheur/statut/période, détail
d'un lot avec chaque opération et son issue), `/app/synchronisation/conflits` (conflits non résolus
en tête, démarcheur, ancienneté, motif lisible, détail corps d'origine face à l'état actuel de la
facture visée, résolution en deux choix : appliquer avec correction facultative de la facture et de
l'imputation automatique, ou abandonner avec motif obligatoire — le `clientRef` d'origine est
toujours conservé, aucun doublon n'est créé), `/app/synchronisation/appareils` (par démarcheur et
appareil : dernière synchronisation réussie, statut du dernier lot, conflits en attente, total
appliqué, appareils silencieux depuis plus de 24 h mis en évidence).

**Composants** : `SyncBatchStatusBadge`, `SyncOutcomeBadge`, `ConflictResolutionDialog`,
`DeviceFreshnessIndicator`. Tuile « Conflits de synchronisation » sur le tableau de bord.

**Hooks** : `use-sync-batches`, `use-sync-conflicts`, `use-sync-devices`, `use-mobile-config`.

**Mocks MSW** : `sync-handlers.ts`, `sync-seed.ts`. Les lots et conflits ne pouvant être créés que
par le mobile (hors périmètre web), le mock amorce paresseusement, à la première requête reçue pour
une organisation donnée, un lot entièrement appliqué, un lot partiellement appliqué avec un conflit,
et un appareil silencieux depuis trois jours ; le conflit se rattache à la première facture non
annulée de l'organisation dès qu'elle en compte une (bascule automatiquement à CANCELLED pour
rejouer le scénario), ce qui fonctionne aussi bien pour les données de démonstration que pour une
organisation e2e fraîchement créée.

### Rapprochement bancaire et chèques (phase 6)

**Domaine** : import de relevés bancaires (`docs/api/phase6-contract.md`), moteur de rapprochement à
trois niveaux (exact, suggéré, manuel) entre les lignes de relevé et les paiements, déclarations de
virement, chèques ou remises de caisse, cycle de vie complet du chèque. Le fichier du relevé ne
transite jamais dans le corps de la requête d'import : il est d'abord téléversé comme un document
classique (`DocumentUploader`, nature `BANK_STATEMENT`), puis l'import référence ce document par
`documentId`. L'état d'une ligne (`LineState`) est dérivé (jamais persisté) : `UNMATCHED`,
`SUGGESTED`, `PARTIALLY_MATCHED`, `MATCHED`, `IGNORED`. Un chèque suit `RECEIVED` → `DEPOSITED` →
`CLEARED`, avec les branches `BOUNCED`, `CANCELLED`, `RETURNED` — jamais `REGISTERED`/`REJECTED`
(anciennes valeurs du plan de phases, remplacées par le contrat).

**Écrans** : `/app/banque/releves` (sélection du compte, import avec détection ou choix du format,
rapport d'import lisible, liste des relevés avec période/soldes/taux de rapprochement) et
`/app/banque/releves/[id]` (détail, lignes filtrables par état, abandon d'un import erroné avec son
avertissement) ; `/app/banque/rapprochement` (file des lignes non rapprochées et suggérées tous
relevés confondus, filtres compte/ancienneté/montant, mise en évidence des lignes de plus de 30
jours, suggestions avec score et critères détaillés, validation/rejet en un geste, recherche
manuelle par locataire puis par paiement/déclaration/chèque/remise, annulation d'un rapprochement
avec motif obligatoire et avertissement de réouverture de facture) ; `/app/banque/cheques` (saisie,
liste filtrable par statut, mise en évidence des chèques déposés depuis plus de quinze jours,
actions dépôt/compensation/rejet motivé/annulation/restitution, bandeau sur les conséquences d'un
rejet) ; `/app/parametres/rapprochement` (seuil de suggestion, fenêtre de dates, tolérance de
montant, confirmation automatique des rapprochements exacts, délai d'alerte des chèques, frais de
rejet). Tuile « Rapprochement bancaire » sur le tableau de bord général, entrée dans la navigation
principale, sous-navigation locale entre Relevés/Rapprochement/Chèques (`banque/layout.tsx`).

**Composants** : `LineStateBadge`, `MatchTypeBadge`, `MatchStatusBadge`, `CheckStatusBadge`,
`ConfidenceScoreGauge`, `ImportReportPanel`, `SuggestionCard`.

**Hooks** : `use-bank-statements`, `use-bank-statement-lines`, `use-reconciliation-matches`,
`use-reconciliation-dashboard`, `use-bank-checks`, `use-bank-statement-adapters`,
`use-reconciliation-settings`.

**Mocks MSW** : `bank-statements-handlers.ts`, `reconciliation-handlers.ts`,
`bank-checks-handlers.ts`, `bank-reconciliation-seed.ts`. Tout import de relevé génère de façon
déterministe 12 lignes : 6 rapprochées automatiquement (`EXACT`/`CONFIRMED`), 3 suggérées avec des
scores différents (88/79/76), 3 non rapprochées dont une de plus de 30 jours ; un chèque déposé
depuis vingt jours illustre l'alerte de délai de compensation dans les données de démonstration.

## Tests

- **Unitaires** (`pnpm test`, Vitest + Testing Library, **175 tests** répartis sur 37 fichiers) :
  formatage XAF (`MoneyXaf`), saisie téléphone congolaise (`PhoneInput`), affichage téléphone
  (`PhoneDisplay`), badge occupation (`OccupancyBadge`), validation taille et MIME de
  `DocumentUploader`, client API (`apiFetch`) incluant le rafraîchissement automatique de token et
  la déduplication des requêtes concurrentes en 401, badges de statut (bail, dépôt), barre de solde
  de dépôt, suivi de job de génération avec minuteurs simulés, badges de statut phase 3
  (`InvoiceStatusBadge`, `PaymentStatusBadge`, `RemittanceStatusBadge`, `MessageStatusBadge`),
  répartition d'un encaissement sur les factures ouvertes (`AllocationPreview`), jauge encours vs
  plafond de caisse (`CashHoldingGauge`), sélecteur de période (`PeriodPicker`), relevé de compte
  (`StatementTable`), badges phase 4 (`MomoStatusBadge`, `DeclarationStatusBadge`,
  `WebhookStatusBadge`, `OperatorBadge`), bloc instructions de paiement, écran d'attente Mobile Money,
  badges de statut phase 5 (`SyncBatchStatusBadge`, `SyncOutcomeBadge`), fraîcheur de synchronisation
  d'un appareil (`DeviceFreshnessIndicator`), résolution d'un conflit en deux choix avec motif
  obligatoire à l'abandon (`ConflictResolutionDialog`), badges de rapprochement phase 6
  (`LineStateBadge`, `MatchTypeBadge`, `MatchStatusBadge`, `CheckStatusBadge`), jauge de confiance
  d'une suggestion (`ConfidenceScoreGauge`), rapport d'import lisible (`ImportReportPanel`), carte de
  suggestion de rapprochement avec validation/rejet (`SuggestionCard`).
- **e2e** (`pnpm test:e2e`, Playwright) :
  - **Phase 0** (`e2e/login-onboarding-invitation.spec.ts`) : connexion OTP → création
    d'organisation → invitation, entièrement mocké via MSW.
  - **Phase 1** (`e2e/phase1-portfolio.spec.ts`) : création bailleur → création immeuble →
    création 12 lots en série → création locataire avec garant → téléversement pièce d'identité,
    entièrement mocké via MSW.
  - **Phase 2** (`e2e/phase2-leases.spec.ts`) : création bail → activation → génération contrat →
    rattachement contrat signé → résiliation → restitution dépôt, entièrement mocké via MSW.
  - **Phase 3** (`e2e/phase3-facturation-caisse.spec.ts`) : facture manuelle émise → encaissement
    partiel au comptoir → second encaissement (solde → facture payée) → quittance créée
    automatiquement → journal de messages → vérification publique de la quittance sans
    authentification (nouveau contexte navigateur, sans cookies), entièrement mocké via MSW.
  - **Phase 4** (`e2e/phase4-paiements.spec.ts`) : déclaration Mobile Money → validation → facture
    payée avec quittance ; déclaration virement → rejet avec motif → aucun paiement, entièrement
    mocké via MSW.
  - **Phase 5** (`e2e/phase5-synchronisation.spec.ts`) : ouverture de la file de synchronisation →
    ouverture d'un conflit (facture annulée pendant l'absence de connexion) → résolution en
    appliquant sur une autre facture → disparition du conflit de la liste des conflits non résolus,
    entièrement mocké via MSW.
  - **Phase 6** (`e2e/phase6-rapprochement-bancaire.spec.ts`) : import d'un relevé bancaire →
    validation d'une suggestion de rapprochement → rapprochement manuel d'une ligne non rapprochée
    avec un chèque déposé → dépôt puis compensation de ce chèque, entièrement mocké via MSW.

Tous les scénarios e2e utilisent MSW (`src/mocks/handlers.ts`), interceptée côté serveur
(`msw/node`, activé dans `instrumentation.ts` quand `E2E_MOCK=1`). Les appels directs du navigateur
vers l'API passent par le proxy same-origin `src/app/api/proxy/[...path]/route.ts` (actif uniquement
quand `E2E_MOCK=1`, 404 sinon) afin de traverser le même process Next — et donc le même état mocké
en mémoire — que les route handlers `/api/auth/*`. Aucune dépendance à un backend réel.

## Mocks MSW

`src/mocks/handlers.ts` inclut des données de démonstration congolaises (quartiers de Brazzaville,
banques locales : BGFI, LCB, Ecobank, UBA, et institutions de microfinance, immeuble « Résidence
Mpila » avec baux, dépôts, et révisions de loyer), isolées sous une organisation de démonstration
dédiée (`DEMO_ORG_ID`). Ces données pré-peuplent le store en mémoire sans interférer avec les
scénarios e2e : chaque test crée son propre contexte d'organisation. Le job de génération de contrat
est simulé en trois appels successifs (QUEUED → RUNNING → DONE) sans accès à un backend asynchrone réel.

Phase 3 ajoute `billing-handlers.ts`/`billing-seed.ts` (factures, campagnes), `payments-handlers.ts`/
`payments-seed.ts` (paiements, crédits, relevé), `cash-handlers.ts`/`cash-seed.ts` (reçus de caisse,
collecteurs, remises), `receipts-handlers.ts`/`receipts-seed.ts` (quittances, vérification publique),
`messages-handlers.ts`/`messages-seed.ts` (journal des messages), `penalty-rules-handlers.ts` et
`notification-templates-handlers.ts`. Une facture réglée en totalité (comptoir ou application d'un
crédit) déclenche automatiquement la création de la quittance et d'un message WhatsApp « envoyé »
dans le mock ; une contre-passation de paiement annule la quittance associée.

Phase 4 enrichit `payments-handlers.ts` avec `mobile-money-handlers.ts`/`payments-phase4-seed.ts`,
`bank-transfer-handlers.ts`, `payment-methods-handlers.ts`, `webhook-events-handlers.ts`. Le
simulateur Mobile Money est piloté par le suffixe du numéro payeur (…01 succès, …02 échec, …03
expiration) ; une déclaration ne crée un paiement que postérieure à sa validation ; rejeu événementiel
webhooks implémenté.

Phase 5 ajoute `sync-handlers.ts`/`sync-seed.ts` (lots de synchronisation, conflits, appareils,
configuration mobile). Les lots ne pouvant être créés que côté mobile, le mock amorce paresseusement
des données de démonstration à la première requête de synchronisation reçue pour une organisation
(plutôt qu'au chargement du module comme les phases précédentes) : un lot appliqué, un lot
partiellement appliqué avec un conflit, un appareil silencieux depuis trois jours. Le conflit se
rattache à la première facture non annulée de l'organisation dès qu'elle en compte une, en la
basculant à CANCELLED pour rejouer le scénario « changement côté serveur pendant l'absence de
connexion » — fonctionne aussi bien pour `DEMO_ORG_ID` que pour une organisation e2e fraîchement
créée dont le portefeuille est construit via l'écran Factures.

## Accessibilité et performance

- Composants basés sur Radix (rôles ARIA, focus, navigation clavier) ; labels associés à tous les
  champs, erreurs liées par `aria-describedby` et annoncées en `aria-live="polite"`.
- Server Components par défaut, `"use client"` réservé aux feuilles interactives.
- Pas de dépendance lourde superflue : composants d'UI écrits à la main sur les primitives Radix
  plutôt qu'un framework de composants complet.
