/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 1), pour affichage
 * (badges, Select) sans jamais exposer les codes techniques à l'utilisateur.
 */
import type {
  BankAccountHolderType,
  BankStatementStatus,
  BillingInterval,
  CashReceiptStatus,
  CheckStatus,
  CommissionBasis,
  CommissionStatus,
  ContactChannelType,
  CreditStatus,
  DeclarationStatus,
  DepositMovementType,
  DepositStatus,
  DocumentKind,
  DunningStepStatus,
  DunningTrigger,
  ExpenseBearer,
  ExpenseCategory,
  ExpenseStatus,
  FurnitureItem,
  Gender,
  IdDocumentType,
  InspectionCondition,
  InspectionStatus,
  InspectionType,
  InvoiceLineType,
  InvoiceStatus,
  LandlordInvitationStatus,
  LeaseDocumentKind,
  LeasePartyRole,
  LeaseStatus,
  LineState,
  MaintenancePriority,
  MaintenanceReporter,
  MaintenanceStatus,
  MandateScope,
  MandateStatus,
  MatchStatus,
  MatchType,
  MessageStatus,
  MeterType,
  MomoAggregatorProvider,
  MomoChannel,
  MomoFeeBearer,
  MomoProvider,
  MomoStatus,
  NotificationChannel,
  OtpPurpose,
  OwnerStatementLineType,
  OwnerStatementStatus,
  PartyType,
  PayoutStatus,
  PaymentMethod,
  PaymentStatus,
  PenaltyBasis,
  PortfolioImportEntityType,
  PortfolioImportStatus,
  PropertyType,
  ReceiptStatus,
  ReconciliationTargetType,
  ReferralCommissionStatus,
  ReferralPartnerStatus,
  ReferralSource,
  ReferralStatus,
  RemittanceStatus,
  RentPeriod,
  StatementFormat,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
  SyncBatchStatus,
  SyncOperationOutcome,
  SyncOperationType,
  TariffBasis,
  UnitStatus,
  UnitType,
  WebhookSource,
  WebhookStatus,
} from '@/lib/api/types';

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  INDIVIDUAL: 'Particulier',
  COMPANY: 'Entreprise',
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Homme',
  FEMALE: 'Femme',
  UNSPECIFIED: 'Non précisé',
};

export const ID_DOCUMENT_TYPE_LABELS: Record<IdDocumentType, string> = {
  CNI: "Carte nationale d'identité",
  PASSPORT: 'Passeport',
  RESIDENCE_PERMIT: 'Carte de séjour',
  DRIVING_LICENSE: 'Permis de conduire',
  VOTER_CARD: "Carte d'électeur",
  RCCM: 'RCCM',
  NIU: 'NIU',
  OTHER: 'Autre',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  HOUSE: 'Maison',
  VILLA: 'Villa',
  APARTMENT_BUILDING: "Immeuble d'appartements",
  COMPOUND: 'Cour commune',
  COMMERCIAL_BUILDING: 'Immeuble commercial',
  MIXED_USE: 'Usage mixte',
  LAND: 'Terrain',
  WAREHOUSE: 'Entrepôt',
  OTHER: 'Autre',
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  STUDIO: 'Studio',
  ROOM: 'Chambre',
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  SHOP: 'Boutique',
  OFFICE: 'Bureau',
  WAREHOUSE: 'Entrepôt',
  PARKING: 'Parking',
  LAND_PLOT: 'Parcelle',
  OTHER: 'Autre',
};

export const FURNITURE_ITEM_LABELS: Record<FurnitureItem, string> = {
  BED: 'Lit',
  MATTRESS: 'Matelas',
  WARDROBE: 'Armoire',
  TABLE: 'Table',
  CHAIRS: 'Chaises',
  SOFA: 'Canapé',
  FRIDGE: 'Réfrigérateur',
  STOVE: 'Cuisinière',
  AIR_CONDITIONER: 'Climatiseur',
  FAN: 'Ventilateur',
  TELEVISION: 'Téléviseur',
  WASHING_MACHINE: 'Machine à laver',
  WATER_HEATER: 'Chauffe-eau',
  MICROWAVE: 'Four à micro-ondes',
  CURTAINS: 'Rideaux',
  KITCHEN_UTENSILS: 'Ustensiles de cuisine',
};

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  OCCUPIED: 'Occupé',
  UNDER_MAINTENANCE: 'En travaux',
  UNAVAILABLE: 'Indisponible',
};

