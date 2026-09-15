import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  TenantDirectoryService,
  type LandlordLinkRow,
} from '../../../shared/prisma/tenant-directory.service';
import { DocumentsService } from '../../documents/application/documents.service';
import {
  toStatementSummaryView,
  type OwnerStatementJoinedRow,
  type StatementSummaryView,
} from '../../owner-statements/application/owner-statement-views';
import { paginateMerged, type CrossOrgPage } from './cross-org-page';
import {
  toPortalCollectionView,
  toPortalMeView,
  toPortalPayoutView,
  toPortalReceiptView,
  type PortalCollectionRow,
  type PortalCollectionView,
  type PortalLandlordRow,
  type PortalMeView,
  type PortalPayoutRow,
  type PortalPayoutView,
  type PortalReceiptRow,
  type PortalReceiptView,
} from './portal-views';

const STATEMENT_SELECT = `
  s.*,
  l.party_type   AS landlord_party_type,
  l.first_name   AS landlord_first_name,
  l.last_name    AS landlord_last_name,
  l.company_name AS landlord_company_name,
  p.name         AS property_name`;

/**
 * Lectures du portail bailleur : boucle sur chaque organisation où l'appelant
 * est lié comme bailleur (`TenantDirectoryService.listLandlordLinks`, seule
 * façon de connaître ces organisations puisque `landlords` est sous RLS),
 * ouvre `withTenant` pour CHACUNE, puis fusionne (voir `cross-org-page.ts`).
 * `TenantDirectoryService` n'est PAS réutilisé pour ces lectures : il ne
 * répond qu'aux questions transverses aux organisations, jamais aux données
 * métier elles-mêmes, qui restent lues sous le rôle applicatif (RLS).
 */
@Injectable()
export class LandlordPortalQueryService {
  constructor(
    private readonly prisma: PrismaService,
    readonly directory: TenantDirectoryService,
    private readonly documents: DocumentsService,
    private readonly config: AppConfigService,
  ) {}

  private get secret(): string {
    return this.config.get('CURSOR_SECRET');
  }

  /** `GET /v1/portal/me` : fiche du premier lien (bailleur « principal ») + toutes les organisations liées. */
  async me(userId: string, links: LandlordLinkRow[]): Promise<PortalMeView> {
    const primary = links[0];
    const landlord = (await this.prisma.withTenant(primary.organizationId, userId, (tx) =>
      tx.landlords.findUniqueOrThrow({
        where: { id: primary.landlordId },
        select: {
          id: true,
          party_type: true,
          first_name: true,
          last_name: true,
          company_name: true,
          primary_phone: true,
          email: true,
          country_code: true,
          payout_method: true,
        },
      }),
    )) as PortalLandlordRow;
    return toPortalMeView(landlord, links);
  }

  /** `GET /v1/portal/statements` : tri `period_start DESC`, troncature en mémoire après fusion (voir `cross-org-page.ts`). */
  async statements(
    userId: string,
    links: LandlordLinkRow[],
    limit: number | undefined,
    cursor: string | undefined,
  ): Promise<CrossOrgPage<StatementSummaryView>> {
    const perOrg = await Promise.all(
      links.map((link) =>
        this.prisma.withTenant(link.organizationId, userId, (tx) =>
          tx.$queryRawUnsafe<OwnerStatementJoinedRow[]>(
            `SELECT ${STATEMENT_SELECT}
               FROM owner_statements s
               JOIN landlords l ON l.id = s.landlord_id
               LEFT JOIN properties p ON p.id = s.property_id
              WHERE s.landlord_id = $1::uuid
              ORDER BY s.period_start DESC`,
            link.landlordId,
          ),
        ),
      ),
    );
    const rows = perOrg.flat().map((row) => ({ ...row, sortAt: row.period_start }));
    const page = paginateMerged(rows, limit, cursor, this.secret);
    return { items: page.items.map(toStatementSummaryView), pageInfo: page.pageInfo };
  }

  /**
   * `GET /v1/portal/statements/{id}/pdf` : étanchéité — le relevé doit
   * appartenir à l'UN des liens de l'appelant, sinon 404 générique, jamais
   * de distinction observable entre « n'existe pas » et « appartient à un
   * autre bailleur ».
   */
  async statementPdf(
    userId: string,
    links: LandlordLinkRow[],
    statementId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    for (const link of links) {
      const found = await this.prisma.withTenant(link.organizationId, userId, (tx) =>
        tx.owner_statements.findFirst({
          where: { id: statementId, landlord_id: link.landlordId },
          select: { document_id: true },
        }),
      );
      if (!found) continue;
      if (!found.document_id) {
        throw new DomainError('AGENCY.STATEMENT_PDF_UNAVAILABLE', { statementId });
      }
      return this.documents.createDownloadUrl(link.organizationId, userId, found.document_id);
    }
    throw new DomainError('AGENCY.STATEMENT_NOT_FOUND', { statementId });
  }

