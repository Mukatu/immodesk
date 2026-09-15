# Plan d'intégration — Phase 6 (`bank-statements`, `reconciliation`, `bank-checks`)

Document d'architecture **contraignant**. Il complète `docs/api/phase6-contract.md`
(le contrat prime sur tout le reste ; ce plan prime sur les habitudes personnelles).
Il est écrit pour des agents qui travaillent **sans se voir** : tout nom exporté, toute
signature de port et toute forme de DTO citée ici est un **contrat inter-lots**. Ne pas
renommer, ne pas « améliorer », ne pas recréer localement.

Aucune modification du DDL. Les quatre tables existent déjà en base et dans
`apps/api/prisma/schema.prisma` (champs Prisma en `snake_case`, aucun `@@map`,
montants en `BigInt`).

---

## 0. Corrections au cadrage initial (à lire avant tout)

Cinq points du brief de départ sont **faux ou incomplets** au regard du DDL réel
(`docs/schema/schema.sql`). Ils sont corrigés ici et font autorité.

1. **Toutes les tables portent une colonne `currency CHAR(3) NOT NULL DEFAULT 'XAF'`**
   (`bank_statements`, `bank_statement_lines`, `bank_checks`, `reconciliation_matches`).
   Elle était absente de l'énoncé. Toujours écrire `'XAF'` explicitement.

2. **L'index d'unicité des rapprochements confirmés est composite** :

   ```sql
   CREATE UNIQUE INDEX reconciliation_matches_confirmed_line_uk
       ON reconciliation_matches (statement_line_id,
                                  coalesce(payment_id, declaration_id, bank_check_id, remittance_id))
       WHERE status = 'CONFIRMED';
   ```

   Il **n'interdit pas** plusieurs rapprochements confirmés sur une même ligne : il
   interdit de confirmer **deux fois le même couple (ligne, cible)**. C'est précisément
   ce qui rend `SPLIT` possible. Ne pas coder l'hypothèse « une ligne = un seul match
   confirmé ». Le garde-fou de sur-rapprochement est applicatif (`BANK.OVER_MATCHED`)
   plus la contrainte `CHECK (matched_amount <= amount)`.

3. **La contrainte de cible est `num_nonnulls(...) >= 1`, pas `= 1`.** La base tolère
   deux clés étrangères renseignées ; l'application doit exiger **exactement une**
   (`BANK.MATCH_TARGET_REQUIRED`).

4. **`bank_checks` n'a pas de colonne `invoice_id`**, alors que `BankCheckInput` du
   contrat accepte `invoiceId` et `BankCheckDetail` expose un objet `invoice`.
   Résolution imposée : `invoiceId` est transmis au **paiement** créé à la réception
   (imputation via `PaymentInput.allocations`), jamais stocké sur le chèque. En lecture,
   `invoice` est **dérivé** des `payment_allocations` du paiement du chèque.

5. **`CHECK (period_start < period_end)` est strict** sur `bank_statements` : un relevé
   d'une seule journée est refusé par la base. Le contrôler en amont et renvoyer
   `BANK.STATEMENT_PERIOD_INVALID` (422) plutôt que de laisser remonter une erreur SQL.

Deux contraintes de plateforme découvertes à l'analyse, qui commandent la conception :

6. **Le corps JSON est plafonné à 1 Mo** (`apps/api/src/bootstrap.ts` :
   `app.useBodyParser('json', { limit: '1mb' })`) alors que
   `BANK_STATEMENT_MAX_BYTES` vaut 10 Mo. Un relevé **ne peut pas** transiter en base64
   dans le corps de la requête. Il n'existe par ailleurs **aucun `multer` /
   `@UploadedFile` / `FileInterceptor`** dans le dépôt : le fichier ne transite jamais
   par l'API. L'import prend donc un `documentId` déjà téléversé (voir §4.6).

7. **`ObjectStorage` n'expose aucune lecture d'octets** (`createUploadUrl`,
   `createDownloadUrl`, `headObject`, `deleteObject`, `putObject` — c'est tout), et
   `ALLOWED_MIME_TYPES` n'autorise que les images et le PDF, tandis que
   `RELATED_ENTITY_TYPES` ignore `bank_statement` et `bank_check`. Sans les ajouts du
   Lot 0, **l'import est impossible**.

---

## 1. Découpage en lots et ordre d'implémentation

Quatre lots. **Le Lot 0 est un préalable absolu** : il contient tout ce qui est partagé
ou modifié hors des trois nouveaux modules. Il existe pour une seule raison : empêcher
trois agents d'éditer les mêmes fichiers transverses et de produire des conflits ou,
pire, trois variantes incompatibles du même type.

| Lot   | Contenu                                                                                                                                                | Dépend de    | Parallélisable      |
| :---- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- | :------------------ |
| **0** | Socle partagé : codes d'erreur, audit, config, réglages, documents/stockage, variantes `*InTx`, squelettes des 3 modules, câblage `app.module.ts`, RLS | —            | non                 |
| **1** | `bank-checks`                                                                                                                                          | Lot 0        | oui (avec le Lot 2) |
| **2** | `bank-statements`                                                                                                                                      | Lot 0        | oui (avec le Lot 1) |
| **3** | `reconciliation`                                                                                                                                       | Lots 0, 1, 2 | non                 |

Règle de propriété des fichiers : **un fichier n'a qu'un seul lot propriétaire.** Un
agent qui a besoin d'un changement dans un fichier appartenant à un autre lot ne le fait
pas : il signale que le Lot 0 est incomplet. Aucun lot autre que le 0 ne touche
`app.module.ts`, `error-codes.ts`, `audit-entry.ts`, `config.schema.ts`,
`operational-settings.ts`, le module `documents`, `payments`, `bank-transfers`, `cash`.

### Pourquoi cet ordre

- `bank-statements` a besoin de `documents` (fichier source) et **déclenche** le moteur
  de rapprochement sans connaître `reconciliation` → port `RECONCILIATION_ENGINE` (§4.1).
- `reconciliation` lit les lignes de relevé, importe les types et la normalisation de
  libellé de `bank-statements`, et **solde un chèque** via `bank-checks` → il vient donc
  après les deux.
- `bank-checks` ne dépend d'aucun des deux autres. Il dépend de `payments` (création,
  contre-passation), `billing` (ligne de frais) et `notifications` (alerte). C'est
  pourquoi les Lots 1 et 2 sont parallélisables.
- **Le graphe reste acyclique** grâce à une décision explicite : le rejet d'un chèque
  (`bounce`) **ne touche jamais `reconciliation_matches`**. La banque produira une ligne
  au débit sur un relevé ultérieur ; le rapprochement n'est pas défait à rebours. Sans
  cette règle, `bank-checks` devrait appeler `reconciliation` qui appelle `bank-checks`.

### Arborescence cible

```
apps/api/src/modules/bank-statements/
  domain/
    canonical-statement.ts        <- Lot 0 (types partagés)
    ports.ts                      <- Lot 0 (RECONCILIATION_ENGINE)
    line-state.ts                 <- Lot 2
    label-normalization.ts        <- Lot 2 (importé par le Lot 3)
    balance-check.ts              <- Lot 2
  application/
    statement-import.service.ts   <- Lot 2
    statements-query.service.ts   <- Lot 2
    statement-lines-query.service.ts
    statement-views.ts
  infrastructure/adapters/
    csv-adapter.ts, csv-descriptors.ts, mt940-adapter.ts, adapter-registry.ts
  presentation/
    bank-account-statements.controller.ts
    bank-statements.controller.ts
    bank-statement-lines.controller.ts
    bank-statement-adapters.controller.ts
    dto/bank-statements.dto.ts
  bank-statements.module.ts       <- squelette Lot 0, rempli Lot 2

apps/api/src/modules/reconciliation/
  domain/
    match-target.ts               <- Lot 0 (types partagés)
    scoring.ts                    <- Lot 3 (pur, testable sans base)
    reference-parser.ts           <- Lot 3 (pur)
    match-rules.ts                <- Lot 3
  application/
    reconciliation-views.ts       <- Lot 0 (vue ReconciliationMatch partagée)
    reconciliation-engine.service.ts
    candidate-repository.ts
    matches.service.ts
    match-settlement.service.ts
    dashboard.service.ts
  presentation/
    reconciliation-matches.controller.ts
    reconciliation-dashboard.controller.ts
    line-suggestions.controller.ts
    dto/reconciliation.dto.ts
  reconciliation.module.ts        <- squelette Lot 0, rempli Lot 3

apps/api/src/modules/bank-checks/
  domain/
    check-status.ts, check-rules.ts, business-days.ts
  application/
    bank-checks.service.ts
    bank-checks-query.service.ts
    check-views.ts
    check-alerts.service.ts
  infrastructure/check-alerts.scheduler.ts
  presentation/
    bank-checks.controller.ts
    dto/bank-checks.dto.ts
  bank-checks.module.ts           <- squelette Lot 0, rempli Lot 1
```

---

## 2. Propriété des routes

Rappel de convention : **aucun contrôleur ne porte `v1/`**. Le préfixe global vient de
`app.setGlobalPrefix(config.get('API_GLOBAL_PREFIX'))` dans `bootstrap.ts`
(`API_GLOBAL_PREFIX` vaut `'v1'`). Un `@Controller('bank-checks')` produit donc
`/v1/bank-checks`. Décorateurs obligatoires sur chaque classe : `@ApiTags(...)`,
`@ApiBearerAuth()`. Sur chaque méthode : `@Roles(...)`, `@ApiHeader(ORG_HEADER)`,
`@ApiOperation({ summary })`.

