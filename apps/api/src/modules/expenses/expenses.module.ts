import { Global, Module } from '@nestjs/common';
import { ExpensesQueryService } from './application/expenses-query.service';
import { ExpensesService } from './application/expenses.service';
import { EXPENSE_READER } from './domain/ports';
import { ExpensesController } from './presentation/expenses.controller';

/**
 * Module `expenses` : dépenses d'agence, propriétaire exclusif de la table
 * `expenses`.
 *
 * `@Global()` : publie `EXPENSE_READER`, consommé par `owner-statements`
 * (pas encore construit) pour la campagne mensuelle, à l'image de
 * `DEPOSIT_WRITER` publié par `deposits`.
 */
@Global()
@Module({
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    ExpensesQueryService,
    { provide: EXPENSE_READER, useExisting: ExpensesService },
  ],
  exports: [ExpensesService, ExpensesQueryService, EXPENSE_READER],
})
export class ExpensesModule {}
