/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 1), pour affichage
 * (badges, Select) sans jamais exposer les codes techniques à l'utilisateur.
 */
import type {
  BankAccountHolderType,
  CashReceiptStatus,
  ContactChannelType,
  CreditStatus,
  DepositMovementType,
  DepositStatus,
  DocumentKind,
  Gender,
  IdDocumentType,
  InvoiceLineType,
  InvoiceStatus,
  LeaseDocumentKind,
  LeasePartyRole,
  LeaseStatus,
  MessageStatus,
  MomoProvider,
  NotificationChannel,
  PartyType,
  PaymentMethod,
  PaymentStatus,
  PenaltyBasis,
  PropertyType,
  ReceiptStatus,
  RemittanceStatus,
  RentPeriod,
  UnitStatus,
  UnitType,
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

/** Convertit un Record de libellés en options `{ value, label }` (ex. pour un Select). */
export function enumOptions<T extends string>(
  labels: Record<T, string>,
): Array<{ value: T; label: string }> {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
