import { Global, Module } from '@nestjs/common';
import { CASH_RECEIPT_PUBLISHER } from '../cash/domain/ports';
import { NOTIFICATION_OUTCOME_LISTENERS } from '../notifications/domain/ports';
import { RECEIPT_ISSUER } from '../payments/domain/ports';
import { PdfModule } from '../pdf/pdf.module';
import { DocumentModelsService } from './application/document-models.service';
import { InvoiceDocumentsService } from './application/invoice-documents.service';
import { ReceiptDeliveryListener } from './application/receipt-delivery.listener';
import { ReceiptDocumentsService } from './application/receipt-documents.service';
import { ReceiptIssuerService } from './application/receipt-issuer.service';
import { ReceiptsQueryService } from './application/receipts-query.service';
import { FinancialDocumentsPipeline } from './infrastructure/financial-documents.pipeline';
import { PublicReceiptsController, ReceiptsController } from './presentation/receipts.controller';

/**
 * Module `receipts` : quittances, vérification publique, et pipeline des
 * documents financiers (PDF de quittance, de reçu de caisse, de facture).
 * Propriétaire de `receipts`.
 *
 * Il publie trois ports — `RECEIPT_ISSUER` (payments), `CASH_RECEIPT_PUBLISHER`
 * (cash) et `NOTIFICATION_OUTCOME_LISTENERS` (notifications) — et consomme
 * `NOTIFICATION_ENQUEUER`. `@Global()` pour les rendre visibles sans imports
 * croisés ; il importe `PdfModule`, feuille du graphe.
 */
@Global()
@Module({
  imports: [PdfModule],
  controllers: [ReceiptsController, PublicReceiptsController],
  providers: [
    DocumentModelsService,
    ReceiptIssuerService,
    ReceiptDocumentsService,
    InvoiceDocumentsService,
    ReceiptsQueryService,
    ReceiptDeliveryListener,
    FinancialDocumentsPipeline,
    { provide: RECEIPT_ISSUER, useExisting: ReceiptIssuerService },
    { provide: CASH_RECEIPT_PUBLISHER, useExisting: FinancialDocumentsPipeline },
    {
      provide: NOTIFICATION_OUTCOME_LISTENERS,
      useFactory: (listener: ReceiptDeliveryListener) => [listener],
      inject: [ReceiptDeliveryListener],
    },
  ],
  exports: [
    RECEIPT_ISSUER,
    CASH_RECEIPT_PUBLISHER,
    NOTIFICATION_OUTCOME_LISTENERS,
    ReceiptDocumentsService,
    InvoiceDocumentsService,
    ReceiptsQueryService,
    FinancialDocumentsPipeline,
  ],
})
export class ReceiptsModule {}
