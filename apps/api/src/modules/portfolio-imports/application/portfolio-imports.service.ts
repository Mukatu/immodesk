import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import { tenantStorage } from '../../../shared/tenant/tenant-context';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { DocumentsService } from '../../documents/application/documents.service';
import { LeasesService } from '../../leases/application/leases.service';
import { LandlordsService } from '../../parties/application/landlords.service';
import { TenantsService } from '../../parties/application/tenants.service';
import { PropertiesService } from '../../portfolio/application/properties.service';
import { UnitsService } from '../../portfolio/application/units.service';
import { toCsvDocument } from '../../reporting/domain/csv';
import {
  buildLandlordRow,
  buildLeaseRow,
  buildPropertyRow,
  buildTenantRow,
  buildUnitRow,
  parseImportRows,
  RowRejected,
  type RawImportRow,
} from '../domain/import-rows';
import {
  IMPORT_QUEUE,
  type ImportJobResult,
  type ImportQueuePort,
  type ImportRejectionView,
} from '../domain/import-queue.port';

/**
 * Champs de `ImportJobResult` remontés À PLAT (pas sous une clé `result`) :
 * c'est le contrat exact de `ImportReportDto`
 * (`presentation/dto/portfolio-imports.dto.ts`), lu tel quel par
 * `GET /v1/portfolio-imports/{jobId}`.
 */
export interface ImportStatusView extends Partial<ImportJobResult> {
  status: 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  error?: string;
}

const ALLOWED_MIME_TYPES = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];

/** Références locales créées, résolues au fil du fichier (ordre imposé par le contrat). */
interface RefMaps {
  landlordRefs: Map<string, string>;
  propertyRefs: Map<string, string>;
  unitRefs: Map<string, string>;
  tenantRefs: Map<string, string>;
}

/**
 * Import de portefeuille (contrat phase 10, § « Import de portefeuille »,
 * arbitrage n°3) : AUCUNE table dédiée, reprend exactement le mécanisme des
 * exports de la phase 9 — `202 { jobId }`, état consultable, fichier et
 * rapport rangés dans `documents` au genre `OTHER`. Chaque ligne valide crée
 * son entité via le service EXISTANT du domaine concerné (`LandlordsService`,
 * `PropertiesService`, `UnitsService`, `TenantsService`, `LeasesService`) —
 * aucune logique de création n'est dupliquée ici.
 */
