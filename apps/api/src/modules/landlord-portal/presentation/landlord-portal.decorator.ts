import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { LandlordLinkRow } from '../../../shared/prisma/tenant-directory.service';

export const LANDLORD_PORTAL_KEY = 'immodesk:landlordPortal';

/**
 * Marque une route du portail bailleur : `LandlordPortalGuard` la protège en
 * résolvant le rôle dérivé `LANDLORD_PORTAL` par lecture base à chaque
 * requête (jamais depuis le jeton).
 *
 * Toutes les routes de ce module sont des `GET` : le contrat (arbitrage n°7,
 * « toute écriture est refusée ») est donc respecté par construction, sans
 * contrôle actif de méthode HTTP à ajouter — aucune route non-GET n'existe
 * dans `PortalController`/`PortalActivationController`.
 */
export const LandlordPortal = () => SetMetadata(LANDLORD_PORTAL_KEY, true);

/**
 * Injecte les liens bailleur posés par `LandlordPortalGuard` sur
 * `request.landlordLinks` — jamais `request.tenant`, réservé au contexte
 * d'organisation classique (`OrganizationGuard`), pour ne jamais entrer en
 * collision avec lui.
 */
export const CurrentLandlordLinks = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): LandlordLinkRow[] => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { landlordLinks?: LandlordLinkRow[] }>();
    return request.landlordLinks ?? [];
  },
);
