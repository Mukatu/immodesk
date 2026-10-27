/**
 * Registre des traitements (contrat phase 11, arbitrage 13) : ressource
 * versionnée du DÉPÔT, pas une table — son contenu change deux fois par an et
 * doit être revu par un juriste, donc en revue de code. Domaine pur : aucune
 * dépendance Nest ni Prisma. Le contenu commun (finalités, sous-traitants,
 * support) est le MÊME pour toute organisation ; seule la section
 * `organization` (DPO et durées propres) varie (voir `application/`).
 */
export interface ProcessingPurpose {
  code: string;
  label: string;
  dataCategories: string[];
  retention: string;
  legalBasis: string;
}

export interface ProcessingProcessor {
  name: string;
  role: string;
  country: string;
  transferOutsideCountry: boolean;
}

export interface ProcessingRegisterCommon {
  controller: { name: string; contact: string };
  purposes: ProcessingPurpose[];
  processors: ProcessingProcessor[];
  support: { channel: string; contact: string; slaBySeverity: Record<string, string> };
}

/**
 * `dpoContact` et `supportContact` sont injectés par l'appelant depuis la
 * configuration (`PRIVACY_DPO_CONTACT`) : le domaine reste pur, sans lecture
 * d'environnement.
 */
export function processingRegisterCommon(dpoContact: string | null): ProcessingRegisterCommon {
  return {
    // Chaque organisation cliente (agence, bailleur indépendant) est
    // responsable de traitement pour les données de ses propres tiers ;
    // Immodesk agit comme sous-traitant technique de la plateforme.
    controller: {
      name: "L'organisation gestionnaire (agence ou bailleur), responsable de traitement de ses tiers",
      contact: dpoContact ?? 'Voir les coordonnées du référent propres à chaque organisation',
    },
    purposes: [
      {
        code: 'TENANCY_MANAGEMENT',
        label: 'Gestion locative : baux, facturation, encaissements, quittances',
        dataCategories: ['identité', 'coordonnées', 'données financières', 'pièce d’identité'],
        retention: 'Durée du bail + identityMonths après sa clôture',
        legalBasis: 'Exécution du contrat de bail',
      },
      {
        code: 'COMMUNICATION',
        label: 'Relances et notifications (WhatsApp, SMS, e-mail)',
        dataCategories: ['coordonnées de contact'],
        retention: 'notificationsDays / messageLogsDays',
        legalBasis: 'Intérêt légitime (recouvrement) et exécution du contrat',
      },
      {
        code: 'ACCOUNTING',
        label: 'Comptabilité et preuve des paiements',
        dataCategories: ['données financières'],
        retention: 'financialYears (dix ans par défaut)',
        legalBasis: 'Obligation légale (conservation comptable)',
      },
      {
        code: 'AUDIT_TRAIL',
        label: "Journal d'audit : preuve des opérations et des accès",
        dataCategories: ['identité de l’acteur', 'adresse IP', 'horodatage'],
        retention: 'auditLogsMonths, puis archivage froid (jamais purgé)',
        legalBasis: 'Intérêt légitime (sécurité, preuve)',
      },
    ],
    processors: [
      {
        name: 'MinIO (auto-hébergé, VPS pilote)',
        role: 'Stockage objet des documents et pièces jointes',
        country: 'CG',
        transferOutsideCountry: false,
      },
      {
        name: 'Cloudflare R2 (si le volume l’exige)',
        role: 'Stockage objet de secours',
        country: 'US/EU (réseau Cloudflare)',
        transferOutsideCountry: true,
      },
    ],
    support: {
      channel: 'WhatsApp / e-mail',
      contact: dpoContact ?? 'support@immodesk.cg',
      slaBySeverity: { CRITICAL: '4h', MAJOR: '24h', MINOR: '5j ouvrés' },
    },
  };
}
