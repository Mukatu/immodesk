import { Global, Module } from '@nestjs/common';
import { BANK_ACCOUNT_READER } from '../parties/domain/read-ports';
import { BankAccountsService } from './application/bank-accounts.service';
import { BankAccountsController } from './presentation/bank-accounts.controller';

/**
 * Module `banking` : comptes de règlement (banques locales et portefeuilles
 * Mobile Money). Propriétaire exclusif de la table `bank_accounts`, partagée
 * à partir de la phase 6 avec le rapprochement bancaire et les reversements.
 *
 * `@Global()` pour publier le port `BANK_ACCOUNT_READER` consommé par la
 * fiche bailleur du module `parties`.
 */
@Global()
@Module({
  controllers: [BankAccountsController],
  providers: [
    BankAccountsService,
    { provide: BANK_ACCOUNT_READER, useExisting: BankAccountsService },
  ],
  exports: [BankAccountsService, BANK_ACCOUNT_READER],
})
export class BankingModule {}
