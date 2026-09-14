# Contrat d'API — Phase 5 (mode hors ligne mobile, synchronisation par lots)

Complète les contrats des phases 0 à 4 (mêmes conventions). Tables : `sync_batches`, `idempotency_keys`, `cash_receipts`, `payments`, `payment_allocations`, `rent_invoices`, `documents`, `organization_members`, `audit_logs`. Aucune modification du DDL. Remplacé par `openapi.json` dès export.

## Arbitrages de ce contrat (ils priment sur le plan de phases)

1. **Le protocole est générique, les types d'opérations sont ceux qui existent.** Le plan cite `inspections`, `inspection_items`, `inspection_photos`, `meter_readings` et `maintenance_requests` : ces entités n'arrivent qu'en phase 8. La phase 5 livre le protocole complet et **un seul type d'opération réel**, `CASH_RECEIPT`, plus `DOCUMENT` pour les pièces jointes (signature, photo). Ajouter un type en phase 8 ne doit modifier ni la route, ni le format d'enveloppe, ni le moteur de rejeu : seulement enregistrer un nouveau gestionnaire d'opération.
2. **Aucune table de conflits.** Un conflit est une opération rejetée pour cause de changement côté serveur. Il vit dans `sync_batches.result` (JSONB) et les routes de conflits agrègent cette colonne. Rien n'est ajouté au DDL.
3. **Les paiements numériques restent en ligne.** Déclarations Mobile Money, déclarations de virement et paiement par agrégateur exigent une connexion, comme en phase 4. Seul l'encaissement en espèces fonctionne hors ligne.
4. **Le serveur ne fait jamais confiance à l'horodatage de l'appareil.** `clientCreatedAt` est conservé à titre informatif et sert à ordonner le rejeu. Les dates métier opposables restent celles du serveur.
5. **Un lot est atomique par opération, pas dans son ensemble.** Chaque opération est appliquée dans sa propre transaction. Un échec n'annule pas les autres.

## Enveloppe de synchronisation

```ts
type SyncOperationType = 'CASH_RECEIPT' | 'DOCUMENT';

interface SyncOperation {
  clientRef: string; // ULID généré sur l'appareil, unique par organisation
  type: SyncOperationType;
  clientCreatedAt: string; // ISO 8601, horodatage local, informatif
  dependsOn?: string[]; // clientRef d'opérations du même lot à appliquer avant
  payload: unknown; // corps identique à la route en ligne correspondante
}

interface SyncBatchInput {
  batchRef: string; // ULID du lot, unique par appareil
  deviceId: string; // identifiant stable de l'appareil
  devicePlatform?: string; // « android », « ios »
  appVersion?: string;
  clientGeneratedAt?: string;
  offlineDurationMinutes?: number;
  operations: SyncOperation[]; // 1 à 100
}

type SyncOperationOutcome = 'APPLIED' | 'DUPLICATE' | 'REJECTED' | 'CONFLICT' | 'SKIPPED';

interface SyncOperationResult {
  clientRef: string;
  type: SyncOperationType;
  outcome: SyncOperationOutcome;
  resourceType?: string; // « cash_receipts », « documents »
  resourceId?: string;
  code?: string; // code d'erreur métier, ex. BILLING.INVOICE_NOT_OPEN
  message?: string; // message en français, affichable au démarcheur
  retryable?: boolean; // faux pour un conflit ou un rejet définitif
}

interface SyncBatchResult {
  batchId: string;
  batchRef: string;
  status: 'APPLIED' | 'PARTIALLY_APPLIED' | 'REJECTED' | 'FAILED';
  operationsCount: number;
  appliedCount: number;
  rejectedCount: number;
  conflictsCount: number;
  receivedAt: string;
  appliedAt: string | null;
  results: SyncOperationResult[];
}
```

**Règles d'application.**

