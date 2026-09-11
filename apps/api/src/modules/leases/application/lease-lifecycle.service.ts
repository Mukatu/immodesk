import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NumberingService } from '../../numbering/application/numbering.service';
import { compareDates, parseIsoDate, startOfDay, toIsoDate } from '../domain/calendar';
import {
  ACTIVATABLE_UNIT_STATUSES,
  assertEffectiveDateAcceptable,
  monthsEquivalent,
  refundDueDate,
} from '../domain/lease-rules';
import { assertTransition, OCCUPYING_LEASE_STATUSES } from '../domain/lease-status';
import { DEPOSIT_WRITER, type DepositWriter } from '../domain/ports';
import { withOverlapTranslation } from '../infrastructure/sql-errors';
import { toLeaseView, UNASSIGNED_REFERENCE_PREFIX, type LeaseRow } from './lease-views';
import { LeasesService } from './leases.service';

@Injectable()
export class LeaseLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly leases: LeasesService,
    private readonly numbering: NumberingService,
    @Inject(DEPOSIT_WRITER) private readonly deposits: DepositWriter,
  ) {}

  /**
   * ACTIVATION — tout ou rien, dans UNE transaction.
   *
   * Cinq écritures indissociables : le bail passe ACTIVE, le lot devient
   * OCCUPIED, la référence `BAIL-{YYYY}-{seq}` est réservée, le locataire
   * principal entre dans `lease_parties`, la ligne `deposits` est créée. Si
   * l'une échoue — un dépôt refusé par une contrainte, par exemple — le
   * ROLLBACK annule les quatre autres. Un bail actif sans dépôt, ou un lot
   * occupé sans bail, serait pire qu'un échec franc : personne ne saurait où
   * reprendre.
   *
   * Le chevauchement est vérifié ici ET garanti en base par
   * `leases_no_overlap_excl`. Le contrôle applicatif produit un message
   * utile ; la contrainte ferme la fenêtre entre le contrôle et le COMMIT,
   * que deux activations concurrentes exploiteraient sinon.
   */
  async activate(
    organizationId: string,
    userId: string,
    leaseId: string,
    input: { moveInDate?: string } = {},
  ): Promise<LeaseRow> {
    return withOverlapTranslation(() =>
      this.prisma.withTenant(organizationId, userId, async (tx) => {
        const before = await this.leases.require(tx, leaseId);
        assertTransition(before.status as never, 'ACTIVATE', 'ACTIVE');

        await this.assertUnitActivatable(tx, before);
        await this.assertNoOverlap(tx, before);

        const reference = await this.resolveReference(tx, organizationId, before);
        const moveInDate = input.moveInDate ? parseIsoDate(input.moveInDate) : before.start_date;

        const after = (await tx.leases.update({
          where: { id: leaseId },
          data: {
            status: 'ACTIVE',
            reference,
            move_in_date: moveInDate,
            signed_at: before.signed_at ?? new Date(),
            updated_at: new Date(),
          },
        })) as unknown as LeaseRow;

        await tx.units.update({
          where: { id: before.unit_id },
          data: { status: 'OCCUPIED', updated_at: new Date() },
        });

        await this.ensurePrimaryParty(tx, organizationId, after);

        await this.deposits.createForLease(tx, {
          leaseId,
          tenantId: after.primary_tenant_id,
          requiredAmount: after.deposit_amount,
          monthsEquivalent: monthsEquivalent(after.deposit_amount, after.rent_amount),
          dueDate: moveInDate,
        });

        await audit(this.auditService, tx, {
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.LEASE_ACTIVATED,
          entityType: 'leases',
          entityId: leaseId,
          previousState: toJsonState({ status: before.status, reference: null }),
          newState: toJsonState({
            status: 'ACTIVE',
            reference,
            unitId: after.unit_id,
            moveInDate: toIsoDate(moveInDate),
            depositAmount: after.deposit_amount,
          }),
        });

        return after;
      }),
    );
  }

  async cancel(
    organizationId: string,
    userId: string,
    leaseId: string,
    reason: string,
  ): Promise<LeaseRow> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.leases.require(tx, leaseId);
      assertTransition(before.status as never, 'CANCEL', 'CANCELLED');

      const after = (await tx.leases.update({
        where: { id: leaseId },
        data: {
          status: 'CANCELLED',
          terminated_at: new Date(),
          termination_reason: reason.trim(),
          updated_at: new Date(),
        },
      })) as unknown as LeaseRow;

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.LEASE_CANCELLED,
        entityType: 'leases',
        entityId: leaseId,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: 'CANCELLED', reason: reason.trim() }),
      });
      return after;
    });
  }

  /**
   * PRÉAVIS — le bail reste en cours jusqu'à la date d'effet.
   *
   * Le lot n'est libéré qu'à cette date, par le cron quotidien : le libérer
   * tout de suite permettrait de relouer un logement encore occupé.
   */
  async giveNotice(
    organizationId: string,
    userId: string,
    leaseId: string,
    input: { effectiveDate: string; reason: string },
  ): Promise<LeaseRow> {
    const effectiveDate = parseIsoDate(input.effectiveDate);
    const today = startOfDay(new Date());
    if (compareDates(effectiveDate, today) <= 0) {
      throw new DomainError('LEASES.TERMINATION_DATE_INVALID', {
        effectiveDate: input.effectiveDate,
        reason: 'NOTICE_MUST_BE_FUTURE',
      });
    }

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.leases.require(tx, leaseId);
      assertTransition(before.status as never, 'GIVE_NOTICE', 'NOTICE_GIVEN');

      const after = (await tx.leases.update({
        where: { id: leaseId },
        data: {
          status: 'NOTICE_GIVEN',
          move_out_date: effectiveDate,
          termination_reason: input.reason.trim(),
          updated_at: new Date(),
        },
      })) as unknown as LeaseRow;

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.LEASE_NOTICE_GIVEN,
        entityType: 'leases',
        entityId: leaseId,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({
          status: 'NOTICE_GIVEN',
          effectiveDate: input.effectiveDate,
          reason: input.reason.trim(),
        }),
      });
      return after;
    });
  }

  /**
   * RÉSILIATION — immédiate ou à effet proche.
   *
   * Le lot repasse AVAILABLE dès maintenant si la date d'effet est atteinte,
   * sinon le cron quotidien s'en charge le jour venu. Le dépôt reçoit sa date
   * limite de restitution : date d'effet + 30 jours.
   */
  async terminate(
    organizationId: string,
    userId: string,
    leaseId: string,
    input: { effectiveDate: string; reason: string },
  ): Promise<LeaseRow> {
    const effectiveDate = parseIsoDate(input.effectiveDate);
    const today = startOfDay(new Date());
    assertEffectiveDateAcceptable(effectiveDate, today);

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.leases.require(tx, leaseId);
      assertTransition(before.status as never, 'TERMINATE', 'TERMINATED');

      const after = (await tx.leases.update({
        where: { id: leaseId },
        data: {
          status: 'TERMINATED',
          terminated_at: new Date(),
          termination_reason: input.reason.trim(),
          move_out_date: effectiveDate,
          updated_at: new Date(),
        },
      })) as unknown as LeaseRow;

      if (compareDates(effectiveDate, today) <= 0) {
        await tx.units.update({
          where: { id: before.unit_id },
          data: { status: 'AVAILABLE', updated_at: new Date() },
        });
      }
      await this.deposits.scheduleRefund(tx, leaseId, refundDueDate(effectiveDate));

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.LEASE_TERMINATED,
        entityType: 'leases',
        entityId: leaseId,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({
          status: 'TERMINATED',
          effectiveDate: input.effectiveDate,
          reason: input.reason.trim(),
          refundDueDate: toIsoDate(refundDueDate(effectiveDate)),
          unitReleased: compareDates(effectiveDate, today) <= 0,
        }),
      });
      return after;
    });
  }

  /** Le lot doit être libre : OCCUPIED est refusé, MAINTENANCE aussi. */
  private async assertUnitActivatable(tx: TenantClient, lease: LeaseRow): Promise<void> {
    const unit = await tx.units.findFirst({
      where: { id: lease.unit_id, deleted_at: null },
      select: { id: true, status: true },
    });
    if (!unit) throw new DomainError('PORTFOLIO.UNIT_NOT_FOUND', { unitId: lease.unit_id });
    if (!(ACTIVATABLE_UNIT_STATUSES as readonly string[]).includes(unit.status)) {
      throw new DomainError('LEASES.UNIT_NOT_AVAILABLE', {
        unitId: unit.id,
        unitStatus: unit.status,
        allowed: [...ACTIVATABLE_UNIT_STATUSES],
      });
    }
  }

  /**
   * Chevauchement applicatif : même lot, bail ACTIVE ou NOTICE_GIVEN, dont la
   * période croise celle du bail à activer. `end_date` nul vaut durée
   * indéterminée, exactement comme dans la contrainte d'exclusion.
   */
  private async assertNoOverlap(tx: TenantClient, lease: LeaseRow): Promise<void> {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; reference: string }>>(
      `SELECT id, reference
         FROM leases
        WHERE unit_id = $1::uuid
          AND id <> $2::uuid
          AND deleted_at IS NULL
          AND status = ANY($3::lease_status[])
          AND daterange(start_date, COALESCE(end_date, DATE '9999-12-31'), '[)')
              && daterange($4::date, COALESCE($5::date, DATE '9999-12-31'), '[)')
        LIMIT 1`,
      lease.unit_id,
      lease.id,
      [...OCCUPYING_LEASE_STATUSES],
      toIsoDate(lease.start_date),
      lease.end_date ? toIsoDate(lease.end_date) : null,
    );

    const conflict = rows[0];
    if (conflict) {
      throw new DomainError('LEASES.OVERLAP', {
        unitId: lease.unit_id,
        conflictingLeaseId: conflict.id,
      });
    }
  }

  /** Réserve `BAIL-{YYYY}-{seq}` si le bail porte encore sa référence technique. */
  private async resolveReference(
    tx: TenantClient,
    organizationId: string,
    lease: LeaseRow,
  ): Promise<string> {
    if (!lease.reference.startsWith(UNASSIGNED_REFERENCE_PREFIX)) return lease.reference;
    const reserved = await this.numbering.nextNumber(tx, organizationId, 'LEASE', new Date());
    await this.numbering.describeSequence(tx, organizationId, 'LEASE', reserved.period);
    return reserved.number;
  }

  /** Le locataire principal est partie au bail : 100 % de la quote-part. */
  private async ensurePrimaryParty(
    tx: TenantClient,
    organizationId: string,
    lease: LeaseRow,
  ): Promise<void> {
    const existing = await tx.lease_parties.findFirst({
      where: { lease_id: lease.id, role: 'PRIMARY_TENANT' },
      select: { id: true },
    });
    if (existing) return;

    await tx.lease_parties.create({
      data: {
        id: newId(),
        organization_id: organizationId,
        lease_id: lease.id,
        role: 'PRIMARY_TENANT',
        tenant_id: lease.primary_tenant_id,
        share_bps: 10_000,
        is_solidary: true,
      },
    });
  }
}

/** Rend le bail tel que le contrat l'expose. */
export { toLeaseView };
