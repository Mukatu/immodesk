import { DomainError } from '../../../shared/errors/domain-error';
import type { MemberRole } from '../../../shared/tenant/tenant-context';

/**
 * Une organisation doit conserver au moins un OWNER actif.
 *
 * La règle est vérifiée DANS la transaction qui modifie l'adhésion, sur un
 * décompte relu à ce moment-là : deux retraits concurrents du dernier OWNER
 * ne peuvent pas passer tous les deux.
 */
export function assertNotLastOwner(params: {
  activeOwnerCount: number;
  currentRole: MemberRole;
  nextRole: MemberRole | null;
}): void {
  const { activeOwnerCount, currentRole, nextRole } = params;
  const losesOwnership = currentRole === 'OWNER' && nextRole !== 'OWNER';
  if (losesOwnership && activeOwnerCount <= 1) {
    throw new DomainError('ORG.LAST_OWNER', { activeOwnerCount });
  }
}
