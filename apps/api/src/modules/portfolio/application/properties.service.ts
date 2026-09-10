import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { sqlSearchClause, toLikePattern } from '../../../shared/search/search-text';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { LandlordsService } from '../../parties/application/landlords.service';
import { normalizeOptionalPhone, trimOrNull } from '../../parties/domain/party-rules';
import { computeOccupancy, type Occupancy } from '../domain/occupancy';
import {
  toPropertySummary,
  toPropertyView,
  type PropertyRow,
  type PropertySummaryView,
  type PropertyView,
} from './portfolio-views';

export interface PropertyInput {
  landlordId?: string;
  code?: string | null;
  name?: string;
  propertyType?: string;
  addressLine?: string;
  district?: string;
  arrondissement?: string | null;
  landmark?: string | null;
  city?: string;
  countryCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  landTitleReference?: string | null;
  parcelNumber?: string | null;
  builtYear?: number | null;
  totalAreaSqm?: number | null;
  floorsCount?: number | null;
  hasWater?: boolean;
  hasElectricity?: boolean;
  hasBorehole?: boolean;
  caretakerName?: string | null;
  caretakerPhone?: string | null;
  coverDocumentId?: string | null;
  notes?: string | null;
}

const PROPERTY_SEARCH_COLUMNS = ['p.name', 'p.code', 'p.district', 'p.landmark', 'p.address_line'];

/** Colonnes du bailleur reprises dans `PropertySummary`. */
const LANDLORD_JOIN = `
  l.party_type    AS landlord_party_type,
  l.first_name    AS landlord_first_name,
  l.last_name     AS landlord_last_name,
  l.company_name  AS landlord_company_name,
  l.primary_phone AS landlord_primary_phone,
  l.is_self       AS landlord_is_self`;

/** Compteurs d'occupation, calculés en SQL pour éviter le N+1. */
const OCCUPANCY_JOIN = `
  (SELECT count(*) FROM units u WHERE u.property_id = p.id AND u.deleted_at IS NULL) AS units_total,
  (SELECT count(*) FROM units u WHERE u.property_id = p.id AND u.deleted_at IS NULL
     AND u.status = 'OCCUPIED') AS units_occupied,
  (SELECT count(*) FROM units u WHERE u.property_id = p.id AND u.deleted_at IS NULL
     AND u.status = 'AVAILABLE') AS units_available`;

