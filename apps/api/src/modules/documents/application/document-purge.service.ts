import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../../shared/config/config.module';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { OBJECT_STORAGE, type ObjectStorage } from '../domain/storage.port';

interface PurgeCandidate {
  id: string;
  organization_id: string;
  object_key: string;
  file_name: string;
}

export interface PurgeReport {
  scanned: number;
  purged: number;
  failed: number;
}

/**
 * Purge différée des objets des documents supprimés logiquement.
 *
 * POURQUOI PAS BULLMQ ICI — BullMQ est la file d'attente tranchée du projet,
 * mais aucun worker n'est déployé avant la phase 3 (quittances PDF) : monter
 * l'infrastructure complète pour une seule tâche de ménage coûterait plus
 * qu'elle ne rapporte. La tâche est donc un intervalle simple, `unref()` pour
 * ne jamais retarder l'arrêt du processus, et `runOnce()` est public afin que
 * l'exploitation, un test ou un futur job BullMQ l'appellent directement. La
 * bascule consistera à remplacer le `setInterval` par un job répétable, sans
 * toucher à la logique.
 *
 * Deux garde-fous :
 *   * délai de rétractation (`DOCUMENTS_PURGE_GRACE_HOURS`, 24 h par défaut) ;
 *   * la LIGNE `documents` n'est jamais supprimée — `lease_documents` et
 *     `inspection_photos` la référencent en `ON DELETE RESTRICT`. Seul l'objet
 *     stocké disparaît ; la fiche reste en pierre tombale, horodatée dans
 *     `metadata.purgedAt`.
 */
@Injectable()
export class DocumentPurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentPurgeService.name);
  private timer: NodeJS.Timeout | null = null;
  private admin: PrismaClient | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('DOCUMENTS_PURGE_ENABLED') || this.config.isTest) return;

    const intervalMs = this.config.get('DOCUMENTS_PURGE_INTERVAL_SECONDS') * 1000;
    this.timer = setInterval(() => {
      void this.runOnce().catch((error) =>
        this.logger.warn(`Purge des documents en échec : ${(error as Error).message}`),
      );
    }, intervalMs);
    // Sans `unref`, l'intervalle maintiendrait le processus en vie.
    this.timer.unref();
    this.logger.log(`Purge des documents planifiée toutes les ${intervalMs / 1000} s.`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.admin) await this.admin.$disconnect();
  }

  /**
   * Un passage de purge. Idempotent et sans verrou distribué : reprendre un
   * objet déjà détruit est sans effet (`deleteObject` est idempotent) et la
   * pierre tombale empêche de le retraiter au tour suivant.
   */
  async runOnce(): Promise<PurgeReport> {
    if (this.running) return { scanned: 0, purged: 0, failed: 0 };
    this.running = true;
    try {
      const candidates = await this.findCandidates();
      let purged = 0;
      let failed = 0;

      for (const candidate of candidates) {
        try {
          await this.storage.deleteObject(candidate.object_key);
          await this.markPurged(candidate);
          purged += 1;
        } catch (error) {
          failed += 1;
          this.logger.warn(`Objet ${candidate.object_key} non purgé : ${(error as Error).message}`);
        }
      }

      if (candidates.length > 0) {
        this.logger.log(`Purge : ${purged} objet(s) détruit(s), ${failed} échec(s).`);
      }
      return { scanned: candidates.length, purged, failed };
    } finally {
      this.running = false;
    }
  }

  /**
   * Recherche des candidats.
   *
   * C'est la seule lecture transverse aux organisations du module : une tâche
   * de fond n'a, par définition, pas d'organisation courante. Elle emprunte
   * donc la connexion d'administration, exactement comme
   * `TenantDirectoryService` le fait pour les trois questions qui précèdent la
   * connaissance du tenant. Toutes les ÉCRITURES qui suivent repassent, elles,
   * par `withTenant` et donc par la RLS.
   */
  private async findCandidates(): Promise<PurgeCandidate[]> {
    const adminUrl = this.config.get('DATABASE_ADMIN_URL');
    if (!adminUrl) {
      this.logger.warn('DATABASE_ADMIN_URL absent : purge des documents désactivée.');
      return [];
    }
    if (!this.admin) {
      this.admin = new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] });
      await this.admin.$connect();
    }

    const graceHours = this.config.get('DOCUMENTS_PURGE_GRACE_HOURS');
    const batchSize = this.config.get('DOCUMENTS_PURGE_BATCH_SIZE');

    return this.admin.$queryRawUnsafe<PurgeCandidate[]>(
      `SELECT id, organization_id, object_key, file_name
         FROM documents
        WHERE deleted_at IS NOT NULL
          AND deleted_at < now() - ($1 || ' hours')::interval
          AND bucket = $2
          AND metadata->>'purgedAt' IS NULL
        ORDER BY deleted_at ASC
        LIMIT $3`,
      String(graceHours),
      this.storage.bucket,
      batchSize,
    );
  }

  /** Pierre tombale + trace d'audit, dans le contexte RLS de l'organisation. */
  private async markPurged(candidate: PurgeCandidate): Promise<void> {
    await this.prisma.withTenant(candidate.organization_id, null, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE documents
            SET metadata = metadata || jsonb_build_object('purgedAt', to_jsonb(now())),
                updated_at = now()
          WHERE id = $1::uuid`,
        candidate.id,
      );
      await this.auditService.record(tx, {
        organizationId: candidate.organization_id,
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.DOCUMENT_PURGED,
        entityType: 'documents',
        entityId: candidate.id,
        actorLabel: 'purge.documents',
        newState: toJsonState({ objectKey: candidate.object_key, fileName: candidate.file_name }),
      });
    });
  }
}
