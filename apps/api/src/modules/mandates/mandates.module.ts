import { Global, Module } from '@nestjs/common';
import { MandatesQueryService } from './application/mandates-query.service';
import { MandatesService } from './application/mandates.service';
import { MANDATE_LANDLORD_INVITER } from './domain/ports';
import { MandatesController } from './presentation/mandates.controller';

/**
 * Module `mandates` : mandats de gestion, propriétaire exclusif de
 * `management_mandates`.
 *
 * `@Global()` : publie `MANDATE_LANDLORD_INVITER`, que `landlord-portal`
 * pourra plus tard rebrancher sur sa propre implémentation (voir
 * `domain/ports.ts`), et consomme `PROPERTY_READER` (`parties`/`portfolio`)
 * et `NOTIFICATION_ENQUEUER` (`notifications`) sans les importer : ces deux
 * modules sont eux-mêmes `@Global()`.
 */
@Global()
@Module({
  controllers: [MandatesController],
  providers: [
    MandatesService,
    MandatesQueryService,
    { provide: MANDATE_LANDLORD_INVITER, useExisting: MandatesService },
  ],
  exports: [MandatesService, MandatesQueryService, MANDATE_LANDLORD_INVITER],
})
export class MandatesModule {}
