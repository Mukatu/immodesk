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
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function httpStatusForCode(code: ErrorCode): number {
  return ERROR_CATALOG[code].status;
}

export function defaultMessageForCode(code: ErrorCode): string {
  return ERROR_CATALOG[code].message;
}
