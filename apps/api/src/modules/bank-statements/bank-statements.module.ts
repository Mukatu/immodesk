import { Global, Module } from '@nestjs/common';
import { StatementImportService } from './application/statement-import.service';
import { StatementsQueryService } from './application/statements-query.service';
import { StatementLinesQueryService } from './application/statement-lines-query.service';
import { BankAccountStatementsController } from './presentation/bank-account-statements.controller';
import { BankStatementsController } from './presentation/bank-statements.controller';
import { BankStatementLinesController } from './presentation/bank-statement-lines.controller';
import { BankStatementAdaptersController } from './presentation/bank-statement-adapters.controller';

/**
 * Module `bank-statements` (phase 6, lot 1) : import de relevés bancaires
 * CSV/MT940, lignes candidates au rapprochement, abandon d'un import erroné.
 * Propriétaire exclusif de `bank_statements` et `bank_statement_lines`.
 *
 * `@Global()`, comme `bank-checks` et `reconciliation` : ce trio de modules
 * de la phase 6 s'échange le port `RECONCILIATION_ENGINE` sans import
 * croisé, exactement comme `leases`/`deposits` en phase 2.
 */
@Global()
@Module({
  controllers: [
    BankAccountStatementsController,
    BankStatementsController,
    BankStatementLinesController,
    BankStatementAdaptersController,
  ],
  providers: [StatementImportService, StatementsQueryService, StatementLinesQueryService],
  exports: [StatementImportService, StatementsQueryService, StatementLinesQueryService],
})
export class BankStatementsModule {}
