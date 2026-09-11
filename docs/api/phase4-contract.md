# Contrat d'API — Phase 4 (Mobile Money à deux modes, virement déclaré, webhooks)

Complète les contrats des phases 0 à 3 (mêmes conventions). Tables : `mobile_money_transactions` (canaux `AGGREGATOR` et `DECLARED`), `bank_transfer_declarations`, `webhook_events`, `idempotency_keys`, `payments`, `payment_allocations`, `tenant_credits`, `rent_invoices`, `receipts`, `bank_accounts`, `documents`, `organization_settings`, `feature_flags`, `message_logs`, `audit_logs`. Aucune modification du DDL. Remplacé par `openapi.json` dès export.

## Arbitrages de ce contrat (ils priment sur le plan de phases)

1. **Une déclaration ne crée pas de paiement.** Mobile Money déclaré comme virement déclaré : seule la déclaration est enregistrée. Le `payment` naît à la validation par un ACCOUNTANT ou un MANAGER. Un rejet ne laisse donc aucune ligne dans `payments`.
2. **La validation humaine est une preuve externe** au sens de l'invariant 2 de l'architecture (§8.5). Une déclaration Mobile Money validée crée un paiement `CONFIRMED`, alloué, avec quittance.
3. **Virement : deux politiques au choix de l'organisation** (`paymentMethods.bankTransfer.confirmOnApproval`, défaut `true`). Si `true`, la validation crée un paiement `CONFIRMED`, alloué, avec quittance ; le rapprochement de la phase 6 viendra seulement pointer la ligne de relevé (`matched_statement_line_id`). Si `false`, la validation crée un paiement `PENDING_VERIFICATION` non alloué, et la facture affiche « paiement déclaré, en attente de confirmation bancaire » jusqu'au rapprochement.
4. **Statuts d'une transaction déclarée** : `DECLARED` → `SUCCEEDED` (validée) ou `REJECTED` (rejetée), ou `CANCELLED` (retirée par le déclarant). Ouvrir une déclaration pour l'instruire ne change pas son statut.
5. **Pas de rôle TENANT en phase 4.** Le portail locataire arrive en phase 10. En phase 4, un MANAGER, un ACCOUNTANT ou un COLLECTOR déclare ou initie pour le compte du locataire.
6. **Mode agrégateur livré derrière un double verrou** : le drapeau plateforme `payments.mobile_money_aggregator` (table `feature_flags`, désactivé par défaut) et le paramètre d'organisation `paymentMethods.mobileMoneyAggregator.enabled`. Il est développé et recetté contre un simulateur ; l'adaptateur CinetPay est écrit mais ne sera activé qu'après signature du contrat.

## Énumérations utilisées (valeurs exactes du DDL)

- `MomoProvider` : MTN_MOMO, AIRTEL_MONEY, CINETPAY, PAWAPAY, OTHER. `MomoChannel` : AGGREGATOR, DECLARED. `MomoStatus` : INITIATED, PENDING, DECLARED, SUCCEEDED, FAILED, EXPIRED, CANCELLED, REJECTED, REFUNDED.
- `DeclarationStatus` (virement) : SUBMITTED, UNDER_REVIEW, MATCHED, APPROVED, REJECTED, CANCELLED. `MATCHED` est réservé à la phase 6.
- `WebhookSource` : CINETPAY, PAWAPAY, MTN_MOMO, AIRTEL_MONEY, WHATSAPP_CLOUD, SMS_GATEWAY, OTHER. `WebhookStatus` : RECEIVED, PROCESSING, PROCESSED, IGNORED, FAILED.

## Paramètres d'organisation (`organization_settings.settings_json.paymentMethods`)

```ts
interface PaymentMethodsSettings {
  mobileMoneyDeclared: { enabled: boolean }; // défaut true
  mobileMoneyAggregator: {
    enabled: boolean; // défaut false
    provider: 'SIMULATOR' | 'CINETPAY'; // défaut SIMULATOR hors production
    feeBearer: 'TENANT' | 'ORGANIZATION'; // défaut TENANT
    feeRateBps: number; // défaut 300 : estimation affichée avant validation
    minAmount: number; // défaut 500 XAF
    maxAmount: number; // défaut 2000000 XAF
  };
  bankTransfer: { enabled: boolean; confirmOnApproval: boolean }; // défauts true, true
  pendingExpiryMinutes: number; // défaut 120 : fenêtre de rattrapage avant EXPIRED
}
```

