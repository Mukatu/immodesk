import { Global, Module } from '@nestjs/common';
import { RECONCILIATION_ENGINE } from '../bank-statements/domain/ports';
import { BankTransfersModule } from '../bank-transfers/bank-transfers.module';
import { CandidateRepository } from './application/candidate-repository';
import { DashboardService } from './application/dashboard.service';
import { MatchSettlementService } from './application/match-settlement.service';
import { MatchesService } from './application/matches.service';
import { ReconciliationEngineService } from './application/reconciliation-engine.service';
import { LineSuggestionsController } from './presentation/line-suggestions.controller';
import { ReconciliationDashboardController } from './presentation/reconciliation-dashboard.controller';
import { ReconciliationMatchesController } from './presentation/reconciliation-matches.controller';

/**
 * Module `reconciliation` (phase 6, lot 3) : moteur de rapprochement
 * bancaire, rapprochements manuels, tableau de bord. Propriétaire exclusif
 * de `reconciliation_matches`.
 *
 * `@Global()`, comme `bank-statements` et `bank-checks` : ce trio de la
 * phase 6 s'échange le port `RECONCILIATION_ENGINE` sans import croisé.
 * `BankTransfersModule` n'étant pas global, il est importé explicitement
 * pour `BankTransferDeclarationsService` (effet de confirmation sur une
 * déclaration de virement rapprochée).
 */
@Global()
@Module({
  imports: [BankTransfersModule],
  controllers: [
    ReconciliationMatchesController,
    ReconciliationDashboardController,
    LineSuggestionsController,
  ],
  providers: [
    CandidateRepository,
    MatchSettlementService,
    MatchesService,
    ReconciliationEngineService,
    DashboardService,
    { provide: RECONCILIATION_ENGINE, useExisting: ReconciliationEngineService },
  ],
  exports: [RECONCILIATION_ENGINE],
})
export class ReconciliationModule {}
