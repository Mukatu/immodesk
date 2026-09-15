# Contrat d'API — Phase 7 (gestion d'agence, relevés de gérance, portail bailleur)

Complète les contrats des phases 0 à 6 (mêmes conventions). Tables : `management_mandates`, `commissions`, `expenses`, `owner_statements`, `owner_statement_lines`, `owner_payouts`, `landlords`, `properties`, `bank_accounts`, `rent_invoices`, `payments`, `receipts`, `documents`, `notifications`, `message_logs`, `organizations`, `organization_settings`, `users`, `audit_logs`. Aucune modification du DDL. Remplacé par `openapi.json` dès export.

## Énumérations (valeurs exactes du DDL, aucune autre n'existe)

- `MandateStatus` : DRAFT, ACTIVE, SUSPENDED, TERMINATED, EXPIRED. `MandateScope` : FULL_MANAGEMENT, RENT_COLLECTION_ONLY, LETTING_ONLY.
- `CommissionBasis` : RATE_BPS_ON_RENT_COLLECTED, RATE_BPS_ON_RENT_DUE, FLAT_AMOUNT_PER_MONTH, FLAT_AMOUNT_PER_LEASE. `CommissionStatus` : PENDING, ACCRUED, INVOICED, SETTLED, CANCELLED.
- `ExpenseStatus` : DRAFT, SUBMITTED, APPROVED, PAID, REBILLED, REJECTED, CANCELLED. `ExpenseBearer` : LANDLORD, TENANT, ORGANIZATION. `ExpenseCategory` : REPAIR, MAINTENANCE, PLUMBING, ELECTRICITY, CLEANING, SECURITY, UTILITY_BILL, TAX, INSURANCE, SYNDIC_FEE, LEGAL_FEE, TRAVEL, SUPPLIES, OTHER.
- `StatementStatus` (relevé de gérance) : DRAFT, ISSUED, SENT, PAID, CANCELLED. **Il n'existe ni VALIDATED ni APPROVED** : « valider » signifie passer `ISSUED`.
- `OwnerStatementLineType` : RENT_COLLECTED, CHARGE_COLLECTED, COMMISSION, EXPENSE, VAT, DEPOSIT_HELD, CARRY_FORWARD, ADJUSTMENT, OTHER.
- `PayoutStatus` : PENDING, APPROVED, PROCESSING, PAID, FAILED, CANCELLED. `PaymentMethod` (reversement) : CASH, MOBILE_MONEY, BANK_TRANSFER, BANK_CHECK.

## Arbitrages de ce contrat (ils priment sur le plan de phases)

1. **Un relevé par bailleur, par bien et par période.** L'unicité en base porte sur `(organization_id, landlord_id, property_id, period_start)`, pas sur le mandat. Deux conséquences. Un mandat couvrant plusieurs biens produit **un relevé consolidé** avec `property_id` nul. Et comme PostgreSQL ne considère jamais deux valeurs nulles comme égales, cette contrainte **ne protège pas** les relevés consolidés : la campagne doit refuser applicativement toute seconde génération pour un même couple bailleur et période, par 409 `AGENCY.STATEMENT_PERIOD_ALREADY_GENERATED`.
2. **Aucune ligne de relevé n'est négative.** `owner_statement_lines.amount` est contraint positif ; le sens vient de `is_debit`. Une commission et une dépense sont des débits, un loyer encaissé est un crédit. Seuls `net_payable_amount` et `carry_forward_amount`, au niveau du relevé, peuvent être négatifs.
3. **La commission ne se calcule que sur l'encaissé.** Base par défaut `RATE_BPS_ON_RENT_COLLECTED` : le taux du mandat s'applique aux paiements `CONFIRMED` de la période, jamais aux montants facturés. Un paiement contre-passé après coup annule sa commission par une commission miroir (`reversal_of_id`), jamais par modification.
4. **La TVA de commission est une ligne distincte.** `commissions.vat_rate_bps` vaut 1800 par défaut, et le relevé porte une ligne `VAT` séparée de la ligne `COMMISSION`.
5. **Un solde négatif se reporte, il ne s'appelle pas.** Si dépenses et commission dépassent les encaissements, `net_payable_amount` est négatif, aucun reversement n'est possible, et le montant est repris en ligne `CARRY_FORWARD` du relevé suivant. L'appel de fonds au bailleur n'est pas dans le périmètre.
6. **Pas de valeur « virement international ».** Un reversement à un bailleur en diaspora est un `BANK_TRANSFER` vers un `bank_accounts` portant IBAN et BIC. Si le bailleur n'a aucune coordonnée exploitable, le reversement est refusé par 409 `AGENCY.PAYOUT_MISSING_BANK_DETAILS` et un gestionnaire est alerté.
7. **Le compte du portail bailleur n'a aucun rôle d'organisation.** Il est identifié par `landlords.user_id` et n'accède qu'en lecture à ses propres données. Toute écriture est refusée par 403 `AGENCY.PORTAL_READ_ONLY`. Ce rôle dérivé est nommé `LANDLORD_PORTAL`.