Exposés par `GET/PATCH /v1/organizations/{id}/payment-methods` (lecture MANAGER, écriture OWNER). La réponse ajoute `aggregatorAvailable: boolean`, vrai seulement si le drapeau plateforme est actif.

**Où payer.** Les numéros Mobile Money et comptes de réception sont les `bank_accounts` actifs existants (phase 1) : d'abord ceux du bailleur du bail (`holder_type = LANDLORD`), sinon ceux de l'organisation. Un compte Mobile Money est un `bank_account` avec `momo_provider` et `momo_msisdn`.

## Mobile Money déclaré

- **Déclarer** : `POST /v1/payments/mobile-money/declarations` crée une `mobile_money_transactions` avec `channel = DECLARED`, `status = DECLARED`, `provider` (MTN_MOMO ou AIRTEL_MONEY), `provider_transaction_id` = référence opérateur saisie (normalisée : majuscules, espaces retirés), `payer_msisdn` (E.164), `payee_msisdn` = numéro de réception choisi, `amount`, `invoice_id` facultatif, `proof_document_id` facultatif (capture d'écran), `declared_by_user_id`, `merchant_reference` = `MMD-{YYYYMM}-{seq}`. Une même référence opérateur ne sert qu'une fois : 409 `MOMO.REFERENCE_ALREADY_USED` (contrainte `momo_provider_tx_uk`). Le gestionnaire est notifié. Idempotence par `clientRef`.
- **Valider** : `POST …/declarations/{id}/approve` crée dans une transaction le `payment` (méthode MOBILE_MONEY, `CONFIRMED`, `fee_amount = 0`, `external_reference` = référence opérateur, référence `PAY-{YYYYMM}-{seq}`), l'imputation (facture visée d'abord si fournie, sinon règle « plus ancienne facture » de la phase 3, reliquat en crédit), passe la transaction `SUCCEEDED` avec `verified_by_user_id` et `verified_at`, relie `payment_id`, déclenche la quittance si la facture est soldée. Montant corrigé possible à la validation (`approvedAmount`, motif obligatoire si différent, audité).
- **Rejeter** : `POST …/declarations/{id}/reject { reason }` → `REJECTED`, `rejection_reason`, locataire notifié par le pipeline de messagerie, aucun paiement.
- **Retirer** : `POST …/declarations/{id}/cancel { reason }` par le déclarant ou un MANAGER → `CANCELLED`, seulement depuis `DECLARED`.

## Mobile Money agrégateur

