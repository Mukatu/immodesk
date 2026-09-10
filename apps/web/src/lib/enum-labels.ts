/**
 * Libellés fr-CG des énumérations du contrat d'API (phase 1), pour affichage
 * (badges, Select) sans jamais exposer les codes techniques à l'utilisateur.
 */
import type {
  BankAccountHolderType,
  ContactChannelType,
  DocumentKind,
  Gender,
  IdDocumentType,
  MomoProvider,
  PartyType,
  PaymentMethod,
  PropertyType,
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

/** Convertit un Record de libellés en options `{ value, label }` (ex. pour un Select). */
export function enumOptions<T extends string>(
  labels: Record<T, string>,
): Array<{ value: T; label: string }> {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
