# Contrat d'API — Phase 9 (relances, pénalités, tableaux de bord, exports)

Complète les contrats des phases 0 à 8 (mêmes conventions). Tables : `dunning_rules`, `dunning_runs`, `penalty_rules`, `notification_templates`, `notifications`, `message_logs`, `rent_invoices`, `invoice_lines`, `payments`, `payment_allocations`, `units`, `leases`, `guarantors`, `documents`, `audit_logs`. Aucune modification du DDL, aucune table nouvelle. Remplacé par `openapi.json` dès export.

## Énumérations (valeurs exactes du DDL, aucune autre n'existe)

- `DunningTrigger` : DAYS_BEFORE_DUE, DAYS_AFTER_DUE, ON_ISSUE, ON_OVERDUE.
- `DunningStepStatus` : PENDING, RUNNING, SENT, SKIPPED, FAILED, CANCELLED. **Il n'existe pas de statut DELIVERED** : la remise effective se lit dans `message_logs`.
- `PenaltyBasis` : RATE_BPS_PER_DAY, RATE_BPS_PER_MONTH, FLAT_AMOUNT, FLAT_AMOUNT_PER_DAY. Le plan citait `calculation_type` avec FIXED_AMOUNT et PERCENTAGE : ces valeurs n'existent pas.
- `NotificationChannel` : WHATSAPP, SMS, EMAIL, PUSH, IN_APP. `MessageStatus` : QUEUED, SENT, DELIVERED, READ, FAILED, REJECTED, EXPIRED.
- `DocumentKind` : aucune valeur d'export n'existe ; un fichier exporté est rangé en `OTHER`.

## Arbitrages de ce contrat (ils priment sur le plan de phases)

1. **L'escalade vers le garant n'existe pas en base, elle est applicative.** `dunning_rules` porte `notify_landlord` et `notify_collector`, mais aucun champ pour le garant, et `notifications` n'a pas de destinataire garant. Le plan promet pourtant cette escalade. Résolution : lorsqu'une règle porte `escalateToLegal`, l'envoi est **doublé** vers le garant actif du bail, en utilisant l'adresse de contact du garant dans `notifications.recipient_address`, avec `related_entity_type = 'guarantor'` et `related_entity_id` renseignés. `message_logs` distingue ainsi les deux destinataires. Aucune colonne n'est ajoutée.
2. **L'idempotence est portée par `dunning_runs`, pas par `message_logs`.** La contrainte `UNIQUE (organization_id, rule_id, invoice_id, run_date)` garantit qu'une facture ne reçoit jamais deux fois la même relance le même jour. Une seconde exécution le même jour insère donc une violation d'unicité, rattrapée et comptée comme ignorée.
3. **Les règles ne se suppriment pas, elles se désactivent.** Ni `dunning_rules` ni `penalty_rules` ne portent de colonne de suppression logique. La route de suppression du plan devient une désactivation par `isActive: false`, qui n'affecte ni les relances déjà envoyées ni les pénalités déjà émises.
4. **Un seul palier par rang.** `UNIQUE (organization_id, step_order)` : deux règles ne peuvent pas partager le même rang. Créer un palier sur un rang occupé renvoie 409 `DUNNING.STEP_ORDER_TAKEN`.
5. **Export au format CSV uniquement.** Le plan annonce CSV et Excel. Le module documents n'accepte pas le format Excel et aucune bibliothèque de génération n'est présente. La phase 9 produit donc des fichiers CSV encodés en UTF-8 avec BOM, qui s'ouvrent directement dans Excel, séparateur point-virgule conforme aux paramètres régionaux francophones. L'Excel natif est écarté et documenté comme tel.
6. **Aucune pénalité n'est calculée deux fois.** Avant d'ajouter une ligne, le moteur vérifie qu'aucune `invoice_lines` de type `PENALTY` ne porte déjà le même couple facture et règle, et `rent_invoices.last_penalty_run_date` est mis à jour. C'est le mécanisme déjà installé en phase 3 : la phase 9 l'active et l'expose, elle ne le réécrit pas.