- Les opérations sont triées par `dependsOn` puis par `clientCreatedAt`. Une opération dont une dépendance n'a pas été appliquée est `SKIPPED` avec le code `SYNC.DEPENDENCY_REJECTED`.
- Chaque opération réutilise le cas d'usage en ligne existant, avec le même `clientRef` : la contrainte d'unicité `(organization_id, client_ref)` garantit l'absence de doublon. Un `clientRef` déjà connu renvoie `DUPLICATE` avec l'identifiant de la ressource existante, sans rien créer ni modifier.
- Toute ressource créée par un lot porte `sync_batch_id`, ce qui permet de retrouver l'origine d'un encaissement.
- `REJECTED` : règle métier violée de façon définitive, par exemple un montant invalide. `CONFLICT` : l'état du serveur a changé pendant que l'appareil était hors ligne, par exemple une facture annulée ou déjà soldée, ou un bail clôturé. Un conflit n'est jamais résolu automatiquement.
- **Rejeu d'un lot** : renvoyer le même `batchRef` depuis le même appareil renvoie le résultat mémorisé, avec le même corps, sans retraitement, grâce à `sync_batches_ref_uk`. En cours de traitement, la réponse est `409 SYNC.BATCH_IN_PROGRESS`.
- Un lot dont **toutes** les opérations échouent est `REJECTED`. Un lot mêlant succès et échecs est `PARTIALLY_APPLIED`. Une erreur technique donne `FAILED` avec `error_message`.
- Taille maximale : 100 opérations et 1 Mo de corps par lot, hors fichiers. Au-delà : `413 SYNC.BATCH_TOO_LARGE`.

## Pièces jointes hors ligne

Une signature ou une photo créée hors ligne ne peut pas emprunter le chemin des URL signées, qui exige une connexion au moment de la capture. Le protocole retient donc deux temps :

1. L'appareil stocke le fichier localement et crée une opération `DOCUMENT` portant son propre `clientRef`.
2. Au moment de la synchronisation, le mobile téléverse d'abord les fichiers par la route existante `/v1/documents/upload-url` puis `/v1/documents` (en ligne, donc disponible), et place le `documentId` obtenu dans le `payload` de l'opération `CASH_RECEIPT` correspondante, via `dependsOn`.

Une opération `DOCUMENT` acceptée renvoie `resourceType: "documents"` et l'identifiant à réutiliser. Les fichiers dépassant la taille configurée sont refusés côté mobile avant l'envoi.

## Téléchargement du périmètre du démarcheur

`GET /v1/sync/pull` renvoie les données de référence nécessaires à une tournée, strictement limitées au périmètre du démarcheur : les baux dont il est le collecteur, leurs lots et immeubles, les locataires correspondants, les factures ouvertes, ses propres reçus de caisse et sa remise en cours. Un `MANAGER` ou un `OWNER` reçoit le même périmètre que celui de son organisation.

```ts
interface SyncPullResult {
  serverTime: string;
  nextCursor: string; // à repasser en « since » au prochain appel
  hasMore: boolean;
  retentionHours: number; // au-delà, le mobile purge sa base locale
  changed: {
    properties: PropertySummary[];
    units: Unit[];
    tenants: Tenant[];
    leases: LeaseSummary[];
    invoices: InvoiceSummary[];
    cashReceipts: CashReceiptSummary[];
    remittances: RemittanceSummary[];
  };
  deleted: { resourceType: string; id: string }[];
}
```

Le curseur encode l'horodatage serveur de la dernière modification vue et l'identifiant de la dernière ligne, signé comme les curseurs de pagination existants. Un appel sans `since` renvoie le périmètre complet. Les suppressions logiques et les sorties de périmètre, par exemple un bail réaffecté à un autre collecteur, apparaissent dans `deleted`.

## Conflits

```ts
interface SyncConflict {
  id: string; // batchId + clientRef, encodé
  batchId: string;
  clientRef: string;
  type: SyncOperationType;
  code: string;
  message: string;
  payload: unknown; // corps d'origine, pour rejouer après décision
  collector: { userId: string; fullName: string };
  deviceId: string;
  clientCreatedAt: string;
  receivedAt: string;
  resolvedAt: string | null;
  resolution: 'APPLIED' | 'DISCARDED' | null;
}
```

`POST /v1/sync/conflicts/{id}/resolve` accepte deux décisions, réservées à un `MANAGER` :

- `{ "decision": "APPLY", "overrides": { "invoiceId": "…", "autoAllocate": true } }` : l'opération est rejouée avec les corrections indiquées. Le `clientRef` d'origine est conservé, donc un encaissement déjà créé ne sera jamais dupliqué.
- `{ "decision": "DISCARD", "reason": "…" }` : l'opération est abandonnée, le motif est enregistré et le démarcheur en est informé.

