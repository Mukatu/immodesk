import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';

/**
 * Regroupe les baux actifs de la session (`request.tenantLeases`, posés par
 * `TenantPortalGuard`) par organisation : chaque organisation doit être lue
 * séparément sous RLS (`PrismaService.withTenant`), sur le principe déjà
 * appliqué par le portail bailleur (phase 7).
 */
export function groupLeasesByOrganization(
  leases: readonly TenantLeaseRow[],
): Map<string, TenantLeaseRow[]> {
  const byOrg = new Map<string, TenantLeaseRow[]>();
  for (const lease of leases) {
    const list = byOrg.get(lease.organizationId);
    if (list) list.push(lease);
    else byOrg.set(lease.organizationId, [lease]);
  }
  return byOrg;
}

/**
 * Bail unique de la session appartenant à `organizationId` et `leaseId`.
 * Lève `PARTIES.PORTAL_OUT_OF_SCOPE` (404, jamais 403 — règle de
 * cloisonnement du contrat, § Portail locataire) hors périmètre : un lien
 * vers un bail d'un autre locataire, ou inexistant, produit la même réponse.
 */
export function requireLeaseInScope(
  leases: readonly TenantLeaseRow[],
  leaseId: string,
): TenantLeaseRow {
  const found = leases.find((l) => l.leaseId === leaseId);
  if (!found) throw new DomainError('PARTIES.PORTAL_OUT_OF_SCOPE', { leaseId });
  return found;
}