## Règles de relance

Une règle décrit un palier : son rang, son déclencheur, son décalage en jours, son canal et son canal de repli, le modèle de message, le solde minimum en dessous duquel on ne relance pas, les destinataires additionnels, l'application éventuelle d'une pénalité, l'heure d'envoi locale et l'éventuel saut des week-ends.

- Le déclencheur `DAYS_AFTER_DUE` compte les jours depuis l'échéance, `DAYS_BEFORE_DUE` avant l'échéance pour un rappel courtois, `ON_ISSUE` à l'émission, `ON_OVERDUE` au basculement en retard.
- `minBalanceAmount` évite de relancer pour un reliquat dérisoire.
- `sendHourLocal` s'entend en heure d'Afrique/Brazzaville. Une relance calculée hors de cette heure est programmée pour le prochain créneau, jamais envoyée en pleine nuit.
- `skipWeekends` reporte au lundi une relance tombant un samedi ou un dimanche.

## Exécution quotidienne

- **Cron `dunning-daily`**, à l'heure la plus basse configurée parmi les règles actives, puis toutes les heures jusqu'à la plus haute, afin de respecter `sendHourLocal` sans multiplier les tâches. Idempotent et rejouable.
- Pour chaque organisation, le moteur parcourt les factures `ISSUED`, `PARTIALLY_PAID` ou `OVERDUE` dont le solde dépasse le minimum de la règle, calcule le nombre de jours de retard, sélectionne **la règle dont le palier correspond exactement** au décalage, et crée une ligne `dunning_runs` au statut `PENDING` puis `RUNNING`.
- L'envoi passe par le pipeline de notifications existant : canal principal, puis canal de repli en cas d'échec. Le statut devient `SENT`, et `notification_id` comme `message_log_id` sont renseignés. Une facture qui n'est plus en retard, un locataire sans canal de contact, un solde sous le minimum ou une relance déjà émise le jour même donnent `SKIPPED` avec un motif lisible. Une erreur technique donne `FAILED` avec son message.
- Si la règle porte `applyPenalty`, la pénalité est calculée selon la règle liée et ajoutée à la facture, `penaltyApplied`, `penaltyAmount` et `penaltyInvoiceLineId` étant renseignés.
- **Arrêt automatique** : une facture soldée ne reçoit plus aucune relance, et les lignes `PENDING` restantes pour cette facture passent `CANCELLED`.
- `POST /v1/organizations/{id}/dunning-runs/trigger` rejoue le scan à la demande, avec les mêmes garanties d'idempotence, et accepte `dryRun` pour simuler sans envoyer.

## Pénalités

Le calcul suit la base de la règle, après la franchise en jours :

| Base                  | Calcul                                                                      |
| :-------------------- | :-------------------------------------------------------------------------- |
| `RATE_BPS_PER_DAY`    | solde dû × taux en points de base × jours de retard au-delà de la franchise |
| `RATE_BPS_PER_MONTH`  | solde dû × taux × nombre de mois entamés au-delà de la franchise            |
| `FLAT_AMOUNT`         | montant fixe, une seule fois                                                |
| `FLAT_AMOUNT_PER_DAY` | montant fixe × jours de retard au-delà de la franchise                      |

L'assiette est le loyer seul, ou le loyer et les charges si `appliesToCharges`. Le résultat est plafonné par `capAmount` en valeur absolue et par `capRateBps` en pourcentage du solde, le plus contraignant l'emportant, et limité à `maxPeriods` périodes. Le montant est arrondi à l'entier XAF supérieur. Une simulation est disponible sans écrire : `POST /v1/penalty-rules/{id}/simulate { balanceAmount, daysOverdue }`.

## Tableaux de bord

