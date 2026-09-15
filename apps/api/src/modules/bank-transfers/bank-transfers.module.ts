import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BankTransferDeclarationsService } from './application/bank-transfer-declarations.service';
import { BankTransferQueryService } from './application/bank-transfer-query.service';
import { PaymentInstructionsService } from './application/payment-instructions.service';
import { BankTransferDeclarationsController } from './presentation/bank-transfer-declarations.controller';
import { PaymentInstructionsController } from './presentation/payment-instructions.controller';

/**
 * Module `bank-transfers` (phase 4) : instructions de paiement, déclarations
 * de virement avec preuve, unicité de la preuve par empreinte SHA-256,
 * prise en charge, validation et rejet. Propriétaire exclusif de
 * `bank_transfer_declarations`.
 */
@Module({
  imports: [OrganizationsModule],
  controllers: [BankTransferDeclarationsController, PaymentInstructionsController],
  providers: [
    BankTransferDeclarationsService,
    BankTransferQueryService,
    PaymentInstructionsService,
  ],
  exports: [BankTransferDeclarationsService, BankTransferQueryService],
})
export class BankTransfersModule {}
