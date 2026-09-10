# Contrat d'API — Phase 2 (baux et dépôts de garantie)

Complète `phase0-contract.md` et `phase1-contract.md` (mêmes conventions). Tables : `leases`, `lease_parties`, `lease_rent_revisions`, `lease_documents`, `deposits`, `deposit_movements`, `sequences`, `documents`, `units` (statut), `audit_logs`. Remplacé par `openapi.json` dès export.

## Énumérations (valeurs exactes du DDL)

- `LeaseStatus` : DRAFT, PENDING_SIGNATURE, ACTIVE, NOTICE_GIVEN, TERMINATED, EXPIRED, CANCELLED.
- `RentPeriod` : MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL.
- `LeasePartyRole` : PRIMARY_TENANT, CO_TENANT, GUARANTOR, OCCUPANT.
- `LeaseDocumentKind` : CONTRACT, AMENDMENT, NOTICE, TERMINATION, INVENTORY, INSURANCE, OTHER.
- `DepositStatus` : PENDING, PARTIALLY_PAID, HELD, PARTIALLY_REFUNDED, REFUNDED, FORFEITED.
- `DepositMovementType` : COLLECTION, REFUND, DEDUCTION, TRANSFER, ADJUSTMENT.
- `PaymentMethod` : CASH, MOBILE_MONEY, BANK_TRANSFER, BANK_CHECK.

## Règles métier

