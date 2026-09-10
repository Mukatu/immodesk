import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { DomainError } from '../errors/domain-error';
import type { MemberRole } from '../tenant/tenant-context';

/** Charge utile d'un jeton d'accès Immodesk. */
export interface AccessTokenPayload {
  /** Identifiant de l'utilisateur. */
  sub: string;
  /** Identifiant de session (famille de refresh tokens). */
  sid: string;
  /** Type de jeton : seul `access` est accepté par les gardes. */
  typ: 'access';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/** Utilisateur authentifié attaché à la requête. */
export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
}

/**
 * Port de vérification des jetons d'accès, implémenté par le module
 * `identity`. Les gardes transverses ne dépendent que de cette interface.
 */
export interface AccessTokenVerifier {
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
}

export const ACCESS_TOKEN_VERIFIER = Symbol('ACCESS_TOKEN_VERIFIER');

export const IS_PUBLIC_KEY = 'immodesk:isPublic';
export const REQUIRED_ROLES_KEY = 'immodesk:requiredRoles';
export const REQUIRES_ORGANIZATION_KEY = 'immodesk:requiresOrganization';

/** Route accessible sans jeton d'accès. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Route d'organisation : impose l'en-tête `X-Organization-Id`, vérifie
 * l'appartenance active de l'utilisateur et ouvre le contexte RLS.
 */
export const RequireOrganization = () => SetMetadata(REQUIRES_ORGANIZATION_KEY, true);

/**
 * Rôle minimum requis. Implique `RequireOrganization`.
 * Exemple : `@Roles('OWNER', 'MANAGER')`.
 */
export const Roles = (...roles: MemberRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

/** Injecte l'utilisateur authentifié dans un paramètre de contrôleur. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);

/** Injecte le contexte d'organisation résolu par la garde. */
export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { tenant?: unknown }>();
  return request.tenant;
});

/**
 * Injecte l'identifiant de l'organisation courante, résolu par
 * `OrganizationGuard` à partir de `X-Organization-Id` — jamais lu d'un
 * paramètre de route non vérifié.
 */
export const CurrentOrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { tenant?: { organizationId: string } }>();
    if (!request.tenant) {
      throw new DomainError('ORG.CONTEXT_MISSING', { header: 'X-Organization-Id' });
    }
    return request.tenant.organizationId;
  },
);
