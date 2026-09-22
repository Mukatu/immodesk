# Contrat d'API — Phase 11 (durcissement sécurité, conformité, lecture seule, go-live)

Complète les contrats des phases 0 à 10 (mêmes conventions). Tables : `refresh_tokens`, `user_credentials`, `api_keys`, `otp_codes`, `audit_logs`, `feature_flags`, `organization_settings`, `organizations`, `organization_members`, `users`, `documents`, `notifications`, `message_logs`, `tenants`, `landlords`, `guarantors`, `contact_channels`, `bank_accounts`. **Aucune table nouvelle.** Une seule extension additive du DDL est proposée et isolée en fin de document (valeur d'énumération `audit_action`) ; tout le reste tient sur les colonnes, les index, les rôles et les politiques RLS existants. Remplacé par `openapi.json` dès export.

Trois épics n'ont **aucune surface d'API** ou presque. 11.B (tests de charge et capacité) et 11.E (documentation, support, formation) sont des livrables de mesure, de rédaction et de formation, pilotés hors du produit : seules deux miettes les touchent ici, les sondes de santé, nécessaires à l'injection de charge et à la page de statut, et l'exposition des coordonnées du support dans le registre des traitements. 11.C (restauration réelle et plan de reprise d'activité) est pour l'essentiel un exercice d'exploitation : l'exercice de restauration sur environnement isolé, la mesure au chronomètre du RTO et du RPO, le contrôle d'intégrité post-restauration et le PRA écrit sont des travaux d'infrastructure et de documentation, sans route ni modèle. **Une seule de ses exigences franchit la frontière de l'API** : la bascule en mode lecture seule en une action, traitée ci-dessous. Aucune route n'est inventée pour le reste.

## Énumérations (valeurs exactes du DDL, aucune autre n'existe)

- `member_role` : OWNER, MANAGER, COLLECTOR, ACCOUNTANT, VIEWER. **`PLATFORM_ADMIN` n'en fait pas partie et n'y sera pas ajouté** (voir arbitrage 1).
- `api_key_status` : ACTIVE, REVOKED. **Deux valeurs seulement** : il n'existe ni EXPIRED ni ROTATING ; l'expiration se lit dans `expires_at`.
- `audit_action` : CREATE, UPDATE, DELETE, STATE_TRANSITION, LOGIN, EXPORT, IMPORT. Le nom métier fin de l'opération vit dans `reason` et `new_state.operation`, conformément à la discipline posée en phase 0.
- `otp_purpose` : LOGIN, PHONE_VERIFICATION, PASSWORD_RESET, SENSITIVE_ACTION. La révocation globale s'appuie sur SENSITIVE_ACTION, qui existe déjà.
- `contact_owner_type` : LANDLORD, TENANT, GUARANTOR, MEMBER, SUPPLIER. `contact_channel_type` : PHONE, MOBILE, WHATSAPP, EMAIL, FAX.
- `party_type` : INDIVIDUAL, COMPANY. `gender_type` : MALE, FEMALE, UNSPECIFIED — colonne `NOT NULL DEFAULT 'UNSPECIFIED'` sur `tenants`, `landlords` et `guarantors`, donc jamais mise à `NULL` par l'anonymisation.
- `id_document_type` : CNI, PASSPORT, RESIDENCE_PERMIT, DRIVING_LICENSE, VOTER_CARD, RCCM, NIU, OTHER.
- `bank_account_holder_type` : ORGANIZATION, LANDLORD, TENANT. **Il n'existe pas de titulaire garant** : `bank_accounts` porte `landlord_id` et `tenant_id`, et aucune colonne `guarantor_id`.
- `document_kind` : ID_DOCUMENT, LEASE_CONTRACT, MANDATE, RECEIPT_PDF, INVOICE_PDF, CASH_RECEIPT_PDF, TRANSFER_PROOF, CHECK_IMAGE, BANK_STATEMENT, INSPECTION_REPORT, INSPECTION_PHOTO, MAINTENANCE_PHOTO, SIGNATURE, OWNER_STATEMENT_PDF, EXPENSE_INVOICE, PROPERTY_PHOTO, OTHER. Aucune valeur d'export, d'archive ou de registre n'existe ; un export de réversibilité et un registre signé sont rangés en `OTHER`, comme les exports de la phase 9.
- `storage_provider` : R2, S3, LOCAL. **MinIO auto-hébergé se déclare `S3`** : il n'existe pas de valeur MINIO (voir arbitrage 13).
- `user_status` : PENDING, ACTIVE, SUSPENDED, DELETED. `organization_status` : ACTIVE, SUSPENDED, CLOSED.
- `notification_status` : SCHEDULED, QUEUED, SENT, FAILED, CANCELLED. `message_status` : QUEUED, SENT, DELIVERED, READ, FAILED, REJECTED, EXPIRED.

## Arbitrages de ce contrat (ils priment sur le plan de phases)

1. **L'administrateur de plateforme est défini ici, et cette définition comble une imprécision de la phase 10.** Le contrat de la phase 10 emploie quatre fois le libellé « OWNER plateforme » dans sa table de routes — approbation des commissions d'apport, versements, consultation d'un versement, abonnements à risque — sans jamais définir de garde ni citer la colonne qui le porte. Ce contrat-ci ne modifie pas celui de la phase 10 ; il en fixe la lecture. L'habilitation est le drapeau booléen `users.is_platform_admin`, `NOT NULL DEFAULT false`, dont le commentaire du schéma dit déjà qu'il habilite « aux routes `/v1/admin/*` ». Elle est **relue en base à chaque requête** par `PlatformAdminGuard`, jamais portée par le jeton d'accès, jamais dérivée de `organization_members`, jamais accordée par une route publique. Le rôle exposé dans l'API s'appelle `PLATFORM_ADMIN` ; il ne fait pas partie de l'énumération `member_role` et n'y sera pas ajouté. Le refus est `403 IAM.FORBIDDEN` avec `details.requiredRole = 'PLATFORM_ADMIN'`. Partout où la phase 10 écrit « OWNER plateforme », il faut lire `PLATFORM_ADMIN` au sens de cet arbitrage. Un `PLATFORM_ADMIN` n'hérite d'**aucun** droit sur les données métier d'une organisation : pour lire un bail il lui faut une appartenance, comme à tout le monde ; ce qu'il gagne, c'est l'accès aux routes de plateforme, pas une clé passe-partout sur les organisations.

2. **Les routes `/v1/admin/*` s'exécutent sous le rôle PostgreSQL `immodesk_admin`, et il faut le dire explicitement sous peine de livrer des routes impossibles.** Le schéma pose deux obstacles que le rôle applicatif ne peut pas franchir. D'une part, les politiques `global_flags_readonly` et `global_flags_no_delete`, déclarées `AS RESTRICTIVE ... TO immodesk_app` avec `USING (organization_id IS NOT NULL)`, interdisent à `immodesk_app` tout `UPDATE` et tout `DELETE` sur un drapeau dont `organization_id IS NULL` — c'est-à-dire exactement sur `read_only_mode`, `platform_incident`, `platform_maintenance` et `security_audit_cleared`. Le rôle applicatif peut lire un drapeau global, et même en insérer un, mais il ne peut jamais le rebasculer : une bascule écrite sous `immodesk_app` serait donc un aller simple. D'autre part, les routes d'administration ne portent pas d'en-tête d'organisation, donc `app.current_organization_id` n'est pas positionné, et la politique `org_isolation` — permissive, `FOR ALL TO immodesk_app` — réduit alors toute table porteuse d'un `organization_id` à zéro ligne : le tableau de bord de go-live et l'activation par vagues renverraient des listes vides, sans erreur, ce qui est pire qu'un refus. La solution est déjà en base et n'a jamais été citée : le schéma crée `immodesk_admin`, `NOLOGIN BYPASSRLS`, avec les `GRANT` correspondants, et son commentaire le destine explicitement à la console d'administration. **Aucune migration n'est nécessaire.** La règle est donc : toute transaction servant une route `/v1/admin/*`, ainsi que les travaux de fond de diffusion d'audit, de vagues et d'archivage, emprunte `immodesk_admin` par `SET LOCAL ROLE immodesk_admin` sur une connexion d'un pool dédié, **après** que `PlatformAdminGuard` a statué, et pour la seule durée de la transaction ; toute autre route, y compris celles du centre de sécurité d'une organisation, celles du portail locataire et toutes les lectures de drapeaux, reste sur `immodesk_app` avec `app.current_organization_id` positionné et la RLS pleinement active. L'emprunt de rôle n'est jamais décidé par un paramètre de requête ni par un en-tête : il est attaché au préfixe de route dans le code. Chaque instruction exécutée sous `immodesk_admin` produit une écriture d'audit diffusée selon l'arbitrage 4, de sorte qu'un contournement de RLS ne soit jamais silencieux.

3. **Un accès refusé se journalise dans `audit_logs`, au prix d'une extension d'énumération.** Le plan exige que la tentative d'accès inter-organisation soit tracée avec l'utilisateur, l'adresse IP et la ressource visée. `audit_logs` porte déjà `actor_user_id`, `ip_address`, `user_agent`, `request_id`, `api_key_id`, `entity_type` et `entity_id` : tout y est, sauf une valeur d'action honnête. La phase propose donc l'unique extension de ce contrat, `ALTER TYPE audit_action ADD VALUE 'ACCESS_DENIED'`, additive et non destructive. À défaut d'accord sur la migration, le repli documenté est `action = 'LOGIN'` — l'événement étant alors classé comme décision d'autorisation — avec `operation = 'ACCESS_DENIED'` ; le journal reste exploitable mais devient moins lisible. Le contrat retient la migration.

4. **`audit_logs.organization_id` est NOT NULL : un événement de plateforme se diffuse, il ne se centralise pas.** Aucune ligne d'audit ne peut exister hors d'une organisation, et la RLS la rendrait invisible. La bascule en lecture seule, l'activation d'une vague et la déclaration d'un incident écrivent donc **une ligne par organisation concernée**, par lot, en tâche de fond sous `immodesk_admin` (arbitrage 2), en une seule instruction `INSERT ... SELECT` : toutes les organisations `ACTIVE` pour la lecture seule et l'incident, les seules organisations de la vague pour le go-live. Ce n'est pas un contournement, c'est la bonne sémantique : chaque client retrouve dans son propre journal la preuve horodatée que la plateforme a été gelée, et son `OWNER` peut la consulter sans nous la demander. Les mises à jour intermédiaires d'un incident ne sont pas diffusées : seules la déclaration et la résolution le sont.

5. **Il n'existe aucune table de demande d'effacement, et il n'en sera pas créé.** Le plan décrit une route, le schéma ne porte rien. La demande, sa recevabilité, son exécution et son refus sont donc des **événements d'audit** (`PRIVACY_ERASURE_REQUESTED`, `_EXECUTED`, `_REFUSED`), et l'exécution emprunte exactement le mécanisme de travail de fond des exports de la phase 9 : `202 { jobId }`, état consultable, rapport renvoyé par la route de suivi et archivé dans `documents` au genre `OTHER`. Le registre des demandes est une requête sur `audit_logs`, pas une table.

6. **Le consentement du locataire est un événement, pas une colonne.** Ni `tenants` ni `users` ne portent de version de mentions légales acceptées. L'acceptation s'écrit dans `audit_logs` (`entity_type = 'tenant'`, `operation = 'PRIVACY_CONSENT_ACCEPTED'`, `new_state = { legalVersion, acceptedAt, ipAddress }`), et l'état courant est **dérivé** de la dernière entrée, sur le modèle de l'état d'avancement de l'onboarding de la phase 10. Le consentement à être contacté, lui, existe déjà en base et n'est pas réinventé : c'est `contact_channels.opt_in` et `opt_out_at`, par canal.

7. **L'effacement anonymise l'identification, il ne touche jamais une ligne financière.** Doctrine opposable, écrite ici une fois pour toutes. Sont anonymisés : `tenants`, `landlords`, `guarantors`. Sont supprimés : les `contact_channels` du tiers, qui ne portent que des coordonnées et aucune suppression logique, et les objets de stockage des pièces d'identité. Ne sont **jamais** touchés, ni modifiés, ni supprimés : `payments`, `payment_allocations`, `cash_receipts`, `receipts`, `rent_invoices`, `invoice_lines`, `deposits`, `deposit_movements`, `audit_logs`. Les quittances et reçus déjà émis conservent le nom figé au moment de leur émission : le PDF est une pièce comptable, pas une donnée modifiable. Un `leases` conserve son `tenant_id` : la filiation comptable reste intacte, elle pointe simplement vers un tiers devenu pseudonyme. La contre-passation reste le seul moyen de corriger un montant, en phase 11 comme depuis la phase 3.

8. **Le schéma interdit de vider un nom sur un locataire ou un bailleur, et tout téléphone principal : l'anonymisation écrit des valeurs réservées.** `tenants_name_chk` et `landlords_name_chk` exigent `last_name` pour une personne physique et `company_name` pour une personne morale ; `tenants_phone_chk`, `landlords_phone_chk` et `guarantors_phone_chk` imposent un `primary_phone` au format E.164. Mettre `NULL` y est donc impossible. **`guarantors` ne porte aucune contrainte de nom** — il n'existe pas de `guarantors_name_chk`, la seule contrainte de la table étant `guarantors_phone_chk` — mais un garant sans nom serait illisible dans un journal comme dans un bail : l'anonymisation y écrit la même valeur réservée par cohérence, pas par obligation. La valeur de nom est le libellé réservé `« Tiers anonymisé »`, la valeur de téléphone le numéro non routable réservé `+242000000000`. Ce numéro est exclu du contrôle d'unicité applicatif `PARTIES.PHONE_ALREADY_USED` et n'est jamais retenu comme destinataire par le pipeline de notifications.

9. **`users.phone_e164` est UNIQUE : un compte utilisateur ne peut pas porter le numéro réservé partagé.** Un effacement demandé par une organisation n'anonymise donc **pas** la ligne `users` : un utilisateur est global et peut être membre ailleurs ou locataire d'une autre agence. Il se contente de poser `tenants.user_id = NULL` ou `landlords.user_id = NULL` — `guarantors` ne porte pas de `user_id`. Seul un effacement de compte, prononcé au niveau plateforme et hors périmètre d'une organisation, touche `users` : statut `DELETED`, `deleted_at` renseigné, noms et courriel vidés, et numéro remplacé par un identifiant non routable unique de la forme `+24299` suivi de neuf chiffres dérivés de l'identifiant de la ligne, seule forme satisfaisant à la fois `users_phone_e164_chk` et `users_phone_key`.

10. **La révocation globale ne tue pas un jeton d'accès déjà émis : elle ferme les portes, elle ne vide pas les couloirs.** Aucune liste de révocation de JWT n'existe et aucune n'est introduite. Révoquer coupe les `refresh_tokens` (famille entière, `revoked_at` et `revoked_reason` renseignés) et les `api_keys` (statut `REVOKED`), ce qui est immédiat et définitif ; un jeton d'accès déjà délivré reste valable **jusqu'à son expiration, au plus quinze minutes**, sans pouvoir être renouvelé. La portée exacte est donc : effet immédiat sur tout renouvellement, sur toute clé machine et sur toute vérification relue en base à chaque requête — appartenance, rôle, drapeau plateforme, activation du portail — et fenêtre résiduelle bornée à quinze minutes sur les seules lectures autorisées par un jeton en cours. C'est énoncé tel quel au client dans la réponse, par le champ `accessTokenGraceSeconds`, qui figure dans la sortie des **trois** routes de révocation globale — personnelle, d'organisation, et révocation d'une session — car la fenêtre est la même dans les trois cas et la taire sur l'une d'elles laisserait croire à une coupure franche. Quiconque a besoin d'une coupure franche pendant cette fenêtre passe par la lecture seule, qui, elle, est instantanée.

11. **La révocation globale d'une organisation exige une preuve de présence.** `POST /v1/organizations/{id}/security/revoke-all` est l'action la plus destructrice ouverte à un client : elle déconnecte tous les membres et casse toutes les intégrations. Elle est donc gardée par un code à usage unique de motif `SENSITIVE_ACTION`, qui existe déjà dans l'énumération et n'a pas à être inventé, avec l'en-tête `X-Otp-Code`. Sans lui, `403 SECURITY.SENSITIVE_ACTION_OTP_REQUIRED`. Le compte compromis étant précisément celui dont le téléphone peut être aux mains d'un tiers, un `PLATFORM_ADMIN` peut exécuter la même action pour le compte de l'organisation, sur vérification d'identité hors bande, avec motif obligatoire.

12. **Le mode lecture seule répond `503`, jamais `403`.** Le plan disait « 403 ou équivalent ». Un 403 signifie « votre rôle ne le permet pas » : le client mobile en déduirait légitimement que la saisie est perdue et pourrait purger sa file locale. Un 503 assorti de `Retry-After` dit la vérité — le service est temporairement gelé, réessayez — et laisse le mobile conserver sa file hors ligne intacte, ce que la phase 5 exige. Le code est `503 PLATFORM.READ_ONLY`, avec `details.reason` et `details.expectedEndAt` quand ils sont connus.

13. **Le registre des traitements est une ressource versionnée du dépôt, lisible par tout utilisateur authentifié.** Aucune table ne peut l'accueillir et aucune ne sera créée pour un contenu qui change deux fois par an et doit être revu par un juriste, donc relu en revue de code. Il vit dans le dépôt, est servi en lecture par l'API depuis la configuration de l'application, et son exemplaire signé est archivé dans `documents` au genre `OTHER`. **Divergence assumée avec le plan**, qui réservait `/privacy/processing-register` au rôle `OWNER` : un registre des traitements est par nature un document d'information, opposable et destiné à être montré ; le refuser à un `ACCOUNTANT` ou à un `VIEWER` de la même organisation ne protège rien, puisqu'il ne contient aucune donnée personnelle ni aucun dénombrement client, et complique inutilement la réponse à une demande d'un tiers. Il est donc ouvert à tout authentifié, sans en-tête d'organisation obligatoire pour sa partie commune. Les coordonnées du référent protection des données et les durées de conservation appliquées, elles, sont propres à chaque organisation et vivent dans `organization_settings.settings_json.privacy`, selon la mécanique de sous-objet déjà utilisée par `contractTemplate` (phase 2), `paymentMethods` (phase 4), `reconciliation` (phase 6) et `facilities` (phase 8) ; elles ne sont jointes au registre que lorsque l'en-tête d'organisation est présent. Le registre nomme le stockage objet réellement en service : MinIO auto-hébergé sur le VPS en pilote, déclaré `storage_provider = 'S3'` faute de valeur MINIO dans l'énumération, Cloudflare R2 seulement si le volume l'impose.

14. **`feature_flags` n'admet qu'une ligne globale par clé : il n'existe donc qu'un seul incident courant, qu'un seul état de lecture seule et qu'une seule maintenance annoncée.** L'index `feature_flags_global_key_uk` est unique sur la clé seule quand `organization_id` est nul. La lecture seule est le drapeau global `read_only_mode`. L'incident public est le drapeau global `platform_incident`, dont le `payload` JSONB porte le titre, la gravité, l'horodatage et la suite des mises à jour ; déclarer un second incident alors qu'un autre est ouvert renvoie `409 PLATFORM.INCIDENT_ALREADY_OPEN` : on met à jour l'incident courant, on ne l'empile pas. La maintenance planifiée est le drapeau global `platform_maintenance`, dont la fenêtre est portée par les colonnes existantes `starts_at` et `ends_at` — que `feature_flags_period_chk` ordonne déjà — et le texte par `payload.message` ; elle est posée et levée par la route de drapeaux existante, sans route ni table propre. C'est la **source** de `PlatformStatus.plannedMaintenance`, qui sans elle n'en aurait aucune : le champ est donc un objet unique ou `null`, jamais une liste, puisque l'index d'unicité interdit qu'il y en ait deux. L'historique des incidents clos et des maintenances passées se lit dans `audit_logs`, par diffusion selon l'arbitrage 4.

15. **Une vague de go-live est une valeur de `payload`, pas une entité.** Le rattachement d'une organisation à une vague est `feature_flags.payload.wave` sur la ligne `commercial_launch` de cette organisation, et la temporalité est portée par les colonnes existantes `starts_at` et `ends_at`. Il n'existe donc ni table de vagues, ni table de suivi : le tableau de bord du go-live est **entièrement dérivé** d'une jointure entre `feature_flags`, `organizations` et `subscriptions`, recalculée à chaque appel, sous `immodesk_admin` faute d'en-tête d'organisation (arbitrage 2). Aucun état de migration n'est stocké, donc aucun ne peut diverger du réel.

16. **`audit_logs` est strictement append-only : sa « rétention » est un archivage, jamais une purge — les refus d'accès compris.** Ni `UPDATE` ni `DELETE` n'y sont possibles, par décision fondatrice du projet et par trigger. La politique de conservation du journal se réduit donc à un **export périodique** des entrées antérieures à `auditLogsMonths` vers le stockage objet, au format JSON Lines compressé, rangé dans `documents` au genre `OTHER` : la ligne reste en base, une copie froide existe, rien n'est supprimé. **Le journal des accès refusés n'y fait pas exception** : une entrée `ACCESS_DENIED` est une ligne d'`audit_logs` comme une autre, elle suit le même archivage et n'est jamais purgée. Toute promesse de suppression du journal d'audit faite à un tiers serait intenable et ne doit pas être faite. Les journaux réellement purgeables sont `notifications` et `message_logs`, qui ne portent aucun verrou d'immuabilité.

17. **Les exports de la phase 11 n'inventent aucun mécanisme ni aucune route de suivi : ce sont ceux de la phase 9.** Export de réversibilité d'une organisation, export des données d'une personne et archivage froid du journal empruntent le même chemin : `202 { jobId }`, travail BullMQ, fichier rangé dans `documents` au genre `OTHER`, lien signé d'une heure. L'état se consulte par la route existante `GET /v1/exports/jobs/{jobId}` de la phase 9, **et par aucune autre** : la phase 11 n'ouvre pas de route de suivi jumelle sous un préfixe de confidentialité, qui ferait deux chemins pour une même chose. Le « format ouvert » promis contractuellement est une archive ZIP contenant un jeu de CSV UTF-8 avec BOM et séparateur point-virgule — strictement le format de la phase 9 — accompagnée d'un `manifest.json` décrivant les tables, les colonnes, les dénombrements et l'horodatage. **Divergence assumée avec le plan**, qui écrivait `GET /organizations/{id}/data-export` : une génération d'export n'est pas une lecture. Elle crée un travail, consomme des ressources, écrit une ligne `documents` et une entrée d'audit `EXPORT`, et n'est pas idempotente au sens de la méthode `GET` ; un préchargeur de navigateur ou une sonde déclencherait des exports de réversibilité complets à l'insu du client. La route est donc `POST`, comme l'est déjà `POST /v1/exports/{kind}` en phase 9.

18. **Aucun préfixe `/v1/platform/*` n'est introduit : la phase 11 se range derrière les préfixes existants.** Aucune phase antérieure n'en compte, et rien ne justifie d'en ouvrir un pour deux lectures. Les trois préfixes en vigueur suffisent et sont conservés tels quels : `/v1/admin/*` pour la console de plateforme, déjà ouvert en phase 10 et nommément visé par le commentaire de `users.is_platform_admin` dans le schéma ; `/v1/tenant/*` pour le portail locataire, ouvert en phase 10 ; la racine `/v1` pour ce qui est commun ou public. L'état de lecture seule, qu'un bandeau permanent doit pouvoir lire sans être connecté, est donc servi par `GET /v1/status`, qui le porte déjà et qui est public — une route authentifiée dédiée n'aurait rien apporté qu'un second chemin vers la même valeur. **Divergence assumée avec le plan** sur deux points de rangement. Les mentions légales passent de `/portal/legal` à `GET /v1/legal` : le préfixe `/v1/portal/*` appartient depuis la phase 7 au portail bailleur et est gardé par le rôle dérivé `LANDLORD_PORTAL`, y placer une route publique casserait la lisibilité du cloisonnement et exposerait un chemin non gardé au milieu d'un espace gardé ; la ressource étant commune aux locataires, aux bailleurs et aux visiteurs, elle vit à la racine. Le recueil du consentement passe de `POST /portal/consents` à `POST /v1/tenant/privacy/consents` : contrairement aux mentions légales, le consentement est un acte **du locataire connecté**, rattaché à son `tenant_id` et au périmètre de sa session, donc il appartient à l'espace que la phase 10 a ouvert pour lui et qu'elle garde par le rôle dérivé `TENANT_PORTAL`. Ranger un acte authentifié de locataire ailleurs que sous `/v1/tenant/*` obligerait à redéfinir sa garde une seconde fois.

## Centre de sécurité (11.A)

- **Sessions actives** : une session est une ligne `refresh_tokens` dont `revoked_at` est nul et `expires_at` à venir. Elle s'affiche avec `device_label`, `user_agent`, `ip_address`, `issued_at` et `expires_at`, la session courante étant marquée `isCurrent`. Le jeton lui-même n'est jamais renvoyé, et `token_hash` ne sort pas de la base.
- **Révoquer une session** révoque **toute sa famille** (`family_id`), jamais la seule ligne : la rotation de la phase 0 fait qu'un appareil possède une chaîne de jetons, et n'en couper qu'un maillon laisserait l'appareil connecté par son successeur. `revoked_reason` est obligatoire et vaut `USER_REVOKED`, `ORG_REVOKE_ALL`, `PLATFORM_REVOKE_ALL` ou `COMPROMISE`. L'opération est **idempotente** : révoquer une famille déjà révoquée renvoie `204`, pas une erreur. Une session déjà coupée est un état souhaité, pas un conflit.
- **Révocation globale personnelle** (`/v1/me/security/sessions/revoke-all`) : toutes les familles de l'utilisateur, la session courante comprise, sur tous ses appareils et toutes ses organisations. L'utilisateur est déconnecté partout et doit repasser par un code à usage unique.
- **Révocation globale d'organisation** : toutes les sessions de **tous les membres actifs** de l'organisation, plus **toutes** ses `api_keys` passées à `REVOKED`. Elle ne touche ni les sessions que ces membres ouvrent chez une autre organisation — `refresh_tokens` est global et ne porte pas d'organisation, la coupure se fait donc membre par membre à partir de `organization_members` — ni les comptes eux-mêmes, qui ne sont ni suspendus ni supprimés. C'est une déconnexion de masse, pas une sanction. Sa réponse porte `accessTokenGraceSeconds` comme les deux autres révocations (arbitrage 10).
- **Clés d'API** : jamais renvoyées en clair après leur création. La création et la rotation renvoient le secret **une seule fois** ; ensuite, seul `key_prefix` est lisible, avec `last_used_at`, `scopes`, `allowed_ips`, `expires_at` et `status`. Le nombre de clés `ACTIVE` par organisation est plafonné par `SECURITY_MAX_API_KEYS_PER_ORG` ; au-delà, la création est refusée par `409 SECURITY.API_KEY_LIMIT_REACHED`, une rotation restant toujours possible puisqu'elle ne fait pas croître le compte durablement.
- **Rotation** : `api_keys` ne porte aucune colonne reliant une clé à celle qu'elle remplace. La rotation crée donc une nouvelle ligne, reprend `name`, `scopes` et `allowed_ips` de l'ancienne, et pose sur l'ancienne un `expires_at` court — `SECURITY_API_KEY_ROTATION_GRACE_HOURS`, 24 h par défaut, `0` pour une coupure immédiate en cas de compromission. L'ancienne reste `ACTIVE` jusqu'à cette échéance, le temps que l'intégration bascule, puis une tâche de fond la passe à `REVOKED`. Le lien entre les deux clés vit dans `audit_logs` (`operation = 'API_KEY_ROTATED'`, `new_state = { previousApiKeyId, newApiKeyId, graceEndsAt }`) : c'est la seule traçabilité possible sans colonne nouvelle, et elle suffit.
- **Journal des accès refusés** : alimenté par le filtre d'autorisation et par la RLS. Sont écrits le refus de rôle (`IAM.FORBIDDEN`), la ressource hors organisation (qui répond `404` au client mais s'enregistre comme refus), le refus de clé d'API (portée insuffisante, adresse non autorisée, clé révoquée) et l'échec d'authentification répété. L'entrée porte `actor_user_id` quand il existe, `api_key_id` le cas échéant, `ip_address`, `user_agent`, `request_id`, l'entité visée et, dans `new_state`, la méthode, le chemin, le code d'erreur rendu et l'organisation visée. `entity_id` étant NOT NULL, un refus portant sur une collection plutôt que sur une ressource précise inscrit l'identifiant de l'organisation visée, `entity_type` conservant le nom de l'entité de la route. Ces entrées sont des lignes d'`audit_logs` : elles ne sont **jamais purgées**, seulement archivées à froid (arbitrage 16). La route de consultation travaille sur une fenêtre glissante dont l'étendue par défaut et maximale est `SECURITY_DENIAL_LOOKBACK_DAYS` ; au-delà, la lecture se fait dans les archives froides, pas en base.
- **Consultation du journal d'audit** : `GET /v1/organizations/{id}/audit-logs`, réservé à `OWNER`, filtrable par acteur, entité, opération, période et action, paginé au curseur comme partout. `previous_state` et `new_state` sont renvoyés tels quels. Les montants en JSONB y sont des chaînes, conformément à la sérialisation déterministe de la phase 0 : aucun montant n'a jamais transité par un flottant.

## Reprise d'activité et mode lecture seule (11.C)

L'épique 11.C porte le plan de reprise d'activité, dont l'essentiel **n'a pas de surface d'API** : l'exercice de restauration sur environnement isolé, la mesure au chronomètre du RTO et du RPO effectifs, le contrôle d'intégrité comparant les totaux de `payments`, `receipts` et `audit_logs` au point de restauration, et le PRA écrit couvrant la perte de la base, l'indisponibilité de l'hébergeur, la compromission d'un compte `OWNER` et la panne prolongée de l'agrégateur Mobile Money ou de l'API WhatsApp sont des travaux d'exploitation et de documentation, versionnés hors du produit. Aucune route ne leur est inventée, et le compte rendu daté de l'exercice reste un livrable documentaire. Seule la dernière exigence de l'épique — figer les écritures en une action pendant un incident — se traduit par de l'API, et c'est l'objet de ce qui suit.

- **Bascule** : `POST /v1/admin/read-only-mode` avec `{ enabled, reason, expectedEndAt?, incidentRef? }`. L'état est le drapeau global `read_only_mode` ; `reason` est obligatoire à l'activation et repris tel quel dans le bandeau affiché aux utilisateurs et sur la page de statut. Réactiver un mode déjà actif renvoie `409 PLATFORM.READ_ONLY_ALREADY_SET` : c'est une bascule, pas un compteur. La transaction s'exécute sous `immodesk_admin`, sans quoi la politique `global_flags_readonly` la refuserait (arbitrage 2).
- **Lecture de l'état** : `GET /v1/status`, public et sans authentification, qui porte déjà `readOnly` — le bandeau permanent du web et de l'application mobile en dépend et n'a besoin d'aucune autre route (arbitrage 18).
- **Ce qui bascule** : toute méthode `POST`, `PATCH`, `PUT` et `DELETE` du préfixe `/v1`, sans exception de rôle. Un `PLATFORM_ADMIN` n'y échappe pas sur les écritures métier : un gel dont l'administrateur peut s'affranchir ne prouve rien et laisserait précisément se créer les données à réconcilier que la bascule cherche à éviter.
- **Ce qui reste actif**, liste limitative : les lectures `GET` et `HEAD`, toutes ; `/v1/health`, `/v1/health/ready` et `/v1/status`, indispensables aux sondes et à la communication ; `/v1/auth/*` et `/v1/tenant-auth/*` — demande et vérification de code, rafraîchissement, déconnexion — sans quoi personne ne pourrait se connecter pour traiter l'incident, et dont les écritures ne touchent que `otp_codes` et `refresh_tokens` ; les routes de révocation du centre de sécurité, car une compromission doit rester arrêtable pendant une panne ; **la conduite de l'incident lui-même**, c'est-à-dire la bascule de lecture seule, `POST /v1/admin/incidents`, `POST /v1/admin/incidents/current/updates` et `POST /v1/admin/incidents/current/resolve`, sans quoi on ne pourrait ni déclarer, ni tenir à jour, ni clore un incident au moment précis où c'est nécessaire, et le gel serait irréversible ; **les seuls drapeaux de conduite d'incident** via `POST /v1/admin/feature-flags/{key}`, limitativement `read_only_mode`, `platform_incident`, `platform_maintenance` et `security_audit_cleared` — toute autre clé, `commercial_launch` en tête, est refusée pendant le gel par `503 PLATFORM.READ_ONLY`, car ouvrir une vague pendant une panne serait précisément la décision à ne pas prendre, ce qui vaut aussi pour `/v1/admin/go-live/*` ; enfin la réception des webhooks `/v1/webhooks/*`, qui continue d'écrire dans `webhook_events` au statut `RECEIVED` **sans rien traiter**. Cette dernière exception est la plus importante : refuser la réception ferait perdre les rappels des agrégateurs Mobile Money et de WhatsApp, donc des encaissements réels. Les événements reçus pendant le gel sont traités à la réouverture, avec la re-interrogation de statut obligatoire depuis la phase 4.
- **Travaux de fond** : les tâches périodiques qui écrivent — facturation mensuelle, relances, pénalités, campagnes d'abonnement, refacturation des charges, génération de PDF — sont suspendues. Les travaux ne sont ni supprimés ni purgés : ils restent en file BullMQ et reprennent à la réouverture. Le cron de facturation étant idempotent par construction depuis la phase 3, un mois entamé avant le gel ne produit aucun doublon à la reprise.
- **Mobile** : l'application continue d'enregistrer hors ligne et de faire signer les reçus. La synchronisation reçoit `503` et réessaie ; aucun lot n'est abandonné, aucune saisie n'est perdue. C'est exactement le motif du choix de `503` plutôt que `403`.
- **Traçabilité** : chaque activation et chaque désactivation écrit `READ_ONLY_MODE_ENABLED` ou `READ_ONLY_MODE_DISABLED` dans `audit_logs`, diffusé à toutes les organisations actives selon l'arbitrage 4, avec l'acteur, le motif et la durée effective du gel.

## Conformité des données personnelles (11.D)

### Export

- **Réversibilité d'une organisation** : tout ce que porte son `organization_id`, tables métier comme journaux, plus les documents rattachés sous forme de fichiers. Réservé à `OWNER`, exécuté en tâche de fond, plafonné à un export concurrent par organisation (`409 PRIVACY.EXPORT_ALREADY_RUNNING`).
- **Export d'une personne** : le même mécanisme, restreint aux lignes concernant un `tenant`, `landlord`, `guarantor` ou `user` désigné, et à celles qui le citent — baux, factures, paiements, quittances, relances, messages, canaux de contact, documents. Il répond à une demande d'accès d'un tiers et se donne au demandeur tel quel.
- **Suivi** : les deux exports renvoient `202 { jobId }` et se suivent par `GET /v1/exports/jobs/{jobId}`, route de la phase 9 réutilisée sans jumelle (arbitrage 17).
- Un export contient des données personnelles : le lien signé expire en une heure, sa délivrance est journalisée (`EXPORT`), et le fichier est purgé du stockage objet au terme de `PRIVACY_EXPORT_RETENTION_DAYS`.

### Effacement

Recevabilité vérifiée avant toute écriture, et refusée par `409 PRIVACY.ERASURE_NOT_ELIGIBLE` en précisant le motif dans `details` : un bail actif ou en préavis subsiste ; un solde reste dû ou un avoir non soldé existe ; un dépôt de garantie est encore détenu ; le dernier bail est clos depuis moins que `identityMonths` ; le tiers visé est le bailleur `is_self` de l'organisation, qui est l'organisation elle-même et ne s'efface pas.

`POST /v1/privacy/erasure-requests/preview` renvoie sans rien écrire la liste exacte de ce qui serait anonymisé, supprimé et conservé — c'est la même discipline de simulation que `dryRun` en phase 9 et que la simulation de pénalité. L'exécution est ensuite idempotente : un tiers déjà anonymisé est ignoré, jamais anonymisé deux fois.

Le traitement dépend de la table, car **les trois tables de tiers n'ont pas les mêmes colonnes**. Chaque ligne ci-dessous n'a été retenue qu'après vérification de la colonne dans `docs/schema/schema.sql` : `landlords` ne porte ni `birth_place`, ni `whatsapp_phone`, ni `profession`, ni `employer_name`, ni `monthly_income`, ni `emergency_contact_*`, ni `client_ref` ; `guarantors` ne porte ni `user_id`, ni `secondary_phone`, ni `whatsapp_phone`, ni `birth_date`, ni `birth_place`, ni `nationality`, ni `id_document_expiry`, ni `rccm_number`, ni `niu_number`, ni `emergency_contact_*`, ni `client_ref`, et c'est la seule des trois à porter `relationship` et `guarantee_amount`.

| Table / donnée                                                                                                                                   | Traitement                                                                                                                           |
| :----------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| `tenants`, `landlords`, `guarantors` : `last_name` si `party_type = 'INDIVIDUAL'`, `company_name` si `'COMPANY'`                                 | Libellé réservé « Tiers anonymisé » (arbitrage 8)                                                                                    |
| `tenants`, `landlords`, `guarantors` : `primary_phone`                                                                                           | Numéro réservé `+242000000000` (contrainte E.164)                                                                                    |
| `tenants`, `landlords`, `guarantors` : `first_name`, l'autre champ de nom, `email`, `address_line`, `district`, `notes`                          | `NULL`                                                                                                                               |
| `tenants`, `landlords`, `guarantors` : `id_document_type`, `id_document_number`, `id_document_id`                                                | `NULL`                                                                                                                               |
| `tenants`, `landlords`, `guarantors` : `gender`                                                                                                  | `'UNSPECIFIED'` — colonne NOT NULL, jamais `NULL`                                                                                    |
| `tenants`, `landlords` **seuls** : `secondary_phone`, `birth_date`, `nationality`, `id_document_expiry`, `rccm_number`, `niu_number`             | `NULL` (colonnes absentes de `guarantors`)                                                                                           |
| `tenants` **seul** : `whatsapp_phone`, `birth_place`, `emergency_contact_name`, `emergency_contact_phone`, `client_ref`                          | `NULL` (colonnes absentes de `landlords` et `guarantors`)                                                                            |
| `tenants`, `guarantors` **seuls** : `profession`, `employer_name`, `monthly_income`                                                              | `NULL` (colonnes absentes de `landlords`)                                                                                            |
| `guarantors` **seul** : `relationship`                                                                                                           | `NULL`                                                                                                                               |
| `tenants`, `landlords` : `user_id`                                                                                                               | `NULL` ; la ligne `users` n'est pas touchée (arbitrage 9). `guarantors` n'a pas de `user_id`                                         |
| `tenants`, `landlords`, `guarantors` : `city`, `country_code`, `party_type`, `currency`, `guarantee_amount` (garant), `payout_method` (bailleur) | Conservés : statistiques ou contractuels, non identifiants                                                                           |
| `guarantors.tenant_id`, `landlords.is_self`                                                                                                      | Conservés : filiation et qualité, non identifiants                                                                                   |
| `contact_channels` du tiers (`owner_type` + `owner_id`)                                                                                          | **Supprimées** : la table ne porte aucune suppression logique                                                                        |
| `documents` de genre `ID_DOCUMENT` rattachés                                                                                                     | Objet purgé du stockage, ligne conservée avec `deleted_at` (mécanisme phase 1)                                                       |
| `bank_accounts` du tiers, `landlord_id` ou `tenant_id` **uniquement**                                                                            | `is_active = false` par la désactivation de la phase 1. Un garant n'a pas de compte : `bank_accounts` ne porte pas de `guarantor_id` |
| `notifications` le citant : `recipient_address`                                                                                                  | Numéro réservé ; `body` vidé, `payload` remis à `'{}'` (colonnes NOT NULL)                                                           |
| `message_logs` le citant : `to_address`                                                                                                          | Numéro réservé ; `content_preview` à `NULL`, `raw_payload` remis à `'{}'` (NOT NULL) ; statuts, coûts et dénombrements conservés     |
| `payments`, `payment_allocations`, `cash_receipts`, `receipts`, `rent_invoices`, `invoice_lines`, `deposits`, `deposit_movements`, `audit_logs`  | **Jamais touchés, ni modifiés, ni supprimés**                                                                                        |
| PDF déjà émis (quittances, reçus, contrats) dans `documents`                                                                                     | Conservés avec le nom figé à l'émission : pièces comptables                                                                          |

L'opération écrit elle-même dans `audit_logs` (`PARTY_ANONYMIZED`) avec l'état avant et après, ce qui est cohérent : le journal d'audit conserve la trace de l'effacement, et cette trace n'est pas une donnée d'identification vivante mais la preuve opposable que l'obligation a été honorée. Le rapport renvoyé à l'issue du travail dénombre les lignes anonymisées, supprimées et conservées, et affirme explicitement que les totaux de `payments` et `receipts` sont inchangés — contrôle exécuté et non supposé.

### Rétention et purge

`organization_settings.settings_json.privacy` porte `identityMonths`, `messageLogsDays`, `notificationsDays`, `auditLogsMonths`, `financialYears`, `dpoName`, `dpoContact` et `legalVersion`, valeurs par défaut issues de la configuration. La tâche `privacy-retention` s'exécute chaque nuit : elle purge `notifications` et `message_logs` au-delà de leur durée, archive `audit_logs` à froid sans rien supprimer — refus d'accès compris (arbitrage 16) —, supprime du stockage objet les `documents` dont `retention_until` est dépassée, et **signale** — sans jamais l'exécuter d'office — les tiers devenus éligibles à l'anonymisation. Aucun effacement n'est automatique : il est toujours prononcé par un `OWNER`. `financialYears` vaut dix ans par défaut, durée de conservation des pièces comptables retenue à titre prudent, à confirmer par le conseil juridique local ; elle prime sur toute autre durée en cas de conflit.

### Consentement et portail locataire

- `GET /v1/legal` est **public** et non authentifié : les mentions légales et la politique de confidentialité doivent être lisibles avant toute connexion, et le plan les classait à tort derrière un rôle locataire. Elles portent une version (`legalVersion`) et sont servies depuis la configuration, au type `LegalTerms`. Rangement et divergence justifiés en arbitrage 18.
- Le consentement est un événement d'audit (arbitrage 6). L'écran « mes données » lit l'état dérivé : version acceptée, date, catégories détenues, coordonnées du référent. Un changement de version fait réapparaître l'écran à la connexion suivante ; tant qu'il n'est pas accepté, le portail reste lisible mais toute action d'écriture est refusée par `403 PRIVACY.CONSENT_REQUIRED`.
- Le locataire pilote lui-même ses canaux : `opt_in` et `opt_out_at` sur ses `contact_channels`. Un canal fermé n'est plus retenu par le pipeline de relances. Le dernier canal joignable ne peut pas être fermé sans en désigner un autre, faute de quoi ses quittances deviendraient indélivrables : `422 PRIVACY.LAST_CHANNEL_PROTECTED`.
- Le locataire **demande** son effacement, il ne le déclenche pas. La demande crée une `notifications` à destination des `OWNER` de l'organisation et un événement d'audit, et renvoie une référence de suivi. La validation reste au gestionnaire, après vérification d'identité, comme l'exige le scénario du plan.

## Plan de go-live (11.F)

- **Verrou de clôture sécurité** : l'activation de `commercial_launch`, pour une organisation comme pour une vague, est refusée par `409 PLATFORM.SECURITY_CLEARANCE_MISSING` tant que le drapeau global `security_audit_cleared` n'est pas activé. Ce drapeau porte dans son `payload` la référence du rapport, la date de clôture et l'identité du cabinet ; il matérialise en base la règle « aucun finding CRITIQUE ou ÉLEVÉ ouvert », dont la source reste le rapport du cabinet et son contre-test. C'est un verrou explicite, pas une convention orale.
- **Vagues** : `POST /v1/admin/go-live/waves/{wave}/activate` prend une liste d'organisations, pose sur chacune la ligne `commercial_launch` avec `is_enabled = true`, `payload.wave` et `starts_at`, et refuse au-delà de `GO_LIVE_WAVE_MAX_ORGANIZATIONS` par `422 PLATFORM.WAVE_TOO_LARGE` : une vague trop large n'en est plus une. Un nom de vague inconnu — aucune organisation ne le portant dans `payload.wave` et aucune n'étant fournie — est refusé par `404 PLATFORM.WAVE_UNKNOWN`. Les organisations déjà activées sont comptées comme ignorées, jamais réactivées. Chaque `MANAGER` des organisations retenues reçoit une notification par le pipeline existant, WhatsApp d'abord, repli SMS.
- **Réversibilité** : `POST /v1/admin/go-live/waves/{wave}/rollback` repasse `is_enabled` à `false` **sans supprimer la ligne ni vider le `payload`** : la vague d'origine reste lisible, le retour arrière est immédiat, sans redéploiement ni migration, et une réactivation ultérieure retrouve son contexte. Un drapeau ne modifie jamais une règle comptable déjà appliquée : les abonnements souscrits pendant la vague restent valides après un retour arrière, seul le parcours commercial disparaît de l'écran.
- **Tableau de suivi**, entièrement dérivé (arbitrage 15) et lu sous `immodesk_admin` faute d'en-tête d'organisation (arbitrage 2), trois états : `MIGRATED` quand le drapeau est actif et dans sa fenêtre ; `PENDING` quand l'organisation est rattachée à la vague sans drapeau actif, ou avant `starts_at` ; `ANOMALY` quand le drapeau est actif et qu'au moins un signal se déclenche — abonnement `PAST_DUE` ou `SUSPENDED`, accès refusés au-delà de `GO_LIVE_ANOMALY_DENIALS_PER_DAY` sur vingt-quatre heures, taux de messages `FAILED` ou `REJECTED` au-delà du seuil, ou onboarding inachevé. Chaque anomalie est renvoyée avec son motif en français, jamais comme un simple drapeau rouge.
- **Page de statut publique** : `GET /v1/status`, sans authentification et sans en-tête d'organisation. Elle expose l'état des services issu des sondes, l'état de lecture seule avec son motif, l'incident courant et ses mises à jour, et la maintenance annoncée. Elle ne nomme **aucune organisation**, ne cite **aucun tiers** et ne divulgue **aucun dénombrement** métier : une page de statut qui fuit la liste de ses clients est une fuite de données.
- **Incidents** : un seul incident courant à la fois (arbitrage 14). La gravité est une valeur applicative — `MINOR`, `MAJOR`, `CRITICAL` — portée par le `payload` et non par une énumération SQL, qui n'existe pas. La déclaration et la résolution sont diffusées dans `audit_logs`, les mises à jour intermédiaires restent dans le `payload`. La résolution fige l'incident dans l'historique et libère la place pour le suivant. Ces trois routes restent ouvertes pendant un gel, faute de quoi on ne pourrait pas conduire l'incident qui l'a motivé.
- **Maintenance planifiée** : le drapeau global `platform_maintenance`, posé par `POST /v1/admin/feature-flags/{key}` avec `startsAt`, `endsAt` et `payload.message`, est l'unique source de `PlatformStatus.plannedMaintenance` (arbitrage 14). Il n'ouvre aucune route propre et n'est pas un incident : une maintenance s'annonce à l'avance, un incident se constate.
- **Sondes** : `/v1/health` reste la sonde de vivacité de la phase 0, inchangée. `/v1/health/ready` s'y ajoute comme sonde de disponibilité et vérifie séparément la base, Redis, le stockage objet et l'agrégateur Mobile Money, en renvoyant `503` dès qu'une dépendance indispensable manque. Les deux sont publiques, sans donnée métier.

## Routes

L'en-tête `X-Organization-Id` reste obligatoire sur toute route d'organisation, y compris celles dont le chemin porte déjà l'identifiant. Les routes `/v1/admin/*`, `/v1/status`, `/v1/health*` et `/v1/legal` n'en prennent pas ; `/v1/privacy/processing-register` l'accepte sans l'exiger. Les routes `/v1/admin/*` sont gardées par `PLATFORM_ADMIN` (arbitrage 1) et exécutées sous `immodesk_admin` (arbitrage 2) ; toutes les autres restent sous `immodesk_app`, RLS active.

| Méthode | Route                                                                                                              | Rôle                 | Sortie                                                                                                                             |
| :------ | :----------------------------------------------------------------------------------------------------------------- | :------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/v1/me/security/sessions`                                                                                         | Authentifié          | `200 { items: Session[] }`                                                                                                         |
| DELETE  | `/v1/me/security/sessions/{id}`                                                                                    | Authentifié          | `204` (famille entière, idempotent) ; 404 `SECURITY.SESSION_NOT_FOUND`                                                             |
| POST    | `/v1/me/security/sessions/revoke-all`                                                                              | Authentifié          | `200 { revokedSessions, accessTokenGraceSeconds }`                                                                                 |
| GET     | `/v1/organizations/{id}/security`                                                                                  | OWNER                | `200 SecurityCenter`                                                                                                               |
| GET     | `/v1/organizations/{id}/security/api-keys`                                                                         | OWNER                | `200 { items: ApiKeySummary[] }`                                                                                                   |
| POST    | `/v1/organizations/{id}/security/api-keys`                                                                         | OWNER                | `201 { apiKey: ApiKeySummary, secret }` (secret rendu une seule fois) ; 409 `SECURITY.API_KEY_LIMIT_REACHED`                       |
| POST    | `/v1/organizations/{id}/security/api-keys/{keyId}/rotate`                                                          | OWNER                | `201 { apiKey, secret, previousKeyExpiresAt }` ; 404 `SECURITY.API_KEY_NOT_FOUND` ; 409 `SECURITY.API_KEY_REVOKED`                 |
| DELETE  | `/v1/organizations/{id}/security/api-keys/{keyId}`                                                                 | OWNER                | `204` ; 404 `SECURITY.API_KEY_NOT_FOUND`                                                                                           |
| POST    | `/v1/organizations/{id}/security/revoke-all`                                                                       | OWNER + `X-Otp-Code` | `200 { revokedSessions, revokedApiKeys, affectedMembers, accessTokenGraceSeconds }` ; 403 `SECURITY.SENSITIVE_ACTION_OTP_REQUIRED` |
| GET     | `/v1/organizations/{id}/security/access-denials?from=&to=&userId=&code=&limit=&cursor=`                            | OWNER                | `200 { items: AccessDenial[], pageInfo }` (fenêtre `SECURITY_DENIAL_LOOKBACK_DAYS`)                                                |
| GET     | `/v1/organizations/{id}/audit-logs?actorUserId=&entityType=&entityId=&operation=&action=&from=&to=&limit=&cursor=` | OWNER                | `200 { items: AuditLogEntry[], pageInfo }`                                                                                         |
| POST    | `/v1/admin/read-only-mode`                                                                                         | PLATFORM_ADMIN       | `200 ReadOnlyState` ; 409 `PLATFORM.READ_ONLY_ALREADY_SET`                                                                         |
| POST    | `/v1/organizations/{id}/data-export`                                                                               | OWNER                | `202 { jobId }` ; 409 `PRIVACY.EXPORT_ALREADY_RUNNING` (suivi : `GET /v1/exports/jobs/{jobId}`)                                    |
| POST    | `/v1/privacy/subject-exports`                                                                                      | OWNER                | `202 { jobId }` ; 404 `PRIVACY.SUBJECT_NOT_FOUND` ; 422 `PRIVACY.SUBJECT_TYPE_INVALID`                                             |
| POST    | `/v1/privacy/erasure-requests/preview`                                                                             | OWNER                | `200 ErasurePreview` (n'écrit rien) ; 404 `PRIVACY.SUBJECT_NOT_FOUND` ; 422 `PRIVACY.SUBJECT_TYPE_INVALID`                         |
| POST    | `/v1/privacy/erasure-requests`                                                                                     | OWNER                | `202 { jobId }` ; 409 `PRIVACY.ERASURE_NOT_ELIGIBLE` ; 409 `PRIVACY.ERASURE_ALREADY_RUNNING`                                       |
| GET     | `/v1/privacy/erasure-requests/{jobId}`                                                                             | OWNER                | `200 ErasureReport` (rapport, non fichier : d'où une route propre, cf. arbitrage 17)                                               |
| GET     | `/v1/privacy/processing-register`                                                                                  | Authentifié          | `200 ProcessingRegister` ; 503 `PRIVACY.REGISTER_UNAVAILABLE`                                                                      |
| GET     | `/v1/organizations/{id}/privacy-settings`                                                                          | MANAGER              | `200 PrivacySettings`                                                                                                              |
| PATCH   | `/v1/organizations/{id}/privacy-settings`                                                                          | OWNER                | `200 PrivacySettings`                                                                                                              |
| GET     | `/v1/legal`                                                                                                        | Public               | `200 LegalTerms` (hors `/v1/portal/*`, réservé au portail bailleur depuis la phase 7)                                              |
| GET     | `/v1/tenant/privacy/me`                                                                                            | TENANT_PORTAL        | `200 TenantPrivacyState`                                                                                                           |
| POST    | `/v1/tenant/privacy/consents`                                                                                      | TENANT_PORTAL        | `201 { legalVersion, acceptedAt }` ; 422 `PRIVACY.CONSENT_VERSION_UNKNOWN`                                                         |
| PATCH   | `/v1/tenant/privacy/channels/{id}`                                                                                 | TENANT_PORTAL        | `200 ContactChannel` ; 422 `PRIVACY.LAST_CHANNEL_PROTECTED`                                                                        |
| POST    | `/v1/tenant/privacy/erasure-requests`                                                                              | TENANT_PORTAL        | `202 { requestRef }` (demande, jamais exécution)                                                                                   |
| GET     | `/v1/admin/feature-flags?key=&organizationId=&limit=&cursor=`                                                      | PLATFORM_ADMIN       | `200 { items: FeatureFlag[], pageInfo }`                                                                                           |
| POST    | `/v1/admin/feature-flags/{key}`                                                                                    | PLATFORM_ADMIN       | `200 { updated, items: FeatureFlag[] }` ; 404 `PLATFORM.FLAG_KEY_UNKNOWN`                                                          |
| POST    | `/v1/admin/go-live/waves/{wave}/activate`                                                                          | PLATFORM_ADMIN       | `202 { wave, activated, skipped, notified }` ; 409 `PLATFORM.SECURITY_CLEARANCE_MISSING` ; 422 `PLATFORM.WAVE_TOO_LARGE`           |
| POST    | `/v1/admin/go-live/waves/{wave}/rollback`                                                                          | PLATFORM_ADMIN       | `200 { wave, reverted }` ; 404 `PLATFORM.WAVE_UNKNOWN`                                                                             |
| GET     | `/v1/admin/go-live/board?wave=&status=&limit=&cursor=`                                                             | PLATFORM_ADMIN       | `200 GoLiveBoard` ; 404 `PLATFORM.WAVE_UNKNOWN`                                                                                    |
| POST    | `/v1/admin/incidents`                                                                                              | PLATFORM_ADMIN       | `201 PlatformIncident` ; 409 `PLATFORM.INCIDENT_ALREADY_OPEN`                                                                      |
| POST    | `/v1/admin/incidents/current/updates`                                                                              | PLATFORM_ADMIN       | `201 PlatformIncident` ; 404 `PLATFORM.INCIDENT_NOT_FOUND`                                                                         |
| POST    | `/v1/admin/incidents/current/resolve`                                                                              | PLATFORM_ADMIN       | `200 PlatformIncident` ; 404 `PLATFORM.INCIDENT_NOT_FOUND`                                                                         |
| GET     | `/v1/status`                                                                                                       | Public               | `200 PlatformStatus` (porte `readOnly` : source du bandeau permanent)                                                              |
| GET     | `/v1/health/ready`                                                                                                 | Public               | `200 { status, checks }` ou `503`                                                                                                  |

## Types

```ts
interface Session {
  id: string;
  familyId: string;
  deviceLabel: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  issuedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  allowedIps: string[] | null;
  status: 'ACTIVE' | 'REVOKED';
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}
interface SecurityCenter {
  members: {
    userId: string;
    displayName: string;
    role: Role;
    activeSessions: number;
    lastLoginAt: string | null;
  }[];
  apiKeys: ApiKeySummary[];
  recentDenials: AccessDenial[];
  readOnly: ReadOnlyState;
}
interface AccessDenial {
  occurredAt: string;
  actorUserId: string | null;
  actorLabel: string | null;
  apiKeyId: string | null;
  ipAddress: string | null;
  method: string;
  path: string;
  code: string;
  entityType: string;
  entityId: string;
  requestId: string | null;
}
interface AuditLogEntry {
  id: string;
  occurredAt: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'STATE_TRANSITION'
    | 'LOGIN'
    | 'EXPORT'
    | 'IMPORT'
    | 'ACCESS_DENIED';
  operation: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  actorLabel: string | null;
  actorRole: Role | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  changedFields: string[];
  ipAddress: string | null;
  requestId: string | null;
}
interface ReadOnlyState {
  enabled: boolean;
  reason: string | null;
  since: string | null;
  expectedEndAt: string | null;
  incidentRef: string | null;
}
interface PrivacySettings {
  identityMonths: number;
  messageLogsDays: number;
  notificationsDays: number;
  auditLogsMonths: number;
  financialYears: number;
  dpoName: string | null;
  dpoContact: string | null;
  legalVersion: string;
}
type SubjectType = 'tenant' | 'landlord' | 'guarantor' | 'user';
interface ErasurePreview {
  subjectType: SubjectType;
  subjectId: string;
  eligible: boolean;
  blockingReasons: string[];
  anonymized: { table: string; rows: number; fields: string[] }[];
  deleted: { table: string; rows: number }[];
  preserved: { table: string; rows: number; reason: string }[];
}
interface ErasureReport extends ErasurePreview {
  jobId: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
  executedAt: string | null;
  financialTotalsUnchanged: boolean;
  error: string | null;
}
// Servi depuis la configuration, jamais depuis une table (arbitrage 13).
// `organization` n'est renseigné que si l'en-tête d'organisation est présent.
interface ProcessingRegister {
  version: string;
  updatedAt: string;
  controller: { name: string; contact: string };
  dpo: { name: string | null; contact: string | null };
  purposes: {
    code: string;
    label: string;
    dataCategories: string[];
    retention: string;
    legalBasis: string;
  }[];
  processors: { name: string; role: string; country: string; transferOutsideCountry: boolean }[];
  support: { channel: string; contact: string; slaBySeverity: Record<string, string> };
  organization: {
    dpoName: string | null;
    dpoContact: string | null;
    retention: PrivacySettings;
  } | null;
}
// Mentions légales et politique de confidentialité, servies publiquement
// depuis la configuration : aucune table ne les porte (arbitrages 6 et 18).
interface LegalTerms {
  legalVersion: string;
  publishedAt: string;
  locale: 'fr-CG';
  documents: { code: 'TERMS' | 'PRIVACY_POLICY'; title: string; body: string; updatedAt: string }[];
  dpoContact: string | null;
  supportContact: string | null;
}
interface TenantPrivacyState {
  legalVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  consentRequired: boolean;
  dataCategories: string[];
  dpoContact: string | null;
  channels: {
    id: string;
    channelType: string;
    value: string;
    optIn: boolean;
    isPrimary: boolean;
  }[];
}
interface FeatureFlag {
  id: string;
  key: string;
  organizationId: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  payload: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
}
interface GoLiveBoard {
  wave: string | null;
  counts: { migrated: number; pending: number; anomaly: number };
  items: {
    organizationId: string;
    legalName: string;
    wave: string | null;
    status: 'MIGRATED' | 'PENDING' | 'ANOMALY';
    activatedAt: string | null;
    subscriptionStatus: string | null;
    anomalies: string[];
  }[];
  pageInfo: { nextCursor: string | null; hasNextPage: boolean; limit: number };
}
interface PlatformIncident {
  reference: string;
  title: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  startedAt: string;
  resolvedAt: string | null;
  updates: { at: string; message: string }[];
}
interface PlatformStatus {
  status: 'ok' | 'degraded' | 'down';
  readOnly: ReadOnlyState;
  checks: { database: string; redis: string; storage: string; mobileMoney: string };
  incident: PlatformIncident | null;
  // Drapeau global `platform_maintenance` : starts_at, ends_at, payload.message.
  // Objet unique ou null — `feature_flags_global_key_uk` interdit qu'il y en ait deux (arbitrage 14).
  plannedMaintenance: { startsAt: string; endsAt: string; message: string } | null;
}
```

## Codes d'erreur nouveaux

Chaque code est rattaché à la route qui le produit. Deux seulement sont **transversaux**, c'est-à-dire rendus par un garde global plutôt que par une route nommée, et ils sont signalés comme tels ; aucun autre code n'est déclaré sans emploi.

- **`SECURITY.*`** : `SESSION_NOT_FOUND` (404, `DELETE /v1/me/security/sessions/{id}`), `API_KEY_NOT_FOUND` (404, suppression et rotation d'une clé), `API_KEY_REVOKED` (409, rotation d'une clé déjà révoquée), `API_KEY_LIMIT_REACHED` (409, création d'une clé au-delà de `SECURITY_MAX_API_KEYS_PER_ORG`), `SENSITIVE_ACTION_OTP_REQUIRED` (403, révocation globale d'organisation sans `X-Otp-Code`).
- **`PRIVACY.*`** : `SUBJECT_NOT_FOUND` (404, export et effacement d'une personne), `SUBJECT_TYPE_INVALID` (422, `subjectType` hors `SubjectType` sur les mêmes routes), `ERASURE_NOT_ELIGIBLE` (409, exécution d'un effacement irrecevable), `ERASURE_ALREADY_RUNNING` (409, second effacement concurrent sur le même tiers), `EXPORT_ALREADY_RUNNING` (409, second export concurrent d'une organisation), `CONSENT_VERSION_UNKNOWN` (422, acceptation d'une version inconnue), `LAST_CHANNEL_PROTECTED` (422, fermeture du dernier canal joignable), `REGISTER_UNAVAILABLE` (503, registre absent ou illisible dans la configuration), `CONSENT_REQUIRED` (403, **transversal** : toute écriture du portail locataire tant que la version courante des mentions légales n'est pas acceptée).
- **`PLATFORM.*`** (domaine existant, étendu) : `READ_ONLY_ALREADY_SET` (409, réactivation d'un gel actif), `FLAG_KEY_UNKNOWN` (404, clé de drapeau inconnue), `SECURITY_CLEARANCE_MISSING` (409, activation d'une vague sans `security_audit_cleared`), `WAVE_UNKNOWN` (404, retour arrière ou tableau de bord sur une vague inexistante), `WAVE_TOO_LARGE` (422, vague au-delà de `GO_LIVE_WAVE_MAX_ORGANIZATIONS`), `INCIDENT_ALREADY_OPEN` (409, déclaration d'un second incident), `INCIDENT_NOT_FOUND` (404, mise à jour ou résolution sans incident courant), `READ_ONLY` (503, **transversal** : toute écriture hors liste limitative pendant un gel, avec `Retry-After`, `details.reason` et `details.expectedEndAt`).
- **Supprimé plutôt que rattaché** : `SECURITY.SESSION_ALREADY_REVOKED`, qui figurait dans la version précédente sans route. Révoquer une famille déjà révoquée est le résultat recherché, pas un conflit : la route répond `204` et l'opération est idempotente, conformément au centre de sécurité ci-dessus. Un client qui réessaie après un réseau coupé ne doit pas recevoir une erreur pour avoir obtenu ce qu'il demandait.
- Réutilisés sans redéfinition : `IAM.FORBIDDEN` (dont le refus `PLATFORM_ADMIN`, avec `details.requiredRole`), `IAM.UNAUTHENTICATED`, `IAM.RATE_LIMITED`, `ORG.NOT_FOUND`, `DOCUMENTS.STORAGE_UNAVAILABLE`.

## Opérations d'audit nouvelles

`SESSION_REVOKED`, `SESSIONS_REVOKED_ALL`, `ORGANIZATION_ACCESS_REVOKED`, `API_KEY_CREATED`, `API_KEY_ROTATED`, `API_KEY_REVOKED`, `ACCESS_DENIED`, `READ_ONLY_MODE_ENABLED`, `READ_ONLY_MODE_DISABLED`, `PRIVACY_SETTINGS_UPDATED`, `PRIVACY_CONSENT_ACCEPTED`, `PRIVACY_CHANNEL_OPT_CHANGED`, `PRIVACY_EXPORT_REQUESTED`, `PRIVACY_EXPORT_COMPLETED`, `PRIVACY_ERASURE_REQUESTED`, `PRIVACY_ERASURE_REFUSED`, `PRIVACY_ERASURE_EXECUTED`, `PARTY_ANONYMIZED`, `RETENTION_PURGE_RUN`, `AUDIT_ARCHIVED`, `FEATURE_FLAG_CHANGED`, `GO_LIVE_WAVE_ACTIVATED`, `GO_LIVE_WAVE_ROLLED_BACK`, `INCIDENT_DECLARED`, `INCIDENT_UPDATED`, `INCIDENT_RESOLVED`, `MAINTENANCE_ANNOUNCED`, `ADMIN_ROLE_ASSUMED`.

`ADMIN_ROLE_ASSUMED` est écrite à chaque emprunt de `immodesk_admin` (arbitrage 2), avec la route, l'acteur et le motif : un contournement de RLS ne doit jamais être silencieux.

## Extension minimale du DDL proposée

Une seule, additive, non destructive, à exécuter hors transaction applicative :

```sql
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ACCESS_DENIED';
```

Justification en arbitrage 3. **Aucune table, aucune colonne, aucune contrainte, aucun rôle et aucune politique RLS n'est ajouté ni modifié par la phase 11.** En particulier, `immodesk_admin`, ses `GRANT` et les politiques `global_flags_readonly` et `global_flags_no_delete` sont pris tels qu'ils existent : l'arbitrage 2 les utilise, il ne les touche pas. Si l'extension est refusée, le repli documenté (`action = 'LOGIN'`, `operation = 'ACCESS_DENIED'`) permet de livrer la phase sans migration, au prix de la lisibilité du journal. Précédent : `users.is_platform_admin` a été introduit de la même manière en phase 10, hors DDL initial.

## Variables d'environnement nouvelles

`READ_ONLY_MODE_BOOTSTRAP=false`, `ADMIN_DB_ROLE=immodesk_admin`, `ADMIN_DB_POOL_MAX=4`, `SECURITY_API_KEY_ROTATION_GRACE_HOURS=24`, `SECURITY_MAX_API_KEYS_PER_ORG=10`, `SECURITY_REVOKE_ALL_REQUIRES_OTP=true`, `SECURITY_ACCESS_TOKEN_GRACE_SECONDS=900`, `SECURITY_DENIAL_LOOKBACK_DAYS=365`, `PRIVACY_PURGE_CRON_ENABLED=true`, `PRIVACY_RETENTION_IDENTITY_MONTHS=60`, `PRIVACY_RETENTION_MESSAGE_LOGS_DAYS=365`, `PRIVACY_RETENTION_NOTIFICATIONS_DAYS=365`, `PRIVACY_RETENTION_AUDIT_MONTHS=120`, `PRIVACY_RETENTION_FINANCIAL_YEARS=10`, `PRIVACY_ANONYMIZED_PHONE=+242000000000`, `PRIVACY_ANONYMIZED_NAME=Tiers anonymisé`, `PRIVACY_EXPORT_RETENTION_DAYS=7`, `PRIVACY_EXPORT_LINK_TTL_SECONDS=3600`, `PRIVACY_LEGAL_VERSION=2026-09`, `PRIVACY_DPO_CONTACT`, `GO_LIVE_WAVE_MAX_ORGANIZATIONS=25`, `GO_LIVE_ANOMALY_DENIALS_PER_DAY=20`, `STATUS_PAGE_ENABLED=true`.

`SECURITY_DENIAL_LOOKBACK_DAYS` remplace `SECURITY_DENIAL_RETENTION_DAYS` de la version précédente : il ne borne plus une rétention — un refus d'accès est une ligne d'`audit_logs`, que rien ne peut supprimer (arbitrage 16) — mais l'étendue par défaut et maximale de la fenêtre de consultation du journal des refus. `ADMIN_DB_ROLE` et `ADMIN_DB_POOL_MAX` décrivent le pool dédié de l'arbitrage 2.
