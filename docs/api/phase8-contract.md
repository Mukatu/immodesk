# Contrat d'API — Phase 8 (états des lieux, compteurs et charges, maintenance)

Complète les contrats des phases 0 à 7 (mêmes conventions). Tables : `inspections`, `inspection_items`, `inspection_photos`, `meters`, `meter_readings`, `utility_tariffs`, `maintenance_requests`, `maintenance_updates`, `invoice_lines`, `rent_invoices`, `deposits`, `deposit_movements`, `documents`, `expenses`, `audit_logs`. Aucune modification du DDL. Remplacé par `openapi.json` dès export.

## Énumérations (valeurs exactes du DDL, aucune autre n'existe)

- `InspectionType` : MOVE_IN, MOVE_OUT, PERIODIC, CONTRADICTORY. **Le plan parlait de ENTRY et EXIT : ces valeurs n'existent pas.**
- `InspectionStatus` : DRAFT, IN_PROGRESS, PENDING_SIGNATURE, SIGNED, DISPUTED, CANCELLED.
- `InspectionCondition` : NEW, GOOD, FAIR, POOR, DAMAGED, MISSING. Six niveaux, et non les cinq du plan. Libellés d'affichage : neuf, bon état, état d'usage, mauvais état, dégradé, manquant.
- `MeterType` : ELECTRICITY_E2C, WATER_LCDE, GAS, PRIVATE_SUBMETER, SOLAR, OTHER. Ce sont les noms actuels des fournisseurs congolais ; le plan citait SNE et SNDE, qui sont les anciennes appellations et n'existent pas dans le schéma.
- `TariffBasis` : PER_UNIT_CONSUMED, FLAT_MONTHLY, PER_OCCUPANT, PER_SQUARE_METER, SHARED_PRORATA.
- `MaintenanceStatus` : OPEN, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS, ON_HOLD, RESOLVED, CLOSED, REJECTED. `MaintenancePriority` : LOW, NORMAL, HIGH, URGENT. `MaintenanceReporter` : TENANT, LANDLORD, COLLECTOR, MANAGER, INSPECTION.
- `InvoiceLineType` (rappel) : la refacturation produit `WATER_CHARGE` ou `ELECTRICITY_CHARGE`, jamais une valeur inventée.

## Arbitrages de ce contrat (ils priment sur le plan de phases)

1. **Une consommation ne peut pas être négative.** La colonne est contrainte positive. Un index inférieur au précédent n'est donc jamais enregistré tel quel : soit c'est un passage par zéro du compteur, et l'appel doit porter `rolloverApplied: true`, la consommation étant alors calculée sur la capacité du compteur déduite de son nombre de chiffres ; soit c'est une erreur de saisie, et l'API refuse par 422 `METERS.INDEX_REGRESSION`. Il n'existe **aucun statut d'anomalie** : un relevé douteux se marque `isEstimated` avec une note, et un relevé estimé n'est jamais utilisé pour facturer tant qu'un `MANAGER` ne l'a pas confirmé.
2. **La refacturation est idempotente par construction.** Un relevé porte `isInvoiced` et `invoiceLineId`, et la ligne de facture porte `meterReadingId`. La campagne ignore tout relevé déjà facturé. Aucune double imputation n'est donc possible, même si la campagne est relancée.
3. **Un état des lieux signé est figé.** Au statut `SIGNED`, aucun poste ni aucune photo ne peut être ajouté, modifié ou supprimé : 409 `INSPECTIONS.LOCKED`. Une contestation ultérieure se marque `DISPUTED` avec un motif, sans jamais toucher au constat d'origine.
4. **La retenue sur dépôt n'est pas tracée au poste en base.** `deposit_movements` porte `inspection_id` mais pas l'identifiant du poste. La traçabilité fine passe donc par le libellé du mouvement, qui reprend obligatoirement la pièce et l'élément concernés, et par un contrôle applicatif interdisant deux retenues pour le même poste : 409 `INSPECTIONS.DEDUCTION_ALREADY_APPLIED`.
5. **Un poste dégradé donne soit une retenue, soit une intervention, jamais les deux pour le même montant.** La conversion d'un poste en demande de maintenance et la retenue sur dépôt sont exclusives l'une de l'autre sur un même poste, sauf décision explicite d'un `MANAGER` portant un motif.
6. **Aucune photo n'est exigée sur un poste en bon état.** Elle devient obligatoire dès que l'état est `POOR`, `DAMAGED` ou `MISSING` : la signature est refusée sans elle, par 422 `INSPECTIONS.PHOTO_REQUIRED`, car c'est la preuve qui fonde une retenue.

