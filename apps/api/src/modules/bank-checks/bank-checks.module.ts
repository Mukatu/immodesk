import { Global, Module } from '@nestjs/common';
import { BankChecksQueryService } from './application/bank-checks-query.service';
import { BankChecksService } from './application/bank-checks.service';
import { CheckAlertsService } from './application/check-alerts.service';
import { CheckAlertsScheduler } from './infrastructure/check-alerts.scheduler';
import { BankChecksController } from './presentation/bank-checks.controller';

/**
 * Module `bank-checks` (phase 6, lot 2) : cycle de vie des chèques reçus,
 * de la remise en banque à la compensation ou au rejet, plus l'alerte
 * quotidienne des chèques non compensés. Propriétaire exclusif de
 * `bank_checks`.
 *
 * `@Global()`, comme `bank-statements` et `reconciliation` : ce trio de
 * modules de la phase 6 s'échange ses services sans import croisé —
 * `BankChecksService.settleFromReconciliation` sera appelée par le futur
 * module `reconciliation` (lot 3) sans que celui-ci importe ce module.
 */
@Global()
@Module({
  controllers: [BankChecksController],
  providers: [BankChecksQueryService, BankChecksService, CheckAlertsService, CheckAlertsScheduler],
  exports: [BankChecksQueryService, BankChecksService],
})
export class BankChecksModule {}