| Route                                        | Contrôleur                          | Module propriétaire | Rôle       |
| :------------------------------------------- | :---------------------------------- | :------------------ | :--------- |
| `POST /bank-accounts/{id}/statements/import` | `BankAccountStatementsController`   | **bank-statements** | ACCOUNTANT |
| `GET /bank-accounts/{id}/statements`         | `BankAccountStatementsController`   | **bank-statements** | ACCOUNTANT |
| `GET /bank-statements/{id}`                  | `BankStatementsController`          | **bank-statements** | ACCOUNTANT |
| `POST /bank-statements/{id}/discard`         | `BankStatementsController`          | **bank-statements** | ACCOUNTANT |
| `POST /bank-statements/{id}/reconcile`       | `BankStatementsController`          | **bank-statements** | ACCOUNTANT |
| `GET /bank-statements/{id}/lines`            | `BankStatementsController`          | **bank-statements** | ACCOUNTANT |
| `GET /bank-statement-lines`                  | `BankStatementLinesController`      | **bank-statements** | ACCOUNTANT |
| `PATCH /bank-statement-lines/{id}`           | `BankStatementLinesController`      | **bank-statements** | ACCOUNTANT |
| `GET /bank-statement-adapters`               | `BankStatementAdaptersController`   | **bank-statements** | ACCOUNTANT |
| `GET /bank-statement-lines/{id}/suggestions` | `LineSuggestionsController`         | **reconciliation**  | ACCOUNTANT |
| `POST /reconciliation-matches`               | `ReconciliationMatchesController`   | **reconciliation**  | ACCOUNTANT |
| `POST /reconciliation-matches/{id}/confirm`  | `ReconciliationMatchesController`   | **reconciliation**  | ACCOUNTANT |
| `POST /reconciliation-matches/{id}/reject`   | `ReconciliationMatchesController`   | **reconciliation**  | ACCOUNTANT |
| `POST /reconciliation-matches/{id}/reverse`  | `ReconciliationMatchesController`   | **reconciliation**  | ACCOUNTANT |
| `GET /reconciliation/dashboard`              | `ReconciliationDashboardController` | **reconciliation**  | MANAGER    |
| `POST /bank-checks` + les 6 transitions      | `BankChecksController`              | **bank-checks**     | ACCOUNTANT |
| `GET /bank-checks`, `GET /bank-checks/{id}`  | `BankChecksController`              | **bank-checks**     | ACCOUNTANT |

### Arbitrages sur les routes ambiguës

- **`GET /bank-statement-lines/{id}/suggestions` appartient à `reconciliation`**, bien
  qu'il vive sous le préfixe `bank-statement-lines`. Le calcul à la demande exige le
  moteur de score et le dépôt de candidats ; le faire porter par `bank-statements`
  obligerait ce module à dépendre de `reconciliation` **dans les deux sens** et
  ruinerait le port du §4.1. Nest accepte deux contrôleurs sur le même préfixe tant que
  les chemins ne se recouvrent pas : `LineSuggestionsController` déclare
  `@Controller('bank-statement-lines')` et **une seule** méthode,
  `@Get(':id/suggestions')`. Elle ne peut entrer en collision ni avec `@Get()` ni avec
  `@Patch(':id')` de `BankStatementLinesController`.
- **`GET /bank-statement-lines` (global) appartient à `bank-statements`** : c'est une
  lecture de lignes filtrée (`bankAccountId`, `state`, `olderThanDays`, `minAmount`,
  `maxAmount`, `q`), sans aucun score. Le filtre `state` est du SQL pur (§5).
- **`POST /bank-statements/{id}/reconcile` appartient à `bank-statements`** : il se
  contente d'appeler le port `RECONCILIATION_ENGINE`.
- **`GET /reconciliation/dashboard`** est un `@Controller('reconciliation')` distinct,
  seul rôle `MANAGER` de la phase.
- **Les réglages `reconciliation` n'ajoutent aucune route.** Ils étendent le
  `GET/PATCH /organizations/{id}/settings` existant (module `organizations`,
  `@Roles('MANAGER')` en lecture, `@Roles('OWNER')` en écriture). Travail du Lot 0, §8.

---

## 3. Types canoniques partagés — emplacements imposés

Ces fichiers sont créés **par le Lot 0**, avant tout le reste, parce que plusieurs
modules les importent. Ce sont des **types et fonctions pures** : aucun décorateur
Nest, aucune injection, donc **aucun cycle de modules** même quand `bank-statements`
importe un fichier de `reconciliation`. Un cycle Nest ne naît que d'un `imports:` de
module, jamais d'un `import` TypeScript de type ou de fonction pure.

### 3.1 `bank-statements/domain/canonical-statement.ts` (Lot 0)

Recopier les interfaces du contrat **à l'identique**, plus le registre d'adaptateurs :

```ts
export type StatementFormat = 'CSV' | 'MT940' | 'CAMT053' | 'OFX' | 'XLSX' | 'PDF_OCR';
export type ImplementedFormat = Extract<StatementFormat, 'CSV' | 'MT940'>;
export type StatementLineDirection = 'CREDIT' | 'DEBIT';

export interface CanonicalStatementLine {
  lineNumber: number;
  direction: StatementLineDirection;
  operationDate: string;
  valueDate?: string;
  amount: number;
  label: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  bankReference?: string;
  endToEndReference?: string;
  operationCode?: string;
  runningBalance?: number;
  raw: Record<string, unknown>;
}

export interface CanonicalStatement {
  statementReference?: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: 'XAF';
  lines: CanonicalStatementLine[];
}

export interface BankStatementAdapter {
  readonly code: string;
  readonly label: string;
  readonly format: ImplementedFormat;
  detect(file: Buffer): boolean;
  parse(file: Buffer): CanonicalStatement;
}
```

`amount` et les soldes sont des `number` **uniquement dans la forme canonique** (c'est
la frontière d'analyse du fichier). Dès l'entrée en base, tout repasse en `bigint` via
`toAmount()` (`apps/api/src/shared/money/amount.ts`).

### 3.2 `reconciliation/domain/match-target.ts` (Lot 0)

Le type de cible est dérivé de quatre colonnes ; il n'est **jamais** stocké.

```ts
export const MATCH_TARGET_TYPES = ['PAYMENT', 'DECLARATION', 'CHECK', 'REMITTANCE'] as const;
export type MatchTargetType = (typeof MATCH_TARGET_TYPES)[number];

export const MATCH_TARGET_COLUMNS: Readonly<Record<MatchTargetType, string>> = {
  PAYMENT: 'payment_id',
  DECLARATION: 'declaration_id',
  CHECK: 'bank_check_id',
  REMITTANCE: 'remittance_id',
};

export interface MatchTargetRef {
  targetType: MatchTargetType;
  targetId: string;
}

/** Exactement une des quatre colonnes doit être renseignée (la base tolère plus). */
export function resolveTarget(row: {
  payment_id: string | null;
  declaration_id: string | null;
  bank_check_id: string | null;
  remittance_id: string | null;
}): MatchTargetRef;
```

`resolveTarget` lève `DomainError('BANK.MATCH_TARGET_REQUIRED')` si zéro ou plus d'une
colonne est renseignée.

### 3.3 `reconciliation/application/reconciliation-views.ts` (Lot 0)

**Les trois modules** exposent des `ReconciliationMatch` : `StatementLine.matches`
(bank-statements) et `BankCheckDetail.matches` (bank-checks) en plus de
`reconciliation`. La vue et son mappeur sont donc écrits une seule fois, au Lot 0 :

```ts
export interface ReconciliationMatchRow {
  id: string;
  statement_line_id: string;
  payment_id: string | null;
  declaration_id: string | null;
  bank_check_id: string | null;
  remittance_id: string | null;
  match_type: string;
  status: string;
  matched_amount: bigint;
  confidence_score: number;
  match_criteria: unknown;
  matched_by_user_id: string | null;
  confirmed_at: Date | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  reversed_at: Date | null;
  reversal_of_id: string | null;
  created_at: Date;
}

export interface ReconciliationMatchView {
  id: string;
  statementLineId: string;
  targetType: MatchTargetType;
  targetId: string;
  matchType: string;
  status: string;
  matchedAmount: number;
  confidenceScore: number;
  matchCriteria: Record<string, unknown>;
  matchedByUserId: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalOfId: string | null;
  createdAt: string;
}

export const MATCH_SELECT: string; // fragment SQL, colonnes ci-dessus, alias `m`
export function toReconciliationMatchView(row: ReconciliationMatchRow): ReconciliationMatchView;
export function loadMatchesFor(
  tx: TenantClient,
  column: 'statement_line_id' | 'bank_check_id',
  ids: readonly string[],
): Promise<Map<string, ReconciliationMatchView[]>>;
```

`loadMatchesFor` est une fonction **pure vis-à-vis de Nest** (elle reçoit le `tx`), donc
importable par `bank-statements` et `bank-checks` sans aucune dépendance de module.

---

## 4. Ports, jetons DI et modifications des modules existants

### Principe de composition transactionnelle (à lire avant tout le §4)

Le dépôt applique une convention stricte, qu'il faut respecter :

- les services **primitifs** (`InvoiceLedgerService`, `InvoiceWriterService`,
  `AllocationService.allocate`, `ReceiptIssuerService.issueForPaidInvoices`,
  `NumberingService.nextNumber`, `PaymentsQueryService.lock`, `PaymentsService.createInTx`)
  prennent **`tx: TenantClient` en premier paramètre** et n'ouvrent jamais de transaction ;
- les services **cas d'usage** (`PaymentsService.confirm`, `ReversalService.reverse`,
  `BankTransferDeclarationsService.approve`, `RemittancesService.deposit`) **ouvrent leur
  propre `prisma.withTenant`** et sont la frontière transactionnelle.

