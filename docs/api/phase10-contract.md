# Contrat d'API — Phase 10 (abonnement SaaS, onboarding, import, portail locataire, apport d'affaires)

Complète les contrats des phases 0 à 9 (mêmes conventions). Tables : `subscription_plans`, `subscriptions`, `subscription_invoices`, `feature_flags`, `referral_programs`, `referral_partners`, `referrals`, `referral_commissions`, `referral_payouts`, `mobile_money_transactions`, `webhook_events`, `otp_codes`, `refresh_tokens`, `documents`, `bank_transfer_declarations`, `rent_invoices`, `receipts`, `audit_logs`. **Aucune modification du DDL, aucune table nouvelle.** Remplacé par `openapi.json` dès export.

## Énumérations (valeurs exactes du DDL, aucune autre n'existe)

- `subscription_status` : TRIALING, ACTIVE, PAST_DUE, SUSPENDED, CANCELLED, EXPIRED.
- `billing_interval` : MONTHLY, QUARTERLY, ANNUAL.
- `invoice_status` (partagé avec les loyers) : DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED.
- `referral_partner_status` : PENDING_VERIFICATION, ACTIVE, SUSPENDED, CLOSED.
- `referral_status` : PENDING, QUALIFIED, ACTIVE, EXPIRED, CANCELLED.
- `referral_commission_status` : ACCRUED, APPROVED, PAID, REVERSED, CANCELLED. **À ne pas confondre avec `commission_status` de la phase 7** (PENDING, ACCRUED, INVOICED, SETTLED, CANCELLED), qui concerne les commissions de gérance et n'a rien à voir.
- `referral_source` : CODE_AT_SIGNUP, PARTNER_REGISTERED_PROPERTY, LINK, MANUAL_ADMIN.
- `payout_status` : PENDING, APPROVED, PROCESSING, PAID, FAILED, CANCELLED. Six valeurs, distinctes de celles d'une commission.
- `otp_purpose` : LOGIN, PHONE_VERIFICATION, PASSWORD_RESET, SENSITIVE_ACTION. **Aucun motif propre au locataire n'existe.**
- `momo_provider` : MTN_MOMO, AIRTEL_MONEY, CINETPAY, PAWAPAY, OTHER.
- `id_document_type` : CNI, PASSPORT, RESIDENCE_PERMIT, DRIVING_LICENSE, VOTER_CARD, RCCM, NIU, OTHER.

## Arbitrages de ce contrat (ils priment sur le plan de phases)

1. **Une organisation n'a qu'un seul abonnement, pour toujours.** `subscriptions_org_uk UNIQUE (organization_id)`. Changer de plan met donc à jour la ligne existante, cela ne crée jamais une seconde ligne, et il n'existe aucun historique des plans successifs en base. `POST /organizations/{id}/subscription` est de ce fait une souscription **ou** un changement de plan selon qu'une ligne existe déjà, et la trace du changement vit dans `audit_logs`, pas dans une table d'historique.

2. **Une facture d'abonnement ne connaît que quatre statuts sur six.** La colonne utilise `invoice_status`, partagé avec les loyers, mais un abonnement se règle en une fois par Mobile Money : seuls ISSUED, PAID, OVERDUE et CANCELLED sont produits. DRAFT et PARTIALLY_PAID ne le sont jamais. Le champ `paid_amount` existe et reste renseigné, mais il vaut toujours zéro ou le total.

3. **Aucune table d'import de portefeuille n'existe, et il n'en sera pas créé.** Le plan décrit un module et deux routes, mais le schéma ne porte rien. L'import emprunte donc **exactement le mécanisme des exports de la phase 9** : la route renvoie `202 { jobId }`, l'état se consulte par `GET /portfolio-imports/{jobId}`, le fichier téléversé et le rapport d'erreurs sont rangés dans `documents` avec le genre `OTHER`, et le rapport est renvoyé en réponse tant qu'il tient sous la limite synchrone. Rien n'est stocké ailleurs.

