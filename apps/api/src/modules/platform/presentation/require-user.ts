import type { AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';

/**
 * Même garde que `referral/presentation/require-user.ts` : par construction,
 * `PlatformAdminGuard` a déjà refusé la requête si `request.user` est absent
 * (`IAM.UNAUTHENTICATED`) — ce contrôle est donc une ceinture de sécurité de
 * typage, pas un chemin atteignable en pratique.
 */
export function requireUser(user: AuthenticatedUser | undefined): string {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user.userId;
}