Or le contrat exige que **tous les effets d'une confirmation tiennent dans une seule
transaction**. Ces quatre cas d'usage sont donc, en l'état, **incomposables**. Le Lot 0
extrait pour chacun une variante `*InTx`, en suivant exactement le précédent déjà présent
dans le dépôt (`PaymentsService.createInTx`, extrait de `create` pour que
`CashReceiptsService` puisse composer). **Le corps métier n'est pas réécrit : il est
déplacé**, et la méthode publique d'origine devient un simple enrobage qui ouvre la
transaction et délègue. Aucun changement de comportement observable.

Effets **post-commit** (génération de quittance, notifications) : jamais dans la
transaction. On collecte des identifiants (`receiptIds`) pendant la transaction et on
appelle `scheduleGeneration` / `enqueue` **après** le `withTenant`, comme le fait déjà
`PaymentsService.transition`.

### 4.1 `RECONCILIATION_ENGINE` — le port central

C'est la réponse à « comment `bank-statements` déclenche le moteur sans dépendre de
`reconciliation` ». **Déclaré dans `bank-statements/domain/ports.ts` (Lot 0)**, implémenté
par `reconciliation`, injecté en `@Optional()` par `bank-statements`.

```ts
export const RECONCILIATION_ENGINE = Symbol('RECONCILIATION_ENGINE');

export interface ReconciliationRunResult {
  matched: number;
  suggested: number;
  unmatched: number;
  /** Quittances créées par les confirmations automatiques : à planifier APRÈS commit. */
  receiptIds: readonly string[];
}

export interface ReconciliationEngine {
  /**
   * Passe les lignes CREDIT non ignorées du relevé au moteur, dans la transaction
   * de l'appelant. Confirme immédiatement les correspondances EXACT si
   * `autoConfirmExact`, crée les SUGGESTED en PROPOSED, laisse le reste UNMATCHED.
   */
  runForStatement(
    tx: TenantClient,
    input: {
      organizationId: string;
      statementId: string;
      actorUserId: string | null;
      today: Date;
    },
  ): Promise<ReconciliationRunResult>;

  /** Effets hors transaction (quittances). Appelé après COMMIT, jamais dedans. */
  scheduleAfterCommit(organizationId: string, result: ReconciliationRunResult): Promise<void>;
}
```

- **Fournisseur** : `ReconciliationModule`, via
  `{ provide: RECONCILIATION_ENGINE, useExisting: ReconciliationEngineService }`, et
  `exports: [RECONCILIATION_ENGINE]`.
- **Consommateur** : `StatementImportService` (bank-statements), en
  `@Optional() @Inject(RECONCILIATION_ENGINE) private readonly engine: ReconciliationEngine | null = null`.
- **Comportement si absent** (Lot 2 livré seul, avant le Lot 3 — cas réel) : l'import
  réussit, les lignes sont créées, le relevé passe `PARSED`, et le rapport vaut
  `autoMatched: 0`, `suggested: 0`. `POST /reconcile` répond alors `202` avec
  `{ matched: 0, suggested: 0, unmatched: <nb lignes CREDIT non ignorées> }`. **Ne jamais
  lever d'erreur parce que le port est absent** : c'est ce qui rend le Lot 2 testable
  seul.

> **`ReconciliationModule` doit être `@Global()`.** Un `@Optional() @Inject(TOKEN)` ne
> résout que si le jeton est visible dans le contexte du module injecteur. Comme
> `BankStatementsModule` n'importe **pas** `ReconciliationModule` (c'est tout l'objet du
> port), la seule façon de rendre le jeton visible sans recréer le cycle est `@Global()`.
> C'est exactement le procédé déjà documenté dans `app.module.ts` pour les modules de
> phase 1 et 2.

### 4.2 Chèques : injection directe, **pas** de port

Question tranchée : **`reconciliation` importe `bank-checks`** et injecte
`BankChecksService` directement. Justification : la dépendance est strictement
**unidirectionnelle** (`bank-checks` n'appelle jamais `reconciliation`, cf. la règle du
`bounce` au §1). Un port ne se justifie que pour casser une bidirectionnalité ; en
introduire un ici n'apporterait qu'une indirection morte.

`BankChecksModule` est `@Global()` et exporte `BankChecksService`, de sorte que
`ReconciliationModule` n'a rien à déclarer dans `imports`. Méthode dédiée, **Lot 1** :

```ts
/**
 * DEPOSITED -> CLEARED déclenché par la confirmation d'un rapprochement.
 * Confirme le paiement du chèque et renvoie les quittances à planifier.
 */
async settleFromReconciliation(
  tx: TenantClient,
  input: {
    organizationId: string;
    bankCheckId: string;
    actorUserId: string | null;
    clearingDate: Date;
    today: Date;
  },
): Promise<{ paymentId: string | null; receiptIds: readonly string[] }>;
```

Elle valide la transition `DEPOSITED → CLEARED` (sinon
`BANK.CHECK_INVALID_TRANSITION`), écrit `cleared_at` / `clearing_date`, et confirme le
paiement via `PaymentsService.confirmInTx`. C'est **la même** méthode que celle
qu'appelle `POST /bank-checks/{id}/clear`, ce qui garantit que les deux chemins de
compensation prévus par le contrat produisent des effets identiques.

### 4.3 `payments` — deux variantes `*InTx` (Lot 0)

`PaymentsModule` est déjà `@Global()` et exporte `PaymentsService`, `ReversalService`,
`AllocationService`, `PaymentsQueryService` : **aucun `imports` à ajouter**, aucun port.

```ts
// PaymentsService
async confirmInTx(
  tx: TenantClient,
  organizationId: string,
  reader: PaymentReader,
  id: string,
  input: { valueDate?: Date; note?: string },
): Promise<{ id: string; receiptIds: string[] }>;

// ReversalService
async reverseInTx(
  tx: TenantClient,
  organizationId: string,
  reader: PaymentReader,
  paymentId: string,
  reason: string,
): Promise<{ originalId: string; reversalId: string; reopenedInvoiceIds: string[] }>;
```

Recette de refactorisation, sans changement de comportement :

- `confirmInTx` reçoit **exactement** le corps de la fonction passée aujourd'hui à
  `this.transition(...)` dans `confirm` (verrou `queries.lock`, `assertPaymentTransition`,
  `UPDATE payments`, `audit(...)`, `intentOf`/`modeOf`, `allocateAndQuit`). Sa valeur de
  retour `{ id, receiptIds }` est déjà la forme attendue par `transition`.
- `confirm` devient :
  `return this.transition(organizationId, reader, (tx) => this.confirmInTx(tx, organizationId, reader, id, input));`
- `reverseInTx` reçoit le corps du `withTenant` de `reverse` ; `reverse` ouvre la
  transaction, appelle `reverseInTx`, puis construit les deux `PaymentDetailView` et
  planifie les effets post-commit comme aujourd'hui.
- `allocateAndQuit` reste `private` : `reconciliation` ne l'appelle jamais directement.

### 4.4 `bank-transfers` — `approveInTx` + export (Lot 0)

`BankTransfersModule` n'est **pas** `@Global()` et n'exporte aujourd'hui que
`BankTransferQueryService`. Le Lot 0 ajoute `BankTransferDeclarationsService` à
`exports`, et `ReconciliationModule` déclare `imports: [BankTransfersModule]` — c'est la
seule dépendance de module explicite de la phase 6.

```ts
async approveInTx(
  tx: TenantClient,
  organizationId: string,
  reader: TransferReader,
  id: string,
  input: { approvedAmount?: bigint; reason?: string | null; statementLineId?: string | null },
): Promise<{ declarationId: string; paymentId: string; receiptIds: string[] }>;
```

Trois points de vigilance :

1. `approve` lit aujourd'hui les réglages **avant** d'ouvrir sa transaction
   (`this.paymentMethods.get(...)`). Dans `approveInTx`, les lire **dans** le `tx` :
   `tx.organization_settings.findUnique({ where: { organization_id }, select: { settings_json: true } })`
   puis `readOperationalSettings(...)`. La politique `confirmOnApproval` reste celle de
   `paymentMethods.bankTransfer.confirmOnApproval`.
2. Le contrat impose `SUBMITTED → MATCHED → APPROVED`. Or `DECLARATION_TRANSITIONS`
   déclare `MATCHED: []` avec le commentaire « réservé au rapprochement de la phase 6 ».
   Le Lot 0 ouvre donc `MATCHED: ['APPROVED', 'REJECTED', 'CANCELLED']` et ajoute
   `'MATCHED'` aux cibles de `SUBMITTED` et `UNDER_REVIEW`.
