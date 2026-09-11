import { Global, Module } from '@nestjs/common';
import { BillingDashboardService } from './application/billing-dashboard.service';
import { BillingEngineService } from './application/billing-engine.service';
import { BillingPenaltiesService } from './application/billing-penalties.service';
import { BillingRunsService } from './application/billing-runs.service';
import { InvoiceLedgerService } from './application/invoice-ledger.service';
import { InvoiceNoticeService } from './application/invoice-notice.service';
import { InvoiceWriterService } from './application/invoice-writer.service';
import { InvoicesQueryService } from './application/invoices-query.service';
import { InvoicesService } from './application/invoices.service';
import { PenaltyRulesService } from './application/penalty-rules.service';
import { BillingCronScheduler } from './infrastructure/billing-cron.scheduler';
import { BillingController } from './presentation/billing.controller';
import { InvoicesController } from './presentation/invoices.controller';

/**
 * Module `billing` : factures de loyer, lignes, pénalités, campagnes et cron
 * quotidien. Propriétaire exclusif de `rent_invoices`, `invoice_lines` et
 * `penalty_rules`.
 *
 * `@Global()` : `payments` impute à travers `InvoiceLedgerService`, et
 * `receipts` lit les factures qu'il quittance. Le module consomme le port
 * `NOTIFICATION_ENQUEUER` (avis d'échéance) sans importer `notifications`.
 */
@Global()
@Module({
  controllers: [InvoicesController, BillingController],
  providers: [
    InvoiceLedgerService,
    InvoiceWriterService,
    InvoicesQueryService,
    InvoicesService,
    InvoiceNoticeService,
    BillingEngineService,
    BillingPenaltiesService,
    BillingRunsService,
    PenaltyRulesService,
    BillingDashboardService,
    BillingCronScheduler,
  ],
  exports: [
    InvoiceLedgerService,
    InvoiceWriterService,
    InvoicesQueryService,
    InvoicesService,
    BillingEngineService,
    BillingRunsService,
  ],
})
export class BillingModule {}
