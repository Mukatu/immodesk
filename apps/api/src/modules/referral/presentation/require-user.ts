import type { AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';

export function requireUser(user: AuthenticatedUser | undefined): string {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user.userId;
}
