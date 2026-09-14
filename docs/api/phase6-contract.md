# Contrat d'API — Phase 6 (rapprochement bancaire et chèques)

Complète les contrats des phases 0 à 5 (mêmes conventions). Tables : `bank_statements`, `bank_statement_lines`, `reconciliation_matches`, `bank_checks`, `bank_accounts`, `payments`, `payment_allocations`, `bank_transfer_declarations`, `cash_remittances`, `rent_invoices`, `receipts`, `documents`, `notifications`, `audit_logs`. Aucune modification du DDL, aucune extension PostgreSQL nouvelle. Remplacé par `openapi.json` dès export.

## Arbitrages de ce contrat (ils priment sur le plan de phases)

1. **Les statuts sont ceux du schéma, pas ceux du plan.** Un chèque suit `RECEIVED → DEPOSITED → CLEARED`, avec `BOUNCED` en cas d'impayé, plus `CANCELLED` et `RETURNED`. Le plan parlait de `REGISTERED` et `REJECTED` : ces valeurs n'existent pas.
2. **Une ligne de relevé n'a pas de colonne de statut.** Son état est dérivé et exposé en lecture sous `state` : `UNMATCHED`, `SUGGESTED` (au moins un rapprochement `PROPOSED`), `PARTIALLY_MATCHED` (`matched_amount` inférieur au montant), `MATCHED` (`is_matched`), `IGNORED` (`is_ignored`).
3. **Type et statut d'un rapprochement sont deux choses distinctes.** `match_type` dit comment il a été trouvé (`EXACT`, `SUGGESTED`, `MANUAL`, `PARTIAL`, `SPLIT`), `status` dit où il en est (`PROPOSED`, `CONFIRMED`, `REJECTED`, `REVERSED`). Un rapprochement exact naît directement `CONFIRMED`, un suggéré naît `PROPOSED`.
4. **Aucune suppression de rapprochement.** L'annulation écrit `reversed_at`, passe le statut à `REVERSED` et crée une écriture miroir via `reversal_of_id`. La route `DELETE` du plan devient `POST …/reverse`.
5. **Pas d'extension `pg_trgm`.** La similarité des libellés est calculée dans l'application, sur un ensemble de candidats restreint en base par le montant et une fenêtre de dates, en s'appuyant sur les index existants. Cela évite une migration d'extension sur une base de production.
6. **Un chèque rejeté ne modifie jamais un paiement confirmé.** Il déclenche la contre-passation prévue en phase 3, ce qui rouvre la facture. Les frais de rejet éventuels partent en ligne `OTHER` sur la facture suivante, jamais en modification de la facture d'origine.

## Énumérations (valeurs exactes du DDL, aucune autre n'existe)

- `StatementFormat` : CSV, MT940, CAMT053, OFX, XLSX, PDF_OCR. La phase 6 n'implémente que CSV et MT940 ; les autres valeurs restent inutilisées.
- `BankStatementStatus` : UPLOADED, PARSING, PARSED, RECONCILING, RECONCILED, FAILED. **Il n'existe pas de statut d'abandon** : voir la règle d'abandon plus bas.
- `StatementLineDirection` : CREDIT, DEBIT.
- `MatchType` : EXACT, SUGGESTED, MANUAL, PARTIAL, SPLIT. `MatchStatus` : PROPOSED, CONFIRMED, REJECTED, REVERSED.
- `CheckStatus` : RECEIVED, DEPOSITED, CLEARED, BOUNCED, CANCELLED, RETURNED.
- `LineState` et le type de cible d'un rapprochement ne sont **pas** des colonnes : ce sont des valeurs dérivées, calculées à la lecture et exposées par l'API.

## Import de relevés

- **Interface** `BankStatementAdapter` : `detect(file): boolean`, `parse(file): CanonicalStatement`. Une seule forme canonique en sortie, quelle que soit la banque.

