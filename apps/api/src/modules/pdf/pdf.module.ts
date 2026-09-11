import { Module } from '@nestjs/common';
import { ContractTemplateService } from './application/contract-template.service';
import { FinancialPdfService } from './application/financial-pdf.service';
import { LeaseContractService } from './application/lease-contract.service';
import { LeaseContractWorker } from './infrastructure/lease-contract.worker';
import { PdfBrowserService } from './infrastructure/pdf-browser.service';
import { ContractTemplateController } from './presentation/contract-template.controller';
import { LeaseContractController } from './presentation/lease-contract.controller';

/**
 * Module `pdf` : rendu des documents, worker BullMQ Puppeteer et gabarit de
 * contrat paramétrable par organisation.
 *
 * Il CONSOMME `leases` par deux ports (`LEASE_CONTRACT_SOURCE`,
 * `LEASE_DOCUMENT_WRITER`) et n'est consommé par personne : c'est une feuille
 * du graphe de dépendances, et rien ne justifie de le déclarer `@Global()`.
 * L'API démarre et sert normalement lorsque aucun navigateur de rendu n'est
 * installé ; seule la génération répond alors 503.
 *
 * Les phases suivantes y brancheront les quittances (phase 3) et les relevés
 * de gérance (phase 7), derrière le même `PdfBrowserService`.
 */
@Module({
  controllers: [LeaseContractController, ContractTemplateController],
  providers: [
    PdfBrowserService,
    ContractTemplateService,
    LeaseContractService,
    LeaseContractWorker,
    FinancialPdfService,
  ],
  exports: [
    PdfBrowserService,
    ContractTemplateService,
    LeaseContractService,
    LeaseContractWorker,
    FinancialPdfService,
  ],
})
export class PdfModule {}
