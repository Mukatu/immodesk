import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { REFERRAL_PARTNER_KEY } from './referral-partner.decorator';

/** Partenaire résolu, attaché à la requête par `ReferralPartnerGuard`. */
export interface ReferralPartnerContext {
  id: string;
  userId: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  organizationId: string | null;
}

/**
 * Garde des routes `/v1/referral-partners/me*`, calquée sur
 * `LandlordPortalGuard`/`PlatformAdminGuard` : le compte appelant est un
 * `users` ordinaire authentifié par `JwtAuthGuard` (APP_GUARD global,
 * déclaré avant cette garde de portée module), et le rôle dérivé
 * « partenaire » est relu en base à CHAQUE requête via
 * `referral_partners.user_id` — jamais porté par le jeton.
 *
 * `referral_partners` est une table GLOBALE (`GLOBAL_TABLES`,
 * `shared/prisma/prisma.service.ts`) : lecture directe par le rôle
 * applicatif, aucun besoin de l'annuaire multi-tenant ni de `withTenant`.
 *
 * Un partenaire `CLOSED` (compte fermé par la plateforme) perd l'accès :
 * même refus 404 que « jamais inscrit », pour ne rien laisser deviner du
 * motif de fermeture.
 */
@Injectable()
export class ReferralPartnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const requiresPartner = this.reflector.getAllAndOverride<boolean>(REFERRAL_PARTNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresPartner) return true;

    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: AuthenticatedUser; referralPartner?: ReferralPartnerContext }
      >();

    if (!request.user) {
      throw new DomainError('IAM.UNAUTHENTICATED');
    }

    const partner = await this.prisma.withUser(request.user.userId, (tx) =>
      tx.referral_partners.findUnique({
        where: { user_id: request.user!.userId },
        select: { id: true, user_id: true, status: true, organization_id: true },
      }),
    );

    if (!partner || partner.status === 'CLOSED') {
      throw new DomainError('REFERRALS.PARTNER_NOT_FOUND');
    }

    request.referralPartner = {
      id: partner.id,
      userId: partner.user_id,
      status: partner.status,
      organizationId: partner.organization_id,
    };
    return true;
  }
}
