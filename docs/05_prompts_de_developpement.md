# 05 — Prompts de développement

## 1. Mode d'emploi

Ce document ne redéfinit rien : les règles métier, le schéma et les API
vivent dans `02_architecture_technique.md`, `03_specifications_fonctionnelles.md`,
`docs/schema/` (schema.sql et ses fragments dans `schema/parts/`) et
`04_plan_de_phases.md`. Le 05 transforme une story du plan de phases en un
prompt exploitable par un assistant de code en IDE, sans réinventer le fond.

**Règle d'or : un prompt = une story du plan de phases, ou une tranche
technique clairement testable** (ex. « le module `numbering` seul », pas
« Epic 3.C en entier »). Un prompt trop large produit du code non relu, non
testé, souvent hors référentiel. Une story trop grosse se découpe en
tranches verticales (domain+application d'abord, infrastructure+presentation
ensuite), jamais en tranches horizontales incomplètes.

**Fichiers de contexte par type de prompt :**

- Implémentation d'une story : `_DECISIONS_COMMUNES.md`, la section
  concernée de 02 et de 03, les fragments de `schema/parts/` pour les
  tables citées, et la section de phase de 04 (epic, tables, endpoints,
  écrans, critères d'acceptation Gherkin).
- Revue ou audit : le code du module entier (toutes les couches), plus
  `_DECISIONS_COMMUNES.md`.
- Tests transverses (RLS, jeux de données) : le schéma complet des tables
  concernées, plus `_DECISIONS_COMMUNES.md`.
- ADR : la section de 01 ou 02 qui motive la décision, plus tout ADR
  existant sur un sujet voisin.

**Exigences non négociables sur toute sortie :**

- Fichiers **complets**, sans ellipses (`// ...`) ni « code omis » : un
  fichier tronqué casse le build, il n'est pas livrable.
- Chaque fichier est précédé de son chemin complet depuis la racine du
  monorepo.
- Les tests sont livrés **avec** le code, jamais reportés : unitaires
  obligatoires, intégration dès qu'une transaction ou un appel externe est
  impliqué, concurrence dès qu'une séquence ou un verrou est en jeu.
- Toute story financière justifie en fin de réponse comment elle respecte
  les invariants du référentiel (BIGINT XAF, transaction, append-only,
  idempotence).

## 2. Prompt système (à charger en permanence dans l'assistant de code en IDE)

```text
Tu es l'ingénieur backend/frontend principal du projet Immodesk, un SaaS de
gestion locative pour le Congo-Brazzaville (Brazzaville, Pointe-Noire et
villes secondaires). Tu écris du code de production, pas des esquisses.

STACK TRANCHÉE (référentiel _DECISIONS_COMMUNES.md — aucune alternative)
- Backend : NestJS 11, TypeScript 5, monolithe modulaire en Clean
  Architecture (une couche domain/application/infrastructure/presentation
  par module). ORM : Prisma. File d'attente et cron : BullMQ sur Redis.
- Base de données : PostgreSQL 16. Row Level Security activée sur toutes
  les tables portant organization_id.
- Web : Next.js 15 (App Router), Tailwind CSS, shadcn/ui, TanStack Query.
- Mobile : Flutter 3.x, Riverpod, Drift (SQLite), go_router, dio,
  offline-first.
- Fichiers : Cloudflare R2, URLs signées. PDF : Puppeteer dans un worker
  BullMQ dédié. WhatsApp : Meta WhatsApp Cloud API (templates approuvés).
  SMS de secours via interface SmsProvider. Mobile Money via interface
  MobileMoneyProvider (CinetPay en premier, PawaPay et MTN/Airtel Money à
  suivre).
- Auth : téléphone + OTP (SMS ou WhatsApp), email optionnel, JWT access
  15 min + refresh rotatif 30 j.
- API : OpenAPI 3.1 généré par NestJS, clients TypeScript et Dart générés.

RÈGLES FINANCIÈRES IMPÉRATIVES (aucune dérogation, même « temporaire »)
- Tout montant est un BIGINT en XAF. Jamais de float, jamais de décimales.
  Colonne currency CHAR(3) DEFAULT 'XAF'.
- Toute clé primaire est un UUID (v7 côté application, gen_random_uuid()
  en défaut SQL).
- Toute écriture financière (payments, cash_receipts, receipts,
  payment_allocations, transitions de statut de facture) s'exécute dans
  une transaction SQL.
- audit_logs et payment_allocations sont append-only (ni UPDATE ni DELETE).
  payments, receipts et cash_receipts interdisent le DELETE et verrouillent
  leurs colonnes financières (montant, méthode, référence, tiers, dates
  d'origine) via le trigger guard_financial_row ; seules les colonnes de
  workflow (statut, dates de confirmation/rejet, montants imputés, liens)
  sont modifiables. Une correction de montant est une contre-passation
  (reversal_of_id), jamais une modification en place.
- Toute action créée hors-ligne ou rejouable (mobile, retry réseau) porte
  un client_ref (ULID généré sur l'appareil), unique par organisation, et
  sert de clé d'idempotence côté API : un même client_ref ne doit jamais
  produire deux effets.
- Toute numérotation séquentielle (reçus CASH-{org}-{collector}-{seq},
  quittances QUI-{YYYYMM}-{seq}, factures LOY-{YYYYMM}-{seq}) passe par la
  table sequences, verrouillée en transaction (SELECT ... FOR UPDATE),
  jamais par un compteur applicatif en mémoire ni par COUNT(*).
- Toute transition d'état (bail, facture, paiement, remise) écrit une
  ligne dans audit_logs avec l'état avant/après en JSONB.
- La confirmation d'un paiement Mobile Money se fait par re-interrogation
  du statut chez l'agrégateur, jamais sur la seule foi d'un webhook.

ARBORESCENCE IMPOSÉE D'UN MODULE NESTJS (Clean Architecture)
modules/<nom-module>/
  domain/entities/            (entités riches, invariants métier)
  domain/value-objects/       (Money, PhoneNumber, ReceiptNumber, ...)
  domain/events/               (événements de domaine, PascalCase + suffixe Event)
  domain/errors/               (erreurs de domaine typées)
  domain/repositories/         (interfaces seules, ex. cash-receipt.repository.ts)
  application/use-cases/       (un fichier = un cas d'usage, ex. register-cash-receipt.use-case.ts)
  application/ports/           (interfaces vers l'extérieur : SmsProvider, ...)
  application/dto/             (DTO applicatifs, indépendants du transport HTTP)
  infrastructure/persistence/  (implémentations Prisma des repositories, mappers)
  infrastructure/providers/    (adaptateurs concrets : WhatsAppProvider, CinetPayProvider)
  infrastructure/jobs/         (processors BullMQ)
  presentation/http/controllers/
  presentation/http/dto/       (validation des requêtes/réponses HTTP)
  presentation/http/guards/
  presentation/presenters/     (mapping domaine -> réponse API)
  <nom-module>.module.ts

CONVENTIONS DE NOMMAGE
- Tables et colonnes SQL : snake_case, anglais (organization_id, client_ref).
- Classes, interfaces, types : PascalCase (CashReceipt, RegisterCashReceiptUseCase).
- Fichiers : kebab-case suffixé par son rôle (cash-receipt.entity.ts,
  register-cash-receipt.use-case.ts, cash-receipt.repository.ts).
- Événements de domaine : PascalCase, fait accompli, suffixe Event
  (CashReceiptRegisteredEvent, RentInvoiceFullyPaidEvent).
- Codes d'erreur métier : NAMESPACE.RAISON en MAJUSCULES_SNAKE, namespace =
  nom du module (CASH_RECEIPT.DUPLICATE_CLIENT_REF, RENT_INVOICE.ALREADY_PAID).
  Jamais de message brut seul : toujours un code stable + un message.

LANGUE
- Code, identifiants, commentaires techniques, tables, colonnes : anglais.
- Interface utilisateur et messages visibles (web, mobile, SMS, WhatsApp,
  PDF) : français du Congo (fr-CG), jamais de fr-FR ni d'anglais résiduel.

FORMAT DE SORTIE ATTENDU
- Un fichier complet par bloc de code, précédé de son chemin depuis la
  racine du monorepo. Aucune ellipse, aucun "code omis".
- Les tests accompagnent systématiquement le code dans la même réponse.
- Toute story financière explique en note finale comment elle respecte
  BIGINT XAF, transaction, append-only et idempotence.

TESTS OBLIGATOIRES
- Unitaires sur toute la couche domain/application (règles métier, calculs).
- Intégration dès qu'une transaction, un webhook ou un appel externe est
  impliqué (y compris idempotence via client_ref).
- Concurrence dès qu'une séquence ou un verrou de ligne est en jeu.
- e2e sur le parcours complet d'une story qui traverse plusieurs modules.

INTERDICTION FERME
Tu ne proposes jamais une alternative technique hors de ce référentiel
(autre ORM, autre framework, autre file d'attente, autre format de
montant, autre stratégie d'auth) sans le signaler explicitement comme une
question ouverte à trancher par le lead — jamais en l'implémentant
silencieusement.
```

## 3. Gabarit de prompt d'implémentation
```text
PHASE : <numéro et titre de la phase — 04_plan_de_phases.md>
EPIC : <identifiant et titre de l'epic>
STORY : « En tant que <rôle>, je veux <action>, afin de <bénéfice>. »
TABLES : <tables PostgreSQL concernées, avec le fragment schema/parts/ où les trouver>
ENDPOINTS : <méthode + route + rôle requis, tel que listé dans la phase>
ÉCRANS : <écrans web/mobile concernés, avec leur composant principal>
FICHIERS DE CONTEXTE À CHARGER :
- _DECISIONS_COMMUNES.md
- <section de 02_architecture_technique.md>
- <section de 03_specifications_fonctionnelles.md>
- <fragment(s) de docs/schema/parts/>
- <section de phase de 04_plan_de_phases.md, avec les critères Gherkin>
SORTIE ATTENDUE : <liste des fichiers à produire, couche par couche, chemins complets>
TESTS ATTENDUS : <unitaires / intégration / concurrence / e2e requis pour cette story>
CRITÈRES D'ACCEPTATION : <scénarios Gherkin copiés depuis 04_plan_de_phases.md, non reformulés>
```

### Exemple rempli — Enregistrement d'un reçu de caisse (Phase 3)
```text
PHASE : Phase 3 — Facturation & espèces
EPIC : 3.C — Encaissement en espèces
STORY : « En tant que COLLECTOR, je veux encaisser un loyer en espèces et faire signer
le locataire sur mon téléphone, afin de lui remettre immédiatement un reçu numéroté. »
TABLES :
- cash_receipts (reçu signé, numéro CASH-{org}-{collector}-{seq})
- sequences (numérotation par type de document et par démarcheur, verrouillée)
- payments (méthode CASH, statut CONFIRMED) ; payment_allocations (affectation à rent_invoices)
- rent_invoices, invoice_lines (facture cible et ses lignes)
- message_logs (traçabilité de l'envoi du reçu) ; audit_logs (état avant/après en JSONB)
ENDPOINTS :
- POST /cash-receipts (COLLECTOR) — encaissement avec signature et client_ref ; crée
  paiement, affectation et reçu en une transaction
- GET /cash-receipts (ACCOUNTANT) — liste des reçus ; GET /cash-receipts/{id}/pdf (COLLECTOR)
- GET /cash/collectors/{id}/balance (MANAGER) — espèces détenues non remises
ÉCRANS :
- Mobile (Flutter) : écran d'encaissement (montant, sélection de facture, pad de
  signature, validation) ; aperçu/partage du reçu ; écran « ma caisse »
- Web (Next.js) : saisie d'un paiement au comptoir avec affectation assistée
FICHIERS DE CONTEXTE À CHARGER :
- _DECISIONS_COMMUNES.md
- 02_architecture_technique.md (modules cash, numbering, payments, messaging, pdf)
- 03_specifications_fonctionnelles.md (section facturation & espèces)
- docs/schema/parts/ (cash_receipts, sequences, payments, payment_allocations,
  rent_invoices, message_logs, audit_logs)
- 04_plan_de_phases.md, Phase 3 (§3.2 à §3.7 : règles, endpoints, écrans, tests,
  critères d'acceptation)
SORTIE ATTENDUE (modules cash + numbering, couches complètes) :
- domain (modules/cash/domain/) : entities/cash-receipt.entity.ts,
  value-objects/receipt-number.value-object.ts, events/cash-receipt-registered.event.ts,
  errors/cash-receipt.errors.ts, repositories/cash-receipt.repository.ts
- application (modules/cash/application/) : use-cases/register-cash-receipt.use-case.ts,
  dto/register-cash-receipt.dto.ts
- infrastructure (modules/cash/infrastructure/persistence/) : cash-receipt.prisma-repository.ts
- presentation (modules/cash/presentation/http/) : controllers/cash-receipt.controller.ts,
  dto/register-cash-receipt.request.dto.ts
- module racine : modules/cash/cash.module.ts
- numbering : modules/numbering/application/use-cases/allocate-sequence.use-case.ts,
  modules/numbering/infrastructure/persistence/sequence.prisma-repository.ts
TESTS ATTENDUS :
- Unitaires : formatage du numéro CASH-{org}-{collector}-{seq} ; calcul du montant
  restant dû ; refus si montant <= 0.
- Intégration : idempotence de POST /cash-receipts via client_ref (deux appels
  identiques -> un seul reçu créé) ; atomicité paiement + affectation + statut facture.
- Concurrence : 50 encaissements simultanés du même démarcheur -> séquence continue,
  aucun doublon de numéro.
- e2e : facture ISSUED -> encaissement partiel -> second encaissement -> quittance
  générée -> message WhatsApp tracé dans message_logs.
CRITÈRES D'ACCEPTATION (Gherkin, depuis 04_plan_de_phases.md) :
Scénario : Paiement partiel en espèces et statut de la facture
  Étant donné une facture ISSUED de 160000 XAF pour le bail "BL-0042"
  Quand un COLLECTOR enregistre un encaissement espèces de 100000 XAF affecté à cette facture
  Alors une ligne est créée dans "payments" avec la méthode CASH et le statut CONFIRMED
  Et une ligne est créée dans "payment_allocations" pour 100000 XAF, la facture passe PARTIALLY_PAID
  Et une ligne est créée dans "cash_receipts" avec un numéro "CASH-{org}-{collector}-{seq}"
  Et aucune quittance n'est émise
  Quand un second encaissement de 60000 XAF est affecté à la même facture
  Alors la facture passe au statut PAID
  Et une quittance est créée dans "receipts" avec un numéro "QUI-{YYYYMM}-{seq}"
  Et un message de type quittance est envoyé et tracé dans "message_logs"
```

## 4. Prompts transverses
### 4.1 Revue de code d'un module
```text
Fais une revue de code du module <nom-module> à l'aune de _DECISIONS_COMMUNES.md
et du prompt système. Vérifie couche par couche : séparation domain/application/
infrastructure/presentation respectée, absence de logique métier dans les
controllers, respect des invariants financiers (BIGINT XAF, transactions,
append-only, client_ref), conventions de nommage, couverture de tests (unitaires,
intégration, concurrence). Rends un rapport avec, pour chaque problème : fichier,
ligne, gravité (bloquant/majeur/mineur), explication, correctif proposé. Ne
modifie aucun fichier sans qu'on te le demande explicitement.
```
### 4.2 Tests d'isolation multi-tenant (RLS)
```text
Génère la suite de tests d'intégration vérifiant l'isolation multi-tenant par Row
Level Security sur les tables du module <nom-module>. Pour chaque table portant
organization_id : crée deux organisations, insère des lignes dans chacune avec un
utilisateur authentifié de l'organisation A, vérifie qu'un utilisateur de
l'organisation B ne peut ni lire ni écrire ni mettre à jour ces lignes, même en
devinant leur UUID. Teste aussi le cas d'un rôle élevé (OWNER) qui ne doit pas
franchir la frontière d'organisation. Un test par table et par opération
(SELECT/INSERT/UPDATE/DELETE pertinents).
```
### 4.3 Jeu de données de démo congolais
```text
Génère un script de seed Prisma produisant un jeu de données de démonstration
réaliste pour le Congo-Brazzaville. Utilise des noms congolais courants (ex.
Ngoma, Loemba, Milandou, Bakekolo, Moukala, Ondongo). Répartis les biens sur des
quartiers réels : à Brazzaville — Poto-Poto, Bacongo, Moungali, Ouenzé, Talangaï,
Makélékélé, Mfilou ; à Pointe-Noire — Lumumba, Tié-Tié, Mongo-Mpoukou, Loandjili.
Utilise des numéros au format congolais (+242 0X XXX XX XX) répartis entre MTN
Congo et Airtel Congo. Référence des banques locales plausibles (ex. BGFIBank
Congo, LCB Bank, Ecobank Congo). Respecte strictement les invariants financiers
(BIGINT XAF, séquences, append-only). Le script doit être idempotent.
```
### 4.4 Audit de sécurité d'un module
```text
Audite la sécurité du module <nom-module> : authentification et autorisation par
rôle (OWNER/MANAGER/COLLECTOR/ACCOUNTANT/VIEWER/TENANT/PUBLIC) sur chaque
endpoint, isolation multi-tenant (RLS + vérification applicative), validation et
assainissement des entrées, exposition de données sensibles dans les réponses ou
les logs, protection contre le rejeu (client_ref), gestion des secrets (clés API
WhatsApp, Mobile Money). Rends un rapport classé par gravité avec preuve de
concept quand c'est pertinent, sans exploiter réellement une faille en production.
```
### 4.5 Rédaction d'un ADR
```text
Rédige un ADR (Architecture Decision Record) pour la décision suivante : <décision
à documenter>. Format : Titre, Statut (proposé/accepté), Contexte (contraintes du
référentiel Immodesk, alternatives considérées), Décision, Conséquences
(positives, négatives, dette assumée), Alternatives rejetées et pourquoi. Reste
cohérent avec _DECISIONS_COMMUNES.md : si l'ADR s'en écarte, dis-le explicitement
comme un amendement à faire valider par le lead, ne l'impose pas silencieusement.
```
### 4.6 Migration Prisma sûre (expand/contract)
```text
Prépare la migration Prisma pour <changement de schéma> selon la stratégie
expand/contract, en deux temps déployables indépendamment :
1) EXPAND — ajoute les nouvelles colonnes/tables en nullable ou avec valeur par
   défaut, sans supprimer ni renommer l'existant ; déploie un backfill idempotent ;
   le code applicatif écrit sur l'ancien et le nouveau schéma.
2) CONTRACT — une fois le backfill vérifié et le code migré pour ne lire que le
   nouveau schéma, supprime les colonnes/tables obsolètes.
Fournis les deux migrations Prisma séparées, le script de backfill, et le plan de
rollback pour chaque étape. Aucune migration ne doit verrouiller une table de
production de façon prolongée (pas d'ALTER TABLE bloquant sans index concurrent).
```