3. `approveInTx` renseigne `bank_transfer_declarations.matched_statement_line_id` avec
   `statementLineId` (la FK existe déjà en base et n'est aujourd'hui jamais écrite).

### 4.5 `cash` — `depositInTx` + export (Lot 0)

`CashModule` est déjà `@Global()` mais n'exporte pas `RemittancesService`. Le Lot 0
l'ajoute à `exports` et extrait :

```ts
async depositInTx(
  tx: TenantClient,
  organizationId: string,
  reader: PaymentReader,
  id: string,
  input: { bankAccountId: string; depositedAt: Date; depositSlipDocumentId?: string | null },
): Promise<{ remittanceId: string }>;
```

Le corps vient du `work` passé à `transition(...)` dans `deposit`. Rappel du contrat :
une remise passée `DEPOSITED` **n'a aucun effet sur les factures** (les reçus de caisse
ont déjà été imputés en phase 3). `reconciliation` ne touche donc ni `payments` ni
`billing` pour cette cible.

### 4.6 `documents` et stockage objet (Lot 0) — sans quoi l'import est impossible

Quatre ajouts, tous dans le module `documents` (qui est `@Global()` et exporte déjà
`DocumentsService` et `OBJECT_STORAGE`) :

```ts
// documents/domain/storage.port.ts — ajouter à l'interface ObjectStorage
getObject(objectKey: string): Promise<Buffer>;
```

```ts
// documents/application/documents.service.ts
/** Relit les octets d'un document de l'organisation courante (import de relevé). */
async readContent(
  tx: TenantClient,
  documentId: string,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string; sizeBytes: number }>;
```

- `S3ObjectStorage.getObject` : `GetObjectCommand` (déjà importé dans le fichier pour la
  signature d'URL), puis agrégation du flux en `Buffer`. Refuser au-delà de
  `BANK_STATEMENT_MAX_BYTES` en s'appuyant d'abord sur `headObject` → sinon
  `BANK.STATEMENT_FILE_TOO_LARGE` (413).
- `documents/domain/document-rules.ts` : étendre `ALLOWED_MIME_TYPES` avec
  `'text/csv'` et `'text/plain'` (MT940 est du texte brut), plafond
  `10 * MEGABYTE` ; ajouter les extensions correspondantes dans `EXTENSIONS`
  (`csv`, `txt`) ; ajouter `'bank_statement'` et `'bank_check'` à
  `RELATED_ENTITY_TYPES`.
- Les genres `document_kind` **existent déjà** : `BANK_STATEMENT` et `CHECK_IMAGE`.
  Aucun changement d'énumération.

**Flux d'import imposé** (conséquence des §0.6 et §0.7) :
`POST /documents/upload-url` → téléversement direct navigateur → `POST /documents`
(`kind: 'BANK_STATEMENT'`) → `POST /bank-accounts/{id}/statements/import`
avec `{ documentId, format? }`. L'API relit les octets par `readContent`, calcule le
SHA-256, détecte le format, analyse, contrôle l'équilibre, puis écrit.
**Ne pas introduire `multer`, ni `@UploadedFile`, ni un corps base64.**

### 4.7 `notifications` (Lot 1 uniquement)

`bank-checks` injecte l'enquêteur en optionnel, comme partout ailleurs :
`@Optional() @Inject(NOTIFICATION_ENQUEUER) private readonly enqueuer: NotificationEnqueuer | null = null`
(jeton `Symbol` défini dans `notifications/domain/ports.ts`). Appels **après commit**,
avec `dedupeKey` systématique. `reconciliation` et `bank-statements` n'envoient aucune
notification.

### 4.8 Récapitulatif des dépendances

| Consommateur    | Fournisseur       | Mécanisme                                        | Optionnel |
| :-------------- | :---------------- | :----------------------------------------------- | :-------- |
| bank-statements | reconciliation    | `RECONCILIATION_ENGINE` (Symbol)                 | **oui**   |
| bank-statements | documents         | `DocumentsService`, `OBJECT_STORAGE` (`@Global`) | non       |
| reconciliation  | bank-statements   | import TypeScript pur (types, normalisation)     | —         |
| reconciliation  | bank-checks       | `BankChecksService` (`@Global`)                  | non       |
| reconciliation  | payments          | `PaymentsService`, `ReversalService` (`@Global`) | non       |
| reconciliation  | bank-transfers    | `BankTransferDeclarationsService` via `imports:` | non       |
| reconciliation  | cash              | `RemittancesService` (`@Global`)                 | non       |
| bank-checks     | payments, billing | services `@Global`                               | non       |
| bank-checks     | notifications     | `NOTIFICATION_ENQUEUER` (Symbol)                 | **oui**   |

---

## 5. `state` (LineState) et `isDiscarded` — calcul et emplacement

**Confirmation du cadrage** : oui, ces deux calculs vivent dans **`bank-statements`**.
`state` est une propriété de la ligne, `isDiscarded` une propriété du relevé ; ni l'un ni
l'autre n'a besoin du moteur de score. `reconciliation` ne recalcule jamais `state` : il
met à jour `matched_amount` / `is_matched` et laisse `bank-statements` dériver.

### 5.1 `computeLineState` — `bank-statements/domain/line-state.ts` (Lot 2)

**L'ordre des tests est normatif** (un conflit est toujours tranché par le premier test
qui passe) :

```ts
export const LINE_STATES = [
  'UNMATCHED',
  'SUGGESTED',
  'PARTIALLY_MATCHED',
  'MATCHED',
  'IGNORED',
] as const;
export type LineState = (typeof LINE_STATES)[number];

export function computeLineState(input: {
  isIgnored: boolean;
  isMatched: boolean;
  amount: bigint;
  matchedAmount: bigint;
  proposedCount: number;
}): LineState {
  if (input.isIgnored) return 'IGNORED';
  if (input.isMatched) return 'MATCHED';
  if (input.matchedAmount > 0n && input.matchedAmount < input.amount) return 'PARTIALLY_MATCHED';
  if (input.proposedCount > 0) return 'SUGGESTED';
  return 'UNMATCHED';
}
```

`IGNORED` prime sur tout : une ligne ignorée après abandon d'import ne doit jamais
ressortir comme `MATCHED`. `PARTIALLY_MATCHED` prime sur `SUGGESTED` : de l'argent est
déjà rapproché, c'est l'information la plus forte.

### 5.2 Le même calcul en SQL (filtre `?state=`)

Le filtre doit être poussé en base (on pagine par keyset, on ne peut pas filtrer après
coup). `proposedCount` vient d'un `LEFT JOIN LATERAL` agrégé, jamais d'une sous-requête
corrélée par ligne dans le `SELECT` :

```sql
FROM bank_statement_lines l
LEFT JOIN LATERAL (
  SELECT count(*)::int AS proposed_count
    FROM reconciliation_matches m
   WHERE m.statement_line_id = l.id AND m.status = 'PROPOSED'
) p ON true
```

Prédicats exacts, un par valeur de `state` :

| `state`             | Prédicat `WHERE`                                                                                                                |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------ |
| `IGNORED`           | `l.is_ignored`                                                                                                                  |
| `MATCHED`           | `NOT l.is_ignored AND l.is_matched`                                                                                             |
| `PARTIALLY_MATCHED` | `NOT l.is_ignored AND NOT l.is_matched AND l.matched_amount > 0 AND l.matched_amount < l.amount`                                |
| `SUGGESTED`         | `NOT l.is_ignored AND NOT l.is_matched AND NOT (l.matched_amount > 0 AND l.matched_amount < l.amount) AND p.proposed_count > 0` |
| `UNMATCHED`         | `NOT l.is_ignored AND NOT l.is_matched AND l.matched_amount = 0 AND p.proposed_count = 0`                                       |

L'index partiel `bank_statement_lines_unmatched_idx` (`WHERE NOT is_matched AND NOT
is_ignored AND direction = 'CREDIT'`) sert la file de traitement manuel : la requête
`GET /bank-statement-lines?state=UNMATCHED` doit porter `direction = 'CREDIT'` quand le
client ne demande pas explicitement les débits, sans quoi l'index n'est pas retenu.

`ageDays` = `(CURRENT_DATE - l.operation_date)::int`, calculé en SQL.

### 5.3 `isDiscarded` — propriété dérivée du relevé

Définition du contrat : toutes les lignes ignorées, aucune rapprochée. Fragment SQL à
recopier tel quel dans `STATEMENT_SUMMARY_SELECT` :

```sql
(s.lines_count > 0
 AND s.matched_lines_count = 0
 AND NOT EXISTS (SELECT 1 FROM bank_statement_lines l
                  WHERE l.statement_id = s.id AND NOT l.is_ignored)) AS is_discarded