## Mandats

- Création par un `OWNER` : bailleur, périmètre (`scope`), un ou plusieurs biens, dates, base et taux de commission, TVA, jour de reversement. Référence `MDT-{YYYY}-{seq}`. Statut initial `DRAFT`, activation explicite.
- **Un bien ne peut dépendre que d'un seul mandat actif à la fois.** La base ne l'impose pas : contrôle applicatif à l'activation et au rattachement d'un bien, 409 `AGENCY.PROPERTY_ALREADY_MANDATED` avec l'identifiant du mandat en cause.
- Commission par défaut : 10 % (1000 bps) pour une organisation `INDEPENDENT_MANAGER`, valeur du référentiel ; modifiable par mandat.
- Résiliation : date d'effet et motif obligatoires, statut `TERMINATED`, `terminated_at`. Les relevés déjà émis restent intacts. Le mois de résiliation donne lieu à un dernier relevé au prorata des encaissements réellement perçus avant la date d'effet. Suspension : `SUSPENDED`, aucune commission calculée pendant la suspension.

## Dépenses

- Saisie par un `MANAGER` : bien, lot ou bail concerné, catégorie, libellé, fournisseur, montant, TVA, date, justificatif (`invoice_document_id`), porteur (`borne_by`). Référence `DEP-{YYYYMM}-{seq}`. Statut `DRAFT` puis `SUBMITTED`.
- Validation par un `ACCOUNTANT` : `APPROVED`, `approved_by_user_id`, `approved_at`. Seules les dépenses `APPROVED` ou `PAID` dont `borne_by = LANDLORD` et `is_deductible_from_rent` entrent dans un relevé. Une dépense `REJECTED` exige un motif.
- Une dépense refacturable au locataire (`is_rebillable`) part en ligne de facture `REPAIR_REBILL` et non dans le relevé du bailleur, pour ne pas la compter deux fois.
- Une dépense déjà rattachée à un relevé émis n'est plus modifiable : 409 `AGENCY.EXPENSE_LOCKED`.

## Campagne mensuelle et relevés

- **Cron `agency-monthly`**, le jour `payout_day` du mandat (défaut 10), pour la période du mois civil précédent. Idempotent et rejouable. Pour chaque mandat actif ou résilié dans la période :
  1. Commissions : une ligne `commissions` par paiement `CONFIRMED` de la période rattaché à un bail du périmètre, statut `ACCRUED`, avec sa TVA.
  2. Relevé : `owner_statements` numéroté `REL-{YYYYMM}-{seq}`, statut `DRAFT`, avec les totaux (`rent_collected_amount`, `charges_collected_amount`, `commission_amount`, `commission_vat_amount`, `expenses_amount`, `deposits_held_amount`, `carry_forward_amount`, `net_payable_amount`), le taux d'occupation et le taux de recouvrement de la période.
  3. Lignes : un `RENT_COLLECTED` par paiement, un `COMMISSION` et un `VAT` par commission, un `EXPENSE` par dépense éligible, un `CARRY_FORWARD` si le relevé précédent était négatif, chacun rattaché à sa source (`payment_id`, `commission_id`, `expense_id`).
  4. Rattachement : `commissions.owner_statement_id` et `expenses.owner_statement_id` sont renseignés, ce qui empêche toute reprise sur un relevé ultérieur.
