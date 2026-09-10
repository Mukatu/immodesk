# IMMODESK — Décisions communes (référentiel partagé par tous les documents)

Nom de code du produit : **Immodesk**.
Marché : Congo-Brazzaville (Brazzaville, Pointe-Noire) puis zone CEMAC. Devise : XAF (Franc CFA BEAC), pas de sous-unité.
Langue produit : français (fr-CG). Langue du code : anglais (identifiants, tables, colonnes). Documentation : français.

## Cibles et acteurs

- **Organisation (organization)** = le tenant SaaS. Trois types : `AGENCY` (agence immobilière), `INDEPENDENT_LANDLORD` (bailleur qui gère seul) et `INDEPENDENT_MANAGER` (démarcheur ou gestionnaire indépendant, voir section dédiée).
- **Rôles dans une organisation** : OWNER (créateur/admin), MANAGER (gestionnaire), COLLECTOR (démarcheur / encaisseur terrain), ACCOUNTANT (lecture financière), VIEWER.
- **Bailleur (landlord)** : propriétaire du bien. Dans une agence, il est un tiers sous mandat de gestion. Chez un bailleur indépendant, l'organisation possède un landlord "self".
- **Locataire (tenant)** : personne physique ou morale. Peut avoir un compte utilisateur (app locataire) ou non.
- **Garant (guarantor)** : optionnel sur un bail.
- Un même `user` peut appartenir à plusieurs organisations et être locataire ailleurs : `users` est global, les rôles sont portés par `organization_members`.

## Stack tranchée (aucune alternative)

