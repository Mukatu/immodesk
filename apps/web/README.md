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
NEXT_PUBLIC_API_URL=http://localhost:3000/v1   # base de l'API, utilisée par le navigateur
API_INTERNAL_URL=http://localhost:3000/v1      # base de l'API, utilisée par les route handlers Next
```

L'API écoute par défaut sur le port 3000 ; le dashboard de développement se lance sur un autre port (par défaut 3001) pour éviter une collision.

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
                          /acces-refuse, /app/equipe, error.tsx, not-found.tsx, /api/auth/* (BFF),
                          phase 1 :
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
                          /app/synchronisation/appareils, phase 6 :
                          /app/banque/releves, /app/banque/releves/[id],
                          /app/banque/rapprochement, /app/banque/cheques,
                          /app/parametres/rapprochement, phase 7 :
                          /app/gerance/mandats, /app/gerance/mandats/[id],
                          /app/gerance/mandats/nouveau, /app/gerance/depenses,
                          /app/gerance/depenses/nouvelle, /app/gerance/commissions,
                          /app/gerance/releves, /app/gerance/releves/[id],
                          /app/gerance/reversements, /onboarding/gestionnaire-independant,
                          /portail, /portail/activer, /portail/activer/[token],
                          /portail/releves, /portail/encaissements, /portail/quittances,
                          /portail/reversements, phase 8 :
                          /app/etats-des-lieux, /app/etats-des-lieux/[id],
                          /app/etats-des-lieux/comparaison/[unitId], /app/compteurs,
                          /app/compteurs/[id], /app/parametres/tarifs,
                          /app/facturation/refacturation, /app/maintenance,
                          /app/maintenance/nouveau, /app/maintenance/[id], phase 9 :
                          /app/relances, /app/relances/historique,
                          /app/relances/historique/[id], /app/tableaux-de-bord, phase 10 :
                          /app/abonnement, /onboarding/etapes, /app/parametres/import-portefeuille,
                          /locataire, /locataire/connexion, /locataire/factures/[id],
                          /locataire/virement, /partenaire, /partenaire/tableau-de-bord,
                          /partenaire/confirmer/[registrationId] (page publique),
                          /app/admin, /app/admin/commissions, /app/admin/versements,
                          /app/admin/abonnements-a-risque, /app/admin/contre-passations
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

### Gestion d'agence, portail bailleur et onboarding du gestionnaire indépendant (phase 7)

**Domaine** (`docs/api/phase7-contract.md`) : mandats de gestion (statuts, périmètre, commission
par défaut 10 % sur loyer encaissé, TVA 18 %), dépenses (saisie, justificatif, validation, rejet
motivé, refacturation au locataire exclue du relevé), commissions (une ligne par paiement
`CONFIRMED`, jamais sur le facturé), campagne mensuelle et relevés de gérance (`DRAFT` → `ISSUED` →
`SENT` → `PAID`, jamais de montant négatif sur une ligne, report du solde négatif en
`CARRY_FORWARD`), reversements (`PENDING` → `APPROVED` → `PROCESSING` → `PAID`, échec motivé,
nouvelle tentative sans recréer), portail bailleur en lecture seule et onboarding du gestionnaire
indépendant. Les types `Statement*` du contrat sont repris sous `OwnerStatement*` côté web pour ne
pas entrer en collision avec les types de relevé bancaire de la phase 6.

**Écrans agence**, sous `/app/gerance` (sous-navigation locale `gerance/layout.tsx` entre
Mandats/Dépenses/Commissions/Relevés/Reversements, entrée « Gérance » dans la navigation
principale) : `/app/gerance/mandats` (liste filtrable par statut, fiche avec biens rattachés et
relevés, création, activation, suspension motivée, résiliation avec date d'effet et motif,
invitation du bailleur par WhatsApp avec statut de l'invitation) ; `/app/gerance/depenses` (saisie
avec justificatif en deux temps, soumission, validation, rejet motivé, filtres par bien et statut,
mention explicite qu'une dépense refacturable au locataire ne figure pas au relevé du bailleur) ;
`/app/gerance/commissions` (cumul par mandat et par période) ; `/app/gerance/releves` (lancement de
la campagne avec son rapport créés/ignorés/erreurs, liste, fiche détaillant les lignes en débit et
crédit, émission, PDF, annulation motivée) ; `/app/gerance/reversements` (création sur un relevé
émis au solde positif, approbation, exécution avec preuve obligatoire, échec motivé avec nouvelle
tentative possible).

**Portail bailleur**, sous `/portail`, en lecture seule (rôle dérivé `LANDLORD_PORTAL`, aucune
appartenance à une organisation, session et jeton isolés de l'agence — voir
`portal-auth-context.tsx`, `portal-client.ts`, cookie httpOnly `immodesk_portal_refresh_token`
distinct de celui de l'agence) : `/portail/activer/[token]` (activation par code reçu sur le
téléphone depuis le lien d'invitation), `/portail` (accueil : solde à percevoir, dernier relevé,
dernier reversement, bandeau mode de reversement et délai pour un bailleur hors du Congo),
`/portail/releves` (téléchargement), `/portail/reversements`, `/portail/encaissements`,
`/portail/quittances`. Aucune action d'écriture, aucun lien vers `/app/**`.

**Onboarding du gestionnaire indépendant**, `/onboarding/gestionnaire-independant` (choisi depuis
`/onboarding/organisation` en sélectionnant le type d'organisation) : organisation, premier
bailleur, premier immeuble et premier mandat (commission 10 % pré-remplie) créés en un seul appel,
en moins de dix minutes.

**Composants** : `MandateStatusBadge`, `ExpenseStatusBadge`, `StatementStatusBadge`,
`PayoutStatusBadge`, `StatementLinesTable` (colonnes Débit/Crédit, jamais de montant négatif),
`CommissionSummaryCard`, `DiasporaBadge`.

**Hooks** : `use-mandates`, `use-expenses`, `use-commissions`, `use-owner-statements`,
`use-owner-payouts`, `use-onboarding`, `use-portal` (client dédié `portal-client.ts`, jamais
`X-Organization-Id`).

**Mocks MSW** : `agency-handlers.ts`/`agency-seed.ts` (mandats, dépenses, commissions, campagne et
relevés, reversements — la commission se calcule sur les allocations de paiements `CONFIRMED` vers
des factures du périmètre du mandat, jamais sur le paiement brut), `portal-handlers.ts` (activation
et routes `/portal/*`, le jeton d'invitation est l'identifiant du mandat lui-même, jamais exposé
par la route `landlord-invitation` conformément au contrat). Un mandat de démonstration actif est
semé sur le premier bailleur/bien de `DEMO_ORG_ID`.

### États des lieux, compteurs et charges, maintenance (phase 8)

**Domaine** (`docs/api/phase8-contract.md`) : états des lieux d'entrée, de sortie, périodiques et
contradictoires avec photos par poste et signature, comparaison automatique entrée/sortie par pièce et
élément avec proposition de retenue, gestion des relevés de compteurs (électricité, eau, gaz, énergie
solaire, etc.) avec gestion des passages par zéro et détection des erreurs de saisie, tarification
dynamique par bien/type avec forfait ou consommation, campagne de refacturation idempotente des charges
aux baux, demandes de maintenance avec cycle de vie statut/priorité/affectation et suivi par mises à
jour.

**Règles de gestion critiques** : (1) Un état des lieux au statut `SIGNED` est figé : aucune action de
modification n'est proposée. Une contestation ultérieure se marque `DISPUTED` sans jamais toucher au
constat d'origine. (2) Les signatures manuscrites ne se capturent pas depuis le dashboard : elles se
recueillent sur le terrain depuis l'application mobile. L'action de signature du dashboard verrouille
un constat sans signature manuscrite, notamment pour clore le cas d'un locataire absent au-delà du
délai de grâce. (3) La campagne de refacturation est idempotente par construction : un relevé déjà
facturé est ignoré automatiquement, donc la relancer ne produit jamais de double facturation.

**Gestion des relevés : cas d'erreur particuliers** : (1) Deux relevés ne peuvent pas porter la même
date pour un même compteur : l'API refuse par 409 `METERS.READING_DUPLICATE_DATE`, et l'écran propose
alors d'annuler ou de retenter avec une date différente. (2) Un index inférieur au précédent génère
une erreur 422 `METERS.INDEX_REGRESSION` ; l'écran proposé deux choix explicites : corriger la saisie
(édition du dernier relevé) ou confirmer un passage par zéro du compteur en renvoyant `rolloverApplied: true`.

**Écrans** : `/app/etats-des-lieux` (liste filtrable par type, statut, lot, lien vers comparaison
entrée/sortie) ; `/app/etats-des-lieux/[id]` (détail d'un état des lieux avec postes par pièce, photos,
actions de signature/contestation/annulation selon le statut, PDF généré automatiquement au statut signé,
retenue sur dépôt par poste) ; `/app/etats-des-lieux/comparaison/[unitId]` (comparaison des états
d'entrée et de sortie signés par pièce et élément, état de chaque poste, écart en niveaux de condition,
présence de photos, retenue proposée en résumé et par poste) ; `/app/compteurs` (liste avec filtres
bien/lot/type, lien vers campagne de refacturation, création de compteur) ; `/app/compteurs/[id]` (détail
du compteur, ajout de relevé avec gestion des erreurs de saisie, historique des relevés et consommation)
; `/app/parametres/tarifs` (grilles tarifaires globales et par bien, groupées par type, création/édition/
activation par rôle `OWNER`, lien vers campagne de refacturation) ; `/app/facturation/refacturation`
(lancement d'une campagne sur période et bien optionnel, rapport lisible avec créés/ignorés/erreurs,
bandeau assurant l'idempotence) ; `/app/maintenance` (liste filtrable par statut, priorité, bien,
personne affectée, surligné les demandes en retard, lien de création, prise en compte du SLA) ;
`/app/maintenance/nouveau` (création de demande avec lot, objet, description, priorité, origine du
signalement) ; `/app/maintenance/[id]` (détail avec mises à jour chronologiques, actions de statut
selon le cycle `OPEN` → `ACKNOWLEDGED` → `ASSIGNED` → `IN_PROGRESS` / `ON_HOLD` → `RESOLVED` →
`CLOSED`, ou rejet à tout moment avec motif, lien vers l'état des lieux d'origine si applicable).

**Composants** : `InspectionStatusBadge`, `ConditionBadge`, `PriorityBadge`,
`MaintenanceStatusBadge`, `MaintenanceDueIndicator`.

**Hooks** : `use-inspections`, `use-inspection`, `use-inspection-comparison`, `use-meters`,
`use-meter`, `use-create-meter-reading`, `use-utility-tariffs`, `use-set-tariff-active`,
`use-launch-utility-run`, `use-utility-run`, `use-maintenance-requests`, `use-maintenance-request`,
`use-create-maintenance-request`.

**Mocks MSW** : `inspections-handlers.ts`, `inspections-seed.ts` (états des lieux avec photos,
signatures, comparaison d'entrée/sortie par pièce/élément), `facilities-handlers.ts`,
`facilities-seed.ts` (compteurs, tarifs, relevés avec gestion des passages par zéro, campagne de
refacturation avec rapport déterministe), `maintenance-handlers.ts`, `maintenance-seed.ts` (demandes
avec cycle de vie, mises à jour, SLA calculé selon priorité).

### Relances, pénalités, tableaux de bord et exports (phase 9)

**Domaine** (`docs/api/phase9-contract.md`) : paliers de relance avec déclencheur (avant/après échéance,
à l'émission, au basculement en retard), canal de notification principal et canal de repli, modèle de message,
solde minimum et heure d'envoi locale. Scan quotidien idempotent, sélection par correspondance EXACTE du
décalage en jours de retard, escalade vers le garant par doublement du message. Règles de pénalité avec
quatre bases (taux journalier/mensuel en points de base, montant forfaitaire, montant par jour),
franchise en jours, plafonner par montant ou pourcentage du solde, limiter par nombre de périodes.
Simulateur de pénalité en lecture seule (aucune écriture). Quatre tableaux de bord agrégés, tous filtrables
par période, immeuble et bailleur, en lecture seule (VIEWER) : taux de recouvrement avec série mensuelle,
impayés avec répartition par tranche d'ancienneté (0–30, 31–60, 61–90, 90+ jours) et liste des débiteurs les
plus en retard, vacance locative avec durée moyenne de vacance, encaissements par mode de paiement mesurant
la bancarisation. Exports en CSV uniquement (jamais Excel, arbitrage du contrat) : synchrone jusqu'à dix
mille lignes, asynchrone avec interrogation d'état au-delà. Fichiers rangés en documents, liens signés
valables une heure.

**Règles de gestion** : (1) Une règle de relance se désactive par `isActive: false`, elle ne se supprime
jamais. (2) Deux paliers ne peuvent pas partager le même rang (409 `DUNNING.STEP_ORDER_TAKEN`). (3) Il
n'existe pas de statut « remis » sur une relance (`DunningStepStatus` : PENDING, RUNNING, SENT, SKIPPED,
FAILED, CANCELLED) ; la remise effective se lit dans le journal des messages. (4) Export en CSV avec
encodage UTF-8 + BOM et séparateur point-virgule francophones : le fichier s'ouvre directement dans Excel,
l'Excel natif est écarté.

**Écrans** : `/app/relances` (liste des paliers triée par rang, chacun montrant déclencheur, canal, solde
minimum, heure d'envoi, pénalité optionnelle, escalade au garant, activation/désactivation en un geste,
bouton de modification, bouton « Lancer le scan » avec simulation optionnelle) ; `/app/relances/historique`
(file des exécutions filtrable par palier et statut, pagination par curseur, lien vers détail d'une
exécution) ; `/app/relances/historique/[id]` (détail d'une exécution : palier, statut, dates planifiée/traitée,
locataire, facture, solde, retard en jours, raison de l'ignorance ou message d'erreur le cas échéant,
présence ou absence d'escalade au garant, présence ou absence de pénalité appliquée) ; `/app/tableaux-de-bord`
(quatre widgets en grille 2×2, filtres en haut : période, immeuble, bailleur, un bouton d'export CSV sur
chaque widget pour l'agrégat correspondant).

**Composants** : `DunningStepDialog`, `DunningStepStatusBadge`, `TriggerScanDialog`, `StepActivateButton`,
`DunningRunDetailSummary`, `ExportButton` (gestion des réponses 201 synchrone et 202 asynchrone),
`CollectionRateWidget`, `ArrearsWidget`, `VacancyWidget`, `PaymentMethodsWidget`.

**Hooks** : `use-dunning-rules`, `use-dunning-runs`, `use-dunning-run`, `use-penalty-rules`,
`use-dashboards-collection-rate`, `use-dashboards-arrears`, `use-dashboards-vacancy`,
`use-dashboards-payment-methods`, `use-exports`, `use-export-job`.

**Mocks MSW** : `dunning-handlers.ts`, `dunning-seed.ts` (paliers, historique d'exécutions couvrant les six
statuts), `dashboards-handlers.ts` (quatre agrégats), `exports-handlers.ts` (téléchargement CSV).
La simulation des relances s'appuie sur une date de référence FIXE `DUNNING_REFERENCE_TODAY = new Date('2024-03-01')`
déclarée en tête de `dunning-seed.ts`, jamais sur `new Date()`, afin que les tests e2e restent déterministes.
Le moteur sélectionne le palier par correspondance EXACTE du décalage en jours de retard, comme le serveur :
une simulation plus permissive que le serveur rendrait les tests complaisants et invalides pour valider les
bugs de sélection du palier.

### Abonnement SaaS, onboarding guidé, import de portefeuille, portail locataire et apport d'affaires (phase 10)

**Domaine** (`docs/api/phase10-contract.md`) : **abonnement SaaS** par organisation (une seule ligne pour
toujours, arbitrage n°1), catalogue de plans (Starter, Standard mensuel/annuel, Pro), facture d'abonnement
réglée en une fois par Mobile Money (jamais DRAFT ni PARTIALLY_PAID, arbitrage n°2) ; **onboarding guidé**
en trois étapes facultatives et reprenables après la création de l'organisation (premier bien, premier bail,
première invitation), avancement entièrement dérivé côté serveur (aucune colonne de progression stockée) ;
**import de portefeuille** en masse par fichier CSV (bailleurs, biens, lots, locataires, baux, arbitrage n°3),
transactionnel ligne à ligne (une ligne en échec n'interrompt jamais l'import, elle est comptée et motivée
dans le rapport) ; **portail locataire** en libre-service (arbitrage n°4 : aucun rôle stocké, jeton propre au
portail, jamais partagé avec l'agence ni le portail bailleur), périmètre strict aux baux ACTIFS du locataire
connecté ; **apport d'affaires** (parrainage, arbitrages n°5 à 7) avec code de parrainage saisi à
l'inscription ou bien apporté directement par le partenaire (avec confirmation OTP obligatoire par le
bailleur avant toute création de filleul, `referrals_otp_chk`), commissions à trois statuts
(ACCRUED → APPROVED → PAID) approuvées par campagne mensuelle puis versées en lot par Mobile Money, jamais
une seconde fois pour la même organisation filleule (arbitrage n°5) ; **abonnements à risque** (vue
plateforme des organisations PAST_DUE/SUSPENDED).

**Écrans** : `/app/abonnement` (plan courant, historique des factures, paiement Mobile Money d'une facture
émise ou en retard, changement de plan, résiliation réservée à OWNER) ; `/onboarding/etapes` (suite affichée
juste après la création de l'organisation, trois étapes avec indicateur de progression, chacune « passable »
sans effet côté serveur — reprenable plus tard depuis les écrans normaux) ; `/app/parametres/import-portefeuille`
(dépôt du fichier via le téléverseur de documents générique, rapport de suivi par sondage jusqu'à un statut
final, téléchargement CSV des lignes rejetées, réservé aux rôles Gestionnaire et Propriétaire) ; portail
locataire (`/locataire/connexion` — OTP direct sur le téléphone sans jeton d'invitation, `/locataire` — liste
des factures tous baux actifs confondus, `/locataire/factures/[id]` — détail, paiement Mobile Money,
téléchargement de quittance une fois payée, `/locataire/virement` — déclaration de virement avec preuve
obligatoire et historique) ; espace partenaire (`/partenaire` — inscription et code de parrainage à
partager, `/partenaire/tableau-de-bord` — filleuls et commissions/versements, `/partenaire/confirmer/[registrationId]`
— page publique de confirmation par le bailleur apporté) ; back-office plateforme (`/app/admin` et
sous-écrans, accès restreint côté composant au rôle OWNER en l'absence de rôle « plateforme » modélisé :
`/app/admin/commissions` — campagne d'approbation ACCRUED → APPROVED, `/app/admin/versements` — versement
groupé par lot de commissions APPROVED, `/app/admin/abonnements-a-risque`, `/app/admin/contre-passations`).

**Composants** : `PaySubscriptionInvoiceDialog`, `ChangePlanDialog`, `ImportReportCard`,
`TenantPortalShell`, `PayInvoicePanel`, `ReceiptDownloadButton`, `DeclareTransferForm`,
`PartnerRegistrationForm`, `PartnerShareCard`, `RegisterPropertyDialog`, `PayoutRow`.

**Hooks** : `use-subscriptions`, `use-onboarding-wizard`, `use-portfolio-imports`, `use-tenant-portal`,
`use-referral`, `use-admin-referrals`.

**Mocks MSW** : `subscription-handlers.ts`/`subscription-seed.ts` (catalogue de plans, upsert de la ligne
d'abonnement, simulateur Mobile Money par suffixe du numéro payeur — ...01 succès, ...02 échec, ...03
attente puis expiration), `onboarding-wizard-handlers.ts` (trois routes idempotentes réutilisant les mêmes
règles de création que les phases 0 à 2, état dérivé sans stockage), `portfolio-import-handlers.ts`/
`portfolio-import-seed.ts` (job d'import avec rapport déterministe : 42 lignes lues, 38 créées, 4 rejetées,
un type d'entité par ligne rejetée), `tenant-portal-handlers.ts`/`tenant-portal-seed.ts` (jeton propre au
portail, réutilise les tables `invoices`/`receipts`/`transferDeclarations` déjà seedées par les phases 3-4),
`referral-handlers.ts`/`referral-seed.ts` (partenaires, filleuls, commissions et versements, anti-abus
serveur contre l'auto-parrainage et le double parrainage d'une même organisation).

**Écart connu, documenté dans le code** (`src/app/locataire/virement/_lib/upload-tenant-proof.ts`) : le
téléversement de la preuve de virement depuis le portail locataire appelle les routes génériques
`/documents/upload-url` et `/documents`, qui résolvent l'organisation via l'en-tête `X-Organization-Id`
(`orgIdFromRequest`, `mocks/handlers.ts`) — jamais envoyé par le client locataire (jeton Bearer seul,
`tenant-client.ts`). La preuve étant obligatoire, aucune déclaration de virement locataire ne peut donc
aboutir tant que ce point n'est pas traité ; le scénario e2e correspondant s'arrête volontairement au
contrôle de validation client (voir la section Tests).

## Tests

- **Unitaires** (`pnpm test`, Vitest + Testing Library, **308 tests** répartis sur 63 fichiers) :
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
  suggestion de rapprochement avec validation/rejet (`SuggestionCard`), badges de gestion d'agence
  phase 7 (`MandateStatusBadge`, `ExpenseStatusBadge`, `StatementStatusBadge`, `PayoutStatusBadge`),
  bailleur en diaspora (`DiasporaBadge`), cumul de commissions (`CommissionSummaryCard`), lignes de
  relevé de gérance en débit/crédit sans jamais de montant négatif (`StatementLinesTable`), carte de
  poste d'état des lieux (`InspectionItemCard`), groupement de postes par pièce (`InspectionItemsByRoom`),
  ajout de relevé avec gestion des erreurs de saisie (`AddReadingDialog`), affichage d'une ligne de
  relevé (`ReadingRow`), ligne tarifaire (`TariffRow`), rapport de campagne de refacturation
  (`UtilityRunReport`), indicateur demande en retard (`MaintenanceDueIndicator`), entrée de mise à
  jour de maintenance (`MaintenanceUpdateEntry`), badge statut maintenance (`MaintenanceStatusBadge`).
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
  - **Phase 7 agence** (`e2e/phase7-gerance-agence.spec.ts`) : portefeuille minimal (bailleur,
    compte bancaire, immeuble, lot, locataire, bail actif, facture payée intégralement au comptoir)
    → mandat de gestion créé puis activé → campagne mensuelle produisant un relevé brouillon →
    émission du relevé → création du reversement → approbation → exécution avec preuve, entièrement
    mocké via MSW.
  - **Phase 7 portail bailleur** (`e2e/phase7-portail-bailleur.spec.ts`) : invitation du bailleur
    par WhatsApp depuis un mandat actif → activation du portail par code reçu sur le téléphone, dans
    un contexte navigateur neuf (session isolée de l'agence) → vérification qu'aucune action
    d'écriture ni aucun lien vers l'agence n'est proposé sur les cinq écrans du portail.
  - **Phase 8** (`e2e/phase8-patrimoine.spec.ts`) : trois parcours indépendants — (1) états des lieux
    d'entrée et sortie semés via l'API mobile → affichage du constat de sortie signé figé → validation
    de la retenue sur dépôt depuis la comparaison entrée/sortie → vérification de l'exclusivité
    (retenue appliquée, aucune autre action) ; (2) compteur d'eau créé → premier relevé → second
    relevé en régression (index < précédent) → refus proposant "Corriger" ou "Confirmer le passage par
    zéro" → confirmation du passage par zéro → lancement de campagne de refacturation → vérification
    du rapport (créées, ignorés, erreurs) ; (3) demande de maintenance signalée (fuite) → refus exige
    un motif (dialog bloqué) → prise en compte → affectation (refus disparaît) → mise à jour en
    « En intervention » → résolution → clôture, entièrement mocké via MSW.
  - **Phase 9** (`e2e/phase9-recouvrement.spec.ts`) : deux scénarios indépendants — (1) création d'une
    organisation fraîche, un bailleur, un immeuble, un lot, un locataire, un bail actif, deux factures
    ancrées à une date fixe de 3 jours avant la date de référence du simulateur → création d'une règle
    de pénalité forfaitaire → test du simulateur sans écriture → création d'un palier de relance avec
    pénalité et seuil minimum → tentative de création d'un palier sur un rang occupé (409) → scan en
    simulation puis en mode réel → vérification de l'historique : une facture au-dessus du seuil reçoit
    la relance, l'autre au-dessous est ignorée (correspondance EXACTE au jour de retard, jamais
    « au moins ») → réexécution du scan le même jour pour vérifier l'idempotence (pas de doublon) ;
    (2) création d'une seconde organisation → vérification que les quatre tableaux de bord s'affichent
    → filtrage par période → vérification de quatre boutons d'export CSV (jamais Excel) → export depuis
    la liste des factures, vérification du format CSV, entièrement mocké via MSW.
  - **Phase 10 monétisation** (`e2e/phase10-monetisation.spec.ts`) : deux scénarios indépendants —
    (1) organisation fraîche → facture d'abonnement (plan Standard, période d'essai) payée par
    Mobile Money (numéro payeur se terminant par ...01) → facture « Payée », abonnement « Actif » ;
    (2) un partenaire s'inscrit et récupère son code de parrainage (contexte séparé) → une seconde
    organisation le saisit à l'étape 3 de la création → suite d'onboarding guidé traversée de bout en
    bout (premier bien créé après détour par « Créer un bailleur », premier bail créé après détour par
    lot et locataire, première invitation envoyée) → vérification côté partenaire que le filleul
    apparaît en attente, source « Code saisi à l'inscription ».
  - **Phase 10 import de portefeuille** (`e2e/phase10-import-portefeuille.spec.ts`) : téléversement
    d'un fichier CSV → rapport déterministe du mock (42 lignes lues, 38 créées, 4 rejetées) → les
    quatre lignes rejetées sont visibles avec leur motif → téléchargement du CSV des rejets → nouvel
    import possible.
  - **Phase 10 portail locataire** (`e2e/phase10-portail-locataire.spec.ts`) : portefeuille minimal
    (bailleur avec compte bancaire, immeuble, lot, locataire, bail actif, facture émise) → connexion
    OTP du locataire dans un contexte navigateur neuf → consultation de la facture → paiement Mobile
    Money (...01) → facture « Payée » et quittance disponible → déclaration de virement : compte
    bancaire du bailleur proposé, contrôle client bloquant tant qu'aucune preuve n'est jointe (l'envoi
    complet n'est pas exercé, voir l'écart connu documenté ci-dessus).
  - **Phase 10 parrainage** (`e2e/phase10-parrainage.spec.ts`) : deux scénarios indépendants —
    (1) inscription d'un partenaire → apport d'un bien pour un bailleur qui n'a pas encore de compte
    Immodesk → ce bailleur crée son compte avec le même numéro → confirmation par OTP sur la page
    publique `/partenaire/confirmer/[registrationId]`, sans session → le filleul apparaît côté
    partenaire (source « Bien enregistré par le partenaire », en attente) → aucune commission pour
    l'instant (aucun abonnement payé côté filleul) ; (2) back-office : approbation de la commission
    ACCRUED du partenaire de démonstration (`seedReferralDemoData`, seule donnée du mock permettant
    d'exercer cette route) → versement groupé regroupant cette commission avec celle déjà APPROVED du
    même partenaire → un versement « Reversé » couvrant deux commissions.

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

Phase 8 ajoute `inspections-handlers.ts`/`inspections-seed.ts` (états des lieux, postes, photos,
signatures, comparaison entrée/sortie), `facilities-handlers.ts`/`facilities-seed.ts` (compteurs,
relevés avec gestion des passages par zéro et erreurs de saisie, tarifs par bien/type, campagne de
refacturation idempotente avec rapport), `maintenance-handlers.ts`/`maintenance-seed.ts` (demandes de
maintenance avec cycle de vie statut, mises à jour, calcul du SLA selon priorité).

Phase 9 ajoute `dunning-handlers.ts`/`dunning-seed.ts` (paliers et historique d'exécutions couvrant les
six statuts), `dashboards-handlers.ts` (quatre agrégats filtrables), `exports-handlers.ts` (génération
CSV synchrone et asynchrone). La simulation des relances s'appuie sur une date de référence FIXE
déclarée en tête de `dunning-seed.ts` : `DUNNING_REFERENCE_TODAY = new Date('2024-03-01')`, jamais
sur l'horloge du système, afin que le test reste déterministe quelle que soit la date d'exécution.
Le moteur sélectionne le palier par correspondance EXACTE du décalage en jours de retard, comme le
serveur : une simulation plus permissive que le serveur rendrait les tests complaisants.

Phase 10 ajoute `subscription-handlers.ts`/`subscription-seed.ts` (catalogue de plans, ligne d'abonnement
indexée par organisation, simulateur Mobile Money par suffixe du numéro payeur), `onboarding-wizard-handlers.ts`
(premier bien/bail/invitation, état dérivé sans stockage), `portfolio-import-handlers.ts`/
`portfolio-import-seed.ts` (job d'import au rapport déterministe), `tenant-portal-handlers.ts`/
`tenant-portal-seed.ts` (jeton propre au portail locataire, réutilise les tables des phases 3-4),
`referral-handlers.ts`/`referral-seed.ts` (partenaires, filleuls, commissions et versements, avec un
partenaire de démonstration ACTIVE et trois commissions ACCRUED/APPROVED/PAID, seule donnée permettant
d'exercer réellement l'approbation et le versement groupé du back-office). Écart connu : le téléversement
de la preuve de virement depuis le portail locataire (`upload-tenant-proof.ts`) appelle les routes
génériques de documents, qui exigent `X-Organization-Id` — jamais envoyé par le client locataire ; voir le
commentaire du fichier et la section Tests.

## Accessibilité et performance

- Composants basés sur Radix (rôles ARIA, focus, navigation clavier) ; labels associés à tous les
  champs, erreurs liées par `aria-describedby` et annoncées en `aria-live="polite"`.
- Server Components par défaut, `"use client"` réservé aux feuilles interactives.
- Pas de dépendance lourde superflue : composants d'UI écrits à la main sur les primitives Radix
  plutôt qu'un framework de composants complet.