## États des lieux

- **Création** par un `COLLECTOR` : lot, bail éventuel, type, date prévue. Référence `EDL-{YYYYMM}-{seq}`. Statut `DRAFT`, puis `IN_PROGRESS` dès le premier poste saisi.
- **Postes** : pièce, élément, catégorie, état constaté, quantité, description de la dégradation, montant de réparation estimé et partie qui en supporte le coût. Photos rattachées au poste, avec empreinte et position.
- **Signature** : `POST /inspections/{id}/sign` enregistre les signatures du locataire et du représentant de l'agence sous forme d'images stockées via le module documents, calcule l'empreinte, passe le statut à `SIGNED` et met en file la génération du rapport PDF. Si le locataire est absent, `tenantPresent: false` et un motif sont obligatoires, et le statut devient `PENDING_SIGNATURE` en attendant sa signature ; au-delà de quinze jours, un `MANAGER` peut clore en `SIGNED` avec mention de l'absence.
- **Comparaison** : `GET /units/{id}/inspections/compare` apparie les postes du dernier `MOVE_IN` signé et du dernier `MOVE_OUT` signé, par pièce et élément normalisés, et renvoie pour chaque couple l'état d'entrée, l'état de sortie, l'écart en nombre de niveaux, la présence de photos des deux côtés et la retenue proposée. Les postes présents d'un seul côté sont signalés comme ajoutés ou disparus.
- **Retenue** : `POST /inspections/{id}/items/{itemId}/deposit-deduction` crée un `deposit_movements` de type `DEDUCTION` sur le dépôt du bail, avec un libellé reprenant la pièce et l'élément. Refusé si le bail n'a pas de dépôt, si le solde détenu est insuffisant, ou si une retenue existe déjà pour ce poste.

## Compteurs, relevés et charges

- **Compteur** : rattaché à un bien, et éventuellement à un lot. Un compteur partagé porte `isShared` et une quote-part en points de base. Un compteur prépayé n'est jamais relevé pour refacturation : ses charges sont forfaitaires.
- **Relevé** : `POST /meters/{id}/readings` avec date, index courant, photo du cadran facultative et `clientRef` pour l'idempotence. L'index précédent et la consommation sont calculés par le serveur, jamais fournis par l'appelant. Deux relevés ne peuvent pas porter la même date pour un même compteur : 409 `METERS.READING_DUPLICATE_DATE`.
- **Valorisation** : le tarif applicable est celui du compteur, sinon la grille active du bien pour ce type d'énergie à la date du relevé. Selon la base : consommation multipliée par le prix unitaire, forfait mensuel, montant par occupant, montant au mètre carré, ou quote-part d'un compteur partagé. S'y ajoutent l'abonnement fixe, puis l'application d'un minimum de facturation. Le montant obtenu est arrondi à l'entier XAF supérieur.
- **Campagne** : `POST /v1/billing/utility-runs` valorise tous les relevés non facturés de la période, crée une ligne `WATER_CHARGE` ou `ELECTRICITY_CHARGE` dans la facture ouverte du bail concerné, ou dans la prochaine facture à émettre si aucune n'est ouverte, et marque le relevé facturé. Un lot sans relevé sur la période apparaît dans le rapport comme ignoré, avec son motif, et reçoit la charge forfaitaire du tarif si le paramètre d'organisation le prévoit. Rapport : `{ created, skipped, errors }`.

## Maintenance

| Étape           | Route                                          | Statut         |
| :-------------- | :--------------------------------------------- | :------------- |
| Signalement     | `POST /v1/maintenance-requests`                | `OPEN`         |
| Prise en compte | `POST …/{id}/acknowledge`                      | `ACKNOWLEDGED` |
| Affectation     | `POST …/{id}/assign`                           | `ASSIGNED`     |
| Intervention    | mise à jour avec `newStatus: IN_PROGRESS`      | `IN_PROGRESS`  |
| Suspension      | mise à jour avec `newStatus: ON_HOLD` et motif | `ON_HOLD`      |
| Résolution      | `POST …/{id}/resolve`                          | `RESOLVED`     |
| Clôture         | `POST …/{id}/close`                            | `CLOSED`       |
| Refus           | `POST …/{id}/reject` avec motif                | `REJECTED`     |