```ts
interface CanonicalStatementLine {
  lineNumber: number;
  direction: 'CREDIT' | 'DEBIT';
  operationDate: string; // ISO, date d'opération
  valueDate?: string;
  amount: number; // entier XAF, toujours positif
  label: string; // libellé brut
  counterpartyName?: string;
  counterpartyAccount?: string;
  bankReference?: string;
  endToEndReference?: string; // référence de bout en bout si la banque la fournit
  operationCode?: string;
  runningBalance?: number;
  raw: Record<string, unknown>; // ligne d'origine, conservée telle quelle
}

interface CanonicalStatement {
  statementReference?: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: 'XAF';
  lines: CanonicalStatementLine[];
}
```

- **Adaptateurs livrés** : `BGFI`, `LCB`, `ECOBANK`, `UBA` en CSV, plus `MT940`. Chaque adaptateur CSV est **déclaratif** : un descripteur JSON versionné donne le séparateur, l'encodage, le format de date, la position des colonnes, le signe des montants et les lignes d'en-tête à ignorer. Ajouter une banque revient à ajouter un descripteur et un échantillon de test, sans écrire de code.
- **Détection** : `format` peut être imposé dans la requête ; sinon chaque adaptateur est interrogé par `detect` et le premier qui reconnaît le fichier l'emporte. Aucun adaptateur : 422 `BANK.STATEMENT_FORMAT_UNKNOWN`.
- **Contrôle d'intégrité** : `openingBalance + Σ crédits − Σ débits = closingBalance`. En cas d'écart, l'import est refusé **en bloc**, aucune ligne n'est créée : 422 `BANK.STATEMENT_BALANCE_MISMATCH` avec l'écart constaté.
- **Doublon** : l'empreinte SHA-256 du fichier est stockée dans `file_checksum_sha256` ; un même fichier réimporté sur le même compte renvoie 409 `BANK.STATEMENT_ALREADY_IMPORTED` avec l'identifiant du relevé existant, sans rien créer.
- **Devise** : une ligne dans une devise autre que XAF est refusée à l'import du relevé entier : 422 `BANK.STATEMENT_CURRENCY_UNSUPPORTED`.
- **Rapport d'import** : `{ statementId, linesAccepted, linesIgnored, linesInError: { lineNumber, reason }[], autoMatched, suggested }`. Le fichier d'origine est conservé dans `documents` et rattaché au relevé.
- **Abandon d'un import erroné** : `POST /v1/bank-statements/{id}/discard` n'est accepté que si aucune ligne n'est rapprochée en `CONFIRMED`, sinon 409 `BANK.STATEMENT_HAS_MATCHES`. Comme l'énumération ne comporte aucun statut d'abandon, l'effet est le suivant : toutes les lignes passent `is_ignored = true` avec un motif, le relevé reste dans son statut d'analyse, et l'API expose le champ dérivé `isDiscarded` à vrai (toutes les lignes ignorées, aucune rapprochée). Aucune ligne n'est supprimée.

## Moteur de rapprochement

Il ne traite que les lignes **au crédit** et non ignorées. Les débits sont conservés pour l'équilibre du relevé et restent hors périmètre, sauf rapprochement manuel.

| Niveau      | Critère                                                                                                                                                                                                                                                                                                                 | Résultat                                                                    |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| **Exact**   | Une référence structurée (`LOY-{YYYYMM}-{seq}`, y compris la variante compacte sans tirets et insensible à la casse) est trouvée dans le libellé ou la référence de bout en bout, **et** le montant est identique au franc près, **et** la date d'opération tombe dans une fenêtre de 15 jours autour de la transaction | `match_type EXACT`, `status CONFIRMED`, score 100, application immédiate    |
| **Suggéré** | Score supérieur ou égal au seuil configuré (défaut 75)                                                                                                                                                                                                                                                                  | `match_type SUGGESTED`, `status PROPOSED`, en attente de validation humaine |
| **Manuel**  | Aucun critère automatique                                                                                                                                                                                                                                                                                               | La ligne reste `UNMATCHED` et part dans la file de traitement manuel        |

