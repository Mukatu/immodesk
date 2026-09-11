import { Global, Module } from '@nestjs/common';
import { LEASE_READER } from '../deposits/domain/ports';
import { LEASE_CONTRACT_SOURCE, LEASE_DOCUMENT_WRITER } from '../pdf/domain/ports';
import { LeaseDailyService } from './application/lease-daily.service';
import { LeaseDetailsService } from './application/lease-details.service';
import { LeaseDocumentsService } from './application/lease-documents.service';
import { LeaseLifecycleService } from './application/lease-lifecycle.service';
import { LeasePartiesService } from './application/lease-parties.service';
import { LeasesService } from './application/leases.service';
import { RentRevisionsService } from './application/rent-revisions.service';
import { LeaseCronScheduler } from './infrastructure/lease-cron.scheduler';
import { LeasePartiesController } from './presentation/lease-parties.controller';
import { LeasesController } from './presentation/leases.controller';

/**
 * Module `leases` : cycle de vie du bail, parties, révisions de loyer,
 * documents contractuels. Propriétaire exclusif des tables `leases`,
 * `lease_parties`, `lease_rent_revisions` et `lease_documents`.
 *
 * `@Global()` comme les modules de la phase 1 : il publie trois ports —
 * `LEASE_READER` pour `deposits`, `LEASE_CONTRACT_SOURCE` et
 * `LEASE_DOCUMENT_WRITER` pour `pdf` — et consomme `DEPOSIT_WRITER`. Un jeu
 * d'imports croisés produirait un cycle de MODULES là où il n'existe aucun
 * cycle entre les CLASSES.
 */
@Global()
@Module({
  controllers: [LeasesController, LeasePartiesController],
  providers: [
    LeasesService,
    LeaseLifecycleService,
    LeasePartiesService,
    RentRevisionsService,
    LeaseDocumentsService,
    LeaseDetailsService,
    LeaseDailyService,
    LeaseCronScheduler,
    { provide: LEASE_READER, useExisting: LeasesService },
    { provide: LEASE_CONTRACT_SOURCE, useExisting: LeaseDetailsService },
    { provide: LEASE_DOCUMENT_WRITER, useExisting: LeaseDocumentsService },
  ],
  exports: [
    LeasesService,
    LeaseLifecycleService,
    LeasePartiesService,
    RentRevisionsService,
    LeaseDocumentsService,
    LeaseDetailsService,
    LeaseDailyService,
    LeaseCronScheduler,
    LEASE_READER,
    LEASE_CONTRACT_SOURCE,
    LEASE_DOCUMENT_WRITER,
  ],
})
export class LeasesModule {}
