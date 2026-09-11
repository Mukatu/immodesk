import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { sqlSearchClause, toLikePattern } from '../../../shared/search/search-text';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { LeaseForDeposit, LeaseReader } from '../../deposits/domain/ports';
import { parseIsoDate } from '../domain/calendar';
import { assertEditable } from '../domain/lease-rules';
import { leaseColumns, type CreateLeaseInput, type LeaseInput } from './lease-input';
import {
  toLeaseSummary,
  toLeaseView,
  UNASSIGNED_REFERENCE_PREFIX,
  type LeaseRow,
  type LeaseSummaryRow,
  type LeaseSummaryView,
  type LeaseView,
} from './lease-views';

const LEASE_SEARCH_COLUMNS = ['l.reference', 'l.notes', 'u.code', 'p.name'];

/** Colonnes du bail enrichies de son lot, de son immeuble et du locataire. */
const SUMMARY_SELECT = `
  l.*, u.code AS unit_code, u.label AS unit_label, p.name AS property_name,
  t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
  t.primary_phone AS tenant_primary_phone`;

@Injectable()
export class LeasesService implements LeaseReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Création à l'état DRAFT.
   *
   * La référence définitive `BAIL-{YYYY}-{seq}` n'est attribuée qu'à
   * l'activation : numéroter un brouillon consommerait un numéro de la série
   * pour un contrat qui ne verra peut-être jamais le jour, et le contrôle
   * d'une série sans trou perdrait tout son sens. `leases.reference` étant
   * NOT NULL, le brouillon porte une référence technique préfixée
   * `BROUILLON-`, rendue `null` à la présentation.
   */
  async create(
    organizationId: string,
    userId: string,
    input: CreateLeaseInput,
  ): Promise<LeaseView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const unit = await this.requireUnit(tx, input.unitId);
      if (unit.status === 'OCCUPIED') {
        throw new DomainError('LEASES.UNIT_NOT_AVAILABLE', {
          unitId: unit.id,
          unitStatus: unit.status,
        });
      }
      await this.requireTenant(tx, input.primaryTenantId);

      const property = await tx.properties.findFirst({
        where: { id: unit.property_id, deleted_at: null },
        select: { id: true, landlord_id: true },
      });
      if (!property) throw new DomainError('PORTFOLIO.PROPERTY_NOT_FOUND', { unitId: unit.id });

      const defaults = await this.organizationDefaults(tx, organizationId);
      const rentAmount = toAmount(input.rentAmount);
      const id = newId();

      const created = (await tx.leases.create({
        data: {
          id,
          organization_id: organizationId,
          unit_id: unit.id,
          property_id: property.id,
          landlord_id: property.landlord_id,
          primary_tenant_id: input.primaryTenantId,
          reference: `${UNASSIGNED_REFERENCE_PREFIX}${id}`,
          status: 'DRAFT',
          currency: 'XAF',
          // `start_date` est explicite ici bien que `leaseColumns` le pose
          // aussi : la colonne est NOT NULL, et la poser dans un
          // `Record<string, unknown>` la rendrait invisible au vérificateur
          // de types. Mieux vaut une ligne redondante qu'un NOT NULL
          // découvert en production.
          start_date: parseIsoDate(input.startDate),
          rent_amount: rentAmount,
          deposit_amount:
            input.depositAmount !== undefined
              ? toAmount(input.depositAmount)
              : BigInt(unit.deposit_months) * rentAmount,
          payment_due_day: input.paymentDueDay ?? defaults.paymentDueDay,
          grace_days: input.graceDays ?? defaults.graceDays,
          ...leaseColumns(input),
        },
      })) as unknown as LeaseRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.LEASE_CREATED,
        entityType: 'leases',
        entityId: id,
        newState: toJsonState(toLeaseView(created)),
      });
      return toLeaseView(created);
    });
  }

  async list(
    organizationId: string,
    userId: string,
    filters: {
      status?: string;
      propertyId?: string;
      tenantId?: string;
      unitId?: string;
      endingWithinDays?: number;
      q?: string;
      limit?: number;
      cursor?: string;
    },
  ): Promise<Page<LeaseSummaryView>> {
    const conditions = ['l.organization_id = $1::uuid', 'l.deleted_at IS NULL'];
    const params: unknown[] = [organizationId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`l.status = $${params.length}::lease_status`);
    }
    if (filters.propertyId) {
      params.push(filters.propertyId);
      conditions.push(`l.property_id = $${params.length}::uuid`);
    }
    if (filters.tenantId) {
      params.push(filters.tenantId);
      conditions.push(`l.primary_tenant_id = $${params.length}::uuid`);
    }
    if (filters.unitId) {
      params.push(filters.unitId);
      conditions.push(`l.unit_id = $${params.length}::uuid`);
    }
    if (filters.endingWithinDays !== undefined) {
      params.push(filters.endingWithinDays);
      conditions.push(
        `l.end_date IS NOT NULL AND l.end_date <= current_date + ($${params.length}::int * INTERVAL '1 day')`,
      );
    }
    if (filters.q?.trim()) {
      params.push(toLikePattern(filters.q));
      conditions.push(sqlSearchClause(LEASE_SEARCH_COLUMNS, `$${params.length}`));
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'l');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<LeaseSummaryRow[]>(
        `SELECT ${SUMMARY_SELECT}
           FROM leases l
           JOIN units u ON u.id = l.unit_id
           JOIN properties p ON p.id = l.property_id
           JOIN tenants t ON t.id = l.primary_tenant_id
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('l')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toLeaseSummary), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<LeaseView> {
    const row = await this.prisma.withTenant(organizationId, userId, (tx) => this.require(tx, id));
    return toLeaseView(row);
  }

  /**
   * Modification.
   *
   * En DRAFT et PENDING_SIGNATURE, tout est ouvert. Après activation, seuls
   * les champs de gestion listés par `POST_ACTIVATION_EDITABLE_FIELDS` le
   * restent : `assertEditable` refuse les autres en les nommant, ce qui
   * permet à l'interface de griser les bons champs plutôt que d'essayer.
   */
  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: LeaseInput,
  ): Promise<LeaseView> {
    const requested = Object.keys(input).filter(
      (key) => (input as Record<string, unknown>)[key] !== undefined,
    );

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertEditable(before.status, requested);

      const columns = leaseColumns(input);
      if (input.rentAmount !== undefined) columns.rent_amount = toAmount(input.rentAmount);
      if (input.depositAmount !== undefined) columns.deposit_amount = toAmount(input.depositAmount);
      if (input.paymentDueDay !== undefined) columns.payment_due_day = input.paymentDueDay;
      if (input.graceDays !== undefined) columns.grace_days = input.graceDays;
      if (input.unitId !== undefined && input.unitId !== before.unit_id) {
        const unit = await this.requireUnit(tx, input.unitId);
        if (unit.status === 'OCCUPIED') {
          throw new DomainError('LEASES.UNIT_NOT_AVAILABLE', { unitId: unit.id });
        }
        const property = await tx.properties.findFirst({
          where: { id: unit.property_id, deleted_at: null },
          select: { id: true, landlord_id: true },
        });
        if (!property) throw new DomainError('PORTFOLIO.PROPERTY_NOT_FOUND', { unitId: unit.id });
        columns.unit_id = unit.id;
        columns.property_id = property.id;
        columns.landlord_id = property.landlord_id;
      }

      const after = (await tx.leases.update({
        where: { id },
        data: { ...columns, updated_at: new Date() },
      })) as unknown as LeaseRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.LEASE_UPDATED,
        entityType: 'leases',
        entityId: id,
        previousState: toJsonState(toLeaseView(before)),
        newState: toJsonState(toLeaseView(after)),
      });
      return toLeaseView(after);
    });
  }

  /**
   * Suppression LOGIQUE, réservée aux brouillons et aux baux annulés.
   *
   * Un bail qui a produit des effets — occupation, dépôt appelé, quittances —
   * ne disparaît jamais : le supprimer effacerait la contrepartie de sommes
   * réellement encaissées.
   */
  async softDelete(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      if (before.status !== 'DRAFT' && before.status !== 'CANCELLED') {
        throw new DomainError('LEASES.NOT_DELETABLE', { leaseId: id, status: before.status });
      }

      await tx.leases.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.LEASE_DELETED,
        entityType: 'leases',
        entityId: id,
        previousState: toJsonState(toLeaseView(before)),
      });
    });
  }

  /** Implémentation du port `LEASE_READER` consommé par `deposits`. */
  async findForDeposit(tx: TenantClient, leaseId: string): Promise<LeaseForDeposit | null> {
    const row = await tx.leases.findFirst({
      where: { id: leaseId, deleted_at: null },
      select: {
        id: true,
        status: true,
        primary_tenant_id: true,
        unit_id: true,
        reference: true,
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      primaryTenantId: row.primary_tenant_id,
      unitId: row.unit_id,
      reference: row.reference,
    };
  }

  async require(tx: TenantClient, id: string): Promise<LeaseRow> {
    const row = (await tx.leases.findFirst({
      where: { id, deleted_at: null },
    })) as unknown as LeaseRow | null;
    if (!row) throw new DomainError('LEASES.NOT_FOUND', { leaseId: id });
    return row;
  }

  private async requireUnit(
    tx: TenantClient,
    unitId: string,
  ): Promise<{ id: string; property_id: string; status: string; deposit_months: number }> {
    const unit = await tx.units.findFirst({
      where: { id: unitId, deleted_at: null },
      select: { id: true, property_id: true, status: true, deposit_months: true },
    });
    if (!unit) throw new DomainError('PORTFOLIO.UNIT_NOT_FOUND', { unitId });
    return unit;
  }

  private async requireTenant(tx: TenantClient, tenantId: string): Promise<void> {
    const tenant = await tx.tenants.findFirst({
      where: { id: tenantId, deleted_at: null },
      select: { id: true },
    });
    if (!tenant) throw new DomainError('PARTIES.TENANT_NOT_FOUND', { tenantId });
  }

  /** Jour d'échéance et tolérance par défaut de l'organisation. */
  private async organizationDefaults(
    tx: TenantClient,
    organizationId: string,
  ): Promise<{ paymentDueDay: number; graceDays: number }> {
    const settings = await tx.organization_settings.findUnique({
      where: { organization_id: organizationId },
      select: { default_payment_due_day: true, default_grace_days: true },
    });
    return {
      paymentDueDay: settings?.default_payment_due_day ?? 5,
      graceDays: settings?.default_grace_days ?? 5,
    };
  }
}
