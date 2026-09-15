import { DomainError } from '../../../shared/errors/domain-error';

export const CHECK_STATUSES = [
  'RECEIVED',
  'DEPOSITED',
  'CLEARED',
  'BOUNCED',
  'CANCELLED',
  'RETURNED',
] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

/**
 * Machine à états d'un chèque (docs/api/phase6-contract.md, § « Chèques »).
 * `CANCELLED` et `RETURNED` ne partent QUE de `RECEIVED` (chèque rendu au
 * tireur avant remise en banque). `BOUNCED` est atteignable depuis
 * `DEPOSITED` (paiement encore `PENDING_VERIFICATION`, simple rejet) et
 * depuis `CLEARED` (paiement `CONFIRMED`, contre-passation). `BOUNCED`,
 * `CANCELLED` et `RETURNED` sont terminaux.
 */
export const CHECK_TRANSITIONS: Readonly<Record<CheckStatus, readonly CheckStatus[]>> = {
  RECEIVED: ['DEPOSITED', 'CANCELLED', 'RETURNED'],
  DEPOSITED: ['CLEARED', 'BOUNCED'],
  CLEARED: ['BOUNCED'],
  BOUNCED: [],
  CANCELLED: [],
  RETURNED: [],
};

export function assertCheckTransition(from: CheckStatus, to: CheckStatus): void {
  if (!CHECK_TRANSITIONS[from].includes(to)) {
    throw new DomainError('BANK.CHECK_INVALID_TRANSITION', { from, to });
  }
}