Quatre agrégats, tous filtrables par période, immeuble et bailleur, tous en lecture seule et accessibles à `VIEWER`. Ils s'appuient sur les vues existantes lorsque c'est possible, notamment pour les impayés et les soldes locataires, et ne créent aucune table.

- **Recouvrement** : montant dû, montant encaissé, taux en points de base, série par mois sur la période.
- **Impayés** : total et répartition par tranche d'ancienneté de 0 à 30, 31 à 60, 61 à 90 et plus de 90 jours, calculée depuis la date d'échéance, avec le détail des locataires les plus en retard.
- **Vacance** : nombre de lots, lots occupés, lots vacants, taux de vacance en points de base, durée moyenne de vacance en jours calculée depuis la fin du dernier bail.
- **Encaissements par mode** : montants et parts par méthode de paiement sur la période, qui mesurent la bancarisation progressive.

## Exports

`POST /v1/organizations/{id}/exports/{kind}` avec `kind` parmi `invoices`, `payments`, `arrears`, `dashboard`. Le corps reprend les mêmes filtres que la liste correspondante. Le fichier CSV est produit de façon synchrone jusqu'à dix mille lignes, au-delà par un travail de fond dont l'état est consultable. Il est rangé dans `documents` avec le genre `OTHER` et un nom parlant, par exemple `impayes-2026-09.csv`, et la réponse renvoie un lien signé valable une heure. Les montants sont exportés en entiers XAF sans séparateur, les dates au format ISO.

## Routes

| Méthode | Route                                                                  | Rôle       | Sortie                                                                    |
| :------ | :--------------------------------------------------------------------- | :--------- | :------------------------------------------------------------------------ |
| GET     | `/v1/dunning-rules`                                                    | VIEWER     | `200 { items: DunningRule[] }`                                            |
| POST    | `/v1/dunning-rules`                                                    | MANAGER    | `201 DunningRule` ; 409 `DUNNING.STEP_ORDER_TAKEN`                        |
| PATCH   | `/v1/dunning-rules/{id}`                                               | MANAGER    | `200 DunningRule`                                                         |
| POST    | `/v1/dunning-rules/{id}/activate`                                      | MANAGER    | `200 DunningRule` (corps `{ isActive }`)                                  |
| GET     | `/v1/dunning-runs?ruleId=&invoiceId=&status=&from=&to=&limit=&cursor=` | ACCOUNTANT | `200 { items: DunningRun[], pageInfo }`                                   |
| GET     | `/v1/dunning-runs/{id}`                                                | ACCOUNTANT | `200 DunningRun`                                                          |
| POST    | `/v1/organizations/{id}/dunning-runs/trigger`                          | MANAGER    | `202 { scanned, created, skipped, failed, dryRun }`                       |
| GET     | `/v1/penalty-rules`                                                    | VIEWER     | `200 { items: PenaltyRule[] }`                                            |
| POST    | `/v1/penalty-rules`                                                    | OWNER      | `201 PenaltyRule`                                                         |
| PATCH   | `/v1/penalty-rules/{id}`                                               | OWNER      | `200 PenaltyRule`                                                         |
| POST    | `/v1/penalty-rules/{id}/activate`                                      | MANAGER    | `200 PenaltyRule`                                                         |
| POST    | `/v1/penalty-rules/{id}/simulate`                                      | MANAGER    | `200 { penaltyAmount, cappedBy, periods }`                                |
| GET     | `/v1/dashboards/collection-rate?from=&to=&propertyId=&landlordId=`     | VIEWER     | `200 CollectionRateDashboard`                                             |
| GET     | `/v1/dashboards/arrears?asOf=&propertyId=&landlordId=`                 | VIEWER     | `200 ArrearsDashboard`                                                    |
| GET     | `/v1/dashboards/vacancy?asOf=&propertyId=`                             | VIEWER     | `200 VacancyDashboard`                                                    |
| GET     | `/v1/dashboards/payment-methods?from=&to=&propertyId=`                 | VIEWER     | `200 PaymentMethodsDashboard`                                             |
| POST    | `/v1/exports/{kind}`                                                   | ACCOUNTANT | `201 { documentId, downloadUrl, expiresAt, rowCount }` ou `202 { jobId }` |
| GET     | `/v1/exports/jobs/{jobId}`                                             | ACCOUNTANT | `200 { status, documentId?, downloadUrl?, error? }`                       |