```

Le garde `lines_count > 0` évite qu'un relevé vide soit annoncé « abandonné ».

### 5.4 Abandon (`POST /bank-statements/{id}/discard`)

Dans une seule transaction : verrouiller le relevé, refuser avec
`BANK.STATEMENT_HAS_MATCHES` (409) s'il existe un `reconciliation_matches` en
`CONFIRMED` sur l'une de ses lignes ; sinon `UPDATE bank_statement_lines SET is_ignored =
true, ignore_reason = $motif` pour **toutes** les lignes non déjà ignorées. Le statut du
relevé **ne change pas** (l'énumération n'a pas de valeur d'abandon), aucune ligne n'est
supprimée. Audit `BANK_STATEMENT_DISCARDED`. Un second appel sur un relevé déjà abandonné
renvoie `BANK.STATEMENT_ALREADY_DISCARDED` (409).

### 5.5 `report` de `StatementDetail`

Il n'existe **aucune colonne** pour stocker l'`ImportReport`. Règle imposée :

- la réponse `201` de l'import renvoie le rapport complet, `linesInError` compris (il
  n'est vrai qu'à cet instant) ;
- en lecture (`GET /bank-statements/{id}`), `report` est **recalculé** :
  `linesAccepted = lines_count`, `linesIgnored` = nombre de lignes `is_ignored`,
  `linesInError: []`, `autoMatched` = nombre de lignes `is_matched`, `suggested` =
  nombre de lignes portant au moins un match `PROPOSED`.
- `linesInError` est toujours `[]` en lecture, **par construction** : une erreur de ligne
  fait échouer l'import en bloc, donc rien n'est créé. Ne pas inventer de table de
  stockage pour cela.

---

## 6. Score, normalisation de libellé, restriction des candidats

### 6.1 Fonctions pures, testables sans base

| Fichier                                         | Lot   | Contenu                                            |
| :---------------------------------------------- | :---- | :------------------------------------------------- |
| `bank-statements/domain/label-normalization.ts` | **2** | `normalizeLabel(raw: string): string`              |
| `reconciliation/domain/reference-parser.ts`     | 3     | `extractInvoiceReferences(text: string): string[]` |
| `reconciliation/domain/scoring.ts`              | 3     | `scoreCandidate(...)`, `labelSimilarity(...)`      |

`normalizeLabel` vit dans **`bank-statements`** et non dans `reconciliation`, parce que
son résultat est **persisté** dans `bank_statement_lines.normalized_label` au moment de
l'import (le Lot 2 en a besoin, le Lot 3 l'importe). C'est la seule implémentation
autorisée : le Lot 3 **ne doit pas** en réécrire une variante.

```ts
/**
 * Majuscules, accents retirés, ponctuation supprimée, mentions bancaires courantes
 * retirées, espaces normalisés. Réutilise foldSearchText() de shared/search/search-text.ts
 * pour le repli des accents, puis passe en majuscules.
 */
export function normalizeLabel(raw: string): string;

/** Mots vides bancaires retirés du libellé avant comparaison. */
export const BANK_NOISE_WORDS: readonly string[];
// VIR, VIREMENT, VRST, VERSEMENT, DE, DU, PAR, REF, REFERENCE, CHQ, CHEQUE,
// REMISE, DEPOT, RECU, PAIEMENT, LOYER, MR, MME, M, SARL, SA, ETS
```

`pg_trgm` est indisponible (décision n° 5 du contrat) : **aucune similarité n'est
calculée en SQL**. `labelSimilarity(a, b): number` renvoie un réel dans `[0, 1]`, calculé
par indice de Dice sur les bigrammes des libellés normalisés, ou par recouvrement de
jetons — au choix de l'implémenteur, mais **déterministe, sans dépendance externe, et
couvert par des tests unitaires** dans `apps/api/test/unit/reconciliation.spec.ts`.

### 6.2 Barème (recopié du contrat, total plafonné à 100)

```ts
export interface ScoreBreakdown {
  amount: number; // 50 si égalité au franc ; 35 si écart <= amountTolerancePercent ; sinon candidat ÉCARTÉ
  date: number; // 20 si écart < 3 j ; 10 si écart < 10 j ; sinon 0
  label: number; // 0..20, round(labelSimilarity * 20)
  declaration: number; // 10 si une déclaration de virement en attente du même montant existe
}
export interface ScoredCandidate {
  target: MatchTargetRef;
  score: number; // somme, bornée à 100
  criteria: Record<string, unknown>; // -> reconciliation_matches.match_criteria
}
```

Un écart de montant supérieur à la tolérance **écarte le candidat** : il ne produit pas
un score faible, il disparaît de la liste. `match_criteria` enregistre le détail
(`ScoreBreakdown`, écart de montant en francs, écart de jours, libellés comparés,
référence trouvée) afin qu'un gestionnaire comprenne la suggestion.

### 6.3 Règle EXACT et référence structurée

Format : `LOY-{YYYYMM}-{seq}`, `seq` sur 5 chiffres. Vérifié dans le dépôt :
`SEQUENCE_FORMATS.RENT_INVOICE = { prefix: 'LOY', scope: 'MONTHLY', padding: 5 }`
(`numbering/domain/sequence-kind.ts`), attribué par `InvoiceWriterService.issue()` à la
transition `DRAFT → ISSUED`, et c'est **ce même numéro de facture** que
`GET /invoices/{id}/payment-instructions` donne au locataire comme référence de virement.

**Aucun analyseur de référence n'existe aujourd'hui dans le dépôt** : le Lot 3 le crée.

```ts
/** Repère LOY-202609-00001 et la variante compacte LOY20260900001, insensible à la casse. */
export const INVOICE_REFERENCE_PATTERN = /LOY-?(\d{6})-?(\d{5,})/gi;
export function extractInvoiceReferences(text: string): string[]; // -> forme canonique LOY-YYYYMM-NNNNN
```

Chercher dans `label` **et** `end_to_end_reference`. Les trois conditions du contrat sont
cumulatives : référence trouvée **et** montant identique au franc **et** date d'opération
dans la fenêtre `dateWindowDays`. Alors seulement : `match_type EXACT`, `status
CONFIRMED`, `confidence_score 100`, effets appliqués immédiatement dans la même
transaction — et uniquement si `autoConfirmExact` est vrai ; sinon la correspondance naît
`SUGGESTED` / `PROPOSED` avec le score 100.

### 6.4 Articulation base / application (jamais de balayage complet)

`reconciliation/application/candidate-repository.ts` restreint **en base**, le score est
calculé **en application** sur ce petit ensemble. Pour chaque ligne CREDIT non ignorée :

1. borne de montant `[amount * (1 - tol), amount]` — les index
   `bank_statement_lines_amount_idx` et les index de montant des tables cibles sont
   utilisables ;
2. borne de date `[operationDate - dateWindowDays, operationDate + dateWindowDays]` ;
3. filtre de statut par cible : `payments` en `PENDING_VERIFICATION`,
   `bank_transfer_declarations` en `SUBMITTED`/`UNDER_REVIEW`, `bank_checks` en
   `DEPOSITED`, `cash_remittances` en `DEPOSITED` ;
4. `LIMIT 50` par type de cible, tri par proximité de montant puis de date.

Le libellé **n'intervient jamais dans la clause `WHERE`** : il ne sert qu'au score, en
mémoire, sur ces 200 candidats au maximum. C'est la traduction exacte de l'arbitrage
« candidats restreints en base par montant et fenêtre de dates, similarité en
application ». Pour un relevé de N lignes, viser **une requête par type de cible et par
lot de lignes**, pas une requête par ligne.

---

## 7. Codes d'erreur à ajouter (Lot 0, `shared/errors/error-codes.ts`)

Forme d'une entrée : `'BANK.XXX': { status: 404, message: 'Texte français.' }`.
Le **statut HTTP d'un code est figé** ; seul le message peut évoluer.

Sept codes `BANK.*` existent déjà et concernent le **virement déclaré** :
`BANK.NOT_FOUND`, `BANK.PROOF_ALREADY_USED`, `BANK.PROOF_NOT_FOUND`,
`BANK.INVALID_TRANSITION`, `BANK.TRANSFER_DISABLED`, `BANK.BENEFICIARY_ACCOUNT_INVALID`,
`BANK.APPROVED_AMOUNT_REASON_REQUIRED`. **Ne jamais les réutiliser** pour la phase 6 :
`BANK.NOT_FOUND` signifie « déclaration de virement introuvable » et
`BANK.INVALID_TRANSITION` porte le même sens métier. Tous les codes ci-dessous sont
nouveaux et sans doublon.

```ts
// --- Phase 6 : relevés bancaires ---------------------------------------
'BANK.STATEMENT_NOT_FOUND':            { status: 404, message: 'Relevé bancaire introuvable.' },
'BANK.STATEMENT_LINE_NOT_FOUND':       { status: 404, message: 'Ligne de relevé introuvable.' },
'BANK.STATEMENT_FORMAT_UNKNOWN':       { status: 422, message: "Format de relevé non reconnu : aucun adaptateur ne sait lire ce fichier." },
'BANK.STATEMENT_PARSE_FAILED':         { status: 422, message: "Le relevé n'a pas pu être analysé." },
'BANK.STATEMENT_BALANCE_MISMATCH':     { status: 422, message: "Relevé déséquilibré : le solde de clôture ne correspond pas aux mouvements. Import refusé." },
'BANK.STATEMENT_CURRENCY_UNSUPPORTED': { status: 422, message: 'Seule la devise XAF est acceptée sur un relevé.' },
'BANK.STATEMENT_ALREADY_IMPORTED':     { status: 409, message: 'Ce fichier a déjà été importé sur ce compte bancaire.' },
'BANK.STATEMENT_EMPTY':                { status: 422, message: 'Le relevé ne contient aucune écriture.' },
'BANK.STATEMENT_PERIOD_INVALID':       { status: 422, message: 'La période du relevé est invalide : la date de début doit précéder la date de fin.' },
'BANK.STATEMENT_FILE_TOO_LARGE':       { status: 413, message: 'Fichier de relevé trop volumineux.' },
'BANK.STATEMENT_HAS_MATCHES':          { status: 409, message: "Ce relevé porte des rapprochements confirmés : l'abandon est impossible." },
'BANK.STATEMENT_ALREADY_DISCARDED':    { status: 409, message: 'Ce relevé a déjà été abandonné.' },
'BANK.STATEMENT_ACCOUNT_MISMATCH':     { status: 422, message: "Le document fourni n'appartient pas à ce compte bancaire." },

