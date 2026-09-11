import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { DepositCreationInput, DepositWriter } from '../../leases/domain/ports';
import {
  assertMovementAllowed,
  deriveStatus,
  recomputeBalances,
  type DepositMovementType,
} from '../domain/deposit-rules';
import { LEASE_READER, type LeaseReader } from '../domain/ports';
import {
  toDepositDetailView,
  type DepositDetailView,
  type DepositMovementRow,
  type DepositRow,
} from './deposit-views';

export interface DepositMovementInput {
  movementType: DepositMovementType;
  amount: number | string;
  movementDate?: string;
  reason?: string;
  paymentId?: string;
  inspectionId?: string;
  reversalOfId?: string;
}

@Injectable()
export class DepositsService implements DepositWriter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(LEASE_READER) private readonly leases: LeaseReader,
  ) {}

  /**
   * Création du dépôt à l'activation du bail, DANS la transaction d'activation.
   * Idempotente : `deposits_lease_uk` n'admet qu'une ligne par bail, et une
   * seconde activation retrouve l'existante plutôt que d'échouer.
   */
  async createForLease(tx: TenantClient, input: DepositCreationInput): Promise<{ id: string }> {
    const existing = await tx.deposits.findFirst({
      where: { lease_id: input.leaseId },
      select: { id: true },
    });
    if (existing) return { id: existing.id };

    const lease = await tx.leases.findFirst({
      where: { id: input.leaseId },
      select: { organization_id: true },
    });
    if (!lease) throw new DomainError('LEASES.NOT_FOUND', { leaseId: input.leaseId });

    const id = newId();
    await tx.deposits.create({
      data: {
        id,
        organization_id: lease.organization_id,
        lease_id: input.leaseId,
        tenant_id: input.tenantId,
        status: 'PENDING',
        required_amount: input.requiredAmount,
        currency: 'XAF',
        months_equivalent: input.monthsEquivalent,
        due_date: input.dueDate,
      },
    });

    await audit(this.auditService, tx, {
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.DEPOSIT_CREATED,
      entityType: 'deposits',
      entityId: id,
      newState: toJsonState({
        leaseId: input.leaseId,
        requiredAmount: input.requiredAmount,
        monthsEquivalent: input.monthsEquivalent,
      }),
    });
    return { id };
  }

  async scheduleRefund(tx: TenantClient, leaseId: string, refundDueDate: Date): Promise<void> {
    await tx.deposits.updateMany({
      where: { lease_id: leaseId },
      data: { refund_due_date: refundDueDate, updated_at: new Date() },
    });
  }

  async findDetail(tx: TenantClient, leaseId: string): Promise<DepositDetailView | null> {
    const row = (await tx.deposits.findFirst({
      where: { lease_id: leaseId },
    })) as unknown as DepositRow | null;
    if (!row) return null;
    return toDepositDetailView(row, await this.movementsOf(tx, row.id));
  }

  async getForLease(
    organizationId: string,
    userId: string,
    leaseId: string,
  ): Promise<DepositDetailView> {
    const detail = await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.findDetail(tx, leaseId),
    );
    if (!detail) throw new DomainError('DEPOSITS.NOT_FOUND', { leaseId });
    return detail;
  }

  /**
   * Enregistre un mouvement et recalcule les soldes dans LA MÊME transaction.
   *
   * `deposit_movements` est append-only côté API : aucune route ne modifie ni
   * ne supprime une ligne. Une erreur se corrige par un mouvement ADJUSTMENT
   * ou par une contre-passation (`reversalOfId`), qui laisse les deux
   * écritures visibles — c'est ce qui permet de justifier chaque franc retenu
   * devant un locataire des mois plus tard.
   */
  async recordMovement(
    organizationId: string,
    userId: string,
    leaseId: string,
    input: DepositMovementInput,
  ): Promise<DepositDetailView> {
    const amount = toAmount(input.amount);

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const lease = await this.leases.findForDeposit(tx, leaseId);
      if (!lease) throw new DomainError('LEASES.NOT_FOUND', { leaseId });

      const deposit = (await tx.deposits.findFirst({
        where: { lease_id: leaseId },
      })) as unknown as DepositRow | null;
      if (!deposit) throw new DomainError('DEPOSITS.NOT_FOUND', { leaseId });

      const balances = recomputeBalances((await this.movementsOf(tx, deposit.id)).map(toEffect));
      const isReversal = Boolean(input.reversalOfId);

      assertMovementAllowed({
        movementType: input.movementType,
        amount,
        isReversal,
        balances,
        leaseStatus: lease.status,
      });

      const movementId = newId();
      await tx.deposit_movements.create({
        data: {
          id: movementId,
          organization_id: organizationId,
          deposit_id: deposit.id,
          lease_id: leaseId,
          movement_type: input.movementType,
          amount,
          currency: 'XAF',
          movement_date: input.movementDate
            ? new Date(`${input.movementDate}T00:00:00.000Z`)
            : new Date(),
          payment_id: input.paymentId ?? null,
          inspection_id: input.inspectionId ?? null,
          reason: input.reason?.trim() || null,
          reversal_of_id: input.reversalOfId ?? null,
          created_by_user_id: userId,
        },
      });

      const movements = await this.movementsOf(tx, deposit.id);
      const updated = await this.applyBalances(tx, deposit, movements);

      await this.traceMovement(tx, {
        movementId,
        deposit,
        updated,
        leaseId,
        input,
        amount,
        previousHeld: balances.heldAmount,
      });

      return toDepositDetailView(updated, movements);
    });
  }

  /** Mouvements d'un dépôt, du plus ancien au plus récent. */
  private async movementsOf(tx: TenantClient, depositId: string): Promise<DepositMovementRow[]> {
    return (await tx.deposit_movements.findMany({
      where: { deposit_id: depositId },
      orderBy: [{ movement_date: 'asc' }, { created_at: 'asc' }],
    })) as unknown as DepositMovementRow[];
  }

  /** Réécrit les quatre soldes et le statut dérivé depuis les mouvements. */
  private async applyBalances(
    tx: TenantClient,
    deposit: DepositRow,
    movements: readonly DepositMovementRow[],
  ): Promise<DepositRow> {
    const balances = recomputeBalances(movements.map(toEffect));
    const status = deriveStatus(balances, deposit.required_amount);
    const fullyCollected =
      balances.collectedAmount >= deposit.required_amount && deposit.required_amount > 0n;

    return (await tx.deposits.update({
      where: { id: deposit.id },
      data: {
        collected_amount: balances.collectedAmount,
        deducted_amount: balances.deductedAmount,
        refunded_amount: balances.refundedAmount,
        held_amount: balances.heldAmount,
        status,
        fully_collected_at:
          fullyCollected && !deposit.fully_collected_at ? new Date() : deposit.fully_collected_at,
        refunded_at:
          status === 'REFUNDED' && !deposit.refunded_at ? new Date() : deposit.refunded_at,
        updated_at: new Date(),
      },
    })) as unknown as DepositRow;
  }

  private async traceMovement(
    tx: TenantClient,
    ctx: {
      movementId: string;
      deposit: DepositRow;
      updated: DepositRow;
      leaseId: string;
      input: DepositMovementInput;
      amount: bigint;
      previousHeld: bigint;
    },
  ): Promise<void> {
    await audit(this.auditService, tx, {
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.DEPOSIT_MOVEMENT_RECORDED,
      entityType: 'deposit_movements',
      entityId: ctx.movementId,
      newState: toJsonState({
        depositId: ctx.deposit.id,
        leaseId: ctx.leaseId,
        movementType: ctx.input.movementType,
        amount: ctx.amount,
        reversalOfId: ctx.input.reversalOfId ?? null,
        heldAmountBefore: ctx.previousHeld,
        heldAmountAfter: ctx.updated.held_amount,
      }),
    });

    if (ctx.updated.status !== ctx.deposit.status) {
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.DEPOSIT_STATUS_CHANGED,
        entityType: 'deposits',
        entityId: ctx.deposit.id,
        previousState: toJsonState({ status: ctx.deposit.status }),
        newState: toJsonState({ status: ctx.updated.status }),
      });
    }
  }
}

function toEffect(row: DepositMovementRow): {
  movementType: DepositMovementType;
  amount: bigint;
  isReversal: boolean;
} {
  return {
    movementType: row.movement_type as DepositMovementType,
    amount: row.amount,
    isReversal: row.reversal_of_id !== null,
  };
}