Référence `MNT-{YYYYMM}-{seq}`. Le délai cible est calculé à la création selon la gravité, quatre heures pour `URGENT`, vingt-quatre heures pour `HIGH`, cinq jours ouvrés pour `NORMAL`, quinze jours pour `LOW`, et stocké dans `slaDueAt`. Chaque changement d'état écrit une ligne dans `maintenance_updates`, avec auteur, statut précédent, statut nouveau, message, photo éventuelle et visibilité pour le locataire. Une dépense engagée sur une intervention se rattache à la mise à jour correspondante et suit le circuit de la phase 7. La conversion d'un poste d'état des lieux crée une demande avec `reporterType: INSPECTION` et le lien vers l'inspection d'origine.

## Paramètres d'organisation (`organization_settings.settings_json.facilities`)

```ts
interface FacilitiesSettings {
  utilityFallbackFlat: boolean; // défaut false : facturer le forfait du tarif si aucun relevé
  utilityRunDayOfMonth: number; // défaut 3 : campagne de charges avant la facturation du 5
  inspectionPhotoRequiredFrom: 'POOR' | 'DAMAGED'; // défaut POOR
  maintenanceSlaHours: { URGENT: number; HIGH: number; NORMAL: number; LOW: number };
  autoCreateMaintenanceFromInspection: boolean; // défaut false : proposition, pas création automatique
}
```

## Routes