**Calcul du score**, sur 100 points : montant identique 50 points, écart inférieur ou égal à 2 % 35 points, au-delà 0 et le candidat est écarté ; proximité de date 20 points à moins de 3 jours, 10 points à moins de 10 jours ; similarité entre le nom du payeur et celui du locataire 20 points au maximum, calculée en application sur les libellés normalisés (majuscules, accents retirés, ponctuation et mentions bancaires courantes supprimées) ; existence d'une déclaration de virement en attente pour le même montant 10 points. Les critères retenus sont enregistrés dans `match_criteria` afin qu'un gestionnaire comprenne pourquoi une suggestion lui est proposée.

**Cibles possibles** d'un rapprochement (la table porte quatre colonnes de clé étrangère distinctes, `payment_id`, `declaration_id`, `bank_check_id` et `remittance_id` ; `targetType` et `targetId` sont déduits à la lecture, rien n'est stocké en double) : un `payment` (virement ou chèque déjà confirmé), une `bank_transfer_declarations` en attente, un `bank_checks` déposé, une `cash_remittances` déposée en banque. Une ligne peut être rapprochée de plusieurs cibles et une cible de plusieurs lignes : les rapprochements partiels portent `match_type PARTIAL` ou `SPLIT`, et la somme des `matched_amount` confirmés ne peut jamais dépasser ni le montant de la ligne, ni celui de la cible (409 `BANK.OVER_MATCHED`).

**Effets d'une confirmation**, dans une seule transaction :

- Cible `bank_transfer_declarations` encore en attente : la déclaration passe `MATCHED` puis `APPROVED`, le paiement est créé ou confirmé selon la politique `confirmOnApproval` de la phase 4, les imputations et la quittance suivent le circuit existant.
- Cible `payments` en `PENDING_VERIFICATION` : le paiement passe `CONFIRMED`, avec imputation et quittance.
- Cible `bank_checks` en `DEPOSITED` : le chèque passe `CLEARED` et son paiement est confirmé.
- Cible `cash_remittances` : la remise passe `DEPOSITED`, sans effet sur les factures, les reçus ayant déjà été imputés en phase 3.
- Dans tous les cas : `matched_amount` et `is_matched` de la ligne sont mis à jour, `matched_lines_count` du relevé aussi, et `audit_logs` reçoit la transition.

**Annulation** : `POST /v1/reconciliation-matches/{id}/reverse { reason }` passe le rapprochement en `REVERSED`, libère la ligne, et contre-passe le paiement s'il avait été confirmé par ce rapprochement, ce qui rouvre la facture en `ISSUED` ou `OVERDUE`. Motif obligatoire, audité.

## Chèques

| Étape                  | Route                                            | Statut chèque | Statut paiement                                                                              |
| :--------------------- | :----------------------------------------------- | :------------ | :------------------------------------------------------------------------------------------- |
| Saisie à la réception  | `POST /v1/bank-checks`                           | `RECEIVED`    | `PENDING_VERIFICATION` créé                                                                  |
| Dépôt en banque        | `POST …/{id}/deposit`                            | `DEPOSITED`   | inchangé                                                                                     |
| Compensation           | `POST …/{id}/clear` ou rapprochement d'une ligne | `CLEARED`     | `CONFIRMED`, imputation et quittance                                                         |
| Impayé                 | `POST …/{id}/bounce`                             | `BOUNCED`     | contre-passation, facture rouverte, frais éventuels en ligne `OTHER` sur la facture suivante |
| Annulation avant dépôt | `POST …/{id}/cancel`                             | `CANCELLED`   | `CANCELLED`                                                                                  |
| Chèque rendu au tireur | `POST …/{id}/return`                             | `RETURNED`    | `CANCELLED`                                                                                  |

Unicité `(organization_id, drawer_bank_code, check_number)` : un même chèque ne peut pas être saisi deux fois, 409 `BANK.CHECK_ALREADY_REGISTERED`. Une alerte quotidienne signale tout chèque `DEPOSITED` depuis plus de quinze jours ouvrés sans issue, via le pipeline de notifications. Le rejet notifie le gestionnaire.

## Paramètres d'organisation (`organization_settings.settings_json.reconciliation`)

