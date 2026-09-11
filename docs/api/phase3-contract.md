# Contrat d'API — Phase 3 (facturation, paiements, espèces, quittances, messagerie)

Complète les contrats des phases 0 à 2 (mêmes conventions). Tables : `rent_invoices`, `invoice_lines`, `penalty_rules`, `payments`, `payment_allocations`, `tenant_credits`, `cash_receipts`, `cash_remittances`, `cash_remittance_items`, `receipts`, `notification_templates`, `notifications`, `message_logs`, `sequences`, `documents`, `idempotency_keys`, `audit_logs`. Remplacé par `openapi.json` dès export.

## Énumérations (valeurs exactes du DDL)

- `InvoiceStatus` : DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED. `InvoiceLineType` : RENT, WATER_CHARGE, ELECTRICITY_CHARGE, SERVICE_CHARGE, PENALTY, DEPOSIT, AGENCY_FEE, REPAIR_REBILL, DISCOUNT, OTHER.
- `PaymentMethod` : CASH, MOBILE_MONEY, BANK_TRANSFER, BANK_CHECK. `PaymentStatus` : PENDING, PENDING_VERIFICATION, CONFIRMED, REJECTED, CANCELLED, REVERSED. `PaymentDirection` : INBOUND, OUTBOUND.
- `CreditStatus` : OPEN, PARTIALLY_USED, USED, REFUNDED, EXPIRED. `CashReceiptStatus` : DRAFT, ISSUED, REMITTED, CANCELLED. `RemittanceStatus` : OPEN, SUBMITTED, VERIFIED, DEPOSITED, REJECTED, CANCELLED. `ReceiptStatus` : DRAFT, GENERATING, ISSUED, SENT, CANCELLED.
- `NotificationChannel` : WHATSAPP, SMS, EMAIL, PUSH, IN_APP. `NotificationStatus` : SCHEDULED, QUEUED, SENT, FAILED, CANCELLED. `MessageStatus` : QUEUED, SENT, DELIVERED, READ, FAILED, REJECTED, EXPIRED. `PenaltyBasis` : RATE_BPS_PER_DAY, RATE_BPS_PER_MONTH, FLAT_AMOUNT, FLAT_AMOUNT_PER_DAY.

## Paramètres d'organisation (`organization_settings.settings_json`)

```ts
interface BillingSettings {
  generateDaysBefore: number; // défaut 5 : la facture est émise J-5 avant l'échéance
  autoIssue: boolean; // défaut true : ISSUED directement, sinon DRAFT
  defaultPenaltyRuleId: string | null; // règle appliquée aux baux sans penalty_rule_id
  applyPenalties: boolean; // défaut false en phase 3 (activé par organisation)
}
interface CashSettings {
  collectorHoldingCapAmount: number; // défaut 500000 XAF ; au-delà : alerte, pas de blocage
  requireTenantSignature: boolean; // défaut true ; sinon photo du reçu papier obligatoire
  denominationsEnabled: boolean; // saisie des coupures à la remise
}
interface MessagingSettings {
  receiptChannelOrder: ('WHATSAPP' | 'SMS')[]; // défaut ['WHATSAPP','SMS']
  sendCashReceiptToTenant: boolean; // défaut true
  sendInvoiceIssued: boolean; // défaut true : avis d'échéance à l'émission
}
```

Routes : `GET/PATCH /v1/organizations/{id}/settings` (phase 0) exposent désormais `billing`, `cash`, `messaging` en plus des champs existants.

## Moteur de facturation