4. **La session du locataire ne s'appuie sur aucun rôle stocké.** Le locataire n'a pas de ligne dans `organization_members`, et aucun motif de code à usage unique ne lui est propre. La demande de code utilise donc `otp_purpose = 'LOGIN'`, et le portail résout un rôle **dérivé** `TENANT_PORTAL` par lecture en base à chaque requête, sur le modèle exact du rôle `LANDLORD_PORTAL` de la phase 7 : jamais lu depuis le jeton, jamais écrit en base. Le périmètre de la session est l'ensemble des baux actifs rattachés au `tenant_id` du numéro vérifié. Un locataire présent dans deux organisations voit ses baux des deux, sans jamais voir autre chose.

5. **Un parrainage par organisation, définitivement.** `referrals_org_uk UNIQUE (referred_organization_id)`. Le plan demande « un seul parrainage ACTIVE à la fois » avec rattachement possible à un second partenaire après expiration : la base l'interdit. Une organisation déjà parrainée, même au statut CANCELLED ou EXPIRED, ne peut jamais être rattachée à un autre partenaire par une route publique. Seule une réattribution administrative met à jour la ligne existante, avec motif obligatoire et trace dans `audit_logs`.

6. **Un parrainage ne se qualifie que sur un encaissement réel.** Le passage de PENDING à QUALIFIED puis ACTIVE n'intervient qu'au moment où une `subscription_invoice` de l'organisation filleule passe réellement au statut PAID, jamais à l'inscription. La contrainte `referrals_qualified_chk` impose d'ailleurs `qualified_at` dès que le statut quitte PENDING pour QUALIFIED, ACTIVE ou EXPIRED.

7. **Une commission payée ne se modifie jamais, elle se contre-passe.** `referral_commissions` porte `reversal_of_id` et la contrainte `referral_commissions_paid_chk` exige `paid_at` et `payout_id` dès le statut PAID. Le remboursement d'une facture d'abonnement crée donc une **nouvelle ligne** au statut REVERSED pointant sur l'originale, qui reste intacte. C'est la règle de contre-passation déjà appliquée aux paiements depuis la phase 3.

8. **Le webhook ne confirme jamais seul un paiement d'abonnement.** Comme en phase 4, la réception écrit d'abord dans `webhook_events`, puis le statut est **re-interrogé** auprès de l'agrégateur, et seule cette re-interrogation fait passer la facture à PAID. Un webhook reçu ne vaut pas encaissement.

## Abonnement SaaS

- **Catalogue** : `subscription_plans` est global, sans `organization_id`. Un plan porte un code unique, un intervalle de facturation, un prix de base, un prix par lot au-delà de `included_units`, des plafonds facultatifs de lots et de membres, une durée d'essai et un bloc `features` en JSONB. Seuls les plans `is_public` et `is_active` sont exposés aux clients.
- **Souscription** : à la création d'une organisation, une ligne `subscriptions` est ouverte au statut TRIALING avec `trial_ends_at` calculé depuis `trial_days` du plan. `units_count` est recalculé à chaque facturation, jamais fourni par l'appelant.
- **Montant** : `recurring_amount` vaut le prix de base plus le prix unitaire multiplié par les lots au-delà de l'inclus, diminué de `discount_rate_bps`. Le résultat est un entier XAF arrondi au supérieur.
- **Cycle de vie** : TRIALING devient ACTIVE au premier encaissement, ou EXPIRED si l'essai s'achève sans paiement. ACTIVE devient PAST_DUE dès qu'une facture dépasse son échéance, puis SUSPENDED au-delà de `grace_days`. Une résiliation pose `cancelled_at` et le statut passe CANCELLED à la fin de la période courante, jamais immédiatement.
- **Suspension** : l'organisation suspendue passe en lecture seule pour tous les rôles sauf `OWNER`, qui conserve l'accès à l'écran d'abonnement et au paiement. C'est un contrôle applicatif : aucune colonne ne porte cet état ailleurs que `subscriptions.status`. Chaque transition écrit dans `audit_logs` avec l'état avant et après.
- **Avertissement préalable** : une notification part avant toute restriction, par WhatsApp avec repli SMS, en réutilisant le pipeline de notifications existant.
- **Facturation** : `subscription_invoices` porte `UNIQUE (subscription_id, period_start)`, ce qui rend la campagne de facturation idempotente par construction. Une seconde exécution sur la même période est ignorée.