```ts
interface ReconciliationSettings {
  suggestionThreshold: number; // défaut 75, entre 50 et 95
  dateWindowDays: number; // défaut 15
  amountTolerancePercent: number; // défaut 2
  autoConfirmExact: boolean; // défaut true
  checkClearingAlertDays: number; // défaut 15 jours ouvrés
  bounceFeeAmount: number; // défaut 0, refacturé au locataire si non nul
}
```

## Routes

| Méthode | Route                                                                                                   | Rôle       | Sortie                                                                                          |
| :------ | :------------------------------------------------------------------------------------------------------ | :--------- | :---------------------------------------------------------------------------------------------- |
| POST    | `/v1/bank-accounts/{id}/statements/import`                                                              | ACCOUNTANT | `201 ImportReport` ; 409 `BANK.STATEMENT_ALREADY_IMPORTED` ; 422 formats et équilibre           |
| GET     | `/v1/bank-accounts/{id}/statements?limit=&cursor=`                                                      | ACCOUNTANT | `200 { items: StatementSummary[], pageInfo }`                                                   |
| GET     | `/v1/bank-statements/{id}`                                                                              | ACCOUNTANT | `200 StatementDetail`                                                                           |
| POST    | `/v1/bank-statements/{id}/discard`                                                                      | ACCOUNTANT | `200 StatementDetail` ; 409 `BANK.STATEMENT_HAS_MATCHES`                                        |
| POST    | `/v1/bank-statements/{id}/reconcile`                                                                    | ACCOUNTANT | `202 { matched, suggested, unmatched }` (relance du moteur)                                     |
| GET     | `/v1/bank-statements/{id}/lines?state=&limit=&cursor=`                                                  | ACCOUNTANT | `200 { items: StatementLine[], pageInfo }`                                                      |
| GET     | `/v1/bank-statement-lines?bankAccountId=&state=&olderThanDays=&minAmount=&maxAmount=&q=&limit=&cursor=` | ACCOUNTANT | `200 { items: StatementLine[], pageInfo }`                                                      |
| GET     | `/v1/bank-statement-lines/{id}/suggestions`                                                             | ACCOUNTANT | `200 { items: MatchSuggestion[] }` (calcul à la demande, non persisté)                          |
| PATCH   | `/v1/bank-statement-lines/{id}`                                                                         | ACCOUNTANT | `200 StatementLine` (`isIgnored`, `ignoreReason` seulement)                                     |
| POST    | `/v1/reconciliation-matches`                                                                            | ACCOUNTANT | `201 ReconciliationMatch` (manuel, `status CONFIRMED`) ; 409 `BANK.OVER_MATCHED`                |
| POST    | `/v1/reconciliation-matches/{id}/confirm`                                                               | ACCOUNTANT | `200 ReconciliationMatch`                                                                       |
| POST    | `/v1/reconciliation-matches/{id}/reject`                                                                | ACCOUNTANT | `200 ReconciliationMatch` (motif obligatoire, la ligne redevient libre)                         |
| POST    | `/v1/reconciliation-matches/{id}/reverse`                                                               | ACCOUNTANT | `200 { reversed: ReconciliationMatch, mirror: ReconciliationMatch }`                            |
| GET     | `/v1/reconciliation/dashboard?bankAccountId=`                                                           | MANAGER    | `200 { unmatchedCount, unmatchedAmount, oldestUnmatchedDays, matchedRatioBps, byAccount: […] }` |
| POST    | `/v1/bank-checks`                                                                                       | ACCOUNTANT | `201 BankCheck` ; 409 `BANK.CHECK_ALREADY_REGISTERED`                                           |
| GET     | `/v1/bank-checks?status=&tenantId=&dueBefore=&limit=&cursor=`                                           | ACCOUNTANT | `200 { items: BankCheck[], pageInfo }`                                                          |
| GET     | `/v1/bank-checks/{id}`                                                                                  | ACCOUNTANT | `200 BankCheckDetail`                                                                           |
| POST    | `/v1/bank-checks/{id}/deposit`                                                                          | ACCOUNTANT | `200 BankCheckDetail`                                                                           |
| POST    | `/v1/bank-checks/{id}/clear`                                                                            | ACCOUNTANT | `200 BankCheckDetail`                                                                           |
| POST    | `/v1/bank-checks/{id}/bounce`                                                                           | ACCOUNTANT | `200 BankCheckDetail` (motif obligatoire)                                                       |
| POST    | `/v1/bank-checks/{id}/cancel`                                                                           | ACCOUNTANT | `200 BankCheckDetail`                                                                           |
| POST    | `/v1/bank-checks/{id}/return`                                                                           | ACCOUNTANT | `200 BankCheckDetail`                                                                           |
| GET     | `/v1/bank-statement-adapters`                                                                           | ACCOUNTANT | `200 { items: { code, label, format, sampleAvailable }[] }`                                     |