- **Périodes** : pour un bail ACTIVE ou NOTICE_GIVEN, les périodes sont des mois civils (MONTHLY), trimestres (QUARTERLY), semestres (SEMI_ANNUAL) ou années (ANNUAL) alignés sur le mois de `startDate`. La première période commence à `startDate` (prorata au jour calendaire sur le mois réel via la fonction `prorata` de la phase 2) ; la dernière se termine à `endDate` ou à la date d'effet de résiliation (prorata). Aucune facture pour une période entièrement postérieure à la fin du bail.
- **Échéance** : `dueDate` = `periodStart` avec le jour `paymentDueDay` (borné au dernier jour du mois) ; `graceUntilDate = dueDate + graceDays`.
- **Cron quotidien `billing-daily`** (03:00 Africa/Brazzaville, BullMQ repeatable, idempotent, rejouable) : pour chaque bail éligible, si aucune facture n'existe pour la prochaine période non couverte et si `today ≥ dueDate − generateDaysBefore`, créer la facture (statut ISSUED si `autoIssue`, sinon DRAFT) avec ses lignes : RENT (loyer applicable à `periodStart` via `rent-at`), SERVICE_CHARGE si `chargesAmount > 0`. Numéro `LOY-{YYYYMM}-{seq}` (`next_sequence(org, 'RENT_INVOICE', YYYYMM)`) attribué à l'émission. `total = rent + charges + penalty + other − discount` ; `paid` et `balance` dérivés des affectations. Unicité `(lease_id, period_start)` garantie en base : la relance du cron ne crée rien. Le cron passe aussi ISSUED/PARTIALLY_PAID → OVERDUE quand `graceUntilDate < today`, et applique la pénalité (une ligne PENALTY par exécution éligible, selon `penalty_rules`, plafonnée par `capAmount`/`capRateBps`/`maxPeriods`, `lastPenaltyRunDate` mis à jour) uniquement si `billing.applyPenalties`.
- **Campagne manuelle** : `POST /v1/billing/runs` exécute la même logique immédiatement pour l'organisation (option `periodStart` pour cibler une période, `dryRun`) ; le rapport est conservé en mémoire/Redis 7 jours : `{ created, skipped, errors[] }`.
- **Machine à états facture** : DRAFT → ISSUED → PARTIALLY_PAID ↔ ISSUED (contre-passation) → PAID ; ISSUED/PARTIALLY_PAID → OVERDUE → PARTIALLY_PAID/PAID ; DRAFT/ISSUED/OVERDUE → CANCELLED (impossible si `paidAmount > 0` : 409 `BILLING.INVOICE_HAS_PAYMENTS`). Lignes modifiables uniquement en DRAFT (409 `BILLING.INVOICE_NOT_EDITABLE`). Toute transition écrit `audit_logs`.

## Paiements et imputation

- **Création** : `POST /v1/payments` crée un `payment` (référence `PAY-{YYYYMM}-{seq}`), statut CONFIRMED pour CASH et pour tout paiement saisi par un MANAGER/ACCOUNTANT avec `confirmed: true`, PENDING_VERIFICATION sinon (MOBILE_MONEY déclaré, BANK_TRANSFER, BANK_CHECK sont détaillés en phase 4 ; en phase 3 ils sont acceptés en PENDING_VERIFICATION puis confirmés via `POST /v1/payments/{id}/confirm`). `clientRef` (ULID) obligatoire depuis le mobile, optionnel depuis le web ; en-tête `Idempotency-Key` accepté : un même `clientRef` ou une même clé renvoie la réponse initiale (200, corps identique) sans créer de second paiement.
- **Imputation** (`allocations` explicites ou `autoAllocate: true`) : règle figée « la plus ancienne facture non soldée du locataire d'abord (par `dueDate` croissante), et au sein d'une facture : pénalités, puis charges, puis loyer » ; l'ordre intra-facture n'est qu'informatif (`allocationOrder`), l'affectation est portée par la facture. Chaque affectation écrit `payment_allocations` (append-only), met à jour `rent_invoices.paidAmount/balanceAmount/status` et `payments.allocatedAmount/unallocatedAmount` dans la même transaction. Reliquat → `tenant_credits` (origin OVERPAYMENT, statut OPEN) et une allocation `tenant_credit_id`. Invariant testé : somme des allocations + crédit = montant du paiement. Un crédit OPEN est imputable sur une facture ultérieure via `POST /v1/tenants/{id}/credits/{creditId}/apply` (crée un `payment` de méthode CASH ? non : crée uniquement des `payment_allocations` portant `tenant_credit_id` et la facture ; `used_amount` mis à jour).
- **Contre-passation** : `POST /v1/payments/{id}/reverse { reason }` : le paiement d'origine n'est pas modifié ; une écriture miroir est créée (`direction` opposée, `status` REVERSED, `reversalOfId`, `reference` `REV-{YYYYMM}-{seq}`) ; chaque allocation d'origine reçoit une allocation miroir (`isReversal: true`, `reversalOfId`) ; les factures repassent ISSUED ou OVERDUE selon `graceUntilDate` ; les crédits issus du paiement passent REFUNDED s'ils sont inutilisés (sinon 409 `PAYMENTS.CREDIT_ALREADY_USED`) ; les quittances liées passent CANCELLED avec motif ; les reçus de caisse liés passent CANCELLED (colonne de workflow). 409 `PAYMENTS.ALREADY_REVERSED`.
- **Quittance** : dès qu'une facture passe PAID, une `receipts` est créée (`QUI-{YYYYMM}-{seq}`, statut GENERATING), le worker PDF produit le document (gabarit quittance : bailleur ou agence, locataire, lot, période, montants loyer/charges/pénalités, mode de règlement et référence, QR code encodant `verificationUrl`), passe ISSUED, puis l'envoi est demandé (statut SENT si remis). Un paiement partiel n'émet pas de quittance ; le reçu de caisse en tient lieu.

