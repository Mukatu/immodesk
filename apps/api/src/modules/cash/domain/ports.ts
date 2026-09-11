/**
 * Port sortant du module `cash` : publication d'un reçu de caisse (PDF puis
 * envoi WhatsApp / SMS au locataire), implémentée par le pipeline de
 * documents du module `receipts`. Appelé APRÈS le COMMIT de l'encaissement :
 * un rendu PDF ou un envoi en échec ne remet jamais l'encaissement en cause.
 */
export const CASH_RECEIPT_PUBLISHER = Symbol('CASH_RECEIPT_PUBLISHER');

export interface CashReceiptPublisher {
  schedule(
    organizationId: string,
    cashReceiptId: string,
    options: { notify: boolean },
  ): Promise<void>;
}