type SummaryRow = PropertyRow & {
  landlord_party_type: string;
  landlord_first_name: string | null;
  landlord_last_name: string | null;
  landlord_company_name: string | null;
  landlord_primary_phone: string;
  landlord_is_self: boolean;
  units_total: bigint;
  units_occupied: bigint;
  units_available: bigint;
};

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
    private readonly landlords: LandlordsService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: PropertyInput,
  ): Promise<PropertyView> {
    const id = newId();
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.landlords.require(tx, input.landlordId ?? '');
      await this.assertCodeFree(tx, trimOrNull(input.code), null);

      const created = (await tx.properties.create({
        data: {
          id,
          organization_id: organizationId,
          landlord_id: input.landlordId as string,
          name: (input.name ?? '').trim(),
          address_line: (input.addressLine ?? '').trim(),
          district: (input.district ?? '').trim(),
          units_count: 0,
          ...this.toColumns(input),
        },
      })) as unknown as PropertyRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.PROPERTY_CREATED,
        entityType: 'properties',
        entityId: id,
        newState: toJsonState(toPropertyView(created)),
      });
      return toPropertyView(created);
    });
  }

  async list(
    organizationId: string,
    userId: string,
    filters: { q?: string; landlordId?: string; city?: string; limit?: number; cursor?: string },
  ): Promise<Page<PropertySummaryView>> {
    const conditions = ['p.organization_id = $1::uuid', 'p.deleted_at IS NULL'];
    const params: unknown[] = [organizationId];

    if (filters.q?.trim()) {
      params.push(toLikePattern(filters.q));
      conditions.push(sqlSearchClause(PROPERTY_SEARCH_COLUMNS, `$${params.length}`));
    }
    if (filters.landlordId) {
      params.push(filters.landlordId);
      conditions.push(`p.landlord_id = $${params.length}::uuid`);
    }
    if (filters.city?.trim()) {
      params.push(toLikePattern(filters.city));
      conditions.push(sqlSearchClause(['p.city'], `$${params.length}`));
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'p');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<SummaryRow[]>(
        `SELECT p.*, ${LANDLORD_JOIN}, ${OCCUPANCY_JOIN}
           FROM properties p
           JOIN landlords l ON l.id = p.landlord_id
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('p')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return {
      items: page.items.map((r) => toPropertySummary(r, occupancyOf(r))),
      pageInfo: page.pageInfo,
    };
  }

  /**
   * Implémentation du port `PropertyReader` : biens d'un bailleur, avec
   * bailleur et occupation, pour la fiche `GET /v1/landlords/{id}`.
   */
  async listSummariesForLandlord(
    tx: TenantClient,
    landlordId: string,
  ): Promise<PropertySummaryView[]> {
    const rows = await tx.$queryRawUnsafe<SummaryRow[]>(
      `SELECT p.*, ${LANDLORD_JOIN}, ${OCCUPANCY_JOIN}
         FROM properties p
         JOIN landlords l ON l.id = p.landlord_id
        WHERE p.landlord_id = $1::uuid AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC`,
      landlordId,
    );
    return rows.map((r) => toPropertySummary(r, occupancyOf(r)));
  }

  /** Occupation d'un bien : `occupés / total`, en points de base. */
  async occupancyOf(tx: TenantClient, propertyId: string): Promise<Occupancy> {
    const [row] = await tx.$queryRawUnsafe<
      Array<{ units_total: bigint; units_occupied: bigint; units_available: bigint }>
    >(
      `SELECT count(*)                                        AS units_total,
              count(*) FILTER (WHERE status = 'OCCUPIED')     AS units_occupied,
              count(*) FILTER (WHERE status = 'AVAILABLE')    AS units_available
         FROM units WHERE property_id = $1::uuid AND deleted_at IS NULL`,
      propertyId,
    );
    return occupancyOf(row ?? { units_total: 0n, units_occupied: 0n, units_available: 0n });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: PropertyInput,
  ): Promise<PropertyView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      if (input.landlordId !== undefined) await this.landlords.require(tx, input.landlordId);
      if (input.code !== undefined) await this.assertCodeFree(tx, trimOrNull(input.code), id);

      const after = (await tx.properties.update({
        where: { id },
        data: {
          ...(input.landlordId !== undefined ? { landlord_id: input.landlordId } : {}),
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.addressLine !== undefined ? { address_line: input.addressLine.trim() } : {}),
          ...(input.district !== undefined ? { district: input.district.trim() } : {}),
          ...this.toColumns(input),
          updated_at: new Date(),
        },
      })) as unknown as PropertyRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.PROPERTY_UPDATED,
        entityType: 'properties',
        entityId: id,
        previousState: toJsonState(toPropertyView(before)),
        newState: toJsonState(toPropertyView(after)),
      });
      return toPropertyView(after);
    });
  }

  async softDelete(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      const units = await tx.units.count({ where: { property_id: id, deleted_at: null } });
      if (units > 0) {
        throw new DomainError('PORTFOLIO.PROPERTY_HAS_UNITS', {
          propertyId: id,
          unitsCount: units,
        });
      }

      await tx.properties.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.PROPERTY_DELETED,
        entityType: 'properties',
        entityId: id,
        previousState: toJsonState(toPropertyView(before)),
      });
    });
  }

  async require(tx: TenantClient, id: string): Promise<PropertyRow> {
    const row = (await tx.properties.findFirst({
      where: { id, deleted_at: null },
    })) as unknown as PropertyRow | null;
    if (!row) throw new DomainError('PORTFOLIO.PROPERTY_NOT_FOUND', { propertyId: id });
    return row;
  }

  /** `properties_code_uk` est global à l'organisation, pas au bailleur. */
  private async assertCodeFree(
    tx: TenantClient,
    code: string | null,
    exceptId: string | null,
  ): Promise<void> {
    if (!code) return;
    const taken = await tx.properties.findFirst({ where: { code }, select: { id: true } });
    if (taken && taken.id !== exceptId) {
      throw new DomainError('PORTFOLIO.PROPERTY_CODE_TAKEN', { code });
    }
  }

  private toColumns(input: PropertyInput): Record<string, unknown> {
    return {
      ...(input.code !== undefined ? { code: trimOrNull(input.code) } : {}),
      ...(input.propertyType !== undefined ? { property_type: input.propertyType } : {}),
      ...(input.arrondissement !== undefined
        ? { arrondissement: trimOrNull(input.arrondissement) }
        : {}),
      ...(input.landmark !== undefined ? { landmark: trimOrNull(input.landmark) } : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.countryCode !== undefined ? { country_code: input.countryCode.toUpperCase() } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.landTitleReference !== undefined
        ? { land_title_reference: trimOrNull(input.landTitleReference) }
        : {}),
      ...(input.parcelNumber !== undefined
        ? { parcel_number: trimOrNull(input.parcelNumber) }
        : {}),
      ...(input.builtYear !== undefined ? { built_year: input.builtYear } : {}),
      ...(input.totalAreaSqm !== undefined ? { total_area_sqm: input.totalAreaSqm } : {}),
      ...(input.floorsCount !== undefined ? { floors_count: input.floorsCount } : {}),
      ...(input.hasWater !== undefined ? { has_water: input.hasWater } : {}),
      ...(input.hasElectricity !== undefined ? { has_electricity: input.hasElectricity } : {}),
      ...(input.hasBorehole !== undefined ? { has_borehole: input.hasBorehole } : {}),
      ...(input.caretakerName !== undefined
        ? { caretaker_name: trimOrNull(input.caretakerName) }
        : {}),
      ...(input.caretakerPhone !== undefined
        ? { caretaker_phone: normalizeOptionalPhone(input.caretakerPhone, 'caretakerPhone') }
        : {}),
      ...(input.coverDocumentId !== undefined ? { cover_document_id: input.coverDocumentId } : {}),
      ...(input.notes !== undefined ? { notes: trimOrNull(input.notes) } : {}),
    };
  }
}

function occupancyOf(counts: {
  units_total: bigint | number;
  units_occupied: bigint | number;
  units_available: bigint | number;
}): Occupancy {
  return computeOccupancy({
    unitsCount: Number(counts.units_total),
    occupiedCount: Number(counts.units_occupied),
    availableCount: Number(counts.units_available),
  });
}