## Onboarding guidé

- Trois étapes, chacune idempotente et reprenable : premier bien, premier bail, première invitation. Chaque étape réutilise les modules des phases 1, 2 et 0, sans dupliquer leur validation.
- L'état d'avancement est **dérivé**, jamais stocké : une étape est faite si l'entité correspondante existe pour l'organisation. Aucune colonne de progression n'est ajoutée.
- Un champ facultatif de code de parrainage est accepté à la création de l'organisation, et traité selon la section consacrée à l'apport d'affaires.

## Import de portefeuille

- Le fichier est d'abord téléversé par le mécanisme habituel du module documents, puis l'import est lancé en citant le `documentId` obtenu. Aucun corps multipart n'existe dans cette API, et le corps JSON est plafonné : c'est la même contrainte qu'en phase 6 pour l'import des relevés bancaires.
- Format attendu : un seul fichier CSV encodé en UTF-8, séparateur point-virgule, portant dans cet ordre les bailleurs, les biens, les lots, les locataires et les baux, chaque ligne préfixée du type d'entité. Les dépendances croisées sont résolues dans le fichier par des références locales, jamais par des identifiants de base.
- **Validation ligne à ligne**, avec les mêmes règles métier que les routes unitaires correspondantes. Une ligne en échec n'interrompt jamais l'import : elle est comptée et motivée.
- Le rapport final donne le nombre de lignes lues, créées et rejetées, et la liste des rejets avec leur numéro de ligne et leur motif en français. Il est archivé dans `documents` au genre `OTHER` et renvoyé par la route de suivi.
- L'écriture est **transactionnelle par ligne**, pas par fichier : cinq cents lignes dont vingt fautives produisent quatre cent quatre-vingts créations effectives, conformément au critère d'acceptation du plan.
- Deux imports simultanés sur la même organisation sont refusés par 409 `IMPORTS.ALREADY_RUNNING`.

## Portail locataire

- **Connexion** : `POST /v1/tenant-auth/otp/request` puis `/verify`, sur le numéro du locataire, avec `otp_purpose = 'LOGIN'`. Les règles d'expiration, de tentatives et de limitation de débit sont celles déjà en place, sans exception.
- **Périmètre** : la session ouvre sur les baux actifs du locataire. Toute lecture d'une facture, d'une quittance ou d'une déclaration hors de ce périmètre répond 404, jamais 403, conformément à la règle de cloisonnement du projet.
- **Paiement** : le locataire règle une facture par Mobile Money, derrière le même fournisseur que les loyers. La confirmation suit la règle de re-interrogation de la phase 4.
- **Quittance** : téléchargement du PDF déjà produit par la phase 3, avec son jeton de vérification publique inchangé.
- **Virement déclaré** : le locataire déclare un virement avec preuve obligatoire, exactement comme le fait le mobile depuis la phase 4. La validation reste réservée au gestionnaire.
- **Téléversement de la preuve par le locataire** : les routes du module documents sont réservées au rôle `MANAGER`, un locataire ne peut donc pas les appeler. Deux routes jumelles lui sont ouvertes, portant le même mécanisme d'URL signée et les mêmes plafonds de taille et de type, mais gardées par le rôle dérivé `TENANT_PORTAL` et **restreintes à ses propres baux** : le document créé porte obligatoirement `related_entity_type = 'lease'` et un `related_entity_id` appartenant au périmètre de la session. Toute autre entité de rattachement est refusée. Sans ces deux routes, la preuve exigée ci-dessus serait impossible à fournir.
- **Activation progressive** : l'ouverture du portail est commandée par un drapeau de fonctionnalité par organisation, dans `feature_flags`, dont l'unicité est déjà garantie par index selon qu'il est global ou propre à une organisation. Le module des drapeaux existe déjà dans les organisations : il est étendu, pas recréé.