## Types

```ts
type LineState = 'UNMATCHED' | 'SUGGESTED' | 'PARTIALLY_MATCHED' | 'MATCHED' | 'IGNORED';

interface StatementSummary {
  id: string;
  bankAccountId: string;
  format: StatementFormat;
  status: BankStatementStatus;
  isDiscarded: boolean;
  statementReference: string | null;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  linesCount: number;
  matchedLinesCount: number;
  totalCreditAmount: number;
  totalDebitAmount: number;
  importedAt: string;
  importedByUserId: string | null;
}
interface StatementDetail extends StatementSummary {
  documentId: string | null;
  fileChecksumSha256: string | null;
  parsedAt: string | null;
  reconciledAt: string | null;
  parseError: string | null;
  report: ImportReport | null;
}
interface ImportReport {
  statementId: string;
  linesAccepted: number;
  linesIgnored: number;
  linesInError: { lineNumber: number; reason: string }[];
  autoMatched: number;
  suggested: number;
}
interface StatementLine {
  id: string;
  statementId: string;
  bankAccountId: string;
  lineNumber: number;
  direction: 'CREDIT' | 'DEBIT';
  operationDate: string;
  valueDate: string | null;
  amount: number;
  matchedAmount: number;
  state: LineState;
  label: string;
  normalizedLabel: string | null;
  counterpartyName: string | null;
  bankReference: string | null;
  endToEndReference: string | null;
  isIgnored: boolean;
  ignoreReason: string | null;
  matches: ReconciliationMatch[];
  ageDays: number;
}
interface MatchSuggestion {
  targetType: 'PAYMENT' | 'DECLARATION' | 'CHECK' | 'REMITTANCE';
  targetId: string;
  label: string;
  amount: number;
  date: string;
  confidenceScore: number;
  criteria: Record<string, unknown>;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
}
interface ReconciliationMatch {
  id: string;
  statementLineId: string;
  targetType: 'PAYMENT' | 'DECLARATION' | 'CHECK' | 'REMITTANCE';
  targetId: string;
  matchType: MatchType;
  status: MatchStatus;
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
interface BankCheckInput {
  tenantId: string;
  leaseId?: string;
  invoiceId?: string;
  checkNumber: string;
  drawerName: string;
  drawerBankCode: string;
  drawerBankName: string;
  drawerAccountNumber?: string;
  amount: number;
  issueDate: string;
  receivedAt?: string;
  imageDocumentId?: string;
  notes?: string;
}
interface BankCheck extends BankCheckInput {
  id: string;
  status: CheckStatus;
  paymentId: string | null;
  depositDate: string | null;
  depositBankAccountId: string | null;
  clearingDate: string | null;
  bouncedAt: string | null;
  bounceReason: string | null;
  bounceFeeAmount: number;
  receivedByUserId: string | null;
  ageDays: number;
}
interface BankCheckDetail extends BankCheck {
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  matches: ReconciliationMatch[];
}
```

## Variables d'environnement nouvelles

`RECONCILIATION_SUGGESTION_THRESHOLD=75`, `RECONCILIATION_DATE_WINDOW_DAYS=15`, `BANK_STATEMENT_MAX_BYTES=10485760`, `CHECK_CLEARING_ALERT_DAYS=15`.