export const CONTACT_CHANNEL_TYPE_LABELS: Record<ContactChannelType, string> = {
  PHONE: 'Téléphone',
  MOBILE: 'Mobile',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  FAX: 'Fax',
};

export const BANK_ACCOUNT_HOLDER_TYPE_LABELS: Record<BankAccountHolderType, string> = {
  ORGANIZATION: 'Organisation',
  LANDLORD: 'Bailleur',
  TENANT: 'Locataire',
};

export const MOMO_PROVIDER_LABELS: Record<MomoProvider, string> = {
  MTN_MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
  CINETPAY: 'CinetPay',
  PAWAPAY: 'PawaPay',
  OTHER: 'Autre',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
  BANK_CHECK: 'Chèque',
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  ID_DOCUMENT: "Pièce d'identité",
  LEASE_CONTRACT: 'Contrat de bail',
  MANDATE: 'Mandat de gestion',
  RECEIPT_PDF: 'Reçu (PDF)',
  INVOICE_PDF: 'Facture (PDF)',
  CASH_RECEIPT_PDF: 'Reçu de caisse (PDF)',
  TRANSFER_PROOF: 'Preuve de virement',
  CHECK_IMAGE: 'Image de chèque',
  BANK_STATEMENT: 'Relevé bancaire',
  INSPECTION_REPORT: "Rapport d'état des lieux",
  INSPECTION_PHOTO: "Photo d'état des lieux",
  MAINTENANCE_PHOTO: 'Photo de maintenance',
  SIGNATURE: 'Signature',
  OWNER_STATEMENT_PDF: 'Relevé de gérance (PDF)',
  EXPENSE_INVOICE: 'Facture de dépense',
  PROPERTY_PHOTO: 'Photo du bien',
  OTHER: 'Autre',
};

/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 2 : baux et dépôts
 * de garantie), pour affichage (badges, Select) sans jamais exposer les codes
 * techniques à l'utilisateur.
 */
export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_SIGNATURE: 'En attente de signature',
  ACTIVE: 'Actif',
  NOTICE_GIVEN: 'Préavis déposé',
  TERMINATED: 'Résilié',
  EXPIRED: 'Expiré',
  CANCELLED: 'Annulé',
};

export const RENT_PERIOD_LABELS: Record<RentPeriod, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMI_ANNUAL: 'Semestriel',
  ANNUAL: 'Annuel',
};

export const LEASE_PARTY_ROLE_LABELS: Record<LeasePartyRole, string> = {
  PRIMARY_TENANT: 'Locataire principal',
  CO_TENANT: 'Colocataire',
  GUARANTOR: 'Garant',
  OCCUPANT: 'Occupant',
};

export const LEASE_DOCUMENT_KIND_LABELS: Record<LeaseDocumentKind, string> = {
  CONTRACT: 'Contrat',
  AMENDMENT: 'Avenant',
  NOTICE: 'Préavis',
  TERMINATION: 'Résiliation',
  INVENTORY: 'État des lieux',
  INSURANCE: 'Assurance',
  OTHER: 'Autre',
};

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  PENDING: 'En attente',
  PARTIALLY_PAID: 'Partiellement versé',
  HELD: 'Détenu',
  PARTIALLY_REFUNDED: 'Partiellement restitué',
  REFUNDED: 'Restitué',
  FORFEITED: 'Conservé',
};

export const DEPOSIT_MOVEMENT_TYPE_LABELS: Record<DepositMovementType, string> = {
  COLLECTION: 'Encaissement',
  REFUND: 'Restitution',
  DEDUCTION: 'Retenue',
  TRANSFER: 'Transfert',
  ADJUSTMENT: 'Ajustement',
};

/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 3 : facturation, paiements,
 * espèces, quittances, messagerie), pour affichage sans jamais exposer les codes
 * techniques à l'utilisateur.
 */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émise',
  PARTIALLY_PAID: 'Partiellement payée',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};

