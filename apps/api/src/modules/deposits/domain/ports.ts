import type { TenantClient } from '../../../shared/prisma/prisma.service';

/**
 * Port de lecture du bail, consommé par `deposits`.
 *
 * Un mouvement de dépôt dépend de l'état du bail : une restitution n'est
 * permise que si celui-ci est TERMINATED ou EXPIRED. Plutôt que de lire
 * `leases` directement — ce qui ferait de `deposits` le copropriétaire de la
 * table — la question passe par cette interface, implémentée par le module
 * propriétaire. `leases` ignore tout de ce port : aucun cycle n'apparaît.
 */
export const LEASE_READER = Symbol('LEASE_READER');

export interface LeaseForDeposit {
  id: string;
  status: string;
  primaryTenantId: string;
  unitId: string;
  reference: string;
}

export interface LeaseReader {
  /** Bail vivant, ou `null` : l'appelant décide du code d'erreur. */
  findForDeposit(tx: TenantClient, leaseId: string): Promise<LeaseForDeposit | null>;
}
