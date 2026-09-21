import { Module } from '@nestjs/common';
import { BankTransfersModule } from '../bank-transfers/bank-transfers.module';
import { MobileMoneyModule } from '../mobile-money/mobile-money.module';
import { TenantBankTransfersService } from './application/tenant-bank-transfers.service';
import { TenantDocumentsService } from './application/tenant-documents.service';
import { TenantInvoicesQueryService } from './application/tenant-invoices-query.service';
import { TenantPaymentsService } from './application/tenant-payments.service';
import { TenantReceiptsService } from './application/tenant-receipts.service';
import { TenantBankTransfersController } from './presentation/tenant-bank-transfers.controller';
import { TenantDocumentsController } from './presentation/tenant-documents.controller';
import { TenantInvoicesController } from './presentation/tenant-invoices.controller';
import { TenantReceiptsController } from './presentation/tenant-receipts.controller';
import { TenantPortalGuard } from './presentation/tenant-portal.guard';

/**
 * Module `tenant-portal` (phase 10, tranche 2) : routes protégées par le
 * rôle dérivé `TENANT_PORTAL` (garde et décorateur hérités de la tranche 1,
 * jamais recréés) — factures, quittances, paiement Mobile Money, virement
 * déclaré et téléversement de document, tous restreints aux baux actifs de
 * la session (voir chaque service applicatif pour le détail du contrat).
 *
 * `BankTransfersModule` et `MobileMoneyModule` ne sont PAS `@Global()` : ils
 * sont donc importés explicitement, à la différence de `documents`,
 * `billing` et `receipts` (tous `@Global()`, aucun import requis pour
 * `DocumentsService`, `InvoicesQueryService` et `ReceiptDocumentsService`).
 */
@Module({
  imports: [BankTransfersModule, MobileMoneyModule],
  controllers: [
    TenantInvoicesController,
    TenantReceiptsController,
    TenantBankTransfersController,
    TenantDocumentsController,
  ],
  providers: [
    TenantPortalGuard,
    TenantInvoicesQueryService,
    TenantPaymentsService,
    TenantReceiptsService,
    TenantBankTransfersService,
    TenantDocumentsService,
  ],
  exports: [TenantPortalGuard],
})
export class TenantPortalModule {}