Toute résolution écrit dans `audit_logs` et met à jour `sync_batches.result`.

## Configuration mobile

`GET /v1/mobile/config` renvoie les paramètres que l'application applique sans être recompilée :

```ts
interface MobileConfig {
  maxPhotoBytes: number; // défaut 1 500 000
  photoMaxDimension: number; // défaut 1600
  photoQuality: number; // défaut 80
  maxSignatureBytes: number; // défaut 200 000
  retentionHours: number; // défaut 72 : purge locale au-delà
  syncIntervalSeconds: number; // défaut 300 en tâche de fond
  maxOperationsPerBatch: number; // défaut 50
  offlineWritesEnabled: boolean; // permet de couper le mode hors ligne à distance
}
```

## Routes

| Méthode | Route                                                                | Rôle                       | Sortie                                                                            |
| :------ | :------------------------------------------------------------------- | :------------------------- | :-------------------------------------------------------------------------------- |
| POST    | `/v1/sync/batches`                                                   | COLLECTOR                  | `200 SyncBatchResult` ; `409 SYNC.BATCH_IN_PROGRESS` ; `413 SYNC.BATCH_TOO_LARGE` |
| GET     | `/v1/sync/batches/{id}`                                              | COLLECTOR auteur / MANAGER | `200 SyncBatchResult`                                                             |
| GET     | `/v1/sync/batches?collectorUserId=&status=&from=&to=&limit=&cursor=` | MANAGER                    | `200 { items: SyncBatchSummary[], pageInfo }`                                     |
| GET     | `/v1/sync/pull?since=&limit=`                                        | COLLECTOR                  | `200 SyncPullResult`                                                              |
| GET     | `/v1/sync/conflicts?resolved=&collectorUserId=&limit=&cursor=`       | MANAGER                    | `200 { items: SyncConflict[], pageInfo }`                                         |
| POST    | `/v1/sync/conflicts/{id}/resolve`                                    | MANAGER                    | `200 { conflict: SyncConflict, result: SyncOperationResult }`                     |
| GET     | `/v1/sync/devices`                                                   | MANAGER                    | `200 { items: DeviceStatus[] }`                                                   |
| GET     | `/v1/mobile/config`                                                  | COLLECTOR                  | `200 MobileConfig`                                                                |

`DeviceStatus` : `{ deviceId, devicePlatform, appVersion, collector: { userId, fullName }, lastBatchAt, lastBatchStatus, pendingConflicts, totalApplied }`. Cet écran de supervision répond à la question « quel démarcheur n'a pas synchronisé depuis longtemps ».

## Côté mobile

- **Base locale chiffrée** : SQLCipher activé par défaut, clé aléatoire de 256 bits conservée dans le stockage sécurisé du système, jamais dans la base. Perte de la clé : réinitialisation par reconnexion et nouveau téléchargement du périmètre.
- **File d'attente** : la table `outbox` existante porte `clientRef`, type, corps, état (`PENDING`, `SENDING`, `SENT`, `FAILED`, `CONFLICT`), nombre de tentatives et dernier message d'erreur. Un élément en conflit reste visible avec une explication en français et ne bloque pas le reste.
- **Reprise** : envoi automatique au retour du réseau, par lots de `maxOperationsPerBatch`, avec repli exponentiel plafonné à cinq minutes. Le `batchRef` d'un lot en cours est conservé et rejoué tel quel après une coupure, jamais régénéré.
- **Purge** : au-delà de `retentionHours` sans synchronisation, les données de référence préchargées sont effacées. La file d'attente n'est **jamais** purgée automatiquement : elle contient de l'argent encaissé.
- **Indicateur permanent** : un badge affiche le nombre d'éléments en attente, en cours d'envoi et en erreur.

## Variables d'environnement nouvelles

`SYNC_MAX_OPERATIONS_PER_BATCH=100`, `SYNC_MAX_BODY_BYTES=1048576`, `MOBILE_RETENTION_HOURS=72`, `MOBILE_OFFLINE_WRITES_ENABLED=true`.
