import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  REQUIRED_ROLES_KEY,
  REQUIRES_ORGANIZATION_KEY,
  type AuthenticatedUser,
} from '../auth/auth.contracts';
import { DomainError } from '../errors/domain-error';
import { isUuid } from '../ids/uuid';
import { PrismaService } from '../prisma/prisma.service';
import { satisfiesAnyRole } from './roles';
import type { MemberRole, TenantContext } from './tenant-context';

export const ORGANIZATION_HEADER = 'x-organization-id';

/**
 * Garde d'organisation : lit `X-Organization-Id`, vérifie que l'utilisateur
 * y possède une adhésion ACTIVE, résout son rôle effectif et applique
 * l'exigence de rôle déclarée par `@Roles(...)`.
 *
 * Toute organisation dont l'utilisateur n'est pas membre est traitée comme
 * inexistante : 404 `ORG.NOT_MEMBER`, jamais 403 — un attaquant ne doit pas
 * pouvoir énumérer les organisations existantes.
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const targets = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(REQUIRED_ROLES_KEY, targets);
    const requiresOrganization =
      this.reflector.getAllAndOverride<boolean>(REQUIRES_ORGANIZATION_KEY, targets) ||
      Array.isArray(requiredRoles);

    if (!requiresOrganization) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; tenant?: TenantContext }>();

    if (!request.user) {
      throw new DomainError('IAM.UNAUTHENTICATED');
    }

    const organizationId = this.readOrganizationId(request);
    const membership = await this.resolveMembership(organizationId, request.user.userId);

    if (requiredRoles && !satisfiesAnyRole(membership.role, requiredRoles)) {
      throw new DomainError('IAM.FORBIDDEN', {
        requiredRoles,
        actualRole: membership.role,
      });
    }

    request.tenant = {
      organizationId,
      userId: request.user.userId,
      role: membership.role,
      membershipId: membership.id,
      requestId: (request.headers['x-request-id'] as string | undefined) ?? undefined,
    };
    return true;
  }

  private readOrganizationId(request: Request): string {
    const header = request.headers[ORGANIZATION_HEADER];
    const value = Array.isArray(header) ? header[0] : header;
    if (!value || !isUuid(value)) {
      throw new DomainError('ORG.CONTEXT_MISSING', { header: 'X-Organization-Id' });
    }
    // Cohérence : si la route porte un {id} d'organisation, il doit
    // correspondre à l'en-tête, sinon la RLS et l'URL divergeraient.
    const paramId = (request.params as Record<string, string> | undefined)?.id;
    if (paramId && isUuid(paramId) && paramId !== value) {
      throw new DomainError('ORG.NOT_MEMBER', { organizationId: paramId });
    }
    return value;
  }

  /**
   * L'adhésion est relue en base à chaque requête : le rôle n'est jamais
   * repris du jeton (un changement de rôle prend effet immédiatement).
   * `organization_members` porte `organization_id` et est donc sous RLS ;
   * la lecture se fait dans le contexte de l'organisation demandée, ce qui
   * ne révèle rien de plus que ce que l'appelant a déjà fourni.
   */
  private async resolveMembership(
    organizationId: string,
    userId: string,
  ): Promise<{ id: string; role: MemberRole }> {
    const rows = await this.prisma.withTenant(organizationId, userId, async (tx) =>
      tx.organization_members.findMany({
        where: { organization_id: organizationId, user_id: userId, status: 'ACTIVE' },
        select: { id: true, role: true },
        take: 1,
      }),
    );

    const membership = rows[0];
    if (!membership) {
      throw new DomainError('ORG.NOT_MEMBER', { organizationId });
    }
    return { id: membership.id, role: membership.role as MemberRole };
  }
}