## Espèces

- **Reçu de caisse** : `POST /v1/cash-receipts` (COLLECTOR ou plus ; au comptoir, le MANAGER est le collecteur) crée en une transaction : le `payment` (CASH, CONFIRMED, `receivedByUserId` = collecteur, coordonnées GPS facultatives), le `cash_receipt` (`CASH-{orgShort}-{collectorShort}-{seq}` via `next_sequence(org, 'CASH_RECEIPT:' + collectorUserId)`), les allocations (explicites ou automatiques), le document signature (PNG base64 dans `signatureDataUrl`, stocké via le module documents, `signatureHash` = sha256) ou la photo du reçu papier (`paperReceiptDocumentId`) si `requireTenantSignature = false`, puis met en file la génération du PDF du reçu (gabarit reçu de caisse, QR de vérification optionnel) et son envoi WhatsApp/SMS au locataire si `sendCashReceiptToTenant`. Idempotence par `clientRef`. Concurrence : 50 encaissements simultanés d'un même collecteur produisent une séquence continue.
- **Encours d'un collecteur** : somme des `cash_receipts` ISSUED (non REMITTED ni CANCELLED) ; `GET /v1/cash/collectors/{userId}/balance` renvoie `{ heldAmount, receiptsCount, oldestReceiptAt, capAmount, overCap }` ; `GET /v1/cash/collectors` liste tous les collecteurs de l'organisation avec ces indicateurs.
- **Remise** : `POST /v1/cash-remittances { cashReceiptIds[], declaredAmount, denominations?, clientRef? }` par le collecteur : statut SUBMITTED directement (OPEN n'est utilisé que si `submit: false`, brouillon), `expectedAmount` = somme des reçus, une seule remise OPEN/SUBMITTED par collecteur (index partiel DDL, 409 `CASH.REMITTANCE_ALREADY_OPEN`), reçus déjà remis refusés (409 `CASH.RECEIPT_ALREADY_REMITTED`). `POST /v1/cash-remittances/{id}/verify { countedAmount, items?: [{ cashReceiptId, isVerified, varianceAmount?, varianceReason? }], notes? }` par un MANAGER : `varianceAmount = counted − expected`, statut VERIFIED (même avec écart : l'écart est enregistré et audité avec contrôleur et collecteur), reçus → REMITTED. `POST /v1/cash-remittances/{id}/reject { reason }` → REJECTED, reçus rendus ISSUED. `POST /v1/cash-remittances/{id}/deposit { bankAccountId, depositSlipDocumentId?, depositedAt }` → DEPOSITED. Référence `REM-{YYYYMM}-{seq}`.

## Messagerie

