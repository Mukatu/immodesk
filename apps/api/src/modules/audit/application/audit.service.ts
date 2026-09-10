import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { currentTenant } from '../../../shared/tenant/tenant-context';
import { changedFields, type AuditEntry } from '../domain/audit-entry';

/**
 * Écriture du journal d'audit (`audit_logs`), strictement append-only.
 *
 * `audit_logs` porte `organization_id NOT NULL` et est donc soumise à la RLS :
 * toute écriture se fait dans le contexte de l'organisation concernée.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Écrit une entrée DANS la transaction en cours.
   * À privilégier : l'audit est ainsi validé ou annulé avec l'opération
   * métier qu'il décrit, jamais séparément.
   */
  async record(tx: TenantClient, entry: AuditEntry): Promise<void> {
    const previous = entry.previousState ?? null;
    const next = entry.newState ?? null;
    await tx.audit_logs.create({
      data: {
        id: newId(),
        organization_id: entry.organizationId,
        actor_user_id: entry.actorUserId ?? null,
        actor_label: entry.actorLabel ?? null,
        actor_role: entry.actorRole ?? null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        previous_state: (previous ?? undefined) as Prisma.InputJsonValue | undefined,
        // L'opération métier fine est reprise dans l'état d'arrivée pour
        // rester requêtable même si `reason` est réutilisé plus tard.
        new_state: (next
          ? { ...next, operation: entry.operation }
          : { operation: entry.operation }) as Prisma.InputJsonValue,
        changed_fields: changedFields(previous, next),
        reason: entry.operation,
        ip_address: entry.ipAddress ?? null,
        user_agent: entry.userAgent ?? null,
        request_id: entry.requestId ?? null,
      },
    });
  }

  /**
   * Écrit une entrée dans sa propre transaction, en ouvrant le contexte de
   * l'organisation visée. À réserver aux cas hors transaction métier
   * (verrouillage OTP, par exemple).
   */
  async recordStandalone(entry: AuditEntry): Promise<void> {
    await this.prisma.withTenant(entry.organizationId, entry.actorUserId ?? null, (tx) =>
      this.record(tx, entry),
    );
  }

  /**
   * Variante tolérante : journalise l'échec plutôt que de faire échouer
   * l'opération appelante. Réservée aux traces d'authentification, qui ne
   * doivent jamais empêcher une réponse de sécurité (verrouillage, 429).
   */
  async tryRecordStandalone(entry: AuditEntry): Promise<void> {
    try {
      await this.recordStandalone(entry);
    } catch (error) {
      this.logger.warn(
        `Audit non écrit (${entry.operation} sur ${entry.entityType}/${entry.entityId}) : ${
          (error as Error).message
        }`,
      );
    }
  }
}

/**
 * Fonction utilitaire `audit()` : complète une entrée avec le contexte de
 * tenant courant (organisation, acteur, rôle) puis l'écrit dans la
 * transaction fournie.
 *
 * Exemple :
 *   await audit(service, tx, {
 *     action: 'STATE_TRANSITION',
 *     operation: AUDIT_OPERATIONS.MEMBER_ROLE_CHANGED,
 *     entityType: 'organization_members',
 *     entityId: member.id,
 *     previousState: toJsonState({ role: before }),
 *     newState: toJsonState({ role: after }),
 *   });
 */
export async function audit(
  service: AuditService,
  tx: TenantClient,
  entry: Omit<AuditEntry, 'organizationId' | 'actorUserId' | 'actorRole'> &
    Partial<Pick<AuditEntry, 'organizationId' | 'actorUserId' | 'actorRole'>>,
): Promise<void> {
  const ctx = currentTenant();
  const organizationId = entry.organizationId ?? ctx?.organizationId;
  if (!organizationId) {
    throw new Error("audit() requiert une organisation : aucun contexte de tenant n'est ouvert.");
  }
  await service.record(tx, {
    ...entry,
    organizationId,
    actorUserId: entry.actorUserId ?? ctx?.userId ?? null,
    actorRole: entry.actorRole ?? ctx?.role ?? null,
    requestId: entry.requestId ?? ctx?.requestId ?? null,
  });
}