| Méthode | Route                                                                                                  | Rôle                                                | Sortie                                                                                               |
| :------ | :----------------------------------------------------------------------------------------------------- | :-------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| POST    | `/v1/inspections`                                                                                      | COLLECTOR                                           | `201 Inspection`                                                                                     |
| GET     | `/v1/inspections?unitId=&leaseId=&type=&status=&limit=&cursor=`                                        | VIEWER                                              | `200 { items: InspectionSummary[], pageInfo }`                                                       |
| GET     | `/v1/inspections/{id}`                                                                                 | VIEWER                                              | `200 InspectionDetail`                                                                               |
| PATCH   | `/v1/inspections/{id}`                                                                                 | COLLECTOR                                           | `200 Inspection` ; 409 `INSPECTIONS.LOCKED`                                                          |
| POST    | `/v1/inspections/{id}/items`                                                                           | COLLECTOR                                           | `201 InspectionItem` ; 409 `INSPECTIONS.LOCKED`                                                      |
| PATCH   | `/v1/inspections/{id}/items/{itemId}`                                                                  | COLLECTOR                                           | `200 InspectionItem`                                                                                 |
| DELETE  | `/v1/inspections/{id}/items/{itemId}`                                                                  | COLLECTOR                                           | `204`                                                                                                |
| POST    | `/v1/inspections/{id}/items/{itemId}/photos`                                                           | COLLECTOR                                           | `201 InspectionPhoto` (document déjà téléversé)                                                      |
| POST    | `/v1/inspections/{id}/sign`                                                                            | COLLECTOR                                           | `200 InspectionDetail` ; 422 `INSPECTIONS.PHOTO_REQUIRED`                                            |
| POST    | `/v1/inspections/{id}/dispute`                                                                         | MANAGER                                             | `200 Inspection` (motif obligatoire)                                                                 |
| POST    | `/v1/inspections/{id}/cancel`                                                                          | MANAGER                                             | `200 Inspection`                                                                                     |
| GET     | `/v1/inspections/{id}/pdf`                                                                             | VIEWER                                              | `200 { downloadUrl, expiresAt }`                                                                     |
| GET     | `/v1/units/{id}/inspections/compare`                                                                   | MANAGER                                             | `200 InspectionComparison`                                                                           |
| POST    | `/v1/inspections/{id}/items/{itemId}/deposit-deduction`                                                | MANAGER                                             | `201 DepositMovement` ; 409 `INSPECTIONS.DEDUCTION_ALREADY_APPLIED`, `DEPOSITS.INSUFFICIENT_BALANCE` |
| POST    | `/v1/inspections/{id}/items/{itemId}/maintenance-request`                                              | MANAGER                                             | `201 MaintenanceRequest`                                                                             |
| POST    | `/v1/meters`                                                                                           | MANAGER                                             | `201 Meter` ; 409 `METERS.SERIAL_TAKEN`                                                              |
| GET     | `/v1/meters?propertyId=&unitId=&type=&limit=&cursor=`                                                  | VIEWER                                              | `200 { items: Meter[], pageInfo }`                                                                   |
| PATCH   | `/v1/meters/{id}`                                                                                      | MANAGER                                             | `200 Meter`                                                                                          |
| POST    | `/v1/meters/{id}/readings`                                                                             | COLLECTOR                                           | `201 MeterReading` ; 422 `METERS.INDEX_REGRESSION` ; 409 `METERS.READING_DUPLICATE_DATE`             |
| GET     | `/v1/meters/{id}/readings?from=&to=&limit=&cursor=`                                                    | ACCOUNTANT                                          | `200 { items: MeterReading[], pageInfo, consumptionSeries }`                                         |
| PATCH   | `/v1/meter-readings/{id}`                                                                              | MANAGER                                             | `200 MeterReading` (confirmation d'un relevé estimé, avant facturation)                              |
| GET     | `/v1/utility-tariffs?propertyId=&meterType=&activeOnly=`                                               | ACCOUNTANT                                          | `200 { items: UtilityTariff[] }`                                                                     |
| POST    | `/v1/utility-tariffs`                                                                                  | OWNER                                               | `201 UtilityTariff`                                                                                  |
| PATCH   | `/v1/utility-tariffs/{id}`                                                                             | OWNER                                               | `200 UtilityTariff`                                                                                  |
| POST    | `/v1/billing/utility-runs`                                                                             | MANAGER                                             | `202 { runId }`                                                                                      |
| GET     | `/v1/billing/utility-runs/{runId}`                                                                     | MANAGER                                             | `200 { status, created, skipped, errors }`                                                           |
| POST    | `/v1/maintenance-requests`                                                                             | MANAGER                                             | `201 MaintenanceRequest`                                                                             |
| GET     | `/v1/maintenance-requests?status=&priority=&propertyId=&assignedToUserId=&overdueOnly=&limit=&cursor=` | MANAGER (COLLECTOR : celles qui lui sont affectées) | `200 { items: MaintenanceSummary[], pageInfo }`                                                      |
| GET     | `/v1/maintenance-requests/{id}`                                                                        | MANAGER / assigné                                   | `200 MaintenanceDetail`                                                                              |
| POST    | `/v1/maintenance-requests/{id}/acknowledge`                                                            | MANAGER                                             | `200 MaintenanceDetail`                                                                              |
| POST    | `/v1/maintenance-requests/{id}/assign`                                                                 | MANAGER                                             | `200 MaintenanceDetail`                                                                              |
| POST    | `/v1/maintenance-requests/{id}/updates`                                                                | COLLECTOR assigné / MANAGER                         | `201 MaintenanceUpdate`                                                                              |
| POST    | `/v1/maintenance-requests/{id}/resolve`                                                                | MANAGER / assigné                                   | `200 MaintenanceDetail`                                                                              |
| POST    | `/v1/maintenance-requests/{id}/close`                                                                  | MANAGER                                             | `200 MaintenanceDetail`                                                                              |
| POST    | `/v1/maintenance-requests/{id}/reject`                                                                 | MANAGER                                             | `200 MaintenanceDetail` (motif obligatoire)                                                          |

## Types

```ts
interface InspectionInput {
  unitId: string;
  leaseId?: string;
  tenantId?: string;
  inspectionType: InspectionType;
  scheduledAt?: string;
  tenantPresent?: boolean;
  landlordPresent?: boolean;
  keysHandedCount?: number;
  notes?: string;
  clientRef?: string;
}
interface Inspection extends InspectionInput {
  id: string;
  reference: string;
  status: InspectionStatus;
  propertyId: string;
  overallCondition: InspectionCondition | null;
  totalDamageAmount: number;
  performedAt: string | null;
  performedByUserId: string | null;
  tenantSignedAt: string | null;
  agentSignedAt: string | null;
  reportDocumentId: string | null;
  disputeReason: string | null;
}
interface InspectionItemInput {
  roomLabel: string;
  elementLabel: string;
  elementCategory?: string;
  condition: InspectionCondition;
  quantity?: number;
  isDamaged?: boolean;
  damageDescription?: string;
  repairAmount?: number;
  chargedTo?: 'LANDLORD' | 'TENANT' | 'ORGANIZATION';
  position?: number;
}
interface InspectionItem extends InspectionItemInput {
  id: string;
  inspectionId: string;
  photos: InspectionPhoto[];
}
interface InspectionPhoto {
  id: string;
  inspectionItemId: string | null;
  documentId: string;
  caption: string | null;
  takenAt: string | null;
  checksumSha256: string | null;
  position: number;
}
interface InspectionDetail extends Inspection {
  unit: Unit;
  property: PropertySummary;
  tenant: { id: string; displayName: string } | null;
  items: InspectionItem[];
}
interface InspectionComparison {
  unitId: string;
  moveIn: InspectionSummary | null;
  moveOut: InspectionSummary | null;
  rows: {
    roomLabel: string;
    elementLabel: string;
    entryCondition: InspectionCondition | null;
    exitCondition: InspectionCondition | null;
    degradationLevels: number;
    suggestedDeductionAmount: number;
    entryPhotos: string[];
    exitPhotos: string[];
    status: 'UNCHANGED' | 'DEGRADED' | 'IMPROVED' | 'ADDED' | 'MISSING';
  }[];
  totalSuggestedDeduction: number;
}
interface MeterInput {
  propertyId: string;
  unitId?: string;
  meterType: MeterType;
  serialNumber: string;
  subscriberNumber?: string;
  providerName?: string;
  isPrepaid?: boolean;
  isShared?: boolean;
  sharedRatioBps?: number;
  measurementUnit?: string;
  digitsCount?: number;
  initialIndex?: number;
  tariffId?: string;
  installedAt?: string;
}
interface Meter extends MeterInput {
  id: string;
  isActive: boolean;
  lastReading: { readingDate: string; currentIndex: number } | null;
}
interface MeterReadingInput {
  readingDate: string;
  currentIndex: number;
  periodStart?: string;
  periodEnd?: string;
  rolloverApplied?: boolean;
  isEstimated?: boolean;
  photoDocumentId?: string;
  notes?: string;
  clientRef: string;
}
interface MeterReading extends MeterReadingInput {
  id: string;
  meterId: string;
  unitId: string | null;
  leaseId: string | null;
  previousIndex: number;
  consumption: number;
  tariffId: string | null;
  unitPriceAmount: number;
  computedAmount: number;
  isInvoiced: boolean;
  invoiceLineId: string | null;
  recordedByUserId: string | null;
}
interface UtilityTariffInput {
  propertyId?: string;
  meterType: MeterType;
  basis?: TariffBasis;
  label: string;
  unitPriceAmount?: number;
  flatAmount?: number;
  standingChargeAmount?: number;
  minimumAmount?: number;
  measurementUnit?: string;
  invoiceLineType?: 'WATER_CHARGE' | 'ELECTRICITY_CHARGE';
  effectiveFrom: string;
  effectiveTo?: string;
}
interface UtilityTariff extends UtilityTariffInput {
  id: string;
  isActive: boolean;
  currency: 'XAF';
}
interface MaintenanceInput {
  propertyId: string;
  unitId?: string;
  leaseId?: string;
  tenantId?: string;
  priority?: MaintenancePriority;
  reporterType?: MaintenanceReporter;
  category?: ExpenseCategory;
  title: string;
  description: string;
  locationDetail?: string;
  estimatedAmount?: number;
  chargedTo?: 'LANDLORD' | 'TENANT' | 'ORGANIZATION';
  inspectionId?: string;
  clientRef?: string;
}
interface MaintenanceSummary {
  id: string;
  reference: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  title: string;
  property: { id: string; name: string };
  unit: { id: string; code: string } | null;
  reportedAt: string;
  slaDueAt: string | null;
  isOverdue: boolean;
  assignedToUserId: string | null;
  ageHours: number;
}
interface MaintenanceUpdateInput {
  newStatus?: MaintenanceStatus;
  message?: string;
  photoDocumentId?: string;
  amountDelta?: number;
  isVisibleToTenant?: boolean;
  expenseId?: string;
  clientRef?: string;
}
interface MaintenanceUpdate extends MaintenanceUpdateInput {
  id: string;
  requestId: string;
  authorUserId: string | null;
  authorLabel: string | null;
  previousStatus: MaintenanceStatus | null;
  occurredAt: string;
}
interface MaintenanceDetail extends MaintenanceSummary {
  description: string;
  locationDetail: string | null;
  category: ExpenseCategory;
  reporterType: MaintenanceReporter;
  estimatedAmount: number;
  actualAmount: number;
  chargedTo: string;
  landlordApproved: boolean;
  inspectionId: string | null;
  rejectionReason: string | null;
  updates: MaintenanceUpdate[];
}
```

## Variables d'environnement nouvelles

`UTILITY_RUN_DAY_OF_MONTH=3`, `MAINTENANCE_SLA_URGENT_HOURS=4`, `MAINTENANCE_SLA_HIGH_HOURS=24`, `INSPECTION_SIGNATURE_GRACE_DAYS=15`.