export const INVOICE_LINE_TYPE_LABELS: Record<InvoiceLineType, string> = {
  RENT: 'Loyer',
  WATER_CHARGE: "Charge d'eau",
  ELECTRICITY_CHARGE: "Charge d'électricité",
  SERVICE_CHARGE: 'Charges',
  PENALTY: 'Pénalité',
  DEPOSIT: 'Dépôt de garantie',
  AGENCY_FEE: "Frais d'agence",
  REPAIR_REBILL: 'Refacturation de réparation',
  DISCOUNT: 'Remise',
  OTHER: 'Autre',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  PENDING_VERIFICATION: 'En attente de vérification',
  CONFIRMED: 'Confirmé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
  REVERSED: 'Contre-passé',
};

export const CREDIT_STATUS_LABELS: Record<CreditStatus, string> = {
  OPEN: 'Disponible',
  PARTIALLY_USED: 'Partiellement utilisé',
  USED: 'Utilisé',
  REFUNDED: 'Remboursé',
  EXPIRED: 'Expiré',
};

export const CASH_RECEIPT_STATUS_LABELS: Record<CashReceiptStatus, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émis',
  REMITTED: 'Remis',
  CANCELLED: 'Annulé',
};

export const REMITTANCE_STATUS_LABELS: Record<RemittanceStatus, string> = {
  OPEN: 'Ouverte',
  SUBMITTED: 'Soumise',
  VERIFIED: 'Vérifiée',
  DEPOSITED: 'Déposée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
};

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  DRAFT: 'Brouillon',
  GENERATING: 'Génération en cours',
  ISSUED: 'Émise',
  SENT: 'Envoyée',
  CANCELLED: 'Annulée',
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  EMAIL: 'E-mail',
  PUSH: 'Notification push',
  IN_APP: 'Dans l’application',
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  QUEUED: 'En file',
  SENT: 'Envoyé',
  DELIVERED: 'Remis',
  READ: 'Lu',
  FAILED: 'Échec',
  REJECTED: 'Rejeté',
  EXPIRED: 'Expiré',
};

export const PENALTY_BASIS_LABELS: Record<PenaltyBasis, string> = {
  RATE_BPS_PER_DAY: 'Taux par jour',
  RATE_BPS_PER_MONTH: 'Taux par mois',
  FLAT_AMOUNT: 'Montant forfaitaire',
  FLAT_AMOUNT_PER_DAY: 'Montant forfaitaire par jour',
};

export const DUNNING_TRIGGER_LABELS: Record<DunningTrigger, string> = {
  DAYS_BEFORE_DUE: "Jours avant l'échéance",
  DAYS_AFTER_DUE: "Jours après l'échéance",
  ON_ISSUE: "À l'émission",
  ON_OVERDUE: 'Au basculement en retard',
};

/**
 * Il n'existe pas de statut DELIVERED (contrat phase 9) : la remise effective
 * d'un message se lit dans le journal des messages (`MessageStatus`), jamais ici.
 */
export const DUNNING_STEP_STATUS_LABELS: Record<DunningStepStatus, string> = {
  PENDING: 'En attente',
  RUNNING: 'En cours',
  SENT: 'Envoyée',
  SKIPPED: 'Ignorée',
  FAILED: 'Échec',
  CANCELLED: 'Annulée',
};

/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 4 : Mobile Money à
 * deux modes, virement déclaré, webhooks), pour affichage sans jamais exposer
 * les codes techniques à l'utilisateur.
 */
export const MOMO_STATUS_LABELS: Record<MomoStatus, string> = {
  INITIATED: 'Initiée',
  PENDING: 'En attente',
  DECLARED: 'Déclarée',
  SUCCEEDED: 'Réussie',
  FAILED: 'Échec',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
  REJECTED: 'Rejetée',
  REFUNDED: 'Remboursée',
};

export const MOMO_CHANNEL_LABELS: Record<MomoChannel, string> = {
  AGGREGATOR: 'Agrégateur',
  DECLARED: 'Déclaré',
};

/**
 * Nommé précisément (déclarations de virement) plutôt que `DECLARATION_STATUS_LABELS`
 * pour ne pas entrer en collision avec un futur Record de libellés portant sur un
 * autre type de déclaration.
 */
export const TRANSFER_DECLARATION_STATUS_LABELS: Record<DeclarationStatus, string> = {
  SUBMITTED: 'Soumise',
  UNDER_REVIEW: 'En instruction',
  MATCHED: 'Rapprochée',
  APPROVED: 'Validée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Retirée',
};

