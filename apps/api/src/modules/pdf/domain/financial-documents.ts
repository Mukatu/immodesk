/**
 * Modèles de données des documents financiers (quittance, reçu de caisse,
 * facture), déjà mis en forme par le module appelant. Le gabarit ne calcule
 * rien : il imprime. Domaine pur, aucune dépendance.
 */
export type PageFormat = 'A5' | 'A4';

export interface OrganizationBlock {
  name: string;
  address: string | null;
  phone: string | null;
  rccm: string | null;
}

export interface ReceiptDocumentModel {
  pageSize: PageFormat;
  organization: OrganizationBlock;
  landlordName: string;
  /** Vrai si l'émetteur (agence) n'est pas le bailleur lui-même. */
  agencyManaged: boolean;
  tenantName: string;
  unitCode: string;
  propertyName: string;
  propertyAddress: string;
  receipt: {
    number: string;
    issueDate: string;
    period: string;
    rentAmount: bigint;
    chargesAmount: bigint;
    penaltyAmount: bigint;
    totalAmount: bigint;
    remainingBalance: bigint;
    verificationUrl: string;
    contentHashShort: string;
    cancelled: boolean;
  };
  payment: {
    methodLabel: string;
    reference: string;
    externalReference: string | null;
    cashReceiptNumber: string | null;
  };
  qrDataUrl: string;
}

export interface CashReceiptDocumentModel {
  pageSize: PageFormat;
  organization: OrganizationBlock;
  tenantName: string;
  payerName: string;
  collectorName: string;
  receipt: {
    number: string;
    receivedAt: string;
    amount: bigint;
    purpose: string | null;
    signatureHashShort: string | null;
    paymentReference: string;
    cancelled: boolean;
  };
  allocations: Array<{ invoiceNumber: string; period: string; amount: bigint }>;
  creditAmount: bigint;
}

export interface InvoiceDocumentModel {
  organization: OrganizationBlock;
  landlordName: string;
  tenantName: string;
  tenantPhone: string;
  unitCode: string;
  propertyName: string;
  propertyAddress: string;
  invoice: {
    number: string;
    statusLabel: string;
    issueDate: string;
    dueDate: string;
    period: string;
    totalAmount: bigint;
    paidAmount: bigint;
    balanceAmount: bigint;
    discountAmount: bigint;
  };
  lines: Array<{
    label: string;
    quantity: string;
    unitPrice: bigint;
    amount: bigint;
    isCredit: boolean;
  }>;
}

/** Libellés français des modes de règlement imprimés sur les pièces. */
export const PAYMENT_METHOD_LABELS: Readonly<Record<string, string>> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
  BANK_CHECK: 'Chèque',
};

export const INVOICE_STATUS_LABELS: Readonly<Record<string, string>> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émise',
  PARTIALLY_PAID: 'Partiellement réglée',
  PAID: 'Réglée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};
