import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface IdempotencyLookup {
  /** Réponse déjà mémorisée à rejouer telle quelle. */
  replay?: { status: number; body: unknown };
  /** Identifiant de la ligne à compléter une fois la réponse produite. */
  recordId?: string;
}

/**
 * Idempotence des POST portant l'en-tête `Idempotency-Key`.
 *
 * `idempotency_keys` porte `organization_id` et est donc soumise à la RLS :
 * une clé est unique PAR organisation (`idempotency_keys_uk`), deux tenants
 * peuvent utiliser la même chaîne sans interférence.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Empreinte du corps : une même clé avec un corps différent est rejetée. */
  static hashRequest(method: string, path: string, body: unknown): string {
    return createHash('sha256')
      .update(`${method.toUpperCase()} ${path} ${JSON.stringify(body ?? null)}`)
      .digest('hex');
  }

  /**
   * Réserve la clé, ou renvoie la réponse déjà mémorisée.
   * Lève `PLATFORM.IDEMPOTENCY_CONFLICT` si la clé a servi pour un autre
   * corps, `PLATFORM.IDEMPOTENCY_IN_PROGRESS` si une requête identique est
   * encore en vol.
   */
  async begin(params: {
    organizationId: string;
    userId: string | null;
    key: string;
    scope: string;
    method: string;
    path: string;
    requestHash: string;
  }): Promise<IdempotencyLookup> {
    return this.prisma.withTenant(params.organizationId, params.userId, async (tx) => {
      const existing = await tx.idempotency_keys.findFirst({
        where: {
          organization_id: params.organizationId,
          scope: params.scope,
          key: params.key,
        },
      });

      if (existing) {
        if (existing.request_hash !== params.requestHash) {
          throw new DomainError('PLATFORM.IDEMPOTENCY_CONFLICT', { key: params.key });
        }
        if (existing.completed_at && existing.response_status !== null) {
          return {
            replay: {
              status: existing.response_status,
              body: existing.response_body ?? null,
            },
          };
        }
        throw new DomainError('PLATFORM.IDEMPOTENCY_IN_PROGRESS', { key: params.key });
      }

      const created = await tx.idempotency_keys.create({
        data: {
          id: newId(),
          organization_id: params.organizationId,
          key: params.key,
          scope: params.scope,
          user_id: params.userId,
          request_method: params.method.toUpperCase(),
          request_path: params.path,
          request_hash: params.requestHash,
          locked_at: new Date(),
        },
        select: { id: true },
      });
      return { recordId: created.id };
    });
  }

  /** Mémorise la réponse pour un futur rejeu. */
  async complete(params: {
    organizationId: string;
    userId: string | null;
    recordId: string;
    status: number;
    body: unknown;
  }): Promise<void> {
    await this.prisma.withTenant(params.organizationId, params.userId, (tx) =>
      tx.idempotency_keys.update({
        where: { id: params.recordId },
        data: {
          response_status: params.status,
          response_body: (params.body ?? null) as object,
          completed_at: new Date(),
          updated_at: new Date(),
        },
      }),
    );
  }

  /**
   * Libère une clé dont le traitement a échoué : le client doit pouvoir
   * réessayer avec la même clé après une erreur transitoire.
   */
  async release(params: {
    organizationId: string;
    userId: string | null;
    recordId: string;
  }): Promise<void> {
    await this.prisma
      .withTenant(params.organizationId, params.userId, (tx) =>
        tx.idempotency_keys.delete({ where: { id: params.recordId } }),
      )
      .catch(() => undefined);
  }
}
