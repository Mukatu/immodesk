import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import type { AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { AUDIT_OPERATIONS } from '../../audit/domain/audit-entry';
import { groupLeasesByOrganization } from '../../tenant-portal/application/tenant-portal-scope';
import { TENANT_PORTAL_KEY } from '../../tenant-portal/presentation/tenant-portal.decorator';
import { deriveConsentState, type ConsentAuditRow } from '../domain/consent';

/** Une lecture ne modifie rien : le portail reste consultable sans consentement. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Refuse les ÉCRITURES du portail locataire tant que la version courante des
 * mentions légales n'est pas acceptée (`403 PRIVACY.CONSENT_REQUIRED`).
 *
 * Le contrat décrit ce refus comme transversal : « tant qu'il n'est pas
 * accepté, le portail reste lisible mais toute action d'écriture est
 * refusée ». Il ne peut donc pas vivre dans un contrôleur.
 *
 * IL RÉSOUT LES BAUX LUI-MÊME, et ne lit pas `request.tenantLeases`. Un garde
 * global s'exécute AVANT les gardes de route (`@UseGuards(TenantPortalGuard)`),
 * donc ce champ n'est pas encore posé au moment où l'on passe ici. S'en
 * remettre à lui aurait produit un garde silencieusement inopérant — le pire
 * des cas pour une règle de conformité.
 *
 * Le coût est borné : la requête d'audit n'est émise que pour une écriture
 * sur une route portant `@TenantPortal()`, jamais sur le reste de l'API.
 */
@Injectable()
export class TenantConsentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly directory: TenantDirectoryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const requiresPortal = this.reflector.getAllAndOverride<boolean>(TENANT_PORTAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresPortal) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const method = (request.method ?? 'GET').toUpperCase();
    if (SAFE_METHODS.has(method)) return true;

    // La route d'acceptation elle-même : l'exiger reviendrait à rendre le
    // consentement impossible à donner.
    if (this.isConsentRoute(request.path ?? request.url ?? '')) return true;

    const user = request.user;
    if (!user) return true; // L'authentification est jugée ailleurs.

    const leases = await this.directory.listActiveTenantLeases(user.userId);
    // Aucun bail : `TenantPortalGuard` tranchera avec son propre refus.
    if (leases.length === 0) return true;

    const legalVersion = this.config.get('PRIVACY_LEGAL_VERSION');
    const rows: ConsentAuditRow[] = [];
    for (const [organizationId, orgLeases] of groupLeasesByOrganization(leases)) {
      const tenantId = orgLeases[0].tenantId;
      await this.prisma.withTenant(organizationId, user.userId, async (tx) => {
        const latest = await tx.audit_logs.findFirst({
          where: {
            entity_type: 'tenants',
            entity_id: tenantId,
            reason: AUDIT_OPERATIONS.PRIVACY_CONSENT_ACCEPTED,
          },
          orderBy: { occurred_at: 'desc' },
          select: { occurred_at: true, new_state: true },
        });
        const state = latest?.new_state as { legalVersion?: string; acceptedAt?: string } | null;
        if (latest && state?.legalVersion && state.acceptedAt) {
          rows.push({
            occurredAt: latest.occurred_at,
            legalVersion: state.legalVersion,
            acceptedAt: state.acceptedAt,
          });
        }
      });
    }

    if (deriveConsentState(rows, legalVersion).consentRequired) {
      throw new DomainError('PRIVACY.CONSENT_REQUIRED', { legalVersion });
    }
    return true;
  }

  private isConsentRoute(rawPath: string): boolean {
    const path = (rawPath.split('?')[0] ?? '').replace(/\/+$/, '');
    return path.endsWith('/tenant/privacy/consents') || path.endsWith('tenant/privacy/consents');
  }
}