- **Machine à états du bail** : DRAFT → PENDING_SIGNATURE (optionnel) → ACTIVE → NOTICE_GIVEN → TERMINATED ; DRAFT/PENDING_SIGNATURE → CANCELLED ; ACTIVE → EXPIRED (cron, quand `endDate` est passée et `autoRenew = false`) ; ACTIVE → TERMINATED (résiliation immédiate). Toute autre transition : 409 `LEASES.INVALID_TRANSITION` avec `details.from`, `details.to`.
- **Activation** (transaction unique) : le lot passe `OCCUPIED`, la ligne `deposits` est créée (`requiredAmount = depositAmount`, statut PENDING, `monthsEquivalent` = depositAmount / rentAmount arrondi), la référence `BAIL-{YYYY}-{seq}` est attribuée via `next_sequence(org, 'LEASE', YYYY)` si elle ne l'est pas déjà, `lease_parties` reçoit le locataire principal (PRIMARY_TENANT, 10000 bps) s'il n'y est pas, `audit_logs` reçoit la transition. Refus si le lot n'est pas `AVAILABLE` ou `RESERVED` : 409 `LEASES.UNIT_NOT_AVAILABLE`. Chevauchement avec un bail ACTIVE ou NOTICE_GIVEN sur le même lot : 409 `LEASES.OVERLAP` (garanti en base par `leases_no_overlap_excl`, l'erreur SQL 23P01 est traduite).
- **Résiliation** : `effectiveDate` ≥ aujourd'hui − 30 jours ; statut TERMINATED, `terminatedAt`, `terminationReason`, `moveOutDate = effectiveDate`, lot repassé `AVAILABLE` à la date d'effet (immédiatement si effectiveDate ≤ aujourd'hui, sinon par le cron quotidien), dépôt : `refundDueDate = effectiveDate + 30 jours`. `NOTICE_GIVEN` = préavis déposé avec `effectiveDate` future ; le cron bascule en TERMINATED à la date.
- **Révision de loyer** : `effectiveDate` doit être postérieure à la dernière révision et au 1er jour du mois courant (aucune période facturée ne peut être réécrite ; en phase 2, aucune facture n'existe : la règle compare simplement à la dernière révision et à `startDate`) ; écrit `lease_rent_revisions` puis met à jour `leases.rentAmount` / `chargesAmount` si `effectiveDate ≤ aujourd'hui`, sinon la mise à jour est appliquée par le cron quotidien à la date. Loyer applicable à une date = dernière révision effective, sinon valeurs initiales. 409 `LEASES.REVISION_DATE_INVALID`.
- **Modification** : `PATCH /leases/{id}` uniquement en DRAFT ou PENDING_SIGNATURE (409 `LEASES.NOT_EDITABLE`) ; après activation, seuls `notes`, `collectorUserId`, `preferredPaymentMethod`, `noticeDays`, `autoRenew`, `endDate` (prolongation) sont modifiables via le même PATCH.
- **Jour d'échéance** : `paymentDueDay` entre 1 et 28 (contrainte DDL), défaut `organization_settings.default_payment_due_day`.
- **Prorata** : fonction pure `prorata(amount, from, to)` au jour calendaire sur le mois réel (février = 28 ou 29), exposée par le domaine pour la phase 3 et testée en phase 2.
- **Dépôt** : `collectedAmount`, `deductedAmount`, `refundedAmount`, `heldAmount = collected − deducted − refunded` recalculés à chaque mouvement dans la même transaction ; `deposit_movements` est append-only côté API (aucune route de modification ni de suppression ; correction = mouvement ADJUSTMENT ou mouvement avec `reversalOfId`). Statut dérivé : PENDING (collected = 0) → PARTIALLY_PAID → HELD (collected ≥ required) → PARTIALLY_REFUNDED / REFUNDED (held = 0 après REFUND) ; FORFEITED si une DEDUCTION absorbe tout. Une REFUND ou DEDUCTION supérieure à `heldAmount` : 409 `DEPOSITS.INSUFFICIENT_BALANCE`. Restitution possible uniquement si le bail est TERMINATED ou EXPIRED : 409 `DEPOSITS.LEASE_NOT_CLOSED`.
- **Contrat PDF** : `POST /leases/{id}/contract` met en file un job BullMQ `lease-contract` ; le worker rend un gabarit Handlebars (HTML + CSS A4) avec Puppeteer, calcule le SHA-256 du PDF, le dépose dans le stockage objet (`documents` kind LEASE_CONTRACT), crée `lease_documents` (kind CONTRACT, `version = max + 1`, `title = "Contrat de bail {reference} v{n}"`, `generatedByJob`, `signatureHash = sha256`). Une version est immuable. Le gabarit vient de `organization_settings.settings_json.contractTemplate` (en-tête, clauses optionnelles, mentions) avec un gabarit par défaut « bail à usage d'habitation, Congo-Brazzaville » ; le bail commercial utilise le même gabarit avec un bloc OHADA activable (`isCommercial` déduit de `unit.unitType ∈ {SHOP, OFFICE, WAREHOUSE}`). Le rendu doit être déterministe pour un même jeu de données (date de génération hors empreinte : imprimée dans le pied de page mais exclue du hash via un rendu séparé, ou hash calculé sur le HTML source sans la date). Statut du job consultable.
- Toute transition et tout mouvement écrivent dans `audit_logs`.

## Routes

| Méthode | Route                                                                                  | Rôle       | Entrée                                                                                                                            | Sortie                                                                                             |
| :------ | :------------------------------------------------------------------------------------- | :--------- | :-------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| POST    | `/v1/leases`                                                                           | MANAGER    | `LeaseInput`                                                                                                                      | `201 Lease` (DRAFT) ; 409 `LEASES.UNIT_NOT_AVAILABLE` si le lot est OCCUPIED                       |
| GET     | `/v1/leases?status=&propertyId=&tenantId=&unitId=&endingWithinDays=&q=&limit=&cursor=` | VIEWER     | —                                                                                                                                 | `200 { items: LeaseSummary[], pageInfo }`                                                          |
| GET     | `/v1/leases/{id}`                                                                      | VIEWER     | —                                                                                                                                 | `200 LeaseDetail`                                                                                  |
| PATCH   | `/v1/leases/{id}`                                                                      | MANAGER    | `Partial<LeaseInput>` (règles ci-dessus)                                                                                          | `200 Lease` ; 409 `LEASES.NOT_EDITABLE`                                                            |
| DELETE  | `/v1/leases/{id}`                                                                      | OWNER      | —                                                                                                                                 | `204` (suppression logique, DRAFT/CANCELLED seulement ; sinon 409 `LEASES.NOT_DELETABLE`)          |
| POST    | `/v1/leases/{id}/activate`                                                             | MANAGER    | `{ moveInDate?: string }`                                                                                                         | `200 LeaseDetail` ; 409 `LEASES.INVALID_TRANSITION`, `LEASES.UNIT_NOT_AVAILABLE`, `LEASES.OVERLAP` |
| POST    | `/v1/leases/{id}/cancel`                                                               | MANAGER    | `{ reason: string }`                                                                                                              | `200 Lease`                                                                                        |
| POST    | `/v1/leases/{id}/notice`                                                               | MANAGER    | `{ effectiveDate: string, reason: string }`                                                                                       | `200 Lease` (NOTICE_GIVEN)                                                                         |
| POST    | `/v1/leases/{id}/terminate`                                                            | MANAGER    | `{ effectiveDate: string, reason: string }`                                                                                       | `200 LeaseDetail` (TERMINATED, `deposit.refundDueDate` renseigné)                                  |
| GET     | `/v1/leases/{id}/rent-revisions`                                                       | VIEWER     | —                                                                                                                                 | `200 { items: RentRevision[] }`                                                                    |
| POST    | `/v1/leases/{id}/rent-revisions`                                                       | MANAGER    | `{ effectiveDate, newRentAmount, newChargesAmount?, reason?, documentId? }`                                                       | `201 RentRevision` ; 409 `LEASES.REVISION_DATE_INVALID`                                            |
| GET     | `/v1/leases/{id}/rent-at?date=`                                                        | VIEWER     | —                                                                                                                                 | `200 { date, rentAmount, chargesAmount, source: "INITIAL" \| "REVISION", revisionId? }`            |
| POST    | `/v1/leases/{id}/parties`                                                              | MANAGER    | `LeasePartyInput`                                                                                                                 | `201 LeaseParty` ; 409 `LEASES.PARTY_DUPLICATE`                                                    |
| PATCH   | `/v1/leases/{id}/parties/{partyId}`                                                    | MANAGER    | `{ shareBps?, isSolidary? }`                                                                                                      | `200 LeaseParty`                                                                                   |
| DELETE  | `/v1/leases/{id}/parties/{partyId}`                                                    | MANAGER    | —                                                                                                                                 | `204` ; 409 `LEASES.PRIMARY_TENANT_PROTECTED`                                                      |
| POST    | `/v1/leases/{id}/contract`                                                             | MANAGER    | `{ regenerate?: boolean }`                                                                                                        | `202 { jobId, status: "QUEUED" }` ; 409 `LEASES.CONTRACT_IN_PROGRESS`                              |
| GET     | `/v1/leases/{id}/contract/jobs/{jobId}`                                                | VIEWER     | —                                                                                                                                 | `200 { jobId, status: "QUEUED" \| "RUNNING" \| "DONE" \| "FAILED", leaseDocumentId?, error? }`     |
| GET     | `/v1/leases/{id}/contract/preview`                                                     | VIEWER     | —                                                                                                                                 | `200 text/html` (rendu HTML du gabarit avec les données du bail, pour prévisualisation)            |
| GET     | `/v1/leases/{id}/documents`                                                            | VIEWER     | —                                                                                                                                 | `200 { items: LeaseDocument[] }`                                                                   |
| POST    | `/v1/leases/{id}/documents`                                                            | MANAGER    | `{ documentId, kind: LeaseDocumentKind, title, effectiveDate?, isSigned?, signedAt? }` (document déjà téléversé via `/documents`) | `201 LeaseDocument` (version = max + 1 pour ce kind)                                               |
| GET     | `/v1/leases/{id}/deposit`                                                              | ACCOUNTANT | —                                                                                                                                 | `200 DepositDetail`                                                                                |
| POST    | `/v1/leases/{id}/deposit/movements`                                                    | ACCOUNTANT | `DepositMovementInput`                                                                                                            | `201 DepositDetail` ; 409 `DEPOSITS.INSUFFICIENT_BALANCE`, `DEPOSITS.LEASE_NOT_CLOSED`             |
| GET     | `/v1/deposits/summary`                                                                 | ACCOUNTANT | —                                                                                                                                 | `200 { heldTotal, pendingTotal, refundDueCount, byStatus: Record<DepositStatus, number> }`         |
| GET     | `/v1/deposits?status=&refundDueBefore=&limit=&cursor=`                                 | ACCOUNTANT | —                                                                                                                                 | `200 { items: DepositSummary[], pageInfo }`                                                        |
| GET     | `/v1/organizations/{id}/contract-template`                                             | MANAGER    | —                                                                                                                                 | `200 ContractTemplate` (défaut si non personnalisé)                                                |
| PATCH   | `/v1/organizations/{id}/contract-template`                                             | OWNER      | `Partial<ContractTemplate>`                                                                                                       | `200 ContractTemplate` (stocké dans `settings_json.contractTemplate`)                              |

## Types

```ts
interface LeaseInput {
  unitId: string;
  primaryTenantId: string;
  startDate: string;
  endDate?: string | null;
  moveInDate?: string;
  rentPeriod?: RentPeriod;
  rentAmount: number;
  chargesAmount?: number;
  chargesAreProvisional?: boolean;
  depositAmount?: number; // défaut : unit.depositMonths × rentAmount
  agencyFeeAmount?: number;
  advanceMonths?: number;
  paymentDueDay?: number;
  graceDays?: number;
  preferredPaymentMethod?: PaymentMethod;
  collectorUserId?: string;
  noticeDays?: number;
  autoRenew?: boolean;
  indexationRateBps?: number;
  nextIndexationDate?: string;
  notes?: string;
  clientRef?: string;
}
interface Lease extends LeaseInput {
  id: string;
  reference: string | null;
  status: LeaseStatus;
  propertyId: string;
  landlordId: string;
  moveOutDate: string | null;
  currency: 'XAF';
  signedAt: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  balanceAmount: number;
  contractDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
interface LeaseSummary {
  id: string;
  reference: string | null;
  status: LeaseStatus;
  unit: { id: string; code: string; label: string | null };
  property: { id: string; name: string };
  tenant: { id: string; displayName: string; primaryPhone: string };
  startDate: string;
  endDate: string | null;
  rentAmount: number;
  chargesAmount: number;
  paymentDueDay: number;
}
interface LeaseDetail extends Lease {
  unit: Unit;
  property: PropertySummary;
  landlord: LandlordSummary;
  primaryTenant: Tenant;
  parties: LeaseParty[];
  rentRevisions: RentRevision[];
  deposit: DepositDetail | null;
  documents: LeaseDocument[];
}
interface LeasePartyInput {
  role: LeasePartyRole;
  tenantId?: string;
  guarantorId?: string;
  shareBps?: number;
  isSolidary?: boolean;
}
interface LeaseParty extends LeasePartyInput {
  id: string;
  leaseId: string;
  displayName: string;
  signedAt: string | null;
  createdAt: string;
}
interface RentRevision {
  id: string;
  leaseId: string;
  effectiveDate: string;
  previousRentAmount: number;
  newRentAmount: number;
  previousChargesAmount: number;
  newChargesAmount: number;
  reason: string | null;
  documentId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}
interface LeaseDocument {
  id: string;
  leaseId: string;
  kind: LeaseDocumentKind;
  documentId: string;
  version: number;
  title: string;
  effectiveDate: string | null;
  isSigned: boolean;
  signedAt: string | null;
  signatureHash: string | null;
  generatedByJob: string | null;
  createdAt: string;
}
interface DepositMovementInput {
  movementType: DepositMovementType;
  amount: number;
  movementDate?: string;
  reason?: string;
  paymentId?: string;
  inspectionId?: string;
  reversalOfId?: string;
}
interface DepositMovement extends DepositMovementInput {
  id: string;
  depositId: string;
  leaseId: string;
  currency: 'XAF';
  createdByUserId: string | null;
  createdAt: string;
}
interface DepositDetail {
  id: string;
  leaseId: string;
  tenantId: string;
  status: DepositStatus;
  requiredAmount: number;
  collectedAmount: number;
  deductedAmount: number;
  refundedAmount: number;
  heldAmount: number;
  monthsEquivalent: number | null;
  dueDate: string | null;
  fullyCollectedAt: string | null;
  refundDueDate: string | null;
  refundedAt: string | null;
  refundBankAccountId: string | null;
  movements: DepositMovement[];
}
interface DepositSummary {
  id: string;
  leaseId: string;
  leaseReference: string | null;
  tenant: { id: string; displayName: string };
  unit: { id: string; code: string };
  status: DepositStatus;
  requiredAmount: number;
  heldAmount: number;
  refundDueDate: string | null;
}
interface ContractTemplate {
  headerTitle: string; // « CONTRAT DE BAIL À USAGE D'HABITATION »
  lessorBlock: string; // texte libre (raison sociale, RCCM, adresse)
  optionalClauses: { key: string; title: string; body: string; enabled: boolean }[];
  legalMentions: string; // mentions légales, à valider par le conseil juridique
  signatureCity: string; // « Brazzaville »
  showOhadaBlock: boolean; // bloc bail commercial (Acte uniforme OHADA)
  footerText: string | null;
}
```

## Cron quotidien (BullMQ repeatable, 02:00 Africa/Brazzaville)

- Bascule NOTICE_GIVEN → TERMINATED à la date d'effet, libère le lot.
- Bascule ACTIVE → EXPIRED quand `endDate < aujourd'hui` et `autoRenew = false` ; si `autoRenew = true`, prolonge `endDate` d'une durée égale à la durée initiale et journalise.
- Applique les révisions de loyer dont `effectiveDate = aujourd'hui`.
- Idempotent, rejouable, rapport dans les logs et `audit_logs`.