## Apport d'affaires

- **Devenir partenaire** : tout utilisateur authentifié peut le demander. La ligne naît au statut PENDING_VERIFICATION. Le code est engendré au format imposé par la base, `IMD-` suivi de six caractères alphanumériques majuscules, et il est unique.
- **Activation** : le passage au statut ACTIVE exige une date de vérification et un numéro de versement renseignés, la contrainte `referral_partners_verified_chk` l'imposant. Le numéro et le fournisseur Mobile Money vont toujours de pair.
- **Rattachement d'un filleul**, deux voies seulement. Le code saisi à l'inscription, source CODE_AT_SIGNUP. Ou l'enregistrement d'un immeuble par le partenaire, source PARTNER_REGISTERED_PROPERTY, qui n'engendre **aucune ligne** tant que le bailleur n'a pas confirmé par un code à usage unique de motif SENSITIVE_ACTION. La contrainte `referrals_otp_chk` le vérifie en base.
- **Anti-abus**, contrôlés côté serveur et pas seulement à l'écran : un partenaire ne peut pas se parrainer lui-même, ni parrainer une organisation dont il est déjà membre. Le refus est 422 `REFERRALS.SELF_REFERRAL`.
- **Commission** : à chaque `subscription_invoice` passée à PAID, une ligne naît au statut ACCRUED, au taux du programme, sur le montant hors taxe de la facture, pendant `duration_months` mois à compter de l'activation. Au-delà du plafond mensuel du programme, l'excédent n'est pas versé : il reste ACCRUED et se reporte.
- **Cycle** : ACCRUED devient APPROVED par une campagne mensuelle, puis PAID par un versement groupé. Une commission non approuvée n'est jamais versée. Une commission PAID ne se modifie jamais.
- **Versement** : `referral_payouts` regroupe les commissions approuvées d'un partenaire sur une période. Le seuil `min_payout_amount` du programme conditionne le déclenchement. Le versement suit les six statuts de `payout_status`, et un échec exige un motif, la contrainte `referral_payouts_failed_chk` l'imposant.

## Routes