  /** `GET /v1/portal/payouts` : lecture directe de `owner_payouts`, la table existe déjà. */
  async payouts(
    userId: string,
    links: LandlordLinkRow[],
    limit: number | undefined,
    cursor: string | undefined,
  ): Promise<CrossOrgPage<PortalPayoutView>> {
    const perOrg = await Promise.all(
      links.map((link) =>
        this.prisma.withTenant(link.organizationId, userId, (tx) =>
          tx.$queryRawUnsafe<PortalPayoutRow[]>(
            `SELECT id, reference, status, method, amount, net_amount, paid_at, created_at
               FROM owner_payouts
              WHERE landlord_id = $1::uuid
              ORDER BY created_at DESC`,
            link.landlordId,
          ),
        ),
      ),
    );
    const rows = perOrg.flat().map((row) => ({ ...row, sortAt: row.created_at }));
    const page = paginateMerged(rows, limit, cursor, this.secret);
    return { items: page.items.map(toPortalPayoutView), pageInfo: page.pageInfo };
  }

  /**
   * `GET /v1/portal/collections` : `payment_allocations` JOIN `payments`
   * (CONFIRMED/INBOUND) JOIN `rent_invoices` (`landlord_id` de ce bailleur) —
   * `rent_invoices.landlord_id` porte déjà le rattachement direct, pas besoin
   * de repasser par `leases`. Tri par ligne d'imputation (`allocation_id`) :
   * un paiement réparti sur plusieurs factures du même bailleur apparaît
   * alors une fois par imputation (cas rare, assumé, plus simple qu'une
   * dé-duplication par paiement).
   */
  async collections(
    userId: string,
    links: LandlordLinkRow[],
    from: string | undefined,
    to: string | undefined,
    limit: number | undefined,
    cursor: string | undefined,
  ): Promise<CrossOrgPage<PortalCollectionView>> {
    const perOrg = await Promise.all(
      links.map((link) =>
        this.prisma.withTenant(link.organizationId, userId, (tx) =>
          tx.$queryRawUnsafe<PortalCollectionRow[]>(
            `SELECT pa.id AS allocation_id, p.id AS payment_id, p.payment_date, p.method, pa.amount,
                    t.id AS tenant_id, t.party_type AS tenant_party_type,
                    t.first_name AS tenant_first_name, t.last_name AS tenant_last_name,
                    t.company_name AS tenant_company_name,
                    u.id AS unit_id, u.code AS unit_code, ri.invoice_number
               FROM payment_allocations pa
               JOIN payments p ON p.id = pa.payment_id
               JOIN rent_invoices ri ON ri.id = pa.invoice_id
               JOIN tenants t ON t.id = ri.tenant_id
               JOIN units u ON u.id = ri.unit_id
              WHERE ri.landlord_id = $1::uuid
                AND p.status = 'CONFIRMED' AND p.direction = 'INBOUND'
                AND ($2::date IS NULL OR p.payment_date >= $2::date)
                AND ($3::date IS NULL OR p.payment_date <= $3::date)
              ORDER BY p.payment_date DESC`,
            link.landlordId,
            from ?? null,
            to ?? null,
          ),
        ),
      ),
    );
    const rows = perOrg
      .flat()
      .map((row) => ({ ...row, id: row.allocation_id, sortAt: row.payment_date }));
    const page = paginateMerged(rows, limit, cursor, this.secret);
    return { items: page.items.map(toPortalCollectionView), pageInfo: page.pageInfo };
  }

  /** `GET /v1/portal/receipts` : `receipts.landlord_id` est renseigné à l'émission (voir `ReceiptIssuerService`). */
  async receipts(
    userId: string,
    links: LandlordLinkRow[],
    limit: number | undefined,
    cursor: string | undefined,
  ): Promise<CrossOrgPage<PortalReceiptView>> {
    const perOrg = await Promise.all(
      links.map((link) =>
        this.prisma.withTenant(link.organizationId, userId, (tx) =>
          tx.$queryRawUnsafe<PortalReceiptRow[]>(
            `SELECT id, receipt_number, issue_date, total_amount, status, document_id
               FROM receipts
              WHERE landlord_id = $1::uuid AND status != 'CANCELLED'
              ORDER BY issue_date DESC`,
            link.landlordId,
          ),
        ),
      ),
    );
    const rows = perOrg.flat().map((row) => ({ ...row, sortAt: row.issue_date }));
    const page = paginateMerged(rows, limit, cursor, this.secret);
    return { items: page.items.map(toPortalReceiptView), pageInfo: page.pageInfo };
  }
}