- **Port** `MobileMoneyProvider` (architecture §8.2.2) : `initiate`, `getStatus`, `parseWebhook`, `verifyWebhook`. Implémentations : `SimulatedMobileMoneyProvider` (développement, tests, CI) et `CinetPayProvider`. Aucune condition sur le nom du fournisseur hors de `infrastructure/mobile-money/`.
- **Simulateur**, piloté par les deux derniers chiffres du numéro payeur : `…01` succès après webhook ; `…02` échec ; `…03` aucune réponse, pour tester le rattrapage puis l'expiration ; `…04` succès mais `getStatus` renvoie un montant différent ; `…05` webhook envoyé deux fois ; `…06` webhook qui arrive avant la réponse d'initiation. Tout autre suffixe : succès. Le simulateur envoie ses webhooks signés vers l'API elle-même après un délai configurable (`MOMO_SIMULATOR_DELAY_MS`, défaut 1500).
- **Devis** : `POST /v1/payments/mobile-money/quote { invoiceId?, amount }` → `{ amount, feeAmount, totalDebited, netReceived, feeBearer }` à partir de `feeRateBps` ; affiché avant validation.
- **Initier** : `POST /v1/payments/mobile-money/initiate { invoiceId?, tenantId, amount, payerMsisdn, clientRef }` crée en une transaction le `payment` (MOBILE_MONEY, `PENDING`) et la transaction (`AGGREGATOR`, `INITIATED`, `aggregator` = nom du fournisseur, `merchant_reference` = `MMA-{YYYYMM}-{seq}` utilisé comme `externalReference` idempotent chez le fournisseur), appelle `initiate` (timeout 10 s, 2 tentatives avec la même référence), enregistre `aggregator_transaction_id` et passe `PENDING`. Réponse `202`. Opérateur déduit du préfixe : 06 MTN, 05 Airtel ; sinon 422 `MOMO.OPERATOR_UNKNOWN`. Hors bornes : 422 `MOMO.AMOUNT_OUT_OF_RANGE`. Mode inactif : 409 `MOMO.AGGREGATOR_DISABLED`.
- **Webhook** : `POST /v1/webhooks/mobile-money/{provider}` persiste d'abord le brut dans `webhook_events` (source, en-têtes, IP, `external_event_id` fourni ou SHA-256 du corps, `signature_valid`), répond `200` en moins de 500 ms, puis met en file `momo:verify-status`. Doublon (`webhook_events_external_uk`) : `200` sans retraitement. Signature invalide : conservé avec `signature_valid = false`, statut `IGNORED`, aucun effet, alerte journalisée au niveau `warn` avec le code `MOMO.WEBHOOK_SIGNATURE_INVALID`.
- **Confirmation** : seul le job `momo:verify-status` peut confirmer, à partir de `getStatus` (timeout 8 s, 5 tentatives exponentielles). `SUCCEEDED` avec montant et devise conformes → transaction `SUCCEEDED`, `fee_amount` réel, `payment CONFIRMED`, imputation, quittance. Montant divergent → paiement `PENDING_VERIFICATION`, code `MOMO.STATUS_MISMATCH`, audit et alerte ; le montant du fournisseur fait foi en cas de validation manuelle ultérieure. `FAILED` → transaction `FAILED`, `payment REJECTED`. Idempotence : un paiement déjà `CONFIRMED` n'est jamais reconfirmé ; une clé `idempotency_keys` de portée `momo:verify-status:{transactionId}` protège le traitement.
- **Rattrapage** : job `momo:reconcile-pending` toutes les 5 minutes, sur les transactions `PENDING` de plus de 3 minutes, avec repli 3, 5, 10, 20, 30 minutes dans la fenêtre `pendingExpiryMinutes`. Au-delà : transaction `EXPIRED`, `payment CANCELLED`, facture inchangée. Un fournisseur injoignable ne fait jamais annuler un paiement : 503 `MOMO.PROVIDER_UNAVAILABLE` sur les appels synchrones, le job reprend ensuite.
- **Frais** : l'imputation porte toujours sur `amount`, jamais sur le net. `feeBearer = TENANT` : débit de `amount + fee`, `net_amount = amount`. `feeBearer = ORGANIZATION` : débit de `amount`, `net_amount = amount − fee`. Les frais figurent sur la quittance à titre informatif.
- **CinetPay** : adaptateur conforme à l'API de paiement CinetPay (initialisation, vérification du statut, notification signée par jeton HMAC dans l'en-tête `x-token`). Variables `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY`, `CINETPAY_BASE_URL`. Les noms de champs non vérifiables sans compte sont isolés dans un seul fichier de correspondance et signalés comme « à confirmer avec la documentation marchande » dans le README.

## Virement déclaré

