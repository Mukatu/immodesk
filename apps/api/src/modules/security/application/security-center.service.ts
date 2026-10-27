import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AccessDenialsService, type AccessDenialView } from './access-denials.service';
import { ApiKeysService, type ApiKeySummaryView } from './api-keys.service';

export interface SecurityCenterMemberView {
  userId: string;
  displayName: string;
  role: string;
  activeSessions: number;
  lastLoginAt: string | null;
}

export interface ReadOnlyStateView {
  enabled: boolean;
  reason: string | null;
  since: string | null;
  expectedEndAt: string | null;
  incidentRef: string | null;
}

export interface SecurityCenterView {
  members: SecurityCenterMemberView[];
  apiKeys: ApiKeySummaryView[];
  recentDenials: AccessDenialView[];
  readOnly: ReadOnlyStateView;
}

interface MemberRow {
  user_id: string;
  role: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_e164: string;
  last_login_at: Date | null;
  active_sessions: bigint;
}

/** Nombre de refus récents affichés dans le tableau de bord (arbitrage local, non paginé). */
const RECENT_DENIALS_LIMIT = 10;

/**
 * Vue d'ensemble `GET /v1/organizations/{id}/security` (contrat, type
 * `SecurityCenter`) : membres actifs et leurs sessions, clés d'API, derniers
 * refus d'accès et état de lecture seule courant.
 */
@Injectable()
export class SecurityCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeys: ApiKeysService,
    private readonly denials: AccessDenialsService,
  ) {}

  async get(organizationId: string, userId: string): Promise<SecurityCenterView> {
    const [members, apiKeys, denialsPage, readOnly] = await Promise.all([
      this.loadMembers(organizationId, userId),
      this.apiKeys.list(organizationId, userId),
      this.denials.list(organizationId, userId, { limit: RECENT_DENIALS_LIMIT }),
      this.loadReadOnlyState(organizationId, userId),
    ]);
    return { members, apiKeys, recentDenials: denialsPage.items, readOnly };
  }

  private async loadMembers(
    organizationId: string,
    userId: string,
  ): Promise<SecurityCenterMemberView[]> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<MemberRow[]>(
        `SELECT om.user_id, om.role, u.display_name, u.first_name, u.last_name,
                u.phone_e164, u.last_login_at,
                (SELECT count(*) FROM refresh_tokens rt
                  WHERE rt.user_id = om.user_id AND rt.revoked_at IS NULL
                    AND rt.expires_at > now()) AS active_sessions
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         WHERE om.organization_id = $1::uuid AND om.status = 'ACTIVE'
         ORDER BY om.joined_at ASC`,
        organizationId,
      ),
    );
    return rows.map((row) => ({
      userId: row.user_id,
      displayName: memberDisplayName(row),
      role: row.role,
      activeSessions: Number(row.active_sessions),
      lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    }));
  }

  /**
   * `read_only_mode` est un drapeau GLOBAL de `feature_flags`
   * (`organization_id IS NULL`), lisible par tout tenant (policy
   * `global_flags_readonly`/`org_isolation`, arbitrage 2 du contrat). Lu ici
   * dans le contexte de l'organisation déjà ouvert, par simplicité — sa
   * visibilité ne dépend pas de `organizationId`.
   */
  private async loadReadOnlyState(
    organizationId: string,
    userId: string,
  ): Promise<ReadOnlyStateView> {
    const flag = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.feature_flags.findFirst({ where: { key: 'read_only_mode', organization_id: null } }),
    );
    if (!flag) {
      return { enabled: false, reason: null, since: null, expectedEndAt: null, incidentRef: null };
    }
    const payload = (flag.payload ?? {}) as Record<string, unknown>;
    return {
      enabled: flag.is_enabled,
      reason: typeof payload.reason === 'string' ? payload.reason : null,
      since: flag.updated_at.toISOString(),
      expectedEndAt: typeof payload.expectedEndAt === 'string' ? payload.expectedEndAt : null,
      incidentRef: typeof payload.incidentRef === 'string' ? payload.incidentRef : null,
    };
  }
}

function memberDisplayName(row: MemberRow): string {
  const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return row.display_name ?? (fullName.length > 0 ? fullName : row.phone_e164);
}