export const WEBHOOK_SOURCE_LABELS: Record<WebhookSource, string> = {
  CINETPAY: 'CinetPay',
  PAWAPAY: 'PawaPay',
  MTN_MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
  WHATSAPP_CLOUD: 'WhatsApp Cloud API',
  SMS_GATEWAY: 'Passerelle SMS',
  OTHER: 'Autre',
};

export const WEBHOOK_STATUS_LABELS: Record<WebhookStatus, string> = {
  RECEIVED: 'Reçu',
  PROCESSING: 'En traitement',
  PROCESSED: 'Traité',
  IGNORED: 'Ignoré',
  FAILED: 'Échec',
};

/**
 * Nommé `MOMO_FEE_BEARER_LABELS` (et non `FEE_BEARER_LABELS`) car `FeeBearer`
 * (phase 3) porte 4 valeurs (TENANT, ORGANIZATION, LANDLORD, SHARED) pour les
 * paiements en général, alors que les paramètres d'agrégateur Mobile Money et
 * le devis (`MomoQuote`) n'admettent que TENANT ou ORGANIZATION (`MomoFeeBearer`,
 * phase 4). Redéfinir `FeeBearer` en 2 valeurs aurait cassé son usage existant.
 */
export const MOMO_FEE_BEARER_LABELS: Record<MomoFeeBearer, string> = {
  TENANT: 'Locataire',
  ORGANIZATION: 'Organisation',
};

/** Fournisseur d'agrégateur Mobile Money configuré pour l'organisation (phase 4). */
export const MOMO_AGGREGATOR_PROVIDER_LABELS: Record<MomoAggregatorProvider, string> = {
  SIMULATOR: 'Simulateur',
  CINETPAY: 'CinetPay',
};

/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 5 : synchronisation
 * hors ligne par lots), pour affichage sans jamais exposer les codes
 * techniques au gestionnaire ni au démarcheur.
 */
export const SYNC_BATCH_STATUS_LABELS: Record<SyncBatchStatus, string> = {
  APPLIED: 'Appliqué',
  PARTIALLY_APPLIED: 'Partiellement appliqué',
  REJECTED: 'Rejeté',
  FAILED: 'Échec technique',
};

export const SYNC_OPERATION_OUTCOME_LABELS: Record<SyncOperationOutcome, string> = {
  APPLIED: 'Appliquée',
  DUPLICATE: 'Déjà connue (doublon évité)',
  REJECTED: 'Rejetée',
  CONFLICT: 'En conflit',
  SKIPPED: 'Ignorée (dépendance rejetée)',
};

export const SYNC_OPERATION_TYPE_LABELS: Record<SyncOperationType, string> = {
  CASH_RECEIPT: 'Encaissement espèces',
  DOCUMENT: 'Pièce jointe',
};

/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 6 : rapprochement
 * bancaire et chèques), pour affichage sans jamais exposer les codes
 * techniques au gestionnaire.
 */
export const STATEMENT_FORMAT_LABELS: Record<StatementFormat, string> = {
  CSV: 'CSV',
  MT940: 'MT940',
  CAMT053: 'CAMT.053',
  OFX: 'OFX',
  XLSX: 'Excel',
  PDF_OCR: 'PDF (OCR)',
};

export const BANK_STATEMENT_STATUS_LABELS: Record<BankStatementStatus, string> = {
  UPLOADED: 'Importé',
  PARSING: 'Analyse en cours',
  PARSED: 'Analysé',
  RECONCILING: 'Rapprochement en cours',
  RECONCILED: 'Rapprochement terminé',
  FAILED: 'Échec',
};

export const LINE_STATE_LABELS: Record<LineState, string> = {
  UNMATCHED: 'Non rapprochée',
  SUGGESTED: 'Suggestion à valider',
  PARTIALLY_MATCHED: 'Partiellement rapprochée',
  MATCHED: 'Rapprochée',
  IGNORED: 'Ignorée',
};

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  EXACT: 'Exact',
  SUGGESTED: 'Suggéré',
  MANUAL: 'Manuel',
  PARTIAL: 'Partiel',
  SPLIT: 'Scindé',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  PROPOSED: 'Suggéré',
  CONFIRMED: 'Confirmé',
  REJECTED: 'Rejeté',
  REVERSED: 'Annulé',
};

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  RECEIVED: 'Reçu',
  DEPOSITED: 'Déposé',
  CLEARED: 'Compensé',
  BOUNCED: 'Rejeté (impayé)',
  CANCELLED: 'Annulé',
  RETURNED: 'Rendu au tireur',
};