@Injectable()
export class PortfolioImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly documents: DocumentsService,
    private readonly auditService: AuditService,
    private readonly landlords: LandlordsService,
    private readonly tenants: TenantsService,
    private readonly properties: PropertiesService,
    private readonly units: UnitsService,
    private readonly leases: LeasesService,
    private readonly directory: TenantDirectoryService,
    @Inject(IMPORT_QUEUE) private readonly queue: ImportQueuePort,
  ) {}

  /**
   * TOUS les contrôles avant mise en file : format, taille, nombre de lignes.
   * Le contenu n'est PAS transmis à la file — le travail de fond relit le
   * document par son identifiant (même principe que `ExportsService`).
   */
  async create(
    organizationId: string,
    userId: string,
    documentId: string,
  ): Promise<{ jobId: string }> {
    if (await this.queue.hasRunning(organizationId)) {
      throw new DomainError('IMPORTS.ALREADY_RUNNING');
    }

    const { buffer, mimeType } = await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.documents.readContent(tx, documentId),
    );
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new DomainError('IMPORTS.FILE_INVALID', { documentId, mimeType });
    }

    const rows = parseImportRows(buffer);
    if (rows.length === 0) throw new DomainError('IMPORTS.FILE_INVALID', { documentId });
    const maxRows = this.config.get('PORTFOLIO_IMPORT_MAX_ROWS');
    if (rows.length > maxRows) {
      throw new DomainError('IMPORTS.TOO_MANY_ROWS', { rows: rows.length, maxRows });
    }

    return this.queue.enqueue({ organizationId, userId, documentId });
  }

  /**
   * Un identifiant de job n'est pas un secret suffisant pour traverser les
   * organisations : un job d'une autre organisation est introuvable (404).
   */
  async jobStatus(organizationId: string, jobId: string): Promise<ImportStatusView> {
    const view = await this.queue.status(jobId);
    if (!view || view.organizationId !== organizationId) {
      throw new DomainError('IMPORTS.JOB_NOT_FOUND', { jobId });
    }
    return { status: view.status, ...view.result, error: view.error };
  }

  /**
   * Corps du travail de fond (`infrastructure/import-worker.ts`) : relit le
   * document, traite CHAQUE ligne dans sa PROPRE transaction (« cinq cents
   * lignes dont vingt fautives produisent quatre cent quatre-vingts créations
   * effectives », critère d'acceptation du contrat), puis range le rapport.
   *
   * Appelé depuis un WORKER BullMQ, jamais une requête HTTP : aucun
   * `TenantContextInterceptor` n'ouvre le contexte `AsyncLocalStorage` ici.
   * Or `LandlordsService.create`, `PropertiesService.create`, etc. (services
   * HTTP existants, réutilisés tels quels par contrat) journalisent chacun
   * via `audit()` en s'appuyant implicitement sur ce contexte pour
   * `actorRole`/`requestId` — et `audit()` EXIGE au moins `organizationId`
   * (voir sa docstring). Ce service ouvre donc lui-même le contexte, avec le
   * rôle réellement détenu par `userId` dans `organizationId` (celui qui a
   * déjà passé la garde `@Roles('OWNER','MANAGER')` de `create()`).
   */
  async run(organizationId: string, userId: string, documentId: string): Promise<ImportJobResult> {
    const memberships = await this.directory.listActiveMemberships(userId);
    const membership = memberships.find((m) => m.organizationId === organizationId);
    if (!membership) {
      throw new DomainError('ORG.NOT_MEMBER', { organizationId });
    }

    return tenantStorage.run(
      { organizationId, userId, role: membership.role, membershipId: membership.membershipId },
      () => this.runWithinTenantContext(organizationId, userId, documentId),
    );
  }

  private async runWithinTenantContext(
    organizationId: string,
    userId: string,
    documentId: string,
  ): Promise<ImportJobResult> {
    const { buffer } = await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.documents.readContent(tx, documentId),
    );
    const rows = parseImportRows(buffer);

    const refs: RefMaps = {
      landlordRefs: new Map(),
      propertyRefs: new Map(),
      unitRefs: new Map(),
      tenantRefs: new Map(),
    };
    const rejected: ImportRejectionView[] = [];
    let createdCount = 0;

    for (const row of rows) {
      try {
        await this.processRow(organizationId, userId, row, refs);
        createdCount += 1;
      } catch (error) {
        rejected.push({ line: row.line, reason: reasonOf(error) });
      }
    }

    return this.storeReport(organizationId, userId, {
      totalRows: rows.length,
      createdCount,
      rejected,
    });
  }

  /**
   * Dispatch par type de ligne. Chaque branche appelle le service EXISTANT
   * du domaine concerné — la transaction de `withTenant` qu'il ouvre lui est
   * propre, ce qui réalise directement l'exigence « transactionnelle par
   * ligne, pas par fichier ».
   */
  private async processRow(
    organizationId: string,
    userId: string,
    row: RawImportRow,
    refs: RefMaps,
  ): Promise<void> {
    switch (row.type) {
      case 'BAILLEUR': {
        const parsed = buildLandlordRow(row.fields);
        const created = await this.landlords.create(organizationId, userId, parsed.input);
        refs.landlordRefs.set(parsed.localRef, created.id);
        return;
      }
      case 'BIEN': {
        const parsed = buildPropertyRow(row.fields);
        const landlordId = refs.landlordRefs.get(parsed.landlordRef);
        if (!landlordId) {
          throw new RowRejected(
            `Bailleur de référence « ${parsed.landlordRef} » introuvable dans le fichier.`,
          );
        }
        const created = await this.properties.create(organizationId, userId, {
          ...parsed.input,
          landlordId,
        });
        refs.propertyRefs.set(parsed.localRef, created.id);
        return;
      }
      case 'LOT': {
        const parsed = buildUnitRow(row.fields);
        const propertyId = refs.propertyRefs.get(parsed.propertyRef);
        if (!propertyId) {
          throw new RowRejected(
            `Bien de référence « ${parsed.propertyRef} » introuvable dans le fichier.`,
          );
        }
        const created = await this.units.create(organizationId, userId, propertyId, parsed.input);
        refs.unitRefs.set(parsed.localRef, created.id);
        return;
      }
      case 'LOCATAIRE': {
        const parsed = buildTenantRow(row.fields);
        const created = await this.tenants.create(organizationId, userId, parsed.input);
        refs.tenantRefs.set(parsed.localRef, created.id);
        return;
      }
      case 'BAIL': {
        const parsed = buildLeaseRow(row.fields);
        const unitId = refs.unitRefs.get(parsed.unitRef);
        const tenantId = refs.tenantRefs.get(parsed.tenantRef);
        if (!unitId) {
          throw new RowRejected(
            `Lot de référence « ${parsed.unitRef} » introuvable dans le fichier.`,
          );
        }
        if (!tenantId) {
          throw new RowRejected(
            `Locataire de référence « ${parsed.tenantRef} » introuvable dans le fichier.`,
          );
        }
        await this.leases.create(organizationId, userId, {
          ...parsed.input,
          unitId,
          primaryTenantId: tenantId,
        });
        return;
      }
      default:
        throw new RowRejected(`Type de ligne inconnu : « ${row.type} ».`);
    }
  }

  /**
   * Rapport final rangé dans `documents` (genre `OTHER`), même mécanique que
   * `ExportsService.storeCsv` : dépôt de l'objet, fiche, lien signé, audit.
   */
  private async storeReport(
    organizationId: string,
    userId: string,
    summary: { totalRows: number; createdCount: number; rejected: ImportRejectionView[] },
  ): Promise<ImportJobResult> {
    const header = ['Ligne', 'Motif du rejet'];
    const rows = summary.rejected.map((r) => [r.line, r.reason]);
    const csv = toCsvDocument(header, rows);
    const body = Buffer.from(csv, 'utf8');

    const stored = await this.documents.storeGeneratedObject(organizationId, {
      kind: 'OTHER',
      mimeType: 'text/csv',
      body,
    });
    const document = await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.documents.registerStoredObject(tx, organizationId, userId, stored, {
        kind: 'OTHER',
        fileName: 'import-portefeuille-rapport.csv',
        mimeType: 'text/csv',
      }),
    );
    const { downloadUrl, expiresAt } = await this.documents.createDownloadUrl(
      organizationId,
      userId,
      document.id,
      this.config.get('EXPORT_LINK_TTL_SECONDS'),
    );

    await this.prisma.withTenant(organizationId, userId, (tx) =>
      audit(this.auditService, tx, {
        organizationId,
        actorUserId: userId,
        action: 'IMPORT',
        operation: AUDIT_OPERATIONS.PORTFOLIO_IMPORT_COMPLETED,
        entityType: 'documents',
        entityId: document.id,
        newState: toJsonState({
          totalRows: summary.totalRows,
          createdCount: summary.createdCount,
          rejectedCount: summary.rejected.length,
        }),
      }),
    );

    return {
      totalRows: summary.totalRows,
      createdCount: summary.createdCount,
      rejectedCount: summary.rejected.length,
      rejected: summary.rejected,
      documentId: document.id,
      downloadUrl,
      expiresAt,
    };
  }
}

function reasonOf(error: unknown): string {
  if (error instanceof DomainError) return `${error.code} : ${error.message}`;
  if (error instanceof Error) return error.message;
  return 'Erreur inattendue.';
}