- **Machine à états** : `DRAFT` → `ISSUED` (validation par un `OWNER`, génération du PDF, numéro figé) → `SENT` (message au bailleur remis) → `PAID` (reversement exécuté). `DRAFT` ou `ISSUED` → `CANCELLED` avec motif, ce qui libère commissions et dépenses pour le relevé suivant. Un relevé `SENT` ou `PAID` ne s'annule pas : 409 `AGENCY.STATEMENT_NOT_CANCELLABLE`.
- Le PDF suit le circuit existant : worker Puppeteer, gabarit de relevé de gérance, stockage dans `documents`, lien signé. L'envoi passe par le pipeline de messagerie, WhatsApp puis repli SMS, avec un modèle `OWNER_STATEMENT_READY`. Pour un bailleur en diaspora, l'email est ajouté aux canaux si `landlords.email` est renseigné.

## Reversements

- `POST /v1/owner-payouts` sur un relevé `ISSUED` ou `SENT` au solde strictement positif. Référence `REV-{YYYYMM}-{seq}`, statut `PENDING`, méthode proposée d'après `landlords.payout_method` et le compte par défaut du bailleur, frais et porteur de frais renseignés.
- Validation par un `OWNER` : `APPROVED`, `approved_by_user_id`, `approved_at`. Exécution par un `ACCOUNTANT` : `PROCESSING` puis `PAID` avec preuve (`proof_document_id`) et référence externe ; en Mobile Money, l'exécution passe par `MobileMoneyProvider` et `momo_transaction_id`. Échec : `FAILED` avec motif, nouvelle tentative possible sans recréer le reversement.
- Le relevé passe `PAID` et `settled_at` est renseigné quand le reversement est `PAID`. Les lignes du relevé ne sont jamais modifiées rétroactivement.
- Un relevé ne peut porter qu'un seul reversement non annulé : 409 `AGENCY.PAYOUT_ALREADY_EXISTS`.

## Portail bailleur et onboarding du gestionnaire indépendant

- **Invitation** : `POST /v1/management-mandates/{id}/landlord-invitation` envoie au bailleur un lien d'activation par WhatsApp, tracé dans `message_logs`. À l'activation par OTP, un `users` est créé et lié à `landlords.user_id`. Le jeton d'accès porte le rôle dérivé `LANDLORD_PORTAL` et l'identifiant du bailleur, sans appartenance à `organization_members`.
- **Routes du portail**, toutes en lecture seule et limitées au bailleur authentifié : ses relevés, ses reversements, ses encaissements confirmés, ses quittances. Un bailleur qui consulte l'identifiant d'un autre reçoit 404, jamais 403, conformément à la règle générale.
- **Onboarding** : `POST /v1/organizations/independent-manager/onboarding` crée en une transaction l'organisation `INDEPENDENT_MANAGER`, le bailleur, le bien et le mandat avec la commission par défaut, et renvoie les identifiants créés. Le parcours vise moins de dix minutes sur mobile.

## Routes