| Méthode | Route                                                  | Rôle              | Sortie                                                                          |
| :------ | :----------------------------------------------------- | :---------------- | :------------------------------------------------------------------------------ |
| GET     | `/v1/subscription-plans`                               | Authentifié       | `200 { items: SubscriptionPlan[] }`                                             |
| GET     | `/v1/organizations/{id}/subscription`                  | OWNER, MANAGER    | `200 Subscription`                                                              |
| POST    | `/v1/organizations/{id}/subscription`                  | OWNER             | `200 Subscription` (souscription ou changement de plan)                         |
| POST    | `/v1/organizations/{id}/subscription/cancel`           | OWNER             | `200 Subscription` ; 409 `SUBSCRIPTIONS.ALREADY_CANCELLED`                      |
| GET     | `/v1/organizations/{id}/subscription-invoices`         | OWNER, ACCOUNTANT | `200 { items: SubscriptionInvoice[], pageInfo }`                                |
| POST    | `/v1/subscription-invoices/{id}/pay`                   | OWNER             | `202 { transactionId, status }` ; 409 `SUBSCRIPTIONS.ALREADY_PAID`              |
| POST    | `/v1/webhooks/mobile-money/subscription`               | Public signé      | `204`                                                                           |
| POST    | `/v1/onboarding/{orgId}/first-property`                | OWNER             | `201 Property`                                                                  |
| POST    | `/v1/onboarding/{orgId}/first-lease`                   | OWNER             | `201 Lease`                                                                     |
| POST    | `/v1/onboarding/{orgId}/invite`                        | OWNER             | `201 Invitation`                                                                |
| GET     | `/v1/onboarding/{orgId}/state`                         | OWNER             | `200 OnboardingState` (dérivé, jamais stocké)                                   |
| POST    | `/v1/portfolio-imports`                                | OWNER, MANAGER    | `202 { jobId }` ; 409 `IMPORTS.ALREADY_RUNNING`                                 |
| GET     | `/v1/portfolio-imports/{jobId}`                        | OWNER, MANAGER    | `200 ImportReport`                                                              |
| POST    | `/v1/tenant-auth/otp/request`                          | Public            | `202 { expiresAt, resendAfter }`                                                |
| POST    | `/v1/tenant-auth/otp/verify`                           | Public            | `200 { accessToken, tenant }`                                                   |
| GET     | `/v1/tenant/invoices`                                  | TENANT_PORTAL     | `200 { items: TenantInvoice[], pageInfo }`                                      |
| GET     | `/v1/tenant/invoices/{id}`                             | TENANT_PORTAL     | `200 TenantInvoice` ; 404 hors périmètre                                        |
| POST    | `/v1/tenant/invoices/{id}/pay`                         | TENANT_PORTAL     | `202 { transactionId, status }`                                                 |
| GET     | `/v1/tenant/receipts/{id}`                             | TENANT_PORTAL     | `200 { downloadUrl, expiresAt }`                                                |
| POST    | `/v1/tenant/documents/upload-url`                      | TENANT_PORTAL     | `201 { uploadUrl, objectKey, expiresAt }` (rattachement à un bail du périmètre) |
| POST    | `/v1/tenant/documents`                                 | TENANT_PORTAL     | `201 Document` ; 404 hors périmètre                                             |
| POST    | `/v1/tenant/bank-transfer-declarations`                | TENANT_PORTAL     | `201 BankTransferDeclaration` (preuve obligatoire)                              |
| GET     | `/v1/tenant/bank-transfer-declarations`                | TENANT_PORTAL     | `200 { items, pageInfo }`                                                       |
| POST    | `/v1/referral-partners`                                | Authentifié       | `201 ReferralPartner` (statut PENDING_VERIFICATION)                             |
| GET     | `/v1/referral-partners/me`                             | Partenaire        | `200 ReferralPartner`                                                           |
| POST    | `/v1/organizations/{id}/referral-code`                 | OWNER             | `201 Referral` ; 422 `REFERRALS.SELF_REFERRAL` ; 409 déjà parrainée             |
| POST    | `/v1/referral-partners/me/properties`                  | Partenaire        | `202 { confirmationSentTo }` (aucune ligne avant confirmation)                  |
| POST    | `/v1/referral-partners/me/properties/{id}/confirm-otp` | Public bailleur   | `201 Referral`                                                                  |
| GET     | `/v1/referral-partners/me/referrals`                   | Partenaire        | `200 { items: Referral[], pageInfo }`                                           |
| GET     | `/v1/referral-partners/me/commissions`                 | Partenaire        | `200 { items: ReferralCommission[], totals }`                                   |
| POST    | `/v1/admin/referral-commissions/approve`               | OWNER plateforme  | `200 { approved, heldByCap }`                                                   |
| POST    | `/v1/admin/referral-payouts`                           | OWNER plateforme  | `202 { payoutIds }`                                                             |
| GET     | `/v1/admin/referral-payouts/{id}`                      | OWNER plateforme  | `200 ReferralPayout`                                                            |
| GET     | `/v1/admin/subscriptions/at-risk`                      | OWNER plateforme  | `200 { items, pageInfo }`                                                       |

## Variables d'environnement nouvelles

`SUBSCRIPTION_CRON_ENABLED=true`, `SUBSCRIPTION_BILLING_DAY_OF_MONTH=1`, `SUBSCRIPTION_DEFAULT_GRACE_DAYS=7`, `TENANT_PORTAL_ENABLED=false`, `PORTFOLIO_IMPORT_MAX_ROWS=5000`, `REFERRAL_DEFAULT_PROGRAM_CODE=IMD-STD`.
