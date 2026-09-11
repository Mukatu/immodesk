import { Global, Module } from '@nestjs/common';
import { DEPOSIT_WRITER } from '../leases/domain/ports';
import { DepositsQueryService } from './application/deposits-query.service';
import { DepositsService } from './application/deposits.service';
import { DepositsController } from './presentation/deposits.controller';

/**
 * Module `deposits` : dépôts de garantie et mouvements append-only.
 * Propriétaire exclusif des tables `deposits` et `deposit_movements`.
 *
 * `@Global()` : il publie `DEPOSIT_WRITER`, consommé par `leases` à
 * l'activation et à la résiliation, et consomme `LEASE_READER` en retour.
 */
@Global()
@Module({
  controllers: [DepositsController],
  providers: [
    DepositsService,
    DepositsQueryService,
    { provide: DEPOSIT_WRITER, useExisting: DepositsService },
  ],
  exports: [DepositsService, DepositsQueryService, DEPOSIT_WRITER],
})
export class DepositsModule {}
