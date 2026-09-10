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