| Méthode | Route                                                                        | Rôle            | Sortie                                                                                                                           |
| :------ | :--------------------------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/v1/management-mandates`                                                    | OWNER           | `201 Mandate`                                                                                                                    |
| GET     | `/v1/management-mandates?status=&landlordId=&propertyId=&limit=&cursor=`     | MANAGER         | `200 { items: MandateSummary[], pageInfo }`                                                                                      |
| GET     | `/v1/management-mandates/{id}`                                               | MANAGER         | `200 MandateDetail`                                                                                                              |
| PATCH   | `/v1/management-mandates/{id}`                                               | OWNER           | `200 Mandate`                                                                                                                    |
| POST    | `/v1/management-mandates/{id}/activate`                                      | OWNER           | `200 Mandate` ; 409 `AGENCY.PROPERTY_ALREADY_MANDATED`                                                                           |
| POST    | `/v1/management-mandates/{id}/suspend`                                       | OWNER           | `200 Mandate` (motif obligatoire)                                                                                                |
| POST    | `/v1/management-mandates/{id}/terminate`                                     | OWNER           | `200 Mandate` (date d'effet et motif obligatoires)                                                                               |
| POST    | `/v1/management-mandates/{id}/properties`                                    | OWNER           | `200 MandateDetail` ; 409 `AGENCY.PROPERTY_ALREADY_MANDATED`                                                                     |
| POST    | `/v1/management-mandates/{id}/landlord-invitation`                           | MANAGER         | `202 { notificationId, invitationStatus }`                                                                                       |
| POST    | `/v1/expenses`                                                               | MANAGER         | `201 Expense`                                                                                                                    |
| GET     | `/v1/expenses?status=&propertyId=&landlordId=&from=&to=&limit=&cursor=`      | ACCOUNTANT      | `200 { items: Expense[], pageInfo }`                                                                                             |
| PATCH   | `/v1/expenses/{id}`                                                          | MANAGER         | `200 Expense` ; 409 `AGENCY.EXPENSE_LOCKED`                                                                                      |
| POST    | `/v1/expenses/{id}/submit`                                                   | MANAGER         | `200 Expense`                                                                                                                    |
| POST    | `/v1/expenses/{id}/approve`                                                  | ACCOUNTANT      | `200 Expense`                                                                                                                    |
| POST    | `/v1/expenses/{id}/reject`                                                   | ACCOUNTANT      | `200 Expense` (motif obligatoire)                                                                                                |
| GET     | `/v1/commissions?mandateId=&landlordId=&period=&status=&limit=&cursor=`      | OWNER           | `200 { items: Commission[], pageInfo, totals }`                                                                                  |
| POST    | `/v1/owner-statements/runs`                                                  | ACCOUNTANT      | `202 { runId }`                                                                                                                  |
| GET     | `/v1/owner-statements/runs/{runId}`                                          | ACCOUNTANT      | `200 { status, created, skipped, errors }`                                                                                       |
| GET     | `/v1/owner-statements?landlordId=&mandateId=&period=&status=&limit=&cursor=` | ACCOUNTANT      | `200 { items: StatementSummary[], pageInfo }`                                                                                    |
| GET     | `/v1/owner-statements/{id}`                                                  | ACCOUNTANT      | `200 StatementDetail`                                                                                                            |
| POST    | `/v1/owner-statements/{id}/issue`                                            | OWNER           | `200 StatementDetail` (PDF mis en file, envoi déclenché)                                                                         |
| POST    | `/v1/owner-statements/{id}/cancel`                                           | OWNER           | `200 StatementDetail` ; 409 `AGENCY.STATEMENT_NOT_CANCELLABLE`                                                                   |
| GET     | `/v1/owner-statements/{id}/pdf`                                              | MANAGER         | `200 { downloadUrl, expiresAt }`                                                                                                 |
| POST    | `/v1/owner-payouts`                                                          | ACCOUNTANT      | `201 Payout` ; 409 `AGENCY.PAYOUT_ALREADY_EXISTS`, `AGENCY.PAYOUT_MISSING_BANK_DETAILS`, `AGENCY.STATEMENT_BALANCE_NOT_POSITIVE` |
| GET     | `/v1/owner-payouts?status=&landlordId=&limit=&cursor=`                       | ACCOUNTANT      | `200 { items: Payout[], pageInfo }`                                                                                              |
| POST    | `/v1/owner-payouts/{id}/approve`                                             | OWNER           | `200 Payout`                                                                                                                     |
| POST    | `/v1/owner-payouts/{id}/execute`                                             | ACCOUNTANT      | `200 Payout`                                                                                                                     |
| POST    | `/v1/owner-payouts/{id}/fail`                                                | ACCOUNTANT      | `200 Payout` (motif obligatoire)                                                                                                 |
| POST    | `/v1/organizations/independent-manager/onboarding`                           | authentifié     | `201 { organization, landlord, property, mandate }`                                                                              |
| GET     | `/v1/portal/me`                                                              | LANDLORD_PORTAL | `200 { landlord, organizations: { id, name }[] }`                                                                                |
| GET     | `/v1/portal/statements?limit=&cursor=`                                       | LANDLORD_PORTAL | `200 { items: StatementSummary[], pageInfo }`                                                                                    |
| GET     | `/v1/portal/statements/{id}/pdf`                                             | LANDLORD_PORTAL | `200 { downloadUrl, expiresAt }`                                                                                                 |
| GET     | `/v1/portal/payouts?limit=&cursor=`                                          | LANDLORD_PORTAL | `200 { items: Payout[], pageInfo }`                                                                                              |
| GET     | `/v1/portal/collections?from=&to=&limit=&cursor=`                            | LANDLORD_PORTAL | `200 { items: CollectionView[], pageInfo }`                                                                                      |
| GET     | `/v1/portal/receipts?limit=&cursor=`                                         | LANDLORD_PORTAL | `200 { items: ReceiptSummary[], pageInfo }`                                                                                      |

## Types

```ts
interface MandateInput {
  landlordId: string;
  propertyIds: string[];
  scope?: MandateScope;
  startDate: string;
  endDate?: string;
  noticeDays?: number;
  autoRenew?: boolean;
  commissionBasis?: CommissionBasis;
  commissionRateBps?: number;
  commissionFlatAmount?: number;
  lettingFeeRateBps?: number;
  vatRateBps?: number;
  payoutDay?: number;
  payoutBankAccountId?: string;
  notes?: string;
}
interface Mandate extends MandateInput {
  id: string;
  reference: string;
  status: MandateStatus;
  signedAt: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  currency: 'XAF';
  createdAt: string;
}
interface MandateSummary {
  id: string;
  reference: string;
  status: MandateStatus;
  landlord: { id: string; displayName: string; isDiaspora: boolean };
  propertiesCount: number;
  commissionRateBps: number | null;
  startDate: string;
  endDate: string | null;
}
interface MandateDetail extends Mandate {
  landlord: LandlordSummary;
  properties: PropertySummary[];
  statements: StatementSummary[];
  landlordPortal: {
    invited: boolean;
    invitedAt: string | null;
    activated: boolean;
    userId: string | null;
  };
}
interface ExpenseInput {
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  landlordId?: string;
  category: ExpenseCategory;
  label: string;
  description?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierNiu?: string;
  amount: number;
  vatRateBps?: number;
  expenseDate: string;
  borneBy?: ExpenseBearer;
  isRebillable?: boolean;
  isDeductibleFromRent?: boolean;
  invoiceDocumentId?: string;
  clientRef?: string;
  notes?: string;
}
interface Expense extends ExpenseInput {
  id: string;
  reference: string;
  status: ExpenseStatus;
  vatAmount: number;
  totalAmount: number;
  currency: 'XAF';
  ownerStatementId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
}
interface Commission {
  id: string;
  mandateId: string | null;
  landlordId: string;
  leaseId: string | null;
  paymentId: string | null;
  status: CommissionStatus;
  basis: CommissionBasis;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  rateBps: number | null;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  ownerStatementId: string | null;
  reversalOfId: string | null;
}
interface StatementSummary {
  id: string;
  statementNumber: string;
  status: StatementStatus;
  landlord: { id: string; displayName: string };
  property: { id: string; name: string } | null;
  periodStart: string;
  periodEnd: string;
  rentCollectedAmount: number;
  commissionAmount: number;
  expensesAmount: number;
  carryForwardAmount: number;
  netPayableAmount: number;
  issuedAt: string | null;
  sentAt: string | null;
  settledAt: string | null;
}
interface StatementLine {
  id: string;
  lineType: OwnerStatementLineType;
  label: string;
  amount: number;
  isDebit: boolean;
  position: number;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  expenseId: string | null;
  commissionId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}
