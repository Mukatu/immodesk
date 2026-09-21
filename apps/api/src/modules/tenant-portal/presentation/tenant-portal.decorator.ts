import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';

export const TENANT_PORTAL_KEY = 'immodesk:tenantPortal';

/**
 * Marque une route du portail locataire : `TenantPortalGuard` la protège en
 * résolvant le rôle dérivé `TENANT_PORTAL` par lecture base à CHAQUE
 * requête (jamais depuis le jeton) — même esprit que `@LandlordPortal()` /
 * `LandlordPortalGuard` (phase 7).
 */
export const TenantPortal = () => SetMetadata(TENANT_PORTAL_KEY, true);

/**
 * Injecte les baux actifs posés par `TenantPortalGuard` sur
 * `request.tenantLeases` — jamais `request.tenant`, réservé au contexte
 * d'organisation classique (`OrganizationGuard`), pour ne jamais entrer en
 * collision avec lui, ni avec `request.landlordLinks` du portail bailleur.
 */
export const CurrentTenantLeases = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantLeaseRow[] => {
    const request = ctx.switchToHttp().getRequest<Request & { tenantLeases?: TenantLeaseRow[] }>();
    return request.tenantLeases ?? [];
  },
);