- **Instructions de paiement** : `GET /v1/invoices/{id}/payment-instructions` → `{ transferReference, bankAccounts: BankAccountSummary[], mobileMoneyNumbers: { provider, msisdn, holderName }[], aggregatorAvailable }`. La référence de virement est le numéro de la facture (`LOY-{YYYYMM}-{seq}`), repris par le rapprochement de la phase 6. `GET /v1/leases/{id}/payment-instructions` renvoie la même structure pour la plus ancienne facture ouverte du bail.
- **Déclarer** : `POST /v1/bank-transfer-declarations` crée la déclaration `SUBMITTED` (montant, date d'exécution, banque et nom du payeur, référence utilisée, compte bénéficiaire, `invoiceId` facultatif, `proofDocumentId` obligatoire). La même preuve ne sert qu'une fois dans l'organisation : 409 `BANK.PROOF_ALREADY_USED`, contrôlé par `documents.checksum_sha256`. Idempotence par `clientRef`. Gestionnaire notifié.
- **Instruire** : `POST …/{id}/review` → `UNDER_REVIEW` et `reviewed_by_user_id` (prise en charge, facultative).
- **Valider** : `POST …/{id}/approve { approvedAmount?, reason? }` → `APPROVED`, création du paiement BANK_TRANSFER selon `confirmOnApproval` (arbitrage 3), `payment_id` relié.
- **Rejeter** : `POST …/{id}/reject { reason }` → `REJECTED`, locataire notifié, aucun paiement. **Retirer** : `POST …/{id}/cancel { reason }` depuis `SUBMITTED` ou `UNDER_REVIEW`.
- **Alerte** : une déclaration non traitée depuis plus de 72 heures ouvrées apparaît en tête de file avec un indicateur d'ancienneté.

## Routes

| Méthode | Route                                                                              | Rôle                                | Sortie                                                          |
| :------ | :--------------------------------------------------------------------------------- | :---------------------------------- | :-------------------------------------------------------------- |
| GET     | `/v1/organizations/{id}/payment-methods`                                           | MANAGER                             | `200 PaymentMethodsSettings & { aggregatorAvailable }`          |
| PATCH   | `/v1/organizations/{id}/payment-methods`                                           | OWNER                               | `200` idem                                                      |
| GET     | `/v1/invoices/{id}/payment-instructions`                                           | COLLECTOR                           | `200 PaymentInstructions`                                       |
| GET     | `/v1/leases/{id}/payment-instructions`                                             | COLLECTOR                           | `200 PaymentInstructions`                                       |
| POST    | `/v1/payments/mobile-money/declarations`                                           | COLLECTOR                           | `201 MomoTransaction` (200 si rejoué)                           |
| GET     | `/v1/payments/mobile-money/declarations?status=&from=&to=&limit=&cursor=`          | ACCOUNTANT                          | `200 { items: MomoTransaction[], pageInfo }`                    |
| POST    | `/v1/payments/mobile-money/declarations/{id}/approve`                              | ACCOUNTANT                          | `200 { transaction, payment: PaymentDetail }`                   |
| POST    | `/v1/payments/mobile-money/declarations/{id}/reject`                               | ACCOUNTANT                          | `200 MomoTransaction`                                           |
| POST    | `/v1/payments/mobile-money/declarations/{id}/cancel`                               | COLLECTOR (déclarant) / MANAGER     | `200 MomoTransaction`                                           |
| POST    | `/v1/payments/mobile-money/quote`                                                  | COLLECTOR                           | `200 MomoQuote`                                                 |
| POST    | `/v1/payments/mobile-money/initiate`                                               | COLLECTOR                           | `202 { transaction: MomoTransaction, payment: PaymentSummary }` |
| GET     | `/v1/payments/mobile-money/transactions?channel=&status=&from=&to=&limit=&cursor=` | ACCOUNTANT                          | `200 { items: MomoTransaction[], pageInfo }`                    |
| GET     | `/v1/payments/mobile-money/transactions/{id}`                                      | COLLECTOR (initiateur) / ACCOUNTANT | `200 MomoTransaction`                                           |
| POST    | `/v1/payments/mobile-money/transactions/{id}/refresh`                              | MANAGER                             | `200 MomoTransaction` (force `getStatus`)                       |
| POST    | `/v1/webhooks/mobile-money/{provider}`                                             | PUBLIC signé                        | `200`                                                           |
| GET     | `/v1/webhook-events?source=&status=&signatureValid=&from=&to=&limit=&cursor=`      | OWNER                               | `200 { items: WebhookEvent[], pageInfo }`                       |
| POST    | `/v1/webhook-events/{id}/replay`                                                   | OWNER                               | `202` (retraitement idempotent)                                 |
| POST    | `/v1/bank-transfer-declarations`                                                   | COLLECTOR                           | `201 TransferDeclaration` (200 si rejoué)                       |
| GET     | `/v1/bank-transfer-declarations?status=&from=&to=&limit=&cursor=`                  | ACCOUNTANT                          | `200 { items: TransferDeclaration[], pageInfo }`                |
| GET     | `/v1/bank-transfer-declarations/{id}`                                              | ACCOUNTANT / déclarant              | `200 TransferDeclaration`                                       |
| POST    | `/v1/bank-transfer-declarations/{id}/review`                                       | ACCOUNTANT                          | `200 TransferDeclaration`                                       |
| POST    | `/v1/bank-transfer-declarations/{id}/approve`                                      | ACCOUNTANT                          | `200 { declaration, payment: PaymentDetail }`                   |
| POST    | `/v1/bank-transfer-declarations/{id}/reject`                                       | ACCOUNTANT                          | `200 TransferDeclaration`                                       |
| POST    | `/v1/bank-transfer-declarations/{id}/cancel`                                       | déclarant / MANAGER                 | `200 TransferDeclaration`                                       |

`webhook_events` porte un `organization_id` nullable : la liste OWNER ne montre que les événements rattachés à son organisation. Un événement sans organisation résolue n'est visible que de l'administration plateforme.

## Types

```ts
interface MomoDeclarationInput {
  tenantId: string;
  leaseId?: string;
  invoiceId?: string;
  provider: 'MTN_MOMO' | 'AIRTEL_MONEY';
  operatorReference: string;
  payerMsisdn: string;
  payeeMsisdn: string;
  amount: number;
  paidAt?: string;
  proofDocumentId?: string;
  clientRef: string;
  notes?: string;
}
interface MomoApproveInput {
  approvedAmount?: number;
  reason?: string;
  allocations?: { invoiceId: string; amount: number }[];
}
interface MomoTransaction {
  id: string;
  channel: 'AGGREGATOR' | 'DECLARED';
  status: MomoStatus;
  provider: MomoProvider;
  aggregator: string | null;
  merchantReference: string;
  providerTransactionId: string | null;
  aggregatorTransactionId: string | null;
  payerMsisdn: string;
  payeeMsisdn: string | null;
  amount: number;
  feeAmount: number;
  feeBearer: 'TENANT' | 'ORGANIZATION' | 'LANDLORD' | 'SHARED';
  netAmount: number;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  paymentId: string | null;
  proofDocumentId: string | null;
  declaredByUserId: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  initiatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  statusCheckedAt: string | null;
  statusCheckCount: number;
}
interface MomoQuote {
  amount: number;
  feeAmount: number;
  totalDebited: number;
  netReceived: number;
  feeBearer: 'TENANT' | 'ORGANIZATION';
}
interface TransferDeclarationInput {
  tenantId: string;
  leaseId?: string;
  invoiceId?: string;
  declaredAmount: number;
  transferDate: string;
  transferReference?: string;
  payerName: string;
  payerBankCode?: string;
  payerBankName?: string;
  payerAccountNumber?: string;
  beneficiaryBankAccountId: string;
  proofDocumentId: string;
  clientRef: string;
  notes?: string;
}
interface TransferDeclaration extends TransferDeclarationInput {
  id: string;
  status: DeclarationStatus;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
  paymentId: string | null;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  matchedStatementLineId: string | null;
  ageHours: number;
  createdAt: string;
}
interface PaymentInstructions {
  transferReference: string | null;
  invoice: { id: string; invoiceNumber: string | null; balanceAmount: number } | null;
  bankAccounts: {
    id: string;
    bankName: string;
    accountHolderName: string;
    accountNumber: string | null;
    ribKey: string | null;
    iban: string | null;
  }[];
  mobileMoneyNumbers: {
    bankAccountId: string;
    provider: MomoProvider;
    msisdn: string;
    holderName: string;
  }[];
  aggregatorAvailable: boolean;
}
interface WebhookEvent {
  id: string;
  source: WebhookSource;
  eventType: string;
  status: WebhookStatus;
  externalEventId: string | null;
  signatureValid: boolean | null;
  receivedAt: string;
  processedAt: string | null;
  processingAttempts: number;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  rawPayload: unknown;
}
```

## Variables d'environnement nouvelles

`MOMO_PROVIDER_DEFAULT=SIMULATOR`, `MOMO_SIMULATOR_DELAY_MS=1500`, `MOMO_SIMULATOR_SECRET`, `MOMO_WEBHOOK_BASE_URL` (URL publique de rappel), `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY`, `CINETPAY_BASE_URL`.
