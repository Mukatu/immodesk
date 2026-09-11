import { Injectable } from '@nestjs/common';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { compareDates, parseIsoDate, startOfDay, toIsoDate } from '../domain/calendar';
import { assertRevisionDate } from '../domain/lease-rules';
import { rentAt, type RentRevisionPoint } from '../domain/rent-schedule';
import { toRentRevisionView, type RentRevisionRow, type RentRevisionView } from './lease-views';
import { LeasesService } from './leases.service';

export interface RentRevisionInput {
  effectiveDate: string;
  newRentAmount: number | string;
  newChargesAmount?: number | string;
  reason?: string;
  documentId?: string;
}

export interface RentAtView {
  date: string;
  rentAmount: number;
  chargesAmount: number;
  source: 'INITIAL' | 'REVISION';
  revisionId: string | null;
}

@Injectable()
export class RentRevisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly leases: LeasesService,
  ) {}

  async list(organizationId: string, userId: string, leaseId: string): Promise<RentRevisionView[]> {
    const rows = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.leases.require(tx, leaseId);
      return this.rowsFor(tx, leaseId);
    });
    return rows.map(toRentRevisionView);
  }

  /**
   * Enregistre une révision datée.
   *
   * Les montants PRÉCÉDENTS sont figés dans la ligne, calculés à partir de
   * l'historique et non de `leases.rent_amount` : cette colonne porte le
   * loyer du jour, qui peut déjà être celui d'une révision à venir. Les
   * recopier depuis l'historique garantit que la ligne se lit seule, des
   * années plus tard, sans rejouer toute la suite.
   *
   * Si la date d'effet est atteinte, `leases` est mis à jour dans la même
   * transaction ; sinon le cron quotidien l'appliquera le jour dit.
   */
  async create(
    organizationId: string,
    userId: string,
    leaseId: string,
    input: RentRevisionInput,
  ): Promise<RentRevisionView> {
    const effectiveDate = parseIsoDate(input.effectiveDate);
    const newRentAmount = toAmount(input.newRentAmount);

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const lease = await this.leases.require(tx, leaseId);
      const existing = await this.rowsFor(tx, leaseId);
      const today = startOfDay(new Date());

      const lastRevision = existing.at(-1);
      assertRevisionDate(
        effectiveDate,
        lease.start_date,
        lastRevision ? lastRevision.effective_date : null,
        today,
      );

      const before = rentAt(
        { rentAmount: lease.rent_amount, chargesAmount: lease.charges_amount },
        existing.map(toPoint),
        effectiveDate,
      );
      const newChargesAmount =
        input.newChargesAmount !== undefined
          ? toAmount(input.newChargesAmount)
          : before.chargesAmount;

      const id = newId();
      const created = (await tx.lease_rent_revisions.create({
        data: {
          id,
          organization_id: organizationId,
          lease_id: leaseId,
          effective_date: effectiveDate,
          previous_rent_amount: before.rentAmount,
          new_rent_amount: newRentAmount,
          previous_charges_amount: before.chargesAmount,
          new_charges_amount: newChargesAmount,
          currency: 'XAF',
          reason: input.reason?.trim() || null,
          document_id: input.documentId ?? null,
          created_by_user_id: userId,
        },
      })) as unknown as RentRevisionRow;

      const appliedNow = compareDates(effectiveDate, today) <= 0;
      if (appliedNow) {
        await tx.leases.update({
          where: { id: leaseId },
          data: {
            rent_amount: newRentAmount,
            charges_amount: newChargesAmount,
            updated_at: new Date(),
          },
        });
      }

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.LEASE_RENT_REVISION_CREATED,
        entityType: 'lease_rent_revisions',
        entityId: id,
        newState: toJsonState({
          leaseId,
          effectiveDate: toIsoDate(effectiveDate),
          previousRentAmount: before.rentAmount,
          newRentAmount,
          previousChargesAmount: before.chargesAmount,
          newChargesAmount,
          appliedImmediately: appliedNow,
        }),
      });

      return toRentRevisionView(created);
    });
  }

  /** Loyer applicable à une date : dernière révision effective, sinon initial. */
  async rentAtDate(
    organizationId: string,
    userId: string,
    leaseId: string,
    date: string,
  ): Promise<RentAtView> {
    const at = parseIsoDate(date);

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const lease = await this.leases.require(tx, leaseId);
      const revisions = await this.rowsFor(tx, leaseId);

      // Les conditions INITIALES sont celles d'avant toute révision : quand
      // des révisions existent, `leases.rent_amount` a déjà été écrasé, et
      // c'est `previous_rent_amount` de la plus ancienne qui fait foi.
      const first = revisions[0];
      const initial = first
        ? { rentAmount: first.previous_rent_amount, chargesAmount: first.previous_charges_amount }
        : { rentAmount: lease.rent_amount, chargesAmount: lease.charges_amount };

      const resolved = rentAt(initial, revisions.map(toPoint), at);
      return {
        date: toIsoDate(at),
        rentAmount: Number(resolved.rentAmount),
        chargesAmount: Number(resolved.chargesAmount),
        source: resolved.source,
        revisionId: resolved.revisionId,
      };
    });
  }

  /** Révisions d'un bail, de la plus ancienne à la plus récente. */
  async rowsFor(tx: TenantClient, leaseId: string): Promise<RentRevisionRow[]> {
    return (await tx.lease_rent_revisions.findMany({
      where: { lease_id: leaseId },
      orderBy: { effective_date: 'asc' },
    })) as unknown as RentRevisionRow[];
  }
}

function toPoint(row: RentRevisionRow): RentRevisionPoint {
  return {
    id: row.id,
    effectiveDate: row.effective_date,
    newRentAmount: row.new_rent_amount,
    newChargesAmount: row.new_charges_amount,
  };
}
