import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { groupLeasesByOrganization } from '../../tenant-portal/application/tenant-portal-scope';
import {
  deriveConsentState,
  TENANT_DATA_CATEGORIES,
  type ConsentAuditRow,
} from '../domain/consent';

export interface TenantChannelView {
  id: string;
  channelType: string;
  value: string;
  optIn: boolean;
  isPrimary: boolean;
}

export interface TenantPrivacyStateView {
  legalVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  consentRequired: boolean;
  dataCategories: readonly string[];
  dpoContact: string | null;
  channels: TenantChannelView[];
}

interface ConsentRow {
  occurred_at: Date;
  new_state: unknown;
}

/**
 * `GET /v1/tenant/privacy/me` et `POST /v1/tenant/privacy/consents` : le
 * consentement est un événement d'audit, jamais une colonne (arbitrage 6). Un
 * locataire multi-agences porte une ligne `tenants` par organisation : cette
 * classe agrège les organisations de la session (`groupLeasesByOrganization`,
 * déjà utilisée par le reste du portail locataire).
 */
@Injectable()
export class TenantPrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
  ) {}

  async me(leases: readonly TenantLeaseRow[], userId: string): Promise<TenantPrivacyStateView> {
    const legalVersion = this.config.get('PRIVACY_LEGAL_VERSION');
    const byOrg = groupLeasesByOrganization(leases);
    const consentRows: ConsentAuditRow[] = [];
    const channels: TenantChannelView[] = [];
    let dpoContact: string | null = this.config.get('PRIVACY_DPO_CONTACT') ?? null;

    for (const [organizationId, orgLeases] of byOrg) {
      const tenantId = orgLeases[0].tenantId;
      await this.prisma.withTenant(organizationId, userId, async (tx) => {
        const latest = (await tx.audit_logs.findFirst({
          where: {
            entity_type: 'tenants',
            entity_id: tenantId,
            reason: AUDIT_OPERATIONS.PRIVACY_CONSENT_ACCEPTED,
          },
          orderBy: { occurred_at: 'desc' },
          select: { occurred_at: true, new_state: true },
        })) as ConsentRow | null;
        if (latest) {
          const state = latest.new_state as { legalVersion?: string; acceptedAt?: string } | null;
          if (state?.legalVersion && state.acceptedAt) {
            consentRows.push({
              occurredAt: latest.occurred_at,
              legalVersion: state.legalVersion,
              acceptedAt: state.acceptedAt,
            });
          }
        }

        const settings = await tx.organization_settings.findUnique({
          where: { organization_id: organizationId },
          select: { settings_json: true },
        });
        const privacy = (settings?.settings_json as { privacy?: { dpoContact?: string } } | null)
          ?.privacy;
        if (privacy?.dpoContact) dpoContact = privacy.dpoContact;

        const rows = await tx.contact_channels.findMany({
          where: { owner_type: 'TENANT', owner_id: tenantId },
          orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
        });
        for (const r of rows) {
          channels.push({
            id: r.id,
            channelType: r.channel_type,
            value: r.value,
            optIn: r.opt_in,
            isPrimary: r.is_primary,
          });
        }
      });
    }

    const consent = deriveConsentState(consentRows, legalVersion);
    return {
      legalVersion,
      ...consent,
      dataCategories: TENANT_DATA_CATEGORIES,
      dpoContact,
      channels,
    };
  }

  /** `POST /v1/tenant/privacy/consents` : une ligne d'audit PAR organisation en session (arbitrage 4, même diffusion). */
  async acceptConsent(
    leases: readonly TenantLeaseRow[],
    userId: string,
    legalVersion: string,
    ipAddress: string | null,
  ): Promise<{ legalVersion: string; acceptedAt: string }> {
    const current = this.config.get('PRIVACY_LEGAL_VERSION');
    if (legalVersion !== current) {
      throw new DomainError('PRIVACY.CONSENT_VERSION_UNKNOWN', { legalVersion, current });
    }
    const acceptedAt = new Date().toISOString();
    const byOrg = groupLeasesByOrganization(leases);

    for (const [organizationId, orgLeases] of byOrg) {
      const tenantId = orgLeases[0].tenantId;
      await this.prisma.withTenant(organizationId, userId, (tx) =>
        audit(this.auditService, tx, {
          organizationId,
          actorUserId: userId,
          action: 'CREATE',
          operation: AUDIT_OPERATIONS.PRIVACY_CONSENT_ACCEPTED,
          entityType: 'tenants',
          entityId: tenantId,
          newState: toJsonState({ legalVersion, acceptedAt, ipAddress }),
        }),
      );
    }
    return { legalVersion, acceptedAt };
  }
}