// --- Phase 6 : rapprochement -------------------------------------------
'BANK.MATCH_NOT_FOUND':                { status: 404, message: 'Rapprochement introuvable.' },
'BANK.MATCH_TARGET_REQUIRED':          { status: 422, message: 'Un rapprochement porte exactement une cible.' },
'BANK.MATCH_TARGET_INVALID':           { status: 422, message: "La cible n'est pas dans un état permettant le rapprochement." },
'BANK.MATCH_INVALID_TRANSITION':       { status: 409, message: 'Transition de rapprochement impossible.' },
'BANK.MATCH_ALREADY_CONFIRMED':        { status: 409, message: 'Ce rapprochement est déjà confirmé.' },
'BANK.MATCH_REASON_REQUIRED':          { status: 422, message: 'Le motif est obligatoire.' },
'BANK.OVER_MATCHED':                   { status: 409, message: "Le total rapproché dépasse le montant de la ligne ou celui de la cible." },
'BANK.LINE_IGNORED':                   { status: 409, message: 'Cette ligne est ignorée : elle ne peut pas être rapprochée.' },

// --- Phase 6 : chèques --------------------------------------------------
'BANK.CHECK_NOT_FOUND':                { status: 404, message: 'Chèque introuvable.' },
'BANK.CHECK_ALREADY_REGISTERED':       { status: 409, message: 'Ce chèque est déjà enregistré pour cette banque.' },
'BANK.CHECK_INVALID_TRANSITION':       { status: 409, message: "Transition impossible pour ce chèque." },
'BANK.CHECK_REASON_REQUIRED':          { status: 422, message: 'Le motif est obligatoire.' },
'BANK.CHECK_DEPOSIT_ACCOUNT_INVALID':  { status: 422, message: 'Compte de dépôt invalide ou inactif.' },
'BANK.CHECK_DATES_INVALID':            { status: 422, message: "La date de dépôt ne peut pas précéder la date d'émission." },
```

`BANK.STATEMENT_ALREADY_IMPORTED` doit porter dans `details` l'identifiant du relevé
existant (`{ statementId }`), et `BANK.STATEMENT_BALANCE_MISMATCH` l'écart constaté
(`{ expected, actual, difference }`) : le contrat l'exige explicitement.

---

## 8. `AUDIT_OPERATIONS`, configuration et réglages (Lot 0)

### 8.1 Opérations d'audit

À ajouter à la fin de `AUDIT_OPERATIONS` (`audit/domain/audit-entry.ts`), après le bloc
Phase 5, avec le commentaire de section attendu. Convention du fichier :
clé = valeur, `{ENTITÉ}_{VERBE_AU_PASSÉ}`.

```ts
// --- Phase 6 : rapprochement bancaire et chèques -----------------------
BANK_STATEMENT_IMPORTED: 'BANK_STATEMENT_IMPORTED',
BANK_STATEMENT_PARSE_FAILED: 'BANK_STATEMENT_PARSE_FAILED',
BANK_STATEMENT_RECONCILED: 'BANK_STATEMENT_RECONCILED',
BANK_STATEMENT_DISCARDED: 'BANK_STATEMENT_DISCARDED',
BANK_STATEMENT_LINE_IGNORED: 'BANK_STATEMENT_LINE_IGNORED',
BANK_STATEMENT_LINE_RESTORED: 'BANK_STATEMENT_LINE_RESTORED',
RECONCILIATION_MATCH_PROPOSED: 'RECONCILIATION_MATCH_PROPOSED',
RECONCILIATION_MATCH_CONFIRMED: 'RECONCILIATION_MATCH_CONFIRMED',
RECONCILIATION_MATCH_REJECTED: 'RECONCILIATION_MATCH_REJECTED',
RECONCILIATION_MATCH_REVERSED: 'RECONCILIATION_MATCH_REVERSED',
BANK_CHECK_RECEIVED: 'BANK_CHECK_RECEIVED',
BANK_CHECK_DEPOSITED: 'BANK_CHECK_DEPOSITED',
BANK_CHECK_CLEARED: 'BANK_CHECK_CLEARED',
BANK_CHECK_BOUNCED: 'BANK_CHECK_BOUNCED',
BANK_CHECK_CANCELLED: 'BANK_CHECK_CANCELLED',
BANK_CHECK_RETURNED: 'BANK_CHECK_RETURNED',
BANK_CHECK_BOUNCE_FEE_INVOICED: 'BANK_CHECK_BOUNCE_FEE_INVOICED',
```

`entityType` = nom de table exact : `'bank_statements'`, `'bank_statement_lines'`,
`'reconciliation_matches'`, `'bank_checks'`. `action` = `'IMPORT'` pour l'import d'un
relevé, `'STATE_TRANSITION'` pour toutes les transitions, `'CREATE'` pour la saisie d'un
chèque et la création d'un rapprochement manuel. Toujours via
`await audit(this.auditService, tx, { ... })`, **dans** la transaction.

### 8.2 Variables d'environnement (`shared/config/config.schema.ts`, zod)

```ts
RECONCILIATION_SUGGESTION_THRESHOLD: z.coerce.number().int().min(50).max(95).default(75),
RECONCILIATION_DATE_WINDOW_DAYS:     z.coerce.number().int().positive().default(15),
BANK_STATEMENT_MAX_BYTES:            z.coerce.number().int().positive().default(10_485_760),
CHECK_CLEARING_ALERT_DAYS:           z.coerce.number().int().positive().default(15),
CHECK_ALERT_CRON_ENABLED:            booleanish.default(false),
CHECK_ALERT_CRON_PATTERN:            z.string().default('0 7 * * *'),
CHECK_ALERT_CRON_TIMEZONE:           z.string().default('Africa/Brazzaville'),
```

Reporter les quatre premières dans **`apps/api/.env.example`** (le fichier de référence,
organisé en blocs `# --- Section ---`), sous un bloc
`# --- Rapprochement bancaire (phase 6) ---`. Lecture uniquement par
`AppConfigService.get('...')` ; **jamais `process.env`** dans le code applicatif.

### 8.3 Réglages d'organisation

Les valeurs d'environnement ne sont que des **défauts d'instance** ; le réglage par
organisation prime. Étendre `shared/settings/operational-settings.ts` :

```ts
export interface ReconciliationSettings {
  suggestionThreshold: number; // défaut 75, borné 50..95
  dateWindowDays: number; // défaut 15
  amountTolerancePercent: number; // défaut 2
  autoConfirmExact: boolean; // défaut true
  checkClearingAlertDays: number; // défaut 15 (jours ouvrés)
  bounceFeeAmount: number; // défaut 0
}

export interface OperationalSettings {
  billing: BillingSettings;
  cash: CashSettings;
  messaging: MessagingSettings;
  paymentMethods: PaymentMethodsSettings;
  reconciliation: ReconciliationSettings; // <- ajout
}
```

`readOperationalSettings` doit renvoyer la section complète avec ses défauts même quand
`settings_json.reconciliation` est absent (cas de toutes les organisations existantes),
et `mergeOperationalSettings` accepter un patch partiel. Ajouter les classes
`ReconciliationSettingsDto` et `UpdateReconciliationSettingsDto` dans
`organizations/presentation/dto/operational-settings.dto.ts`, câblées par
`@ValidateNested()` + `@Type(() => ...)` comme les sections existantes.

**Lecture depuis les trois modules** : il n'existe **aucun port** pour les réglages. Le
procédé du dépôt est de lire la table dans sa propre transaction puis de parser :

```ts
const settings = await tx.organization_settings.findUnique({
  where: { organization_id: organizationId },
  select: { settings_json: true },
});
const { reconciliation } = readOperationalSettings(settings?.settings_json);
```

