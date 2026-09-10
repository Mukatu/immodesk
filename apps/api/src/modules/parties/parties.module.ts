import { Global, Module } from '@nestjs/common';
import { ORGANIZATION_LIFECYCLE_LISTENERS } from '../organizations/domain/ports';
import { ContactChannelsService } from './application/contact-channels.service';
import { GuarantorsService } from './application/guarantors.service';
import { LandlordsService } from './application/landlords.service';
import { PartyDetailsService } from './application/party-details.service';
import { SelfLandlordProvisioner } from './application/self-landlord.provisioner';
import { TenantsService } from './application/tenants.service';
import { ContactChannelsController } from './presentation/contact-channels.controller';
import { GuarantorsController } from './presentation/guarantors.controller';
import { LandlordsController } from './presentation/landlords.controller';
import { TenantsController } from './presentation/tenants.controller';

/**
 * Module `parties` : tiers de l'organisation. Propriétaire exclusif des
 * tables `landlords`, `tenants`, `guarantors` et `contact_channels`.
 *
 * Déclaré `@Global()` comme `audit` et `notifications` : il expose le port
 * `ORGANIZATION_LIFECYCLE_LISTENERS` consommé par `organizations` et
 * consomme les ports de lecture de `portfolio`, `banking` et `documents`.
 * Un jeu d'imports croisés produirait un cycle de modules là où il n'existe
 * aucun cycle de dépendances entre classes.
 */
@Global()
@Module({
  controllers: [
    LandlordsController,
    TenantsController,
    GuarantorsController,
    ContactChannelsController,
  ],
  providers: [
    LandlordsService,
    TenantsService,
    GuarantorsService,
    ContactChannelsService,
    PartyDetailsService,
    SelfLandlordProvisioner,
    {
      // Bailleur « self » des organisations INDEPENDENT_LANDLORD et
      // INDEPENDENT_MANAGER, créé dans la transaction de l'organisation.
      provide: ORGANIZATION_LIFECYCLE_LISTENERS,
      useFactory: (provisioner: SelfLandlordProvisioner) => [provisioner],
      inject: [SelfLandlordProvisioner],
    },
  ],
  exports: [
    LandlordsService,
    TenantsService,
    GuarantorsService,
    ContactChannelsService,
    PartyDetailsService,
    ORGANIZATION_LIFECYCLE_LISTENERS,
  ],
})
export class PartiesModule {}
