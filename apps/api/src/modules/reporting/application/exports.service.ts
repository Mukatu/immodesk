import { Optional, Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { DocumentsService } from '../../documents/application/documents.service';
import { businessToday } from '../../../shared/time/business-date';
import { toIsoDate, parseIsoDate } from '../../leases/domain/calendar';
import { bucketForDaysOverdue, daysOverdueAt } from '../domain/arrears-buckets';
import { csvAmount, toCsvDocument, type CsvCell } from '../domain/csv';
import {
  EXPORT_KINDS,
  type ExportDashboardKind,
  type ExportKind,
} from '../presentation/dto/reporting.dto';
import {
  EXPORT_STATUS_FALLBACKS,
  type ExportStatusFallback,
} from '../../../shared/exports/export-status-fallback.port';
import { EXPORT_QUEUE, type ExportQueuePort } from '../domain/export-queue.port';
import { ArrearsDashboardService } from './arrears-dashboard.service';
import { CollectionRateDashboardService } from './collection-rate-dashboard.service';
import { PaymentMethodsDashboardService } from './payment-methods-dashboard.service';
import { VacancyDashboardService } from './vacancy-dashboard.service';

export interface ExportFilters {
  from?: string;
  to?: string;
  asOf?: string;
  propertyId?: string;
  landlordId?: string;
  status?: string;
  method?: string;
  dashboardKind?: ExportDashboardKind;
}

export interface ExportRows {
  header: string[];
  rows: CsvCell[][];
}

export type ExportOutcome =
  | { sync: true; documentId: string; downloadUrl: string; expiresAt: string; rowCount: number }
  | { sync: false; jobId: string };

export interface ExportJobStatusView {
  status: 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  documentId?: string;
  downloadUrl?: string;
  expiresAt?: string;
  rowCount?: number;
  error?: string;
}

interface InvoiceExportRow {
  invoice_number: string;
  tenant_name: string;
  property_name: string;
  unit_code: string;
  period_start: Date;
  period_end: Date;
  due_date: Date;
  status: string;
  total_amount: bigint;
  paid_amount: bigint;
  balance_amount: bigint;
}

interface PaymentExportRow {
  reference: string;
  tenant_name: string | null;
  method: string;
  amount: bigint;
  payment_date: Date;
  status: string;
  property_name: string | null;
}

/**
 * Exports CSV (`POST /v1/exports/{kind}`, contrat phase 9, arbitrage 5) :
 * UTF-8 avec BOM, séparateur point-virgule, montants XAF entiers, dates ISO.
 * Rangés dans `documents` au genre `OTHER` (aucun genre d'export n'existe
 * dans `document_kind`) ; aucune table `exports` n'est créée.
 *
 * Synchrone jusqu'à `EXPORT_SYNC_ROW_LIMIT` lignes ; au-delà, un travail de
 * fond (`EXPORT_QUEUE`, BullMQ) rejoue exactement la même construction de
 * lignes — `buildAndStore` est le point d'entrée commun aux deux chemins.
 */
@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly documents: DocumentsService,
    private readonly auditService: AuditService,
    private readonly arrears: ArrearsDashboardService,
    private readonly collectionRate: CollectionRateDashboardService,
    private readonly vacancy: VacancyDashboardService,
    private readonly paymentMethods: PaymentMethodsDashboardService,
    @Inject(EXPORT_QUEUE) private readonly queue: ExportQueuePort,
    // Files d autres modules (phase 11 : exports de conformite). Optionnel :
    // aucun module producteur n est requis pour que les exports CSV marchent.
    @Optional()
    @Inject(EXPORT_STATUS_FALLBACKS)
    private readonly fallbacks: ExportStatusFallback[] | null = null,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    kind: string,
    filters: ExportFilters,
  ): Promise<ExportOutcome> {
    const validKind = assertExportKind(kind);
    if (validKind === 'dashboard' && !filters.dashboardKind) {
      throw new DomainError('EXPORTS.DASHBOARD_KIND_INVALID', { kind });
    }

    const fileName = exportFileName(validKind, filters);
    const { header, rows } = await this.buildRows(organizationId, userId, validKind, filters);

    if (rows.length <= this.config.get('EXPORT_SYNC_ROW_LIMIT')) {
      const stored = await this.storeCsv(organizationId, userId, fileName, header, rows);
      return { sync: true, ...stored, rowCount: rows.length };
    }

    // Au-delà du seuil : le travail de fond REFAIT la même requête (les
    // filtres suffisent à la reproduire), plutôt que de faire transiter des
    // dizaines de milliers de lignes déjà en mémoire à travers la file.
    const { jobId } = await this.queue.enqueue({
      organizationId,
      userId,
      kind: validKind,
      fileName,
      filters,
    });
    return { sync: false, jobId };
  }

  /**
   * Un identifiant de travail n'est pas un secret suffisant pour traverser
   * les organisations : un job d'une autre organisation est traité comme
   * introuvable (404, jamais 403 — même convention que pour un document).
   */
  async jobStatus(organizationId: string, jobId: string): Promise<ExportJobStatusView> {
    let view: Awaited<ReturnType<ExportQueuePort['status']>> = await this.queue.status(jobId);
    // Le contrat interdit une route de suivi jumelle : les travaux des autres
    // modules se consultent donc ICI (voir le port partage).
    if (!view) {
      for (const fallback of this.fallbacks ?? []) {
        const found = await fallback.status(jobId);
        if (found) {
          view = found;
          break;
        }
      }
    }
    if (!view || view.organizationId !== organizationId) {
      throw new DomainError('EXPORTS.JOB_NOT_FOUND', { jobId });
    }
    return {
      status: view.status,
      documentId: view.result?.documentId,
      downloadUrl: view.result?.downloadUrl,
      expiresAt: view.result?.expiresAt,
      rowCount: view.result?.rowCount,
      error: view.error,
    };
  }

  /**
   * Appelé par le travail de fond (`infrastructure/export-worker.ts`) : rejoue
   * la construction des lignes puis range le CSV. Identique au chemin
   * synchrone, à ceci près que le nombre de lignes n'est plus revérifié
   * contre le seuil — un export déjà en file va à son terme.
   */
  async buildAndStore(
    organizationId: string,
    userId: string,
    kind: ExportKind,
    fileName: string,
    filters: ExportFilters,
  ): Promise<{ documentId: string; downloadUrl: string; expiresAt: string; rowCount: number }> {
    const { header, rows } = await this.buildRows(organizationId, userId, kind, filters);
    const stored = await this.storeCsv(organizationId, userId, fileName, header, rows);
    return { ...stored, rowCount: rows.length };
  }

  private async storeCsv(
    organizationId: string,
    userId: string,
    fileName: string,
    header: string[],
    rows: CsvCell[][],
  ): Promise<{ documentId: string; downloadUrl: string; expiresAt: string }> {
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
        fileName,
        mimeType: 'text/csv',
      }),
    );

    const ttlSeconds = this.config.get('EXPORT_LINK_TTL_SECONDS');
    const { downloadUrl, expiresAt } = await this.documents.createDownloadUrl(
      organizationId,
      userId,
      document.id,
      ttlSeconds,
    );

    await this.prisma.withTenant(organizationId, userId, (tx) =>
      audit(this.auditService, tx, {
        action: 'EXPORT',
        operation: AUDIT_OPERATIONS.EXPORT_GENERATED,
        entityType: 'documents',
        entityId: document.id,
        newState: toJsonState({ fileName, rowCount: rows.length }),
      }),
    );

    return { documentId: document.id, downloadUrl, expiresAt };
  }

  private async buildRows(
    organizationId: string,
    userId: string,
    kind: ExportKind,
    filters: ExportFilters,
  ): Promise<ExportRows> {
    switch (kind) {
      case 'invoices':
        return this.buildInvoiceRows(organizationId, userId, filters);
      case 'payments':
        return this.buildPaymentRows(organizationId, userId, filters);
      case 'arrears':
        return this.buildArrearsRows(organizationId, userId, filters);
      case 'dashboard':
        return this.buildDashboardRows(organizationId, userId, filters);
    }
  }

  private async buildInvoiceRows(
    organizationId: string,
    userId: string,
    filters: ExportFilters,
  ): Promise<ExportRows> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<InvoiceExportRow[]>(
        `SELECT ri.invoice_number,
                coalesce(t.company_name, concat_ws(' ', t.first_name, t.last_name)) AS tenant_name,
                p.name AS property_name, u.code AS unit_code,
                ri.period_start, ri.period_end, ri.due_date, ri.status::text AS status,
                ri.total_amount, ri.paid_amount, ri.balance_amount
           FROM rent_invoices ri
           JOIN tenants t ON t.id = ri.tenant_id
           JOIN units u ON u.id = ri.unit_id
           JOIN properties p ON p.id = ri.property_id
          WHERE ri.organization_id = $1::uuid
            AND ($2::date IS NULL OR ri.period_start >= $2::date)
            AND ($3::date IS NULL OR ri.period_start <= $3::date)
            AND ($4::uuid IS NULL OR ri.property_id = $4::uuid)
            AND ($5::uuid IS NULL OR ri.landlord_id = $5::uuid)
            AND ($6::text IS NULL OR ri.status::text = $6::text)
          ORDER BY ri.period_start, ri.invoice_number`,
        organizationId,
        filters.from ?? null,
        filters.to ?? null,
        filters.propertyId ?? null,
        filters.landlordId ?? null,
        filters.status ?? null,
      ),
    );
    return {
      header: [
        'Numero',
        'Locataire',
        'Immeuble',
        'Lot',
        'Debut periode',
        'Fin periode',
        'Echeance',
        'Statut',
        'Montant total',
        'Montant encaisse',
        'Solde',
      ],
      rows: rows.map((r) => [
        r.invoice_number,
        r.tenant_name,
        r.property_name,
        r.unit_code,
        toIsoDate(r.period_start),
        toIsoDate(r.period_end),
        toIsoDate(r.due_date),
        r.status,
        csvAmount(r.total_amount),
        csvAmount(r.paid_amount),
        csvAmount(r.balance_amount),
      ]),
    };
  }

  private async buildPaymentRows(
    organizationId: string,
    userId: string,
    filters: ExportFilters,
  ): Promise<ExportRows> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<PaymentExportRow[]>(
        `SELECT pm.reference,
                coalesce(t.company_name, concat_ws(' ', t.first_name, t.last_name)) AS tenant_name,
                pm.method::text AS method, pm.amount, pm.payment_date, pm.status::text AS status,
                p.name AS property_name
           FROM payments pm
           LEFT JOIN tenants t ON t.id = pm.tenant_id
           LEFT JOIN leases l ON l.id = pm.lease_id
           LEFT JOIN properties p ON p.id = l.property_id
          WHERE pm.organization_id = $1::uuid
            AND ($2::date IS NULL OR pm.payment_date >= $2::date)
            AND ($3::date IS NULL OR pm.payment_date <= $3::date)
            AND ($4::uuid IS NULL OR l.property_id = $4::uuid)
            AND ($5::uuid IS NULL OR pm.landlord_id = $5::uuid)
            AND ($6::text IS NULL OR pm.method::text = $6::text)
          ORDER BY pm.payment_date, pm.reference`,
        organizationId,
        filters.from ?? null,
        filters.to ?? null,
        filters.propertyId ?? null,
        filters.landlordId ?? null,
        filters.method ?? null,
      ),
    );
    return {
      header: ['Reference', 'Locataire', 'Methode', 'Montant', 'Date', 'Statut', 'Immeuble'],
      rows: rows.map((r) => [
        r.reference,
        r.tenant_name ?? '',
        r.method,
        csvAmount(r.amount),
        toIsoDate(r.payment_date),
        r.status,
        r.property_name ?? '',
      ]),
    };
  }

  private async buildArrearsRows(
    organizationId: string,
    userId: string,
    filters: ExportFilters,
  ): Promise<ExportRows> {
    const asOf = filters.asOf ? parseIsoDate(filters.asOf) : businessToday();
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.arrears.unpaidInvoiceRows(
        tx,
        organizationId,
        toIsoDate(asOf),
        filters.propertyId,
        filters.landlordId,
      ),
    );
    return {
      header: [
        'Facture',
        'Locataire',
        'Telephone',
        'Immeuble',
        'Lot',
        'Echeance',
        'Jours de retard',
        'Tranche',
        'Solde',
      ],
      rows: rows.map((r) => {
        const days = daysOverdueAt(r.due_date, asOf);
        return [
          r.invoice_number,
          r.tenant_name,
          r.tenant_phone,
          r.property_name,
          r.unit_code,
          toIsoDate(r.due_date),
          days,
          bucketForDaysOverdue(days),
          csvAmount(r.balance_amount),
        ];
      }),
    };
  }

  /**
   * Export « dashboard » : chaque `dashboardKind` exporte sa répartition la
   * plus tabulaire — la série mensuelle pour le recouvrement, les tranches
   * pour les impayés (le détail ligne à ligne existe déjà via
   * `kind = arrears`), la répartition par immeuble pour la vacance, par mode
   * pour les encaissements.
   */
  private async buildDashboardRows(
    organizationId: string,
    userId: string,
    filters: ExportFilters,
  ): Promise<ExportRows> {
    switch (filters.dashboardKind) {
      case 'collection-rate': {
        const view = await this.collectionRate.get(organizationId, userId, filters);
        return {
          header: ['Mois', 'Montant du', 'Montant encaisse', 'Taux (bps)'],
          rows: view.series.map((s) => [
            s.period,
            csvAmount(s.dueAmount),
            csvAmount(s.collectedAmount),
            s.collectionRateBps,
          ]),
        };
      }
      case 'arrears': {
        const view = await this.arrears.get(organizationId, userId, filters);
        return {
          header: ['Tranche', 'Montant', 'Nombre de factures'],
          rows: view.buckets.map((b) => [b.label, csvAmount(b.amount), b.invoicesCount]),
        };
      }
      case 'vacancy': {
        const view = await this.vacancy.get(organizationId, userId, filters);
        return {
          header: ['Immeuble', 'Nombre de lots', 'Lots vacants', 'Taux de vacance (bps)'],
          rows: view.byProperty.map((p) => [p.name, p.unitsCount, p.vacantCount, p.vacancyRateBps]),
        };
      }
      case 'payment-methods': {
        const view = await this.paymentMethods.get(organizationId, userId, filters);
        return {
          header: ['Mode', 'Montant', 'Part (bps)', 'Nombre'],
          rows: view.byMethod.map((m) => [m.method, csvAmount(m.amount), m.shareBps, m.count]),
        };
      }
      default:
        throw new DomainError('EXPORTS.DASHBOARD_KIND_INVALID', { filters });
    }
  }
}

function assertExportKind(kind: string): ExportKind {
  if ((EXPORT_KINDS as readonly string[]).includes(kind)) return kind as ExportKind;
  throw new DomainError('EXPORTS.KIND_INVALID', { kind });
}

/** `impayes-2026-09.csv` (contrat, § « Exports ») : libellé + mois de la période demandée. */
function exportFileName(kind: ExportKind, filters: ExportFilters): string {
  const labels: Record<ExportKind, string> = {
    invoices: 'factures',
    payments: 'encaissements',
    arrears: 'impayes',
    dashboard: `tableau-${filters.dashboardKind ?? 'export'}`,
  };
  const stamp = filters.to ?? filters.asOf ?? toIsoDate(businessToday());
  const period = stamp.slice(0, 7);
  return `${labels[kind]}-${period}.csv`;
}