- Backend : **NestJS 11 (TypeScript 5)**, monolithe modulaire en Clean Architecture (domain / application / infrastructure / presentation par module). ORM : **Prisma**. File d'attente : **BullMQ sur Redis**. Cron : BullMQ repeatable jobs.
- Base : **PostgreSQL 16**. Row Level Security activée sur toutes les tables portant `organization_id`.
- Web (dashboard agences/bailleurs + portail locataire) : **Next.js 15 (App Router), Tailwind CSS, shadcn/ui, TanStack Query**.
- Mobile (démarcheurs, bailleurs, locataires) : **Flutter 3.x, Riverpod, Drift (SQLite), go_router, dio**. Offline-first.
- Fichiers : stockage objet compatible S3, **MinIO auto-hébergé** en pilote, Cloudflare R2 si le volume l'exige ; URLs signées.
- PDF : **Puppeteer** (Chromium headless) dans un worker BullMQ dédié.
- Messagerie : **WhatsApp d'abord**, via **Meta WhatsApp Cloud API** en accès direct (pas d'intermédiaire type Twilio : même API, marge en plus). Sert aux codes de connexion (templates d'authentification), aux quittances et aux relances. Repli automatique par **SMS via une passerelle open source sur téléphone Android** (SIM MTN, forfait SMS illimité) pour les numéros sans WhatsApp ou en cas d'échec de remise ; interface `SmsProvider` pour brancher plus tard une passerelle commerciale. Décision du 10 septembre 2026.
- Mobile Money : **deux modes au choix de chaque organisation**, activables ensemble ou séparément dans `organization_settings` : (1) **paiement déclaré** sur le numéro Mobile Money du bailleur ou de l'agence (le locataire saisit la référence de transaction de l'opérateur, validation manuelle ou par relevé opérateur, zéro commission) ; (2) **agrégateur** (interface `MobileMoneyProvider`, première implémentation CinetPay ; PawaPay et connexion directe MTN MoMo / Airtel Money derrière la même interface, commission par transaction). Confirmation d'un paiement agrégateur = re-interrogation du statut côté agrégateur, jamais sur la seule foi du webhook. Décision du 10 septembre 2026.
- Auth : **téléphone + OTP**, canal **WhatsApp par défaut**, repli SMS automatique (voir Messagerie), email optionnel. JWT access (15 min) + refresh token rotatif (30 j). Mot de passe optionnel pour le web.
- Contrat d'API : **OpenAPI 3.1** généré par NestJS, client TypeScript (web) et Dart (mobile) générés.
- Infra : Docker, déploiement sur un **VPS** loué en région **Europe (Paris)** (Hetzner ou OVH, tarif d'entrée), reverse proxy Caddy, CI/CD **GitHub Actions**, suivi des erreurs **GlitchTip auto-hébergé** (open source, compatible avec les SDK Sentry), métriques Grafana + Prometheus, sauvegardes PostgreSQL quotidiennes chiffrées (pgBackRest vers un stockage objet).
- Principe « open source d'abord » (décision du 10 septembre 2026) : tout composant est auto-hébergé et open source quand une alternative crédible existe ; les services payants sont limités à ce qui n'a pas d'équivalent (opérateurs Mobile Money, WhatsApp officiel, envoi de SMS, location du serveur, nom de domaine). Stockage de fichiers : MinIO auto-hébergé sur le VPS en phase pilote, Cloudflare R2 seulement si le volume l'exige.
- Monorepo : `apps/api`, `apps/web`, `apps/mobile`, `packages/shared` (types, enums, validation zod), `infra/`.

## Règles financières et techniques non négociables

- Montants : **BIGINT en XAF**, colonne `currency CHAR(3) DEFAULT 'XAF'`. Jamais de float, jamais de décimales.
- Clés primaires : **UUID** (v7 généré par l'application, `gen_random_uuid()` en valeur par défaut SQL).
- Toute table métier porte `organization_id`, `created_at`, `updated_at`. Suppression logique via `deleted_at` sur les entités de référence (properties, units, leases, tenants, landlords) ; jamais sur les tables financières.
- Toute écriture financière est dans une transaction SQL. `audit_logs` et `payment_allocations` sont strictement append-only (ni UPDATE ni DELETE). `payments`, `receipts` et `cash_receipts` interdisent le DELETE et verrouillent leurs colonnes financières (montant, méthode, référence, tiers, dates d'origine, signature) par trigger `guard_financial_row` ; seules les colonnes de workflow (statut, dates de confirmation/rejet/annulation, montants imputés, liens vers documents et remises) restent modifiables. Toute correction d'un montant se fait par contre-passation (`reversal_of_id`).
- Idempotence : toute action créée sur mobile porte un `client_ref` (ULID généré sur l'appareil), unique par organisation, utilisé comme clé d'idempotence côté API.
- Numérotation séquentielle : reçus de caisse (`CASH-{org}-{collector}-{seq}`), quittances (`QUI-{YYYYMM}-{seq}`), factures de loyer (`LOY-{YYYYMM}-{seq}`), via table `sequences` verrouillée en transaction.
- Audit : toute transition d'état (bail, facture, paiement, remise) écrit dans `audit_logs` (JSONB avant/après).

## Modèle de facturation (séparation facture / paiement)

- `rent_invoices` : une facture par bail et par période (générée par cron mensuel J-N jours avant échéance), lignes dans `invoice_lines` (loyer, charges eau/électricité, pénalités, autres). Statuts : DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED.
- `payments` : un règlement (n par facture possible, paiements partiels), avec `method` : CASH, MOBILE_MONEY, BANK_TRANSFER, BANK_CHECK. Statuts : PENDING, PENDING_VERIFICATION, CONFIRMED, REJECTED, CANCELLED, REVERSED.
- `payment_allocations` : affectation d'un paiement à une ou plusieurs factures (trop-perçu → crédit locataire).
- Espèces : `cash_receipts` (reçu signé, numéroté, signature locataire) → `cash_remittances` (reversement du démarcheur vers l'agence/bailleur, contrôlé).
- Virement : `bank_transfer_declarations` (preuve uploadée par locataire) + `bank_statements` / `bank_statement_lines` (import CSV/MT940) + `reconciliation_matches` (exact, suggéré, manuel).
- Mobile Money : `mobile_money_transactions` (référence opérateur, frais, statut, payload brut).
- Chèque : `bank_checks` (numéro, banque, date de dépôt, compensation).
- Quittance : `receipts` (PDF, token QR de vérification publique, envoi WhatsApp tracé dans `message_logs`).

## Liste canonique des tables (à modéliser intégralement)

Tenancy & sécurité : organizations, organization_settings, organization_members, users, user_credentials, otp_codes, refresh_tokens, invitations, api_keys.
Tiers : landlords, tenants, guarantors, contact_channels (téléphones/emails/WhatsApp par tiers).
Patrimoine : properties, units, bank_accounts, meters, meter_readings, utility_tariffs.
Contrats : management_mandates, leases, lease_parties, lease_documents, deposits, deposit_movements, inspections, inspection_items, inspection_photos.
Facturation & encaissement : sequences, rent_invoices, invoice_lines, penalty_rules, payments, payment_allocations, tenant_credits, cash_receipts, cash_remittances, cash_remittance_items, bank_transfer_declarations, bank_checks, mobile_money_transactions, bank_statements, bank_statement_lines, reconciliation_matches, receipts.
Gestion d'agence : expenses, commissions, owner_statements, owner_statement_lines, owner_payouts.
Exploitation : maintenance_requests, maintenance_updates.
Communication : notification_templates, notifications, message_logs, dunning_rules, dunning_runs.
Technique : documents, webhook_events, idempotency_keys, sync_batches, audit_logs, feature_flags.
SaaS : subscription_plans, subscriptions, subscription_invoices.

## Démarcheurs et gestionnaires informels : des prescripteurs, pas des concurrents

- **Espace gestionnaire indépendant** : troisième type d'organisation `INDEPENDENT_MANAGER` (démarcheur ou gestionnaire informel, agence unipersonnelle). Mêmes capacités qu'une `AGENCY` (mandats de gestion, commissions, relevés de gérance, remises de caisse), plan tarifaire dédié moins cher, onboarding mobile-first en moins de 10 minutes. Commission par défaut du mandat : 10 % du loyer encaissé (`commission_basis = RATE_BPS_ON_RENT_COLLECTED`, 1000 bps), modifiable par mandat.
- **Preuve d'honnêteté envers le propriétaire** : tout bailleur sous mandat peut recevoir un accès **portail bailleur** en lecture seule (compte `users` lié à `landlords.user_id`) : encaissements, quittances, relevés de gérance, reversements. L'invitation est envoyée par WhatsApp par le gestionnaire ; le bailleur en diaspora est la cible première.
- **Programme d'apport d'affaires (parrainage)** : tout utilisateur (démarcheur en priorité) peut devenir `referral_partner` avec un code unique. Chaque organisation bailleur ou gestionnaire qui s'abonne en indiquant ce code (ou dont le premier immeuble est enregistré par le partenaire, avec confirmation du bailleur par OTP) devient un `referral` rattaché à un `referral_program` défini par la plateforme : taux en bps sur chaque `subscription_invoice` payée, durée en mois, montant minimum de versement. Les commissions s'accumulent dans `referral_commissions` (ACCRUED → APPROVED → PAID, contre-passée si la facture est remboursée) et sont versées par Mobile Money via `referral_payouts`. Règles anti-abus : un partenaire ne peut pas parrainer sa propre organisation, une organisation n'a qu'un seul parrain, commission uniquement sur facture réellement encaissée, vérification d'identité légère (CNI + numéro Mobile Money) avant tout versement, plafond mensuel par partenaire.
- Tables ajoutées à la liste canonique (globales, gérées par la plateforme, non rattachées à une organisation) : `referral_programs`, `referral_partners`, `referrals`, `referral_commissions`, `referral_payouts`. Phases concernées : 7 (espace gestionnaire, portail bailleur) et 10 (programme d'apport d'affaires).

## Phases (numérotation de référence)

- Phase 0 : Cadrage, monorepo, CI/CD, infra, auth OTP, multi-tenant, design system, OpenAPI.
- Phase 1 : Tiers & patrimoine (landlords, tenants, properties, units, bank_accounts, documents).
- Phase 2 : Baux & dépôts (leases, deposits, lease_documents, génération de contrat PDF).
- Phase 3 : Facturation & espèces (rent_invoices cron, cash_receipts, cash_remittances, receipts PDF, WhatsApp).
- Phase 4 : Mobile Money & virement déclaré (agrégateur, webhooks, déclarations, validation).
- Phase 5 : Application mobile offline (Drift, sync_batches, signature, photos, mode démarcheur).
- Phase 6 : Rapprochement bancaire & chèques (import CSV/MT940, matching, bank_checks).
- Phase 7 : Gestion d'agence (mandats, commissions, dépenses, relevés de gérance, reversements).
- Phase 8 : États des lieux, compteurs & charges, maintenance.
- Phase 9 : Relances, pénalités, reporting & tableaux de bord.
- Phase 10 : Abonnement SaaS, onboarding, portail locataire, pilote Brazzaville.
- Phase 11 : Durcissement (sécurité, performance, conformité, DR), lancement commercial.
