import { Global, Module } from '@nestjs/common';
import { COMMISSION_CANCELLER } from '../payments/domain/ports';
import { CommissionsQueryService } from './application/commissions-query.service';
import { CommissionsService } from './application/commissions.service';
import { CommissionsController } from './presentation/commissions.controller';

/**
 * Module `commissions` : honoraires de gestion, propriétaire exclusif de la
 * table `commissions` (phase 7).
 *
 * `@Global()` : publie `COMMISSION_CANCELLER` (jeton déclaré par `payments`,
 * consommé — facultativement — par `ReversalService`), et expose
 * `CommissionsService` directement à `owner-statements`, qui l'injecte sans
 * passer par un port `Symbol` (les deux modules sont volontairement
 * couplés, voir le commentaire de tête d'`OwnerStatementsCampaignService`).
 * Aucun import de `payments` ici : le jeton suffit, comme `RECEIPT_ISSUER`
 * pour `receipts`.
 */
@Global()
@Module({
  controllers: [CommissionsController],
  providers: [
    CommissionsService,
    CommissionsQueryService,
    { provide: COMMISSION_CANCELLER, useExisting: CommissionsService },
  ],
  exports: [CommissionsService, CommissionsQueryService, COMMISSION_CANCELLER],
})
export class CommissionsModule {}