interface StatementDetail extends StatementSummary {
  mandateId: string | null;
  chargesCollectedAmount: number;
  commissionVatAmount: number;
  depositsHeldAmount: number;
  occupancyRateBps: number | null;
  collectionRateBps: number | null;
  documentId: string | null;
  lines: StatementLine[];
  payout: Payout | null;
}
interface Payout {
  id: string;
  reference: string;
  statementId: string | null;
  landlordId: string;
  status: PayoutStatus;
  method: PaymentMethod;
  amount: number;
  feeAmount: number;
  feeBearer: 'TENANT' | 'ORGANIZATION' | 'LANDLORD' | 'SHARED';
  netAmount: number;
  bankAccountId: string | null;
  momoTransactionId: string | null;
  scheduledDate: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  failureReason: string | null;
  proofDocumentId: string | null;
}
interface CollectionView {
  paymentId: string;
  paymentDate: string;
  method: PaymentMethod;
  amount: number;
  tenant: { id: string; displayName: string };
  unit: { id: string; code: string };
  invoiceNumber: string | null;
}
```

`isDiaspora` est dérivé : `landlords.country_code` différent de `CG`.

## Variables d'environnement nouvelles

`AGENCY_STATEMENT_DEFAULT_PAYOUT_DAY=10`, `AGENCY_DEFAULT_COMMISSION_RATE_BPS=1000`, `AGENCY_COMMISSION_VAT_RATE_BPS=1800`, `PORTAL_BASE_URL` (lien d'activation envoyé au bailleur).