- **Interfaces** : `WhatsAppProvider` (sendTemplate, sendDocument, parseWebhook, verifyWebhookSignature) et `SmsProvider` (send, parseDeliveryWebhook). Implémentations : `MetaWhatsAppProvider` (Graph API v21+, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` pour la signature `X-Hub-Signature-256`, `WHATSAPP_VERIFY_TOKEN` pour la vérification du webhook GET), `AndroidGatewaySmsProvider` (application open source « SMS Gateway for Android » : `POST {SMS_GATEWAY_URL}/message` en Basic Auth, corps `{ message, phoneNumbers }`, webhooks `sms:sent` / `sms:delivered` / `sms:failed`), `FakeWhatsAppProvider` et `FakeSmsProvider` (dev/test, journalisent et simulent l'échec pour les numéros finissant par `99`). Sélection par `WHATSAPP_PROVIDER=meta|fake`, `SMS_PROVIDER=android_gateway|fake`.
- **Pipeline** : `NotificationService.enqueue({ templateCode, channelOrder, recipient, variables, attachments?, relatedEntity, dedupeKey })` crée `notifications` (SCHEDULED → QUEUED) puis un job BullMQ `notifications` qui tente les canaux dans l'ordre : WhatsApp (template approuvé `providerTemplateName` + pièce jointe PDF par lien signé longue durée 7 jours) ; en cas d'échec de remise (erreur Meta 131026 numéro sans WhatsApp, 131047, ou tout échec) → SMS de repli contenant le texte court + lien vers le PDF et la page de vérification. Chaque tentative écrit `message_logs` (provider, providerMessageId, statut, coût estimé, payload brut). Webhooks `POST /v1/webhooks/whatsapp` et `POST /v1/webhooks/sms` mettent à jour `message_logs.status` (SENT → DELIVERED → READ / FAILED) par `providerMessageId`, stockent l'événement brut dans `webhook_events`, sont idempotents. Rejet des webhooks non signés (401).
- **Templates** (`notification_templates`, `isSystem` semés par organisation à la création, modifiables) : `RECEIPT_ISSUED` (quittance), `CASH_RECEIPT_ISSUED` (reçu de caisse), `INVOICE_ISSUED` (avis d'échéance), `OTP_CODE` (déjà en phase 0), chacun en WHATSAPP (avec `providerTemplateName`/`providerTemplateLang` fr) et SMS (texte ≤ 2 segments). Variables : `{{tenantName}}`, `{{amount}}`, `{{period}}`, `{{receiptNumber}}`, `{{link}}`, `{{organizationName}}`.
- **Vérification publique** : `GET /v1/public/receipts/verify/{token}` (sans auth, limité en débit) → `{ receiptNumber, issueDate, period, totalAmount, landlordDisplayName, organizationName, status }` ; jamais de téléphone ni d'adresse du locataire, seulement son nom ; token inconnu ou falsifié → 404. Page HTML équivalente servie par le web sur `/verifier/{token}`.

## Routes

| Méthode | Route                                                                                               | Rôle                                                                      | Entrée                                                                                              | Sortie                                                                                                                                                                                                                       |
| :------ | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/v1/invoices?status=&period=YYYY-MM&propertyId=&leaseId=&tenantId=&overdueOnly=&q=&limit=&cursor=` | ACCOUNTANT (COLLECTOR : seulement ses lots via `collectorUserId` du bail) | —                                                                                                   | `200 { items: InvoiceSummary[], pageInfo }`                                                                                                                                                                                  |
| GET     | `/v1/invoices/{id}`                                                                                 | ACCOUNTANT / COLLECTOR affecté                                            | —                                                                                                   | `200 InvoiceDetail`                                                                                                                                                                                                          |
| POST    | `/v1/invoices`                                                                                      | MANAGER                                                                   | `{ leaseId, periodStart, periodEnd, dueDate?, lines: InvoiceLineInput[], notes?, issue?: boolean }` | `201 InvoiceDetail` ; 409 `BILLING.PERIOD_ALREADY_INVOICED`                                                                                                                                                                  |
| POST    | `/v1/invoices/{id}/lines`                                                                           | MANAGER                                                                   | `InvoiceLineInput`                                                                                  | `201 InvoiceDetail` ; 409 `BILLING.INVOICE_NOT_EDITABLE`                                                                                                                                                                     |
| DELETE  | `/v1/invoices/{id}/lines/{lineId}`                                                                  | MANAGER                                                                   | —                                                                                                   | `200 InvoiceDetail` (DRAFT seulement)                                                                                                                                                                                        |
| POST    | `/v1/invoices/{id}/issue`                                                                           | MANAGER                                                                   | —                                                                                                   | `200 InvoiceDetail` (numéro attribué, avis d'échéance envoyé si `sendInvoiceIssued`)                                                                                                                                         |
| POST    | `/v1/invoices/{id}/cancel`                                                                          | MANAGER                                                                   | `{ reason }`                                                                                        | `200 InvoiceDetail` ; 409 `BILLING.INVOICE_HAS_PAYMENTS`                                                                                                                                                                     |
| GET     | `/v1/invoices/{id}/pdf`                                                                             | ACCOUNTANT / COLLECTOR affecté                                            | —                                                                                                   | `200 { downloadUrl, expiresAt }` (génération à la demande, mise en cache dans `documents`)                                                                                                                                   |
| POST    | `/v1/billing/runs`                                                                                  | OWNER                                                                     | `{ periodStart?: string, dryRun?: boolean }`                                                        | `202 { runId }`                                                                                                                                                                                                              |
| GET     | `/v1/billing/runs/{runId}`                                                                          | MANAGER                                                                   | —                                                                                                   | `200 { runId, status: "RUNNING" \| "DONE" \| "FAILED", startedAt, finishedAt, created: number, skipped: number, errors: { leaseId, reason }[] }`                                                                             |
| GET     | `/v1/billing/dashboard?period=YYYY-MM`                                                              | MANAGER                                                                   | —                                                                                                   | `200 { period, expectedAmount, collectedAmount, outstandingAmount, overdueAmount, invoicesCount, paidCount, byProperty: { propertyId, name, expected, collected, outstanding }[], byMethod: Record<PaymentMethod, number> }` |
| GET     | `/v1/penalty-rules`                                                                                 | MANAGER                                                                   | —                                                                                                   | `200 { items: PenaltyRule[] }`                                                                                                                                                                                               |
| POST    | `/v1/penalty-rules`                                                                                 | OWNER                                                                     | `PenaltyRuleInput`                                                                                  | `201 PenaltyRule`                                                                                                                                                                                                            |
| PATCH   | `/v1/penalty-rules/{id}`                                                                            | OWNER                                                                     | `Partial<PenaltyRuleInput>`                                                                         | `200 PenaltyRule`                                                                                                                                                                                                            |
| POST    | `/v1/payments`                                                                                      | COLLECTOR                                                                 | `PaymentInput`                                                                                      | `201 PaymentDetail` (200 si rejoué par clientRef / Idempotency-Key)                                                                                                                                                          |
| GET     | `/v1/payments?method=&status=&tenantId=&leaseId=&from=&to=&limit=&cursor=`                          | ACCOUNTANT                                                                | —                                                                                                   | `200 { items: PaymentSummary[], pageInfo }`                                                                                                                                                                                  |
| GET     | `/v1/payments/{id}`                                                                                 | ACCOUNTANT / COLLECTOR auteur                                             | —                                                                                                   | `200 PaymentDetail`                                                                                                                                                                                                          |
| POST    | `/v1/payments/{id}/allocations`                                                                     | ACCOUNTANT                                                                | `{ allocations: { invoiceId, amount }[] }`                                                          | `200 PaymentDetail` ; 409 `PAYMENTS.OVER_ALLOCATED`, `PAYMENTS.INVOICE_NOT_OPEN`                                                                                                                                             |
| POST    | `/v1/payments/{id}/confirm`                                                                         | ACCOUNTANT                                                                | `{ valueDate?, note? }`                                                                             | `200 PaymentDetail` (PENDING_VERIFICATION → CONFIRMED, imputation automatique si `autoAllocate` avait été demandé)                                                                                                           |
| POST    | `/v1/payments/{id}/reject`                                                                          | ACCOUNTANT                                                                | `{ reason }`                                                                                        | `200 PaymentDetail`                                                                                                                                                                                                          |
| POST    | `/v1/payments/{id}/reverse`                                                                         | ACCOUNTANT                                                                | `{ reason }`                                                                                        | `200 { original: PaymentDetail, reversal: PaymentDetail }` ; 409 `PAYMENTS.ALREADY_REVERSED`, `PAYMENTS.CREDIT_ALREADY_USED`                                                                                                 |
| GET     | `/v1/tenants/{id}/credits`                                                                          | ACCOUNTANT                                                                | —                                                                                                   | `200 { remainingAmount, items: TenantCredit[] }`                                                                                                                                                                             |
| POST    | `/v1/tenants/{id}/credits/{creditId}/apply`                                                         | ACCOUNTANT                                                                | `{ invoiceId, amount? }`                                                                            | `200 { credit: TenantCredit, invoice: InvoiceDetail }`                                                                                                                                                                       |
| GET     | `/v1/tenants/{id}/statement?from=&to=`                                                              | ACCOUNTANT                                                                | —                                                                                                   | `200 { openingBalance, lines: { date, type: "INVOICE" \| "PAYMENT" \| "REVERSAL" \| "CREDIT", reference, debit, credit, balance }[], closingBalance }`                                                                       |
| POST    | `/v1/cash-receipts`                                                                                 | COLLECTOR                                                                 | `CashReceiptInput`                                                                                  | `201 CashReceiptDetail` (200 si rejoué) ; 409 `CASH.SIGNATURE_REQUIRED`                                                                                                                                                      |
| GET     | `/v1/cash-receipts?collectorUserId=&status=&from=&to=&limit=&cursor=`                               | ACCOUNTANT (COLLECTOR : les siens)                                        | —                                                                                                   | `200 { items: CashReceiptSummary[], pageInfo }`                                                                                                                                                                              |
| GET     | `/v1/cash-receipts/{id}`                                                                            | ACCOUNTANT / COLLECTOR auteur                                             | —                                                                                                   | `200 CashReceiptDetail`                                                                                                                                                                                                      |
| GET     | `/v1/cash-receipts/{id}/pdf`                                                                        | COLLECTOR auteur / ACCOUNTANT                                             | —                                                                                                   | `200 { downloadUrl, expiresAt }`                                                                                                                                                                                             |
| POST    | `/v1/cash-receipts/{id}/send`                                                                       | COLLECTOR auteur / MANAGER                                                | `{ channel?: NotificationChannel }`                                                                 | `202 { notificationId }`                                                                                                                                                                                                     |
| GET     | `/v1/cash/collectors`                                                                               | MANAGER                                                                   | —                                                                                                   | `200 { items: CollectorBalance[] }`                                                                                                                                                                                          |
| GET     | `/v1/cash/collectors/{userId}/balance`                                                              | MANAGER (COLLECTOR : lui-même)                                            | —                                                                                                   | `200 CollectorBalance`                                                                                                                                                                                                       |
| POST    | `/v1/cash-remittances`                                                                              | COLLECTOR                                                                 | `RemittanceInput`                                                                                   | `201 RemittanceDetail`                                                                                                                                                                                                       |
| GET     | `/v1/cash-remittances?status=&collectorUserId=&limit=&cursor=`                                      | MANAGER (COLLECTOR : les siennes)                                         | —                                                                                                   | `200 { items: RemittanceSummary[], pageInfo }`                                                                                                                                                                               |
| GET     | `/v1/cash-remittances/{id}`                                                                         | MANAGER / COLLECTOR auteur                                                | —                                                                                                   | `200 RemittanceDetail`                                                                                                                                                                                                       |
| POST    | `/v1/cash-remittances/{id}/submit`                                                                  | COLLECTOR auteur                                                          | —                                                                                                   | `200 RemittanceDetail` (OPEN → SUBMITTED)                                                                                                                                                                                    |
| POST    | `/v1/cash-remittances/{id}/verify`                                                                  | MANAGER                                                                   | `RemittanceVerifyInput`                                                                             | `200 RemittanceDetail`                                                                                                                                                                                                       |
| POST    | `/v1/cash-remittances/{id}/reject`                                                                  | MANAGER                                                                   | `{ reason }`                                                                                        | `200 RemittanceDetail`                                                                                                                                                                                                       |
| POST    | `/v1/cash-remittances/{id}/deposit`                                                                 | ACCOUNTANT                                                                | `{ bankAccountId, depositedAt, depositSlipDocumentId? }`                                            | `200 RemittanceDetail`                                                                                                                                                                                                       |
| GET     | `/v1/receipts?tenantId=&leaseId=&period=&status=&limit=&cursor=`                                    | VIEWER                                                                    | —                                                                                                   | `200 { items: ReceiptSummary[], pageInfo }`                                                                                                                                                                                  |
| GET     | `/v1/receipts/{id}`                                                                                 | VIEWER                                                                    | —                                                                                                   | `200 ReceiptDetail`                                                                                                                                                                                                          |
| GET     | `/v1/receipts/{id}/pdf`                                                                             | VIEWER                                                                    | —                                                                                                   | `200 { downloadUrl, expiresAt }`                                                                                                                                                                                             |
| POST    | `/v1/receipts/{id}/send`                                                                            | MANAGER                                                                   | `{ channel?: NotificationChannel }`                                                                 | `202 { notificationId }`                                                                                                                                                                                                     |
| GET     | `/v1/public/receipts/verify/{token}`                                                                | PUBLIC                                                                    | —                                                                                                   | `200 ReceiptVerification` ; 404                                                                                                                                                                                              |
| GET     | `/v1/notification-templates`                                                                        | MANAGER                                                                   | —                                                                                                   | `200 { items: NotificationTemplate[] }`                                                                                                                                                                                      |
| PATCH   | `/v1/notification-templates/{id}`                                                                   | OWNER                                                                     | `{ body?, subject?, providerTemplateName?, providerTemplateLang?, isActive? }`                      | `200 NotificationTemplate`                                                                                                                                                                                                   |
| POST    | `/v1/notification-templates/{id}/test`                                                              | MANAGER                                                                   | `{ phone }`                                                                                         | `202 { notificationId }`                                                                                                                                                                                                     |
| GET     | `/v1/message-logs?channel=&status=&relatedEntityType=&relatedEntityId=&from=&to=&limit=&cursor=`    | MANAGER                                                                   | —                                                                                                   | `200 { items: MessageLog[], pageInfo }`                                                                                                                                                                                      |
| POST    | `/v1/message-logs/{id}/retry`                                                                       | MANAGER                                                                   | —                                                                                                   | `202 { notificationId }`                                                                                                                                                                                                     |
| GET     | `/v1/webhooks/whatsapp?hub.mode=&hub.verify_token=&hub.challenge=`                                  | PUBLIC                                                                    | —                                                                                                   | `200 challenge`                                                                                                                                                                                                              |
| POST    | `/v1/webhooks/whatsapp`                                                                             | PUBLIC signé                                                              | payload Meta                                                                                        | `200`                                                                                                                                                                                                                        |
| POST    | `/v1/webhooks/sms`                                                                                  | PUBLIC signé (secret partagé)                                             | payload passerelle                                                                                  | `200`                                                                                                                                                                                                                        |

## Types

```ts
interface InvoiceLineInput {
  lineType: InvoiceLineType;
  label: string;
  description?: string;
  quantity?: number;
  unitPriceAmount: number;
  amount?: number;
  vatRateBps?: number;
  isCredit?: boolean;
  periodStart?: string;
  periodEnd?: string;
}
interface InvoiceLine extends InvoiceLineInput {
  id: string;
  invoiceId: string;
  amount: number;
  vatAmount: number;
  position: number;
}
interface InvoiceSummary {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  lease: { id: string; reference: string | null };
  tenant: { id: string; displayName: string; primaryPhone: string };
  unit: { id: string; code: string };
  property: { id: string; name: string };
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  graceUntilDate: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}
interface InvoiceDetail extends InvoiceSummary {
  rentAmount: number;
  chargesAmount: number;
  penaltyAmount: number;
  otherAmount: number;
  discountAmount: number;
  issueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  lines: InvoiceLine[];
  allocations: AllocationView[];
  receipt: ReceiptSummary | null;
  documentId: string | null;
  notes: string | null;
}
interface AllocationView {
  id: string;
  paymentId: string;
  paymentReference: string;
  method: PaymentMethod;
  amount: number;
  allocationDate: string;
  isReversal: boolean;
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
  createdAt: string;
}

interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  tenantId: string;
  leaseId?: string;
  paymentDate?: string;
  valueDate?: string;
  externalReference?: string;
  bankAccountId?: string;
  feeAmount?: number;
  feeBearer?: 'TENANT' | 'ORGANIZATION' | 'LANDLORD' | 'SHARED';
  autoAllocate?: boolean;
  allocations?: { invoiceId: string; amount: number }[];
  confirmed?: boolean;
  clientRef?: string;
  notes?: string;
  collectionLatitude?: number;
  collectionLongitude?: number;
}
interface PaymentSummary {
  id: string;
  reference: string;
  method: PaymentMethod;
  status: PaymentStatus;
  direction: PaymentDirection;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  paymentDate: string;
  tenant: { id: string; displayName: string } | null;
  lease: { id: string; reference: string | null } | null;
  receivedByUserId: string | null;
  reversalOfId: string | null;
}
interface PaymentDetail extends PaymentSummary {
  externalReference: string | null;
  feeAmount: number;
  netAmount: number;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  allocations: {
    id: string;
    invoiceId: string | null;
    invoiceNumber: string | null;
    tenantCreditId: string | null;
    amount: number;
    isReversal: boolean;
  }[];
  cashReceipt: CashReceiptSummary | null;
  receipts: ReceiptSummary[];
  clientRef: string | null;
  notes: string | null;
  createdAt: string;
}
interface TenantCredit {
  id: string;
  tenantId: string;
  leaseId: string | null;
  status: CreditStatus;
  origin: string;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  sourcePaymentId: string | null;
  sourceInvoiceId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface CashReceiptInput {
  tenantId: string;
  leaseId?: string;
  amount: number;
  payerName?: string;
  payerPhone?: string;
  purpose?: string;
  receivedAt?: string;
  autoAllocate?: boolean;
  allocations?: { invoiceId: string; amount: number }[];
  signatureDataUrl?: string;
  paperReceiptDocumentId?: string;
  latitude?: number;
  longitude?: number;
  clientRef: string;
}
interface CashReceiptSummary {
  id: string;
  receiptNumber: string;
  status: CashReceiptStatus;
  amount: number;
  receivedAt: string;
  tenant: { id: string; displayName: string };
  collectorUserId: string;
  collectorName: string;
  remittanceId: string | null;
  paymentId: string | null;
}
interface CashReceiptDetail extends CashReceiptSummary {
  payerName: string;
  payerPhone: string | null;
  purpose: string | null;
  leaseId: string | null;
  signatureDocumentId: string | null;
  signatureHash: string | null;
  documentId: string | null;
  allocations: { invoiceId: string; invoiceNumber: string | null; amount: number }[];
  cancelledAt: string | null;
  cancellationReason: string | null;
  clientRef: string | null;
}
interface CollectorBalance {
  userId: string;
  fullName: string;
  heldAmount: number;
  receiptsCount: number;
  oldestReceiptAt: string | null;
  capAmount: number;
  overCap: boolean;
  lastRemittanceAt: string | null;
}
interface RemittanceInput {
  cashReceiptIds: string[];
  declaredAmount: number;
  denominations?: Record<string, number>;
  submit?: boolean;
  notes?: string;
  clientRef?: string;
}
interface RemittanceVerifyInput {
  countedAmount: number;
  items?: {
    cashReceiptId: string;
    isVerified: boolean;
    varianceAmount?: number;
    varianceReason?: string;
  }[];
  notes?: string;
}
interface RemittanceSummary {
  id: string;
  reference: string;
  status: RemittanceStatus;
  collectorUserId: string;
  collectorName: string;
  declaredAmount: number;
  expectedAmount: number;
  countedAmount: number;
  varianceAmount: number;
  receiptsCount: number;
  openedAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
}
interface RemittanceDetail extends RemittanceSummary {
  items: {
    id: string;
    cashReceiptId: string;
    receiptNumber: string;
    amount: number;
    isVerified: boolean;
    varianceAmount: number;
    varianceReason: string | null;
  }[];
  denominations: Record<string, number>;
  verifiedByUserId: string | null;
  rejectionReason: string | null;
  depositedAt: string | null;
  depositBankAccountId: string | null;
  notes: string | null;
}

interface ReceiptSummary {
  id: string;
  receiptNumber: string;
  status: ReceiptStatus;
  issueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalAmount: number;
  tenant: { id: string; displayName: string };
  paymentId: string;
  invoiceId: string | null;
  sentAt: string | null;
  sentChannel: NotificationChannel | null;
}
interface ReceiptDetail extends ReceiptSummary {
  rentAmount: number;
  chargesAmount: number;
  penaltyAmount: number;
  remainingBalanceAmount: number;
  verificationUrl: string;
  documentId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  messageLogs: MessageLog[];
}
interface ReceiptVerification {
  receiptNumber: string;
  issueDate: string;
  period: string | null;
  totalAmount: number;
  tenantName: string;
  landlordDisplayName: string;
  organizationName: string;
  status: ReceiptStatus;
}
interface NotificationTemplate {
  id: string;
  code: string;
  channel: NotificationChannel;
  locale: string;
  name: string;
  subject: string | null;
  body: string;
  providerTemplateName: string | null;
  providerTemplateLang: string | null;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  approvedAt: string | null;
}
interface MessageLog {
  id: string;
  notificationId: string | null;
  channel: NotificationChannel;
  status: MessageStatus;
  provider: string;
  providerMessageId: string | null;
  toAddress: string;
  templateCode: string | null;
  contentPreview: string | null;
  costAmount: number;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}
```

## Variables d'environnement nouvelles

`WHATSAPP_PROVIDER=fake|meta`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_API_VERSION=v21.0` ; `SMS_PROVIDER=fake|android_gateway`, `SMS_GATEWAY_URL`, `SMS_GATEWAY_USERNAME`, `SMS_GATEWAY_PASSWORD`, `SMS_GATEWAY_WEBHOOK_SECRET` ; `PUBLIC_WEB_BASE_URL` (liens des SMS et QR : `{PUBLIC_WEB_BASE_URL}/verifier/{token}`), `DOCUMENT_LINK_TTL_SECONDS=604800` (liens de PDF dans les messages).
