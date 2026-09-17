/**
 * Catalogue des codes d'erreur métier stables de la phase 0.
 *
 * Le code est un contrat public : le message peut évoluer, l'identifiant jamais.
 * Format : `DOMAINE.RAISON`. Messages en français (fr-CG).
 * Référence : docs/api/phase0-contract.md.
 */
export const ERROR_CATALOG = {
  // --- Domaine IAM (authentification, jetons, clés d'API) ---------------
  'IAM.OTP_INVALID': { status: 401, message: 'Code incorrect.' },
  'IAM.OTP_EXPIRED': { status: 401, message: 'Ce code a expiré. Demandez-en un nouveau.' },
  'IAM.OTP_LOCKED': {
    status: 429,
    message: 'Trop de tentatives. Ce code est verrouillé, demandez-en un nouveau.',
  },
  'IAM.OTP_NOT_FOUND': { status: 401, message: 'Aucune demande de code en cours pour ce numéro.' },
  'IAM.OTP_RESEND_TOO_SOON': {
    status: 429,
    message: 'Veuillez patienter avant de demander un nouveau code.',
  },
  'IAM.RATE_LIMITED': { status: 429, message: 'Trop de demandes. Réessayez plus tard.' },
  'IAM.PHONE_INVALID': { status: 422, message: 'Numéro de téléphone invalide.' },
  'IAM.UNAUTHENTICATED': { status: 401, message: 'Authentification requise.' },
  'IAM.TOKEN_INVALID': { status: 401, message: "Jeton d'accès invalide ou expiré." },
  'IAM.REFRESH_INVALID': { status: 401, message: 'Jeton de rafraîchissement invalide.' },
  'IAM.REFRESH_EXPIRED': { status: 401, message: 'Jeton de rafraîchissement expiré.' },
  'IAM.REFRESH_REVOKED': {
    status: 401,
    message: 'Ce jeton a déjà été utilisé. Toutes les sessions de cet appareil ont été fermées.',
  },
  'IAM.USER_SUSPENDED': { status: 403, message: 'Ce compte est suspendu.' },
  'IAM.FORBIDDEN': { status: 403, message: 'Votre rôle ne permet pas cette action.' },

  // --- Domaine ORG (organisations, membres, invitations) ----------------
  'ORG.NOT_FOUND': { status: 404, message: 'Organisation introuvable.' },
  'ORG.CONTEXT_MISSING': {
    status: 400,
    message: 'En-tête X-Organization-Id manquant ou invalide.',
  },
  'ORG.NOT_MEMBER': { status: 404, message: 'Organisation introuvable.' },
  'ORG.SLUG_TAKEN': { status: 409, message: 'Ce nom d’organisation est déjà utilisé.' },
  'ORG.LAST_OWNER': {
    status: 409,
    message: 'Impossible : une organisation doit conserver au moins un OWNER.',
  },
  'ORG.MEMBER_NOT_FOUND': { status: 404, message: 'Membre introuvable.' },
  'ORG.ALREADY_MEMBER': { status: 409, message: 'Cet utilisateur est déjà membre.' },
  'ORG.SETTINGS_NOT_FOUND': { status: 404, message: 'Paramètres introuvables.' },

  // --- Domaine INVITATION ----------------------------------------------
  'INVITATION.NOT_FOUND': { status: 404, message: 'Invitation introuvable.' },
  'INVITATION.EXPIRED': { status: 410, message: 'Cette invitation a expiré.' },
  'INVITATION.ALREADY_USED': { status: 409, message: 'Cette invitation a déjà été utilisée.' },
  'INVITATION.REVOKED': { status: 410, message: 'Cette invitation a été annulée.' },
  'INVITATION.PHONE_MISMATCH': {
    status: 403,
    message: 'Cette invitation a été émise pour un autre numéro de téléphone.',
  },

  // --- Domaine PARTIES (bailleurs, locataires, garants, canaux) ---------
  'PARTIES.PHONE_INVALID': { status: 422, message: 'Numéro de téléphone invalide.' },
  'PARTIES.NAME_REQUIRED': {
    status: 422,
    message:
      'Le nom est obligatoire : « lastName » pour une personne physique, « companyName » pour une personne morale.',
  },
  'PARTIES.PHONE_ALREADY_USED': {
    status: 409,
    message: 'Ce numéro est déjà utilisé par un autre locataire de cette organisation.',
  },
  'PARTIES.SELF_LANDLORD_PROTECTED': {
    status: 409,
    message: "Le bailleur « self » de l'organisation ne peut pas être supprimé.",
  },
  'PARTIES.LANDLORD_HAS_PROPERTIES': {
    status: 409,
    message: 'Ce bailleur possède encore des biens : transférez-les avant de le supprimer.',
  },
  'PARTIES.LANDLORD_NOT_FOUND': { status: 404, message: 'Bailleur introuvable.' },
  'PARTIES.TENANT_NOT_FOUND': { status: 404, message: 'Locataire introuvable.' },
  'PARTIES.GUARANTOR_NOT_FOUND': { status: 404, message: 'Garant introuvable.' },
  'PARTIES.CHANNEL_NOT_FOUND': { status: 404, message: 'Canal de contact introuvable.' },
  'PARTIES.CHANNEL_DUPLICATE': {
    status: 409,
    message: 'Ce canal de contact existe déjà pour ce tiers.',
  },
  'PARTIES.OWNER_TYPE_INVALID': {
    status: 422,
    message: 'Type de tiers inconnu : utilisez landlords, tenants ou guarantors.',
  },

  // --- Domaine PORTFOLIO (immeubles, lots, occupation) ------------------
  'PORTFOLIO.PROPERTY_NOT_FOUND': { status: 404, message: 'Bien introuvable.' },
  'PORTFOLIO.UNIT_NOT_FOUND': { status: 404, message: 'Lot introuvable.' },
  'PORTFOLIO.PROPERTY_CODE_TAKEN': {
    status: 409,
    message: 'Ce code de bien est déjà utilisé dans cette organisation.',
  },
  'PORTFOLIO.PROPERTY_HAS_UNITS': {
    status: 409,
    message: 'Ce bien porte encore des lots : supprimez-les avant de le supprimer.',
  },
  'PORTFOLIO.UNIT_CODE_TAKEN': { status: 409, message: 'Ce code de lot est déjà pris.' },
  'PORTFOLIO.UNIT_HAS_ACTIVE_LEASE': {
    status: 409,
    message: 'Lot rattaché à un bail actif : suppression impossible.',
  },
  'PORTFOLIO.BULK_RANGE_INVALID': {
    status: 422,
    message: 'Série de lots invalide : « from » doit précéder « to », et 200 lots au maximum.',
  },

  // --- Domaine BANKING (comptes de règlement) ---------------------------
  'BANKING.ACCOUNT_NOT_FOUND': { status: 404, message: 'Compte bancaire introuvable.' },
  'BANKING.ACCOUNT_DUPLICATE': {
    status: 409,
    message: 'Un compte porte déjà ce couple banque / numéro dans cette organisation.',
  },
  'BANKING.IDENTIFIER_REQUIRED': {
    status: 422,
    message: 'Renseignez au moins un numéro de compte, un IBAN ou un numéro Mobile Money.',
  },
  'BANKING.HOLDER_INVALID': {
    status: 422,
    message:
      'Titulaire incohérent : un compte LANDLORD exige landlordId, un compte TENANT tenantId.',
  },

  // --- Domaine DOCUMENTS (stockage objet, URL signées) ------------------
  'DOCUMENTS.NOT_FOUND': { status: 404, message: 'Document introuvable.' },
  'DOCUMENTS.FILE_TOO_LARGE': { status: 413, message: 'Fichier trop volumineux.' },
  'DOCUMENTS.MIME_NOT_ALLOWED': { status: 415, message: 'Type de fichier non autorisé.' },
  'DOCUMENTS.OBJECT_MISSING': {
    status: 409,
    message: "Aucun objet téléversé sous cette clé : recommencez l'envoi.",
  },
  'DOCUMENTS.OBJECT_KEY_INVALID': {
    status: 422,
    message: "Clé d'objet invalide pour cette organisation.",
  },
  'DOCUMENTS.STORAGE_UNAVAILABLE': {
    status: 503,
    message: 'Stockage de fichiers indisponible. Réessayez dans un instant.',
  },

  // --- Domaine LEASES (baux, parties, révisions, contrat PDF) -----------
  'LEASES.NOT_FOUND': { status: 404, message: 'Bail introuvable.' },
  'LEASES.INVALID_TRANSITION': {
    status: 409,
    message: "Cette transition d'état n'est pas permise pour ce bail.",
  },
  'LEASES.UNIT_NOT_AVAILABLE': {
    status: 409,
    message: 'Ce lot n’est pas disponible : il porte déjà un bail en cours.',
  },
  'LEASES.OVERLAP': {
    status: 409,
    message: 'Chevauchement de baux sur le lot : un seul bail en cours par lot.',
  },
  'LEASES.NOT_EDITABLE': {
    status: 409,
    message: 'Ce bail n’est plus modifiable : seules les conditions de gestion restent ouvertes.',
  },
  'LEASES.NOT_DELETABLE': {
    status: 409,
    message: 'Seul un bail en brouillon ou annulé peut être supprimé.',
  },
  'LEASES.REVISION_DATE_INVALID': {
    status: 409,
    message:
      'Date de révision invalide : elle doit suivre la dernière révision, la date de début du bail et le 1er du mois courant.',
  },
  'LEASES.TERMINATION_DATE_INVALID': {
    status: 422,
    message: "La date d'effet ne peut pas remonter à plus de 30 jours.",
  },
  'LEASES.PARTY_NOT_FOUND': { status: 404, message: 'Partie au bail introuvable.' },
  'LEASES.PARTY_DUPLICATE': {
    status: 409,
    message: 'Ce tiers est déjà partie à ce bail.',
  },
  'LEASES.PARTY_INVALID': {
    status: 422,
    message: 'Partie invalide : un garant exige guarantorId, toute autre partie tenantId.',
  },
  'LEASES.PRIMARY_TENANT_PROTECTED': {
    status: 409,
    message: 'Le locataire principal ne peut pas être retiré du bail.',
  },
  'LEASES.CONTRACT_IN_PROGRESS': {
    status: 409,
    message: 'Une génération de contrat est déjà en cours pour ce bail.',
  },
  'LEASES.CONTRACT_JOB_NOT_FOUND': { status: 404, message: 'Travail de génération introuvable.' },
  'LEASES.CONTRACT_UNAVAILABLE': {
    status: 503,
    message: 'Génération de contrat indisponible : aucun navigateur de rendu configuré.',
  },
  'LEASES.DOCUMENT_DUPLICATE': {
    status: 409,
    message: 'Ce document est déjà rattaché à ce bail.',
  },

  // --- Domaine DEPOSITS (dépôts de garantie) ----------------------------
  'DEPOSITS.NOT_FOUND': { status: 404, message: 'Dépôt de garantie introuvable.' },
  'DEPOSITS.INSUFFICIENT_BALANCE': {
    status: 409,
    message: 'Montant supérieur au solde encore détenu sur ce dépôt.',
  },
  'DEPOSITS.LEASE_NOT_CLOSED': {
    status: 409,
    message: 'Restitution impossible : le bail doit être résilié ou expiré.',
  },
  'DEPOSITS.MOVEMENT_INVALID': {
    status: 422,
    message: 'Mouvement de dépôt invalide : le montant doit être strictement positif.',
  },

  // --- Domaine BILLING (factures, pénalités, campagnes) -----------------
  'BILLING.INVOICE_NOT_FOUND': { status: 404, message: 'Facture introuvable.' },
  'BILLING.LINE_NOT_FOUND': { status: 404, message: 'Ligne de facture introuvable.' },
  'BILLING.INVALID_TRANSITION': {
    status: 409,
    message: "Cette transition d'état n'est pas permise pour cette facture.",
  },
  'BILLING.INVOICE_NOT_EDITABLE': {
    status: 409,
    message: 'Seule une facture en brouillon peut être modifiée.',
  },
  'BILLING.INVOICE_HAS_PAYMENTS': {
    status: 409,
    message: 'Cette facture porte des encaissements : contre-passez-les avant de l’annuler.',
  },
  'BILLING.PERIOD_ALREADY_INVOICED': {
    status: 409,
    message: 'Une facture existe déjà pour ce bail et cette période.',
  },
  'BILLING.NEGATIVE_TOTAL': {
    status: 422,
    message: 'Le total de la facture ne peut pas être négatif : utilisez un avoir.',
  },
  'BILLING.LEASE_NOT_BILLABLE': {
    status: 409,
    message: 'Ce bail ne peut pas être facturé : il doit être actif ou en préavis.',
  },
  'BILLING.PERIOD_INVALID': {
    status: 422,
    message: 'Période invalide : le début doit précéder la fin.',
  },
  'BILLING.RUN_NOT_FOUND': { status: 404, message: 'Campagne de facturation introuvable.' },
  'BILLING.PENALTY_RULE_NOT_FOUND': { status: 404, message: 'Règle de pénalité introuvable.' },
  'BILLING.PENALTY_RULE_INVALID': {
    status: 422,
    message: 'Règle de pénalité invalide : un taux ou un montant forfaitaire est requis.',
  },
  'BILLING.PENALTY_RULE_NAME_TAKEN': {
    status: 409,
    message: 'Une règle de pénalité porte déjà ce nom.',
  },
  'BILLING.PDF_UNAVAILABLE': {
    status: 503,
    message: 'Génération PDF indisponible : aucun navigateur de rendu configuré.',
  },

  // --- Domaine PAYMENTS (paiements, imputations, avoirs) ----------------
  'PAYMENTS.NOT_FOUND': { status: 404, message: 'Paiement introuvable.' },
  'PAYMENTS.OVER_ALLOCATED': {
    status: 409,
    message: 'Imputation supérieure au montant disponible du paiement ou au reste dû.',
  },
  'PAYMENTS.INVOICE_NOT_OPEN': {
    status: 409,
    message: 'Cette facture n’est pas ouverte à l’encaissement.',
  },
  'PAYMENTS.INVOICE_TENANT_MISMATCH': {
    status: 422,
    message: 'Cette facture n’appartient pas au locataire du paiement.',
  },
  'PAYMENTS.LEASE_TENANT_MISMATCH': {
    status: 422,
    message: 'Ce bail n’appartient pas à ce locataire.',
  },
  'PAYMENTS.INVALID_TRANSITION': {
    status: 409,
    message: "Cette transition d'état n'est pas permise pour ce paiement.",
  },
  'PAYMENTS.ALREADY_REVERSED': { status: 409, message: 'Ce paiement a déjà été contre-passé.' },
  'PAYMENTS.CREDIT_ALREADY_USED': {
    status: 409,
    message: 'Un avoir issu de ce paiement a déjà été utilisé : contre-passation impossible.',
  },
  'PAYMENTS.CREDIT_NOT_FOUND': { status: 404, message: 'Avoir introuvable.' },
  'PAYMENTS.CREDIT_NOT_APPLICABLE': {
    status: 409,
    message: 'Cet avoir n’est pas imputable : il est épuisé, remboursé ou sans paiement source.',
  },

  // --- Domaine CASH (reçus de caisse, remises) --------------------------
  'CASH.RECEIPT_NOT_FOUND': { status: 404, message: 'Reçu de caisse introuvable.' },
  'CASH.SIGNATURE_REQUIRED': {
    status: 409,
    message: 'Signature du locataire (ou photo du reçu papier) obligatoire.',
  },
  'CASH.SIGNATURE_INVALID': {
    status: 422,
    message:
      'Signature illisible : une image PNG encodée en base64 de 512 Ko au plus est attendue.',
  },
  'CASH.REMITTANCE_NOT_FOUND': { status: 404, message: 'Remise d’espèces introuvable.' },
  'CASH.REMITTANCE_ALREADY_OPEN': {
    status: 409,
    message: 'Une remise est déjà ouverte ou en attente de contrôle pour ce démarcheur.',
  },
  'CASH.RECEIPT_ALREADY_REMITTED': {
    status: 409,
    message: 'Un des reçus est déjà remis, annulé ou rattaché à une autre remise.',
  },
  'CASH.REMITTANCE_INVALID_TRANSITION': {
    status: 409,
    message: "Cette transition d'état n'est pas permise pour cette remise.",
  },
  'CASH.REMITTANCE_EMPTY': { status: 422, message: 'Une remise porte au moins un reçu.' },

  // --- Domaine RECEIPTS (quittances) ------------------------------------
  'RECEIPTS.NOT_FOUND': { status: 404, message: 'Quittance introuvable.' },
  'RECEIPTS.NOT_SENDABLE': {
    status: 409,
    message: 'Cette quittance ne peut pas être envoyée : elle est annulée ou pas encore émise.',
  },
  'RECEIPTS.PDF_UNAVAILABLE': {
    status: 503,
    message: 'Génération PDF indisponible : aucun navigateur de rendu configuré.',
  },

  // --- Domaine NOTIFICATIONS / WEBHOOKS ---------------------------------
  'NOTIFICATIONS.TEMPLATE_NOT_FOUND': { status: 404, message: 'Modèle de message introuvable.' },
  'NOTIFICATIONS.MESSAGE_LOG_NOT_FOUND': { status: 404, message: 'Message introuvable.' },
  'NOTIFICATIONS.NO_RECIPIENT': {
    status: 422,
    message: 'Aucun numéro de téléphone exploitable pour ce destinataire.',
  },
  'NOTIFICATIONS.RETRY_NOT_ALLOWED': {
    status: 409,
    message:
      'Ce message ne peut pas être relancé : les modèles d’authentification ne se relancent pas, redemandez un nouveau code.',
  },
  'WEBHOOKS.SIGNATURE_INVALID': { status: 401, message: 'Signature du webhook invalide.' },
  'WEBHOOKS.VERIFY_TOKEN_INVALID': { status: 403, message: 'Jeton de vérification invalide.' },
  'WEBHOOKS.EVENT_NOT_FOUND': { status: 404, message: 'Événement de webhook introuvable.' },
  'PUBLIC.LINK_INVALID': { status: 404, message: 'Lien invalide ou expiré.' },

  // --- Domaine MOMO (Mobile Money, déclaré et agrégateur) ----------------
  'MOMO.NOT_FOUND': { status: 404, message: 'Transaction Mobile Money introuvable.' },
  'MOMO.REFERENCE_ALREADY_USED': {
    status: 409,
    message: 'Cette référence opérateur a déjà été utilisée.',
  },
  'MOMO.OPERATOR_UNKNOWN': {
    status: 422,
    message: 'Opérateur Mobile Money non reconnu pour ce numéro.',
  },
  'MOMO.AMOUNT_OUT_OF_RANGE': {
    status: 422,
    message: 'Montant hors des bornes autorisées pour le paiement Mobile Money.',
  },
  'MOMO.AGGREGATOR_DISABLED': {
    status: 409,
    message: "Le mode agrégateur Mobile Money n'est pas activé pour cette organisation.",
  },
  'MOMO.DECLARED_DISABLED': {
    status: 409,
    message: "Le mode Mobile Money déclaré n'est pas activé pour cette organisation.",
  },
  'MOMO.PROVIDER_UNAVAILABLE': {
    status: 503,
    message: 'Fournisseur Mobile Money indisponible. Réessayez dans un instant.',
  },
  'MOMO.STATUS_MISMATCH': {
    status: 409,
    message: 'Le montant confirmé par le fournisseur diverge du montant attendu.',
  },
  'MOMO.WEBHOOK_SIGNATURE_INVALID': {
    status: 401,
    message: 'Signature du webhook Mobile Money invalide.',
  },
  'MOMO.INVALID_TRANSITION': {
    status: 409,
    message: "Cette transition d'état n'est pas permise pour cette transaction Mobile Money.",
  },
  'MOMO.PROOF_NOT_FOUND': { status: 404, message: 'Capture jointe introuvable.' },
  'MOMO.APPROVED_AMOUNT_REASON_REQUIRED': {
    status: 422,
    message: 'Le motif est obligatoire lorsque le montant validé diffère du montant déclaré.',
  },

  // --- Domaine BANK (virement déclaré) -----------------------------------
  'BANK.NOT_FOUND': { status: 404, message: 'Déclaration de virement introuvable.' },
  'BANK.PROOF_ALREADY_USED': {
    status: 409,
    message: 'Cette preuve a déjà été utilisée pour une autre déclaration.',
  },
  'BANK.PROOF_NOT_FOUND': { status: 404, message: 'Preuve de virement introuvable.' },
  'BANK.INVALID_TRANSITION': {
    status: 409,
    message: "Cette transition d'état n'est pas permise pour cette déclaration de virement.",
  },
  'BANK.TRANSFER_DISABLED': {
    status: 409,
    message: "Le virement déclaré n'est pas activé pour cette organisation.",
  },
  'BANK.BENEFICIARY_ACCOUNT_INVALID': {
    status: 422,
    message: 'Compte bénéficiaire invalide ou inactif pour cette organisation.',
  },
  'BANK.APPROVED_AMOUNT_REASON_REQUIRED': {
    status: 422,
    message: 'Le motif est obligatoire lorsque le montant validé diffère du montant déclaré.',
  },

  // --- Phase 6 : relevés bancaires ---------------------------------------
  'BANK.STATEMENT_NOT_FOUND': { status: 404, message: 'Relevé bancaire introuvable.' },
  'BANK.STATEMENT_LINE_NOT_FOUND': { status: 404, message: 'Ligne de relevé introuvable.' },
  'BANK.STATEMENT_FORMAT_UNKNOWN': {
    status: 422,
    message: 'Format de relevé non reconnu : aucun adaptateur ne sait lire ce fichier.',
  },
  'BANK.STATEMENT_PARSE_FAILED': { status: 422, message: "Le relevé n'a pas pu être analysé." },
  'BANK.STATEMENT_BALANCE_MISMATCH': {
    status: 422,
    message:
      'Relevé déséquilibré : le solde de clôture ne correspond pas aux mouvements. Import refusé.',
  },
  'BANK.STATEMENT_CURRENCY_UNSUPPORTED': {
    status: 422,
    message: 'Seule la devise XAF est acceptée sur un relevé.',
  },
  'BANK.STATEMENT_ALREADY_IMPORTED': {
    status: 409,
    message: 'Ce fichier a déjà été importé sur ce compte bancaire.',
  },
  'BANK.STATEMENT_EMPTY': { status: 422, message: 'Le relevé ne contient aucune écriture.' },
  'BANK.STATEMENT_PERIOD_INVALID': {
    status: 422,
    message: 'La période du relevé est invalide : la date de début doit précéder la date de fin.',
  },
  'BANK.STATEMENT_FILE_TOO_LARGE': { status: 413, message: 'Fichier de relevé trop volumineux.' },
  'BANK.STATEMENT_HAS_MATCHES': {
    status: 409,
    message: "Ce relevé porte des rapprochements confirmés : l'abandon est impossible.",
  },
  'BANK.STATEMENT_ALREADY_DISCARDED': { status: 409, message: 'Ce relevé a déjà été abandonné.' },
  'BANK.STATEMENT_ACCOUNT_MISMATCH': {
    status: 422,
    message: "Le document fourni n'appartient pas à ce compte bancaire.",
  },

  // --- Phase 6 : rapprochement -------------------------------------------
  'BANK.MATCH_NOT_FOUND': { status: 404, message: 'Rapprochement introuvable.' },
  'BANK.MATCH_TARGET_REQUIRED': {
    status: 422,
    message: 'Un rapprochement porte exactement une cible.',
  },
  'BANK.MATCH_TARGET_INVALID': {
    status: 422,
    message: "La cible n'est pas dans un état permettant le rapprochement.",
  },
  'BANK.MATCH_INVALID_TRANSITION': {
    status: 409,
    message: 'Transition de rapprochement impossible.',
  },
  'BANK.MATCH_ALREADY_CONFIRMED': { status: 409, message: 'Ce rapprochement est déjà confirmé.' },
  'BANK.MATCH_REASON_REQUIRED': { status: 422, message: 'Le motif est obligatoire.' },
  'BANK.OVER_MATCHED': {
    status: 409,
    message: 'Le total rapproché dépasse le montant de la ligne ou celui de la cible.',
  },
  'BANK.LINE_IGNORED': {
    status: 409,
    message: 'Cette ligne est ignorée : elle ne peut pas être rapprochée.',
  },

  // --- Phase 6 : chèques --------------------------------------------------
  'BANK.CHECK_NOT_FOUND': { status: 404, message: 'Chèque introuvable.' },
  'BANK.CHECK_ALREADY_REGISTERED': {
    status: 409,
    message: 'Ce chèque est déjà enregistré pour cette banque.',
  },
  'BANK.CHECK_INVALID_TRANSITION': {
    status: 409,
    message: 'Transition impossible pour ce chèque.',
  },
  'BANK.CHECK_REASON_REQUIRED': { status: 422, message: 'Le motif est obligatoire.' },
  'BANK.CHECK_DEPOSIT_ACCOUNT_INVALID': {
    status: 422,
    message: 'Compte de dépôt invalide ou inactif.',
  },
  'BANK.CHECK_DATES_INVALID': {
    status: 422,
    message: "La date de dépôt ne peut pas précéder la date d'émission.",
  },

  // --- Domaine SYNC (synchronisation mobile par lots, phase 5) ----------
  'SYNC.BATCH_IN_PROGRESS': {
    status: 409,
    message: 'Ce lot est déjà en cours de traitement.',
  },
  'SYNC.BATCH_TOO_LARGE': {
    status: 413,
    message: 'Lot trop volumineux : 100 opérations ou 1 Mo de corps au plus.',
  },
  'SYNC.BATCH_NOT_FOUND': { status: 404, message: 'Lot de synchronisation introuvable.' },
  'SYNC.CONFLICT_NOT_FOUND': { status: 404, message: 'Conflit de synchronisation introuvable.' },
  'SYNC.CONFLICT_ALREADY_RESOLVED': {
    status: 409,
    message: 'Ce conflit a déjà été résolu.',
  },
  'SYNC.DISCARD_REASON_REQUIRED': {
    status: 422,
    message: 'Le motif est obligatoire pour abandonner une opération en conflit.',
  },

  // --- Domaine VALIDATION / plateforme ----------------------------------
  'VALIDATION.INVALID_PAYLOAD': { status: 422, message: 'Requête invalide.' },
  'PLATFORM.IDEMPOTENCY_CONFLICT': {
    status: 409,
    message: "Cette clé d'idempotence a déjà été utilisée avec un corps de requête différent.",
  },
  'PLATFORM.IDEMPOTENCY_IN_PROGRESS': {
    status: 409,
    message: 'Une requête identique est déjà en cours de traitement.',
  },
  'PLATFORM.NOT_FOUND': { status: 404, message: 'Ressource introuvable.' },
  'PLATFORM.INTERNAL_ERROR': { status: 500, message: 'Erreur interne du serveur.' },
  'PLATFORM.TENANT_CONTEXT_MISSING': {
    status: 500,
    message: "Contexte d'organisation absent : requête refusée.",
  },

  // --- Domaine AGENCY (mandats, dépenses, commissions, relevés, reversements,
  // portail bailleur, phase 7) --------------------------------------------
  'AGENCY.MANDATE_NOT_FOUND': { status: 404, message: 'Mandat de gestion introuvable.' },
  'AGENCY.PROPERTY_ALREADY_MANDATED': {
    status: 409,
    message: 'Ce bien dépend déjà d’un autre mandat actif.',
  },
  'AGENCY.MANDATE_INVALID_TRANSITION': {
    status: 409,
    message: 'Transition impossible pour ce mandat.',
  },
  'AGENCY.MANDATE_REASON_REQUIRED': {
    status: 422,
    message: 'Le motif est obligatoire pour cette action.',
  },
  'AGENCY.MANDATE_TERMINATION_DATE_REQUIRED': {
    status: 422,
    message: "La date d'effet de la résiliation est obligatoire.",
  },
  'AGENCY.MANDATE_PROPERTY_NOT_FOUND': { status: 404, message: 'Bien introuvable.' },
  'AGENCY.MANDATE_COMMISSION_REQUIRED': {
    status: 422,
    message: 'Un taux de commission ou un montant forfaitaire est obligatoire.',
  },

  'AGENCY.EXPENSE_NOT_FOUND': { status: 404, message: 'Dépense introuvable.' },
  'AGENCY.EXPENSE_LOCKED': {
    status: 409,
    message: 'Cette dépense est déjà rattachée à un relevé émis : elle n’est plus modifiable.',
  },
  'AGENCY.EXPENSE_INVALID_TRANSITION': {
    status: 409,
    message: 'Transition impossible pour cette dépense.',
  },
  'AGENCY.EXPENSE_REJECTION_REASON_REQUIRED': {
    status: 422,
    message: 'Le motif de rejet est obligatoire.',
  },

  'AGENCY.COMMISSION_NOT_FOUND': { status: 404, message: 'Commission introuvable.' },
  'AGENCY.COMMISSION_BASIS_UNSUPPORTED': {
    status: 422,
    message: 'Cette base de calcul de commission n’est pas encore prise en charge par la campagne.',
  },

  'AGENCY.STATEMENT_NOT_FOUND': { status: 404, message: 'Relevé de gérance introuvable.' },
  'AGENCY.STATEMENT_RUN_NOT_FOUND': { status: 404, message: 'Campagne de relevés introuvable.' },
  'AGENCY.STATEMENT_PERIOD_ALREADY_GENERATED': {
    status: 409,
    message: 'Un relevé existe déjà pour ce bailleur et cette période.',
  },
  'AGENCY.STATEMENT_NOT_ISSUABLE': {
    status: 409,
    message: 'Seul un relevé au statut brouillon peut être validé.',
  },
  'AGENCY.STATEMENT_NOT_CANCELLABLE': {
    status: 409,
    message: 'Ce relevé ne peut plus être annulé.',
  },
  'AGENCY.STATEMENT_CANCEL_REASON_REQUIRED': {
    status: 422,
    message: "Le motif d'annulation est obligatoire.",
  },
  'AGENCY.STATEMENT_BALANCE_NOT_POSITIVE': {
    status: 409,
    message: 'Le solde net du relevé doit être strictement positif pour être reversé.',
  },
  'AGENCY.STATEMENT_PDF_UNAVAILABLE': {
    status: 503,
    message: 'Le PDF du relevé n’est pas encore disponible.',
  },
  'AGENCY.STATEMENT_INVALID_TRANSITION': {
    status: 409,
    message: 'Transition impossible pour ce relevé.',
  },

  'AGENCY.PAYOUT_NOT_FOUND': { status: 404, message: 'Reversement introuvable.' },
  'AGENCY.PAYOUT_ALREADY_EXISTS': {
    status: 409,
    message: 'Ce relevé porte déjà un reversement non annulé.',
  },
  'AGENCY.PAYOUT_MISSING_BANK_DETAILS': {
    status: 409,
    message: 'Coordonnées de reversement du bailleur absentes ou incomplètes.',
  },
  'AGENCY.PAYOUT_INVALID_TRANSITION': {
    status: 409,
    message: 'Transition impossible pour ce reversement.',
  },
  'AGENCY.PAYOUT_FAILURE_REASON_REQUIRED': {
    status: 422,
    message: "Le motif d'échec est obligatoire.",
  },

  'AGENCY.PORTAL_READ_ONLY': {
    status: 403,
    message: 'Le portail bailleur ne permet aucune action d’écriture.',
  },
  'AGENCY.PORTAL_NOT_INVITED': {
    status: 404,
    message: 'Aucune invitation en cours pour ce numéro.',
  },

  'AGENCY.ONBOARDING_INVALID': {
    status: 422,
    message: 'Données d’inscription du gestionnaire indépendant invalides.',
  },

  // --- Domaine INSPECTIONS (états des lieux, phase 8) -------------------
  'INSPECTIONS.NOT_FOUND': { status: 404, message: 'État des lieux introuvable.' },
  'INSPECTIONS.ITEM_NOT_FOUND': { status: 404, message: 'Poste introuvable.' },
  'INSPECTIONS.LOCKED': {
    status: 409,
    message: 'Cet état des lieux est signé : aucune modification n’est plus possible.',
  },
  'INSPECTIONS.INVALID_TRANSITION': { status: 409, message: 'Transition impossible.' },
  'INSPECTIONS.PHOTO_REQUIRED': {
    status: 422,
    message: 'Une photo est obligatoire pour un poste en mauvais état, dégradé ou manquant.',
  },
  'INSPECTIONS.TENANT_ABSENCE_REASON_REQUIRED': {
    status: 422,
    message: "Le motif d'absence du locataire est obligatoire.",
  },
  'INSPECTIONS.DISPUTE_REASON_REQUIRED': {
    status: 422,
    message: 'Le motif de contestation est obligatoire.',
  },
  'INSPECTIONS.SIGNATURE_GRACE_NOT_ELAPSED': {
    status: 409,
    message: 'Le délai de grâce d’absence du locataire n’est pas encore écoulé.',
  },
  'INSPECTIONS.DEDUCTION_ALREADY_APPLIED': {
    status: 409,
    message: 'Une retenue a déjà été appliquée pour ce poste.',
  },
  'INSPECTIONS.MAINTENANCE_ALREADY_CREATED': {
    status: 409,
    message: 'Une demande de maintenance a déjà été créée pour ce poste.',
  },
  'INSPECTIONS.NO_DEPOSIT': {
    status: 409,
    message: 'Ce bail ne porte aucun dépôt de garantie.',
  },
  'INSPECTIONS.REPORT_NOT_READY': {
    status: 503,
    message: 'Le rapport de l’état des lieux n’est pas encore disponible.',
  },

  // --- Domaine METERS (compteurs et relevés, phase 8) -------------------
  'METERS.NOT_FOUND': { status: 404, message: 'Compteur introuvable.' },
  'METERS.SERIAL_TAKEN': {
    status: 409,
    message: 'Ce numéro de série est déjà utilisé par un autre compteur.',
  },
  'METERS.READING_NOT_FOUND': { status: 404, message: 'Relevé introuvable.' },
  'METERS.READING_DUPLICATE_DATE': {
    status: 409,
    message: 'Un relevé existe déjà à cette date pour ce compteur.',
  },
  'METERS.INDEX_REGRESSION': {
    status: 422,
    message:
      'Cet index est inférieur au précédent : confirmez un passage par zéro (rolloverApplied) ou corrigez la saisie.',
  },
  'METERS.PREPAID_NOT_READABLE': {
    status: 409,
    message: 'Un compteur prépayé n’est jamais relevé pour refacturation.',
  },
  'METERS.READING_ALREADY_CONFIRMED': {
    status: 409,
    message: 'Ce relevé est déjà confirmé.',
  },
  'METERS.READING_ALREADY_INVOICED': {
    status: 409,
    message: 'Ce relevé est déjà facturé et ne peut plus être modifié.',
  },

  // --- Domaine UTILITIES (grilles tarifaires et refacturation, phase 8) --
  'UTILITIES.TARIFF_NOT_FOUND': { status: 404, message: 'Grille tarifaire introuvable.' },
  'UTILITIES.TARIFF_PERIOD_INVALID': {
    status: 422,
    message: 'La date de fin doit être postérieure à la date d’effet.',
  },
  'UTILITIES.NO_TARIFF_APPLICABLE': {
    status: 422,
    message: 'Aucune grille tarifaire applicable à ce relevé.',
  },
  'UTILITIES.RUN_NOT_FOUND': { status: 404, message: 'Campagne de refacturation introuvable.' },

  // --- Domaine DUNNING (relances impayés, phase 9) -----------------------
  'DUNNING.RULE_NOT_FOUND': { status: 404, message: 'Règle de relance introuvable.' },
  'DUNNING.STEP_ORDER_TAKEN': {
    status: 409,
    message: 'Ce rang de relance est déjà occupé par une autre règle.',
  },
  'DUNNING.RUN_NOT_FOUND': { status: 404, message: 'Exécution de relance introuvable.' },
  'DUNNING.TEMPLATE_NOT_FOUND': { status: 404, message: 'Modèle de message introuvable.' },

  // --- Domaine MAINTENANCE (demandes de maintenance, phase 8) -----------
  'MAINTENANCE.NOT_FOUND': { status: 404, message: 'Demande de maintenance introuvable.' },
  'MAINTENANCE.INVALID_TRANSITION': { status: 409, message: 'Transition impossible.' },
  'MAINTENANCE.REJECTION_REASON_REQUIRED': {
    status: 422,
    message: 'Le motif de refus est obligatoire.',
  },
  'MAINTENANCE.ALREADY_ASSIGNED': {
    status: 409,
    message: 'Cette demande est déjà affectée.',
  },

  // --- Domaine REPORTING (tableaux de bord, phase 9) --------------------
  'REPORTING.INVALID_PERIOD': {
    status: 422,
    message: 'Période invalide : « from » doit précéder ou égaler « to ».',
  },

  // --- Domaine EXPORTS (exports CSV, phase 9) ---------------------------
  'EXPORTS.KIND_INVALID': {
    status: 422,
    message: 'Type d’export inconnu : utilisez invoices, payments, arrears ou dashboard.',
  },
  'EXPORTS.DASHBOARD_KIND_INVALID': {
    status: 422,
    message:
      'Pour un export « dashboard », « dashboardKind » est obligatoire : collection-rate, arrears, vacancy ou payment-methods.',
  },
  'EXPORTS.JOB_NOT_FOUND': { status: 404, message: 'Travail d’export introuvable.' },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function httpStatusForCode(code: ErrorCode): number {
  return ERROR_CATALOG[code].status;
}

export function defaultMessageForCode(code: ErrorCode): string {
  return ERROR_CATALOG[code].message;
}
