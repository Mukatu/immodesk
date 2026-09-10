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
import { trimOrNull } from '../../parties/domain/party-rules';
import { generateUnitCodes } from '../domain/unit-code';
import { toUnitView, type UnitRow, type UnitView } from './portfolio-views';
import { PropertiesService } from './properties.service';

export interface UnitInput {
  code?: string;
  label?: string | null;
  unitType?: string;
  status?: string;
  floorNumber?: number | null;
  roomsCount?: number | null;
  bedroomsCount?: number | null;
  bathroomsCount?: number | null;
  areaSqm?: number | null;
  isFurnished?: boolean;
  hasPrivateMeter?: boolean;
  baseRentAmount?: number | string;
  baseChargesAmount?: number | string;
  depositMonths?: number;
  amenities?: Record<string, unknown>;
  notes?: string | null;
}

export interface BulkUnitsInput {
  prefix: string;
  from: number;
  to: number;
  padding?: number;
  template: Omit<UnitInput, 'code' | 'label'>;
}

const UNIT_SEARCH_COLUMNS = ['u.code', 'u.label', 'u.notes'];

@Injectable()
export class UnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
    private readonly properties: PropertiesService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    propertyId: string,
    input: UnitInput,
  ): Promise<UnitView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.properties.require(tx, propertyId);
      const code = (input.code ?? '').trim();
      await this.assertCodeFree(tx, propertyId, [code], null);

      const created = (await tx.units.create({
        data: {
          id: newId(),
          organization_id: organizationId,
          property_id: propertyId,
          code,
          currency: 'XAF',
          ...this.toColumns(input),
        },
      })) as unknown as UnitRow;

      await this.refreshUnitsCount(tx, propertyId);
      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.UNIT_CREATED,
        entityType: 'units',
        entityId: created.id,
        newState: toJsonState(toUnitView(created)),
      });
      return toUnitView(created);
    });
  }

  /**
   * Création en série — TOUT OU RIEN.
   *
   * Les 12 lots d'un immeuble sont insérés dans la transaction ouverte par
   * `withTenant` : si un seul code est déjà pris, l'erreur remonte et le
   * ROLLBACK annule les précédents. Une saisie partielle serait pire que pas
   * de saisie du tout, l'agence ne sachant pas où reprendre.
   */
  async createBulk(
    organizationId: string,
    userId: string,
    propertyId: string,
    input: BulkUnitsInput,
  ): Promise<UnitView[]> {
    const codes = generateUnitCodes(input);

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.properties.require(tx, propertyId);
      await this.assertCodeFree(tx, propertyId, codes, null);

      const columns = this.toColumns(input.template);
      const created: UnitRow[] = [];
      for (const code of codes) {
        const row = (await tx.units.create({
          data: {
            id: newId(),
            organization_id: organizationId,
            property_id: propertyId,
            code,
            label: code,
            currency: 'XAF',
            ...columns,
          },
        })) as unknown as UnitRow;
        created.push(row);
      }

      await this.refreshUnitsCount(tx, propertyId);
      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.UNITS_BULK_CREATED,
        entityType: 'properties',
        entityId: propertyId,
        newState: toJsonState({ codes, count: codes.length, unitIds: created.map((u) => u.id) }),
      });
      return created.map(toUnitView);
    });
  }

  async list(
    organizationId: string,
    userId: string,
    filters: { propertyId?: string; status?: string; q?: string; limit?: number; cursor?: string },
  ): Promise<Page<UnitView>> {
    const conditions = ['u.organization_id = $1::uuid', 'u.deleted_at IS NULL'];
    const params: unknown[] = [organizationId];

    if (filters.propertyId) {
      params.push(filters.propertyId);
      conditions.push(`u.property_id = $${params.length}::uuid`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`u.status = $${params.length}::unit_status`);
    }
    if (filters.q?.trim()) {
      params.push(toLikePattern(filters.q));
      conditions.push(sqlSearchClause(UNIT_SEARCH_COLUMNS, `$${params.length}`));
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'u');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<UnitRow[]>(
        `SELECT u.* FROM units u
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('u')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toUnitView), pageInfo: page.pageInfo };
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: UnitInput,
  ): Promise<UnitView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      if (input.code !== undefined) {
        await this.assertCodeFree(tx, before.property_id, [input.code.trim()], id);
      }

      const after = (await tx.units.update({
        where: { id },
        data: {
          ...(input.code !== undefined ? { code: input.code.trim() } : {}),
          ...this.toColumns(input),
          updated_at: new Date(),
        },
      })) as unknown as UnitRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.UNIT_UPDATED,
        entityType: 'units',
        entityId: id,
        previousState: toJsonState(toUnitView(before)),
        newState: toJsonState(toUnitView(after)),
      });
      return toUnitView(after);
    });
  }

  /**
   * Suppression logique, refusée si un bail ACTIF porte ce lot.
   *
   * Aucune route de bail n'existe encore en phase 1 : la règle est néanmoins
   * codée ici et vérifiée par un test d'intégration qui insère directement un
   * `leases` en SQL. La supprimer sous prétexte que « la table est vide »
   * reviendrait à livrer la phase 2 avec un trou.
   */
  async softDelete(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);

      const activeLeases = await tx.leases.count({
        where: { unit_id: id, status: 'ACTIVE', deleted_at: null },
      });
      if (activeLeases > 0) {
        throw new DomainError('PORTFOLIO.UNIT_HAS_ACTIVE_LEASE', {
          unitId: id,
          activeLeases,
        });
      }

      await tx.units.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
      await this.refreshUnitsCount(tx, before.property_id);
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.UNIT_DELETED,
        entityType: 'units',
        entityId: id,
        previousState: toJsonState(toUnitView(before)),
      });
    });
  }

  async require(tx: TenantClient, id: string): Promise<UnitRow> {
    const row = (await tx.units.findFirst({
      where: { id, deleted_at: null },
    })) as unknown as UnitRow | null;
    if (!row) throw new DomainError('PORTFOLIO.UNIT_NOT_FOUND', { unitId: id });
    return row;
  }

  async listForProperty(tx: TenantClient, propertyId: string): Promise<UnitView[]> {
    const rows = (await tx.units.findMany({
      where: { property_id: propertyId, deleted_at: null },
      orderBy: { code: 'asc' },
    })) as unknown as UnitRow[];
    return rows.map(toUnitView);
  }

  /** `properties.units_count` est dénormalisé : l'application le maintient. */
  private async refreshUnitsCount(tx: TenantClient, propertyId: string): Promise<void> {
    const count = await tx.units.count({ where: { property_id: propertyId, deleted_at: null } });
    await tx.properties.update({
      where: { id: propertyId },
      data: { units_count: count, updated_at: new Date() },
    });
  }

  private async assertCodeFree(
    tx: TenantClient,
    propertyId: string,
    codes: string[],
    exceptId: string | null,
  ): Promise<void> {
    const taken = await tx.units.findMany({
      where: { property_id: propertyId, code: { in: codes } },
      select: { id: true, code: true },
    });
    const conflict = taken.find((u) => u.id !== exceptId);
    if (conflict) {
      throw new DomainError('PORTFOLIO.UNIT_CODE_TAKEN', {
        propertyId,
        code: conflict.code,
        existingUnitId: conflict.id,
      });
    }
  }

  private toColumns(input: UnitInput): Record<string, unknown> {
    return {
      ...(input.label !== undefined ? { label: trimOrNull(input.label) } : {}),
      ...(input.unitType !== undefined ? { unit_type: input.unitType } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.floorNumber !== undefined ? { floor_number: input.floorNumber } : {}),
      ...(input.roomsCount !== undefined ? { rooms_count: input.roomsCount } : {}),
      ...(input.bedroomsCount !== undefined ? { bedrooms_count: input.bedroomsCount } : {}),
      ...(input.bathroomsCount !== undefined ? { bathrooms_count: input.bathroomsCount } : {}),
      ...(input.areaSqm !== undefined ? { area_sqm: input.areaSqm } : {}),
      ...(input.isFurnished !== undefined ? { is_furnished: input.isFurnished } : {}),
      ...(input.hasPrivateMeter !== undefined ? { has_private_meter: input.hasPrivateMeter } : {}),
      // Montants XAF : conversion en BigInt, jamais de flottant.
      ...(input.baseRentAmount !== undefined
        ? { base_rent_amount: BigInt(input.baseRentAmount) }
        : {}),
      ...(input.baseChargesAmount !== undefined
        ? { base_charges_amount: BigInt(input.baseChargesAmount) }
        : {}),
      ...(input.depositMonths !== undefined ? { deposit_months: input.depositMonths } : {}),
      ...(input.amenities !== undefined ? { amenities: input.amenities } : {}),
      ...(input.notes !== undefined ? { notes: trimOrNull(input.notes) } : {}),
    };
  }
}
