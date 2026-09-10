import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { DomainError } from '../errors/domain-error';
import {
  ACCESS_TOKEN_VERIFIER,
  IS_PUBLIC_KEY,
  type AccessTokenVerifier,
  type AuthenticatedUser,
} from './auth.contracts';

/**
 * Garde d'authentification globale : toute route est protégée sauf
 * annotation `@Public()`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly verifier: AccessTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = extractBearerToken(request);

    if (isPublic) {
      // Une route publique accepte un jeton facultatif (ex. /v1/invitations/{token}).
      if (token) {
        try {
          const payload = await this.verifier.verifyAccessToken(token);
          request.user = { userId: payload.sub, sessionId: payload.sid };
        } catch {
          // Jeton invalide sur une route publique : ignoré silencieusement.
        }
      }
      return true;
    }

    if (!token) {
      throw new DomainError('IAM.UNAUTHENTICATED');
    }

    const payload = await this.verifier.verifyAccessToken(token);
    request.user = { userId: payload.sub, sessionId: payload.sid };
    return true;
  }
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (!value || scheme.toLowerCase() !== 'bearer') return null;
  return value.trim() || null;
}