export const RECONCILIATION_TARGET_TYPE_LABELS: Record<ReconciliationTargetType, string> = {
  PAYMENT: 'Paiement',
  DECLARATION: 'Déclaration de virement',
  CHECK: 'Chèque',
  REMITTANCE: 'Remise de caisse',
};

// ---- Phase 7 : gestion d'agence ----

export const MANDATE_STATUS_LABELS: Record<MandateStatus, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  TERMINATED: 'Résilié',
  EXPIRED: 'Expiré',
};

export const MANDATE_SCOPE_LABELS: Record<MandateScope, string> = {
  FULL_MANAGEMENT: 'Gestion complète',
  RENT_COLLECTION_ONLY: 'Encaissement seul',
  LETTING_ONLY: 'Mise en location seule',
};

export const COMMISSION_BASIS_LABELS: Record<CommissionBasis, string> = {
  RATE_BPS_ON_RENT_COLLECTED: 'Taux sur loyer encaissé',
  RATE_BPS_ON_RENT_DUE: 'Taux sur loyer facturé',
  FLAT_AMOUNT_PER_MONTH: 'Forfait par mois',
  FLAT_AMOUNT_PER_LEASE: 'Forfait par bail',
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  PENDING: 'En attente',
  ACCRUED: 'Constatée',
  INVOICED: 'Facturée',
  SETTLED: 'Réglée',
  CANCELLED: 'Annulée',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  APPROVED: 'Validée',
  PAID: 'Payée',
  REBILLED: 'Refacturée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
};

export const EXPENSE_BEARER_LABELS: Record<ExpenseBearer, string> = {
  LANDLORD: 'Bailleur',
  TENANT: 'Locataire',
  ORGANIZATION: 'Agence',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  REPAIR: 'Réparation',
  MAINTENANCE: 'Entretien',
  PLUMBING: 'Plomberie',
  ELECTRICITY: 'Électricité',
  CLEANING: 'Nettoyage',
  SECURITY: 'Sécurité',
  UTILITY_BILL: 'Facture eau/électricité',
  TAX: 'Taxe',
  INSURANCE: 'Assurance',
  SYNDIC_FEE: 'Charges de syndic',
  LEGAL_FEE: 'Frais juridiques',
  TRAVEL: 'Déplacement',
  SUPPLIES: 'Fournitures',
  OTHER: 'Autre',
};

export const OWNER_STATEMENT_STATUS_LABELS: Record<OwnerStatementStatus, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émis',
  SENT: 'Envoyé au bailleur',
  PAID: 'Reversé',
  CANCELLED: 'Annulé',
};

export const OWNER_STATEMENT_LINE_TYPE_LABELS: Record<OwnerStatementLineType, string> = {
  RENT_COLLECTED: 'Loyer encaissé',
  CHARGE_COLLECTED: 'Charges encaissées',
  COMMISSION: 'Commission de gestion',
  EXPENSE: 'Dépense',
  VAT: 'TVA sur commission',
  DEPOSIT_HELD: 'Dépôt de garantie conservé',
  CARRY_FORWARD: 'Report du solde précédent',
  ADJUSTMENT: 'Régularisation',
  OTHER: 'Autre',
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  PROCESSING: 'En cours',
  PAID: 'Reversé',
  FAILED: 'Échec',
  CANCELLED: 'Annulé',
};

export const LANDLORD_INVITATION_STATUS_LABELS: Record<LandlordInvitationStatus, string> = {
  NOT_INVITED: 'Non invité',
  INVITED: 'Invitation envoyée',
  ACTIVATED: 'Portail activé',
};

/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 8 : états des lieux,
 * compteurs et charges, maintenance), pour affichage sans jamais exposer les
 * codes techniques au démarcheur ni au gestionnaire.
 */
export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  MOVE_IN: "État des lieux d'entrée",
  MOVE_OUT: 'État des lieux de sortie',
  PERIODIC: 'État des lieux périodique',
  CONTRADICTORY: 'État des lieux contradictoire',
};

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  PENDING_SIGNATURE: 'En attente de signature',
  SIGNED: 'Signé',
  DISPUTED: 'Contesté',
  CANCELLED: 'Annulé',
};