## Types

```ts
interface DunningRuleInput {
  name: string;
  stepOrder: number;
  triggerType?: DunningTrigger;
  offsetDays: number;
  channel?: NotificationChannel;
  fallbackChannel?: NotificationChannel;
  templateId?: string;
  minBalanceAmount?: number;
  notifyLandlord?: boolean;
  notifyCollector?: boolean;
  applyPenalty?: boolean;
  penaltyRuleId?: string;
  escalateToLegal?: boolean;
  sendHourLocal?: number;
  skipWeekends?: boolean;
  isActive?: boolean;
}
interface DunningRule extends DunningRuleInput {
  id: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
}
interface DunningRun {
  id: string;
  ruleId: string;
  ruleName: string;
  stepOrder: number;
  status: DunningStepStatus;
  runDate: string;
  scheduledAt: string;
  executedAt: string | null;
  daysOverdue: number;
  balanceAmount: number;
  channel: NotificationChannel;
  invoice: { id: string; invoiceNumber: string | null } | null;
  tenant: { id: string; displayName: string };
  notificationId: string | null;
  messageLogId: string | null;
  messageStatus: MessageStatus | null;
  guarantorNotified: boolean;
  penaltyApplied: boolean;
  penaltyAmount: number;
  skipReason: string | null;
  errorMessage: string | null;
}
interface PenaltyRuleInput {
  name: string;
  basis: PenaltyBasis;
  rateBps?: number;
  flatAmount?: number;
  graceDays?: number;
  capAmount?: number;
  capRateBps?: number;
  maxPeriods?: number;
  appliesToCharges?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
}
interface PenaltyRule extends PenaltyRuleInput {
  id: string;
  currency: 'XAF';
  createdAt: string;
}
interface CollectionRateDashboard {
  from: string;
  to: string;
  dueAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  collectionRateBps: number;
  series: {
    period: string;
    dueAmount: number;
    collectedAmount: number;
    collectionRateBps: number;
  }[];
  byProperty: {
    propertyId: string;
    name: string;
    dueAmount: number;
    collectedAmount: number;
    collectionRateBps: number;
  }[];
}
interface ArrearsDashboard {
  asOf: string;
  totalAmount: number;
  invoicesCount: number;
  buckets: { label: '0-30' | '31-60' | '61-90' | '90+'; amount: number; invoicesCount: number }[];
  topDebtors: {
    tenantId: string;
    displayName: string;
    phone: string;
    amount: number;
    oldestDueDate: string;
    daysOverdue: number;
  }[];
}
interface VacancyDashboard {
  asOf: string;
  unitsCount: number;
  occupiedCount: number;
  vacantCount: number;
  vacancyRateBps: number;
  averageVacancyDays: number;
  byProperty: {
    propertyId: string;
    name: string;
    unitsCount: number;
    vacantCount: number;
    vacancyRateBps: number;
  }[];
}
interface PaymentMethodsDashboard {
  from: string;
  to: string;
  totalAmount: number;
  byMethod: { method: PaymentMethod; amount: number; shareBps: number; count: number }[];
}
```

## Variables d'environnement nouvelles

`DUNNING_CRON_ENABLED=true`, `DUNNING_MAX_RUNS_PER_HOUR=500`, `EXPORT_SYNC_ROW_LIMIT=10000`, `EXPORT_LINK_TTL_SECONDS=3600`.
