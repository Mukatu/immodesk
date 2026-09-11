import type { TenantClient } from '../../../shared/prisma/prisma.service';

/**
 * Ports sortants du module `payments`.
 *
 * Un paiement qui solde une facture fait naître une quittance (`receipts`) ;
 * une contre-passation annule les quittances et les reçus de caisse liés
 * (`cash`). Or `cash` crée lui-même des paiements : un import direct
 * produirait un cycle. Les deux sens passent donc par des jetons `Symbol`,
 * comme `DEPOSIT_WRITER` / `LEASE_READER` en phase 2.
 *
 * Les méthodes prennent le client TRANSACTIONNEL : la quittance naît, et
 * s'annule, dans la transaction même du paiement.
 */
export const RECEIPT_ISSUER = Symbol('RECEIPT_ISSUER');
export const CASH_RECEIPT_CANCELLER = Symbol('CASH_RECEIPT_CANCELLER');

export interface ReceiptIssuer {
  /** Crée une quittance (GENERATING) par facture passée PAID ; renvoie leurs identifiants. */
  issueForPaidInvoices(
    tx: TenantClient,
    input: {
      organizationId: string;
      paymentId: string;
      invoiceIds: readonly string[];
      today: Date;
    },
  ): Promise<string[]>;

  /** Annule les quittances du paiement contre-passé et celles des factures redevenues impayées. */
  cancelForReversal(
    tx: TenantClient,
    input: {
      organizationId: string;
      paymentId: string;
      invoiceIds: readonly string[];
      reason: string;
    },
  ): Promise<string[]>;

  /** Après COMMIT : met en file la génération PDF puis l'envoi. */
  scheduleGeneration(organizationId: string, receiptIds: readonly string[]): Promise<void>;
}

export interface CashReceiptCanceller {
  /** Passe CANCELLED les reçus de caisse portés par ce paiement (colonne de workflow). */
  cancelForPayment(
    tx: TenantClient,
    input: { organizationId: string; paymentId: string; reason: string },
  ): Promise<string[]>;
}
