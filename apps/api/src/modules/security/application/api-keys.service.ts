import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS } from '../../audit/domain/audit-entry';
import { generateApiKeySecret, hashApiKeySecret } from '../domain/api-key-secret';
import {
  assertApiKeyLimitNotReached,
  assertApiKeyRotatable,
  rotationGraceExpiresAt,
} from '../domain/security-policy';

export interface ApiKeySummaryView {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  allowedIps: string[] | null;
  status: 'ACTIVE' | 'REVOKED';
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes?: string[];
  allowedIps?: string[];
  expiresAt?: string;
}

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  allowed_ips: string[];
  status: string;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

/** Clés d'API par organisation (`api_keys`). Table sous RLS : toujours `withTenant`. */
@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async list(organizationId: string, userId: string): Promise<ApiKeySummaryView[]> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.api_keys.findMany({
        where: { organization_id: organizationId },
        orderBy: { created_at: 'desc' },
      }),
    );
    return rows.map(toSummary);
  }

  async create(
    organizationId: string,
    userId: string,
    input: CreateApiKeyInput,
  ): Promise<{ apiKey: ApiKeySummaryView; secret: string }> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const activeCount = await tx.api_keys.count({
        where: { organization_id: organizationId, status: 'ACTIVE' },
      });
      assertApiKeyLimitNotReached(activeCount, this.config.get('SECURITY_MAX_API_KEYS_PER_ORG'));

      const { secret, prefix } = generateApiKeySecret();
      const row = await tx.api_keys.create({
        data: {
          id: newId(),
          organization_id: organizationId,
          name: input.name,
          key_prefix: prefix,
          key_hash: hashApiKeySecret(secret),
          scopes: input.scopes ?? [],
          allowed_ips: input.allowedIps ?? [],
          expires_at: input.expiresAt ? new Date(input.expiresAt) : null,
          created_by_user_id: userId,
        },
      });
      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.API_KEY_CREATED,
        entityType: 'api_keys',
        entityId: row.id,
        newState: { name: row.name, keyPrefix: row.key_prefix, scopes: row.scopes },
      });
      return { apiKey: toSummary(row), secret };
    });
  }

  async rotate(
    organizationId: string,
    userId: string,
    keyId: string,
  ): Promise<{ apiKey: ApiKeySummaryView; secret: string; previousKeyExpiresAt: string }> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const existing = await tx.api_keys.findFirst({
        where: { id: keyId, organization_id: organizationId },
      });
      if (!existing) throw new DomainError('SECURITY.API_KEY_NOT_FOUND', { id: keyId });
      assertApiKeyRotatable(existing.status);

      const { secret, prefix } = generateApiKeySecret();
      const graceEndsAt = rotationGraceExpiresAt(
        new Date(),
        this.config.get('SECURITY_API_KEY_ROTATION_GRACE_HOURS'),
      );

      const created = await tx.api_keys.create({
        data: {
          id: newId(),
          organization_id: organizationId,
          name: existing.name,
          key_prefix: prefix,
          key_hash: hashApiKeySecret(secret),
          scopes: existing.scopes,
          allowed_ips: existing.allowed_ips,
          created_by_user_id: userId,
        },
      });
      await tx.api_keys.update({
        where: { id: existing.id },
        data: { expires_at: graceEndsAt },
      });
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.API_KEY_ROTATED,
        entityType: 'api_keys',
        entityId: created.id,
        newState: {
          previousApiKeyId: existing.id,
          newApiKeyId: created.id,
          graceEndsAt: graceEndsAt.toISOString(),
        },
      });
      return {
        apiKey: toSummary(created),
        secret,
        previousKeyExpiresAt: graceEndsAt.toISOString(),
      };
    });
  }

  async revoke(organizationId: string, userId: string, keyId: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const existing = await tx.api_keys.findFirst({
        where: { id: keyId, organization_id: organizationId },
      });
      if (!existing) throw new DomainError('SECURITY.API_KEY_NOT_FOUND', { id: keyId });
      if (existing.status === 'REVOKED') return;

      await tx.api_keys.update({
        where: { id: existing.id },
        data: { status: 'REVOKED', revoked_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.API_KEY_REVOKED,
        entityType: 'api_keys',
        entityId: existing.id,
        previousState: { status: existing.status },
        newState: { status: 'REVOKED' },
      });
    });
  }

  /** Révoque TOUTES les clés ACTIVE de l'organisation — appelé par `OrgRevokeAllService`. */
  async revokeAllForOrganization(tx: TenantClient, organizationId: string): Promise<number> {
    const result = await tx.api_keys.updateMany({
      where: { organization_id: organizationId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revoked_at: new Date() },
    });
    return result.count;
  }
}

function toSummary(row: ApiKeyRow): ApiKeySummaryView {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes,
    allowedIps: row.allowed_ips.length > 0 ? row.allowed_ips : null,
    status: row.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE',
    lastUsedAt: row.last_used_at ? row.last_used_at.toISOString() : null,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}