Ne pas injecter `OrganizationsService` (il n'est consommé par aucun autre module).

---

## 9. Câblage dans `app.module.ts` (Lot 0)

Les trois modules sont ajoutés **à la fin** du tableau `imports`, après
`MobileSyncModule`, avec un commentaire de phase comme pour toutes les phases
précédentes :

```ts
    // Phase 6 — rapprochement bancaire et chèques. `bank-statements` ne connaît
    // pas `reconciliation` : il déclenche le moteur par le port
    // RECONCILIATION_ENGINE, que `reconciliation` publie en `@Global()`. Le
    // rejet d'un chèque ne touche jamais un rapprochement, ce qui garde le
    // graphe acyclique.
    BankChecksModule,
    BankStatementsModule,
    ReconciliationModule,
```

Décorateurs de module imposés :

| Module                 | `@Global()` | `imports`               | `exports`                    |
| :--------------------- | :---------- | :---------------------- | :--------------------------- |
| `BankChecksModule`     | **oui**     | —                       | `BankChecksService`          |
| `BankStatementsModule` | oui         | —                       | `BankStatementsQueryService` |
| `ReconciliationModule` | **oui**     | `[BankTransfersModule]` | `RECONCILIATION_ENGINE`      |

`@Global()` sur `ReconciliationModule` est **obligatoire** (§4.1) ; sur
`BankChecksModule` il évite à `ReconciliationModule` un `imports` supplémentaire.
`BankTransfersModule` est le seul module non global consommé, d'où l'unique `imports`.

Le Lot 0 crée les **trois `*.module.ts` vides mais valides** (aucun contrôleur, aucun
fournisseur) et les enregistre. Conséquence voulue : **aucun autre lot ne touche
`app.module.ts`**, et l'application démarre après le Lot 0.

---

## 10. Séquences transactionnelles normatives

### 10.0 Invariant fondateur

**Seul un rapprochement `CONFIRMED` modifie quoi que ce soit.** Un `PROPOSED` ne touche
ni `matched_amount`, ni `is_matched`, ni la cible, ni une facture. C'est ce qui permet à
plusieurs suggestions concurrentes de coexister sur une même ligne sans se marcher
dessus, et ce qui rend `reject` sans effet de bord.

### 10.1 Confirmation (`POST /reconciliation-matches/{id}/confirm` et création manuelle)

Une seule `prisma.withTenant`, dans cet ordre :

1. verrouiller le rapprochement puis **la ligne** (`SELECT ... FOR UPDATE`), toujours
   dans cet ordre pour éviter tout interblocage avec le moteur d'import ;
2. exiger `status = 'PROPOSED'` (sinon `BANK.MATCH_INVALID_TRANSITION`, ou
   `BANK.MATCH_ALREADY_CONFIRMED` si déjà `CONFIRMED`) ; refuser si la ligne est ignorée
   (`BANK.LINE_IGNORED`) ;
3. contrôle de sur-rapprochement, **des deux côtés** :
   `Σ matched_amount des matchs CONFIRMED de la ligne + celui-ci <= ligne.amount`
   **et** `Σ matched_amount des matchs CONFIRMED de la cible + celui-ci <= cible.montant`
   → sinon `BANK.OVER_MATCHED` (409) ;
4. effets selon la cible :
   - **DECLARATION** : `approveInTx(...)` avec `statementLineId` — la déclaration passe
     `MATCHED` puis `APPROVED`, le paiement est créé ou confirmé selon
     `confirmOnApproval`, imputation et quittance suivent le circuit existant ;
   - **PAYMENT** (`PENDING_VERIFICATION`) : `PaymentsService.confirmInTx(...)` —
     imputation et quittance en découlent ;
   - **CHECK** (`DEPOSITED`) : `BankChecksService.settleFromReconciliation(...)` — le
     chèque passe `CLEARED` et son paiement est confirmé ;
   - **REMITTANCE** : `RemittancesService.depositInTx(...)` — **aucun effet sur les
     factures** ;
     toute cible qui n'est pas dans l'état attendu → `BANK.MATCH_TARGET_INVALID` (422) ;
5. `UPDATE reconciliation_matches SET status='CONFIRMED', confirmed_at=now(),
confirmed_by_user_id=$user` ;
6. ligne : `matched_amount = matched_amount + $montant`, puis
   `is_matched = (matched_amount >= amount)` ;
7. relevé : **recalculer** `matched_lines_count` plutôt que l'incrémenter —
   `UPDATE bank_statements SET matched_lines_count = (SELECT count(*) FROM
bank_statement_lines WHERE statement_id = $1 AND is_matched)`. Un recalcul est
   idempotent et ne dérive jamais ;
8. si plus aucune ligne `CREDIT` n'est ni rapprochée ni ignorée : `status='RECONCILED'`,
   `reconciled_at=now()` ;
9. `audit(..., RECONCILIATION_MATCH_CONFIRMED, 'reconciliation_matches', id)`.

Après COMMIT seulement : `receipts.scheduleGeneration(organizationId, receiptIds)` via la
valeur remontée par les `*InTx`.

### 10.2 Annulation (`.../reverse`) et rejet (`.../reject`)

**Reverse** (motif obligatoire, sinon `BANK.MATCH_REASON_REQUIRED`), transaction unique :
passer l'original en `REVERSED` + `reversed_at` ; **créer l'écriture miroir** (mêmes
ligne, cible, `matched_amount` et `match_type`, `status='REVERSED'`,
`reversal_of_id = original.id`) ; décrémenter `matched_amount` de la ligne et recalculer
`is_matched` ; recalculer `matched_lines_count` ; si le paiement avait été confirmé **par
ce rapprochement**, `ReversalService.reverseInTx(...)` — ce qui crée le paiement miroir,
dé-impute et rouvre la facture en `ISSUED`/`OVERDUE`. Réponse :
`{ reversed, mirror }`. Les deux écritures étant `REVERSED`, l'index unique partiel
`WHERE status = 'CONFIRMED'` n'est pas sollicité : aucun conflit possible.

**Reject** : `PROPOSED → REJECTED`, `rejected_at`, `rejection_reason`. Aucune autre
écriture (cf. §10.0) : la ligne redevient simplement libre.

### 10.3 Machine à états des chèques

Transitions **exhaustives** — toute autre combinaison lève
`BANK.CHECK_INVALID_TRANSITION` :

```
RECEIVED  -> DEPOSITED | CANCELLED | RETURNED
DEPOSITED -> CLEARED   | BOUNCED
CLEARED   -> BOUNCED
BOUNCED, CANCELLED, RETURNED : terminaux
```

Arbitrages imposés, parce que le contrat ne les tranche pas explicitement :

- **`CANCELLED` et `RETURNED` ne partent que de `RECEIVED`** (« annulation avant
  dépôt » ; le chèque rendu au tireur n'a pas été remis en banque). Tous deux passent le
  paiement en `CANCELLED`.
- **`BOUNCED` part de `DEPOSITED` ou de `CLEARED`**, et les deux cas diffèrent :
  - depuis `CLEARED`, le paiement est `CONFIRMED` → `ReversalService.reverseInTx(...)`,
    la facture est rouverte : c'est la contre-passation du contrat ;
  - depuis `DEPOSITED`, le paiement est encore `PENDING_VERIFICATION` et n'a **aucune
    imputation** (l'imputation n'a lieu qu'à la confirmation) → il passe simplement
    `REJECTED` via `PaymentsService.rejectInTx(...)`. **Le Lot 0 extrait `rejectInTx`
    avec exactement la même recette que `confirmInTx`** (§4.3).

**Frais de rejet** (`bounceFeeAmount` du réglage, ou montant fourni dans le corps) :
ligne `invoice_line_type = 'OTHER'` ajoutée via `InvoiceWriterService.appendLine` puis
`recomputeTotals`, sur **la première facture du bail en statut `DRAFT` dont
`period_start` est postérieur à la date de rejet**. La facture d'origine n'est **jamais**
modifiée. Si aucune facture `DRAFT` n'existe, le rejet réussit quand même :
`bounce_fee_amount` est enregistré sur le chèque, aucune ligne n'est créée, et la réponse
porte `feeInvoiceId: null`. Ne pas inventer de facture pour loger les frais.

### 10.4 Alerte quotidienne des chèques sans issue

Pas de `@nestjs/schedule` dans ce dépôt : le procédé est un **job répétable BullMQ**,
calqué sur `billing/infrastructure/billing-cron.scheduler.ts` (`upsertJobScheduler`, id
de job fixe, `OnModuleInit`/`OnModuleDestroy`, désactivé si `config.isTest` ou si le
drapeau est faux ; Redis indisponible ⇒ cron silencieusement inactif, jamais une erreur
d'API). Fichier : `bank-checks/infrastructure/check-alerts.scheduler.ts`, file
`bank-checks-daily`, job `bank-checks-alert-cron`.

Sélection : chèques `DEPOSITED` dont `deposit_date` remonte à plus de
`checkClearingAlertDays` **jours ouvrés**. Aucun utilitaire de jours ouvrés n'est
exporté aujourd'hui (seul `businessHoursElapsed` existe, dans `bank-transfers`, avec
`isBusinessDay` privé). Créer `bank-checks/domain/business-days.ts` avec la **même
règle** que le dépôt — lundi à samedi ouvrés, **dimanche seul jour chômé**, calcul en UTC :

```ts
export function businessDaysBetween(from: Date, to: Date): number;
```

Notification via `NOTIFICATION_ENQUEUER`, après commit, avec
`dedupeKey: 'bank-check-uncleared:{checkId}:{YYYY-MM-DD}'` pour qu'un même chèque ne
génère qu'une alerte par jour. Ajouter le code `BANK_CHECK_UNCLEARED` à
`MESSAGE_TEMPLATE_CODES` (`notifications/domain/template-codes.ts`) **et** la paire
`WHATSAPP` + `SMS` correspondante à `SYSTEM_TEMPLATES`
(`notifications/domain/template-catalog.ts`), en respectant la forme d'entrée existante
(`code`, `channel`, `name`, `body` avec des variables `{{nommées}}`,
`providerTemplateName`, `providerTemplateLang`, `variables: string[]`). Ne pas utiliser
le catalogue `TEMPLATE_CODES` en notation pointée (`auth.otp_login`) : c'est un vestige
de la phase 0.

---

## 11. Tests et RLS

### 11.1 RLS (Lot 0)

`apps/api/test/integration/rls-isolation.int-spec.ts` :

```ts
const PHASE6_TENANT_TABLES = [
  'bank_statements',
  'bank_statement_lines',
  'bank_checks',
  'reconciliation_matches',
] as const;
```

avec le même contrôle `missing`/`phase` que `PHASE5_TENANT_TABLES`. Dans
`rls-matrix.ts`, ajouter les `TABLE_HINTS` pour les colonnes `NOT NULL` que le
générateur ne sait pas inventer et les `CHECK` à satisfaire :

- `bank_statements` : `period_start` / `period_end` tels que `period_start < period_end` ;
- `bank_statement_lines` : `line_number`, `direction` (`'CREDIT'::statement_line_direction`),
  `operation_date`, `amount`, `label` ;
- `bank_checks` : `check_number`, `drawer_name`, `drawer_bank_code`, `drawer_bank_name`,
  `amount`, `issue_date` ;
- `reconciliation_matches` : `matched_amount`, et en `DYNAMIC_TABLE_HINTS` le
  `statement_line_id` **plus au moins une** des quatre colonnes de cible
  (`num_nonnulls >= 1`), via `typed(anchors.known.get('...'), 'uuid')`.

### 11.2 Tests unitaires (pas de base, `jest.unit.config.js`)

`apps/api/test/unit/` — fichiers `bank-statements.spec.ts`, `reconciliation.spec.ts`,
`bank-checks.spec.ts`, important en relatif (`../../src/...`). Cibles prioritaires, toutes
pures : `normalizeLabel`, `labelSimilarity`, `scoreCandidate` (chaque palier du barème),
`extractInvoiceReferences` (forme longue, forme compacte, casse mélangée, faux positifs),
`computeLineState` (les cinq états et leurs priorités), le contrôle d'équilibre, les
adaptateurs CSV/MT940 sur échantillons, `businessDaysBetween`, les tables de transitions
chèque.

### 11.3 Tests d'intégration et échantillons

Les `*.int-spec.ts` **sont** les tests HTTP de bout en bout (`startTestApp()` + le
client `api()` de `helpers.ts`) : `phase6-statements.int-spec.ts`,
`phase6-reconciliation.int-spec.ts`, `phase6-checks.int-spec.ts`, plus
`phase6-fixtures.ts` sur le modèle des `phaseN-fixtures.ts`.

**Il n'existe aujourd'hui aucun répertoire d'échantillons de fichiers** (aucun `.csv`,
aucun `.sta`, aucun chargeur `readFileSync`). Le Lot 2 crée
`apps/api/test/integration/fixtures/` et y dépose un échantillon par adaptateur
(`bgfi.csv`, `lcb.csv`, `ecobank.csv`, `uba.csv`, `sample.mt940`), chargés par
`readFileSync(join(__dirname, 'fixtures', '<nom>'))`. Chaque nouvelle banque = un
descripteur JSON + un échantillon, **sans code**.

---

## 12. Points d'attention — risques d'incohérence entre agents

Ces agents ne se voient pas. Chaque point ci-dessous est un endroit où deux
implémentations plausibles divergent silencieusement et ne se recollent qu'au moment de
l'intégration, trop tard.

### 12.1 Un seul propriétaire par symbole partagé

| Symbole                                                                  | Fichier unique                                       | Lot | Qui l'importe |
| :----------------------------------------------------------------------- | :--------------------------------------------------- | :-- | :------------ |
| `CanonicalStatement`, `BankStatementAdapter`                             | `bank-statements/domain/canonical-statement.ts`      | 0   | 2             |
| `RECONCILIATION_ENGINE`, `ReconciliationEngine`                          | `bank-statements/domain/ports.ts`                    | 0   | 2, 3          |
| `MatchTargetType`, `resolveTarget`                                       | `reconciliation/domain/match-target.ts`              | 0   | 1, 2, 3       |
| `ReconciliationMatchView`, `toReconciliationMatchView`, `loadMatchesFor` | `reconciliation/application/reconciliation-views.ts` | 0   | 1, 2, 3       |
| `LineState`, `computeLineState`                                          | `bank-statements/domain/line-state.ts`               | 2   | 2, 3          |
| `normalizeLabel`, `BANK_NOISE_WORDS`                                     | `bank-statements/domain/label-normalization.ts`      | 2   | 2, 3          |

**Interdiction formelle de recréer localement l'un de ces symboles.** Le piège le plus
probable : le Lot 3 réécrit sa propre normalisation de libellé, différente de celle qui a
rempli `normalized_label` à l'import — le score s'effondre sans qu'aucun test ne rougisse.

### 12.2 Forme des réponses

Les DTO de sortie sont **exactement** ceux du §Types du contrat : mêmes noms de champs,
même nullabilité. Un champ nul se sérialise `null`, il n'est **jamais** omis. Trois
conversions, jamais improvisées :

- **montants** : `BigInt` partout dans le domaine et Prisma ; conversion **au seul
  niveau des vues** par `toJsonAmount()` / `toJsonAmountOrNull()`
  (`shared/money/amount.ts`). Jamais de `Number(...)` nu — la garde existe pour qu'une
  valeur hors `MAX_SAFE_INTEGER` lève au lieu de tronquer ;
- **dates SQL `DATE`** (`operation_date`, `issue_date`, `period_start`, `deposit_date`) :
  `toIsoDate()` → `YYYY-MM-DD` ;
- **instants `TIMESTAMPTZ`** (`confirmed_at`, `reversed_at`, `imported_at`) :
  `toIsoInstant()` ; `created_at`, non nul, se sérialise par `row.created_at.toISOString()`.

Convention de nommage des mappeurs : `to<Chose>View(row: <Chose>Row): <Chose>View`, les
`Row` en `snake_case` calqués sur les colonnes, les `View` en `camelCase`. Une vue
« détail » compose la vue « résumé » (`...toStatementSummary(row)`) au lieu de
redéclarer ses champs.

### 12.3 Pagination

Toute liste paginée passe par `buildKeyset(filters, this.config.get('CURSOR_SECRET'),
params.length + 1, '<alias>')` puis `keysetOrderBy('<alias>')` et `buildPage(rows,
keyset.limit, secret)`. Deux conséquences non négociables : la requête doit lire
`keyset.fetch` lignes (`limit + 1`), et **chaque ligne retournée doit porter `id` et
`created_at`**, sans quoi `buildPage` ne compile pas. Les paramètres SQL se lient par le
helper `bind()` local, jamais par concaténation.

### 12.4 Pièges propres à cette phase

- **Ne jamais inventer de valeur d'énumération.** Pas de `REGISTERED`, pas de
  `REJECTED` sur un chèque, pas de statut d'abandon de relevé. Les valeurs sont celles
  du DDL, reprises au §Énumérations du contrat.
- **`currency = 'XAF'`** est écrit explicitement sur les quatre tables.
- **Phase 6 n'implémente que `CSV` et `MT940`.** `CAMT053`, `OFX`, `XLSX`, `PDF_OCR`
  existent dans l'énumération et restent inutilisés : ne pas les coder, ne pas les
  annoncer dans `GET /bank-statement-adapters`.
- **Dédoublonnage d'import** : s'appuyer sur la contrainte
  `bank_statements_checksum_uk (organization_id, bank_account_id, file_checksum_sha256)`
  et **traiter la violation** (`P2002`) pour renvoyer `BANK.STATEMENT_ALREADY_IMPORTED`
  avec l'identifiant existant. Un simple `SELECT` préalable laisse passer deux imports
  simultanés.
- **Refus en bloc** : équilibre, devise et doublon se contrôlent **avant** la moindre
  écriture. En cas d'échec, zéro ligne créée — y compris zéro `bank_statements`.
- **Lignes `DEBIT`** : conservées pour l'équilibre, exclues du moteur. Seul un
  rapprochement manuel peut les viser.
- **RLS** : toute écriture et toute lecture métier passent par
  `prisma.withTenant(organizationId, userId, ...)`. C'est le seul endroit qui pose
  `app.current_organization_id` ; une requête hors de ce cadre ne voit rien ou fuit.
- **Audit dans la transaction, notifications et quittances après le commit.** Ne jamais
  appeler `enqueue(...)` ni `scheduleGeneration(...)` à l'intérieur du `withTenant`.
- **Ne pas toucher aux fichiers d'un autre lot.** Un besoin manquant dans le socle se
  signale ; il ne se corrige pas en douce dans `error-codes.ts`.

### 12.5 Définition de terminé

- **Lot 0** : l'application démarre, les trois modules vides sont enregistrés, les
  variantes `confirmInTx` / `rejectInTx` / `reverseInTx` / `approveInTx` / `depositInTx`
  existent et **les tests d'intégration des phases 3 à 5 passent sans modification** —
  c'est la preuve que la refactorisation n'a rien changé au comportement.
- **Lot 1** : cycle de vie complet d'un chèque, frais de rejet sur la facture suivante,
  alerte quotidienne, `reconciliation` non requis.
- **Lot 2** : import CSV + MT940, refus en bloc, abandon, `state` et `isDiscarded`
  corrects, **moteur absent** (le port n'est pas fourni) et tout fonctionne.
- **Lot 3** : moteur branché, les quatre cibles, confirmation/rejet/annulation,
  tableau de bord, suggestions à la demande.

Enfin, `docs/api/openapi.json` est régénéré en fin de phase : le contrat indique qu'il
remplace le document dès l'export.