export const INSPECTION_CONDITION_LABELS: Record<InspectionCondition, string> = {
  NEW: 'Neuf',
  GOOD: 'Bon état',
  FAIR: "État d'usage",
  POOR: 'Mauvais état',
  DAMAGED: 'Dégradé',
  MISSING: 'Manquant',
};

export const METER_TYPE_LABELS: Record<MeterType, string> = {
  ELECTRICITY_E2C: 'Électricité (E2C)',
  WATER_LCDE: 'Eau (LCDE)',
  GAS: 'Gaz',
  PRIVATE_SUBMETER: 'Sous-compteur privé',
  SOLAR: 'Solaire',
  OTHER: 'Autre',
};

export const TARIFF_BASIS_LABELS: Record<TariffBasis, string> = {
  PER_UNIT_CONSUMED: 'Au volume consommé',
  FLAT_MONTHLY: 'Forfait mensuel',
  PER_OCCUPANT: 'Par occupant',
  PER_SQUARE_METER: 'Au mètre carré',
  SHARED_PRORATA: 'Quote-part partagée',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  OPEN: 'Signalée',
  ACKNOWLEDGED: 'Prise en compte',
  ASSIGNED: 'Affectée',
  IN_PROGRESS: 'En intervention',
  ON_HOLD: 'En suspens',
  RESOLVED: 'Résolue',
  CLOSED: 'Clôturée',
  REJECTED: 'Refusée',
};

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  LOW: 'Faible',
  NORMAL: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

export const MAINTENANCE_REPORTER_LABELS: Record<MaintenanceReporter, string> = {
  TENANT: 'Locataire',
  LANDLORD: 'Bailleur',
  COLLECTOR: 'Démarcheur',
  MANAGER: 'Gestionnaire',
  INSPECTION: 'État des lieux',
};

// ---- Phase 10 : abonnement SaaS, portail locataire, apport d'affaires ----

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Période d'essai",
  ACTIVE: 'Actif',
  PAST_DUE: 'Impayé',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Résilié',
  EXPIRED: 'Expiré',
};

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  ANNUAL: 'Annuel',
};

export const SUBSCRIPTION_INVOICE_STATUS_LABELS: Record<SubscriptionInvoiceStatus, string> = {
  ISSUED: 'Émise',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};

export const OTP_PURPOSE_LABELS: Record<OtpPurpose, string> = {
  LOGIN: 'Connexion',
  PHONE_VERIFICATION: 'Vérification du numéro',
  PASSWORD_RESET: 'Réinitialisation du mot de passe',
  SENSITIVE_ACTION: 'Action sensible',
};

export const PORTFOLIO_IMPORT_STATUS_LABELS: Record<PortfolioImportStatus, string> = {
  QUEUED: 'En file',
  RUNNING: 'En cours',
  DONE: 'Terminé',
  FAILED: 'Échec',
};

export const PORTFOLIO_IMPORT_ENTITY_TYPE_LABELS: Record<PortfolioImportEntityType, string> = {
  LANDLORD: 'Bailleur',
  PROPERTY: 'Bien',
  UNIT: 'Lot',
  TENANT: 'Locataire',
  LEASE: 'Bail',
};

export const REFERRAL_PARTNER_STATUS_LABELS: Record<ReferralPartnerStatus, string> = {
  PENDING_VERIFICATION: 'Vérification en attente',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  CLOSED: 'Clôturé',
};

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDING: 'En attente',
  QUALIFIED: 'Qualifié',
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  CANCELLED: 'Annulé',
};

export const REFERRAL_COMMISSION_STATUS_LABELS: Record<ReferralCommissionStatus, string> = {
  ACCRUED: 'Provisionnée',
  APPROVED: 'Approuvée',
  PAID: 'Payée',
  REVERSED: 'Contre-passée',
  CANCELLED: 'Annulée',
};

export const REFERRAL_SOURCE_LABELS: Record<ReferralSource, string> = {
  CODE_AT_SIGNUP: "Code saisi à l'inscription",
  PARTNER_REGISTERED_PROPERTY: 'Bien enregistré par le partenaire',
  LINK: 'Lien de parrainage',
  MANUAL_ADMIN: 'Rattachement manuel (plateforme)',
};

/** Convertit un Record de libellés en options `{ value, label }` (ex. pour un Select). */
export function enumOptions<T extends string>(
  labels: Record<T, string>,
): Array<{ value: T; label: string }> {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
