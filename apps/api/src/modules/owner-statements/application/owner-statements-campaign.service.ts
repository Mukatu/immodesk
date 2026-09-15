import { Inject, Injectable } from '@nestjs/common';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  CommissionsService,
  type AccrualTotals,
} from '../../commissions/application/commissions.service';
import {
  EXPENSE_READER,
  type ExpenseForStatement,
  type ExpenseReader,
} from '../../expenses/domain/ports';
import { NumberingService } from '../../numbering/application/numbering.service';
import { computeCollectionRateBps, computeNetPayable } from '../domain/owner-statement-rules';
import { insertStatementLines, type StatementLineInput } from './owner-statement-line-writer';

export interface CampaignOptions {
  /** Filtre le jour de reversement du mandat (cron) ; absent = tous (relance manuelle). */
  payoutDayFilter?: number;
  actorUserId?: string | null;
  jobLabel: string;
}

export interface CampaignOutcome {
  created: number;
  skipped: number;
  errors: Array<{ mandateId: string; reason: string }>;
}

interface MandateRow {
  id: string;
  landlord_id: string;
  property_id: string | null;
  status: string;
  terminated_at: Date | null;
  commission_basis: string;
  commission_rate_bps: number | null;
  vat_rate_bps: number;
}

/**
 * Campagne mensuelle (contrat, § Campagne). Chaque mandat est traité dans SA
 * PROPRE transaction (`withTenant`) : l'échec d'un mandat n'annule jamais le
 * travail déjà validé pour les autres (contrat : « toute erreur sur un
 * mandat ne doit pas interrompre la campagne »).
 *
 * Couplage direct et assumé avec `CommissionsService` (injecté sans port
 * `Symbol`, contrairement à `EXPENSE_READER`) : les deux modules sont nés de
 * la même phase, pour le même besoin, et `commissions` reste malgré tout le
 * SEUL écrivain de sa table (`accrueForPeriod`, `attachToStatement`).
 */
@Injectable()
export class OwnerStatementsCampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionsService,
    @Inject(EXPENSE_READER) private readonly expenseReader: ExpenseReader,
    private readonly numbering: NumberingService,
    private readonly auditService: AuditService,
  ) {}

  async runForOrganization(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    options: CampaignOptions,
  ): Promise<CampaignOutcome> {
    const userId = options.actorUserId ?? null;
    const mandates = await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.eligibleMandates(tx, organizationId, periodStart, periodEnd, options.payoutDayFilter),
    );

    let created = 0;
    let skipped = 0;
    const errors: Array<{ mandateId: string; reason: string }> = [];

    for (const mandate of mandates) {
      try {
        const outcome = await this.prisma.withTenant(organizationId, userId, (tx) =>
          this.processMandate(
            tx,
            organizationId,
            mandate,
            periodStart,
            periodEnd,
            options.jobLabel,
          ),
        );
        if (outcome === 'CREATED') created += 1;
        else skipped += 1;
      } catch (error) {
        errors.push({ mandateId: mandate.id, reason: (error as Error).message.slice(0, 300) });
      }
    }
    return { created, skipped, errors };
  }

  private async eligibleMandates(
    tx: TenantClient,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    payoutDayFilter: number | undefined,
  ): Promise<MandateRow[]> {
    const nextDay = new Date(periodEnd.getTime() + 86_400_000);
    return (await tx.management_mandates.findMany({
      where: {
        organization_id: organizationId,
        OR: [
          { status: 'ACTIVE' },
          { status: 'TERMINATED', terminated_at: { gte: periodStart, lt: nextDay } },
        ],
        ...(payoutDayFilter != null ? { payout_day: payoutDayFilter } : {}),
      },
      select: {
        id: true,
        landlord_id: true,
        property_id: true,
        status: true,
        terminated_at: true,
        commission_basis: true,
        commission_rate_bps: true,
        vat_rate_bps: true,
      },
    })) as unknown as MandateRow[];
  }

  /** Traite un mandat pour la période : `'CREATED'` ou `'SKIPPED'` (déjà généré, idempotence). */
  private async processMandate(
    tx: TenantClient,
    organizationId: string,
    mandate: MandateRow,
    periodStart: Date,
    periodEnd: Date,
    jobLabel: string,
  ): Promise<'CREATED' | 'SKIPPED'> {
    // Verrou consultatif PAR (bailleur, période) : la contrainte d'unicité
    // SQL ne protège pas les relevés consolidés (arbitrage n°1, property_id
    // NULL des deux côtés) — voir aussi `remittances.service.ts`, même pattern.
    const lockKey = `owner-statement:${organizationId}:${mandate.landlord_id}:${periodStart
      .toISOString()
      .slice(0, 10)}`;
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', lockKey);

    if (await this.alreadyGenerated(tx, organizationId, mandate, periodStart)) return 'SKIPPED';

    const periodEndForMandate = this.effectivePeriodEnd(mandate, periodStart, periodEnd);

    const accrual = await this.commissions.accrueForPeriod(
      tx,
      organizationId,
      {
        id: mandate.id,
        landlordId: mandate.landlord_id,
        propertyId: mandate.property_id,
        commissionBasis: mandate.commission_basis,
        commissionRateBps: mandate.commission_rate_bps,
        vatRateBps: mandate.vat_rate_bps,
      },
      periodStart,
      periodEndForMandate,
    );

    const expenses = await this.expenseReader.findEligibleForStatement(
      tx,
      organizationId,
      mandate.landlord_id,
      mandate.property_id,
      periodStart,
      periodEndForMandate,
    );
    const expensesAmount = expenses.reduce((sum, e) => sum + e.totalAmount, 0n);
    const chargesCollectedAmount = 0n; // Hors périmètre de cette campagne, voir rapport de livraison.

    const carryForwardAmount = await this.previousCarryForward(
      tx,
      organizationId,
      mandate,
      periodStart,
    );
    const rentDueAmount = await this.rentDueAmount(
      tx,
      organizationId,
      mandate,
      periodStart,
      periodEnd,
    );
    const depositsHeldAmount = await this.depositsHeld(tx, organizationId, mandate);

    const netPayableAmount = computeNetPayable(
      accrual.rentCollectedAmount,
      chargesCollectedAmount,
      accrual.commissionAmount,
      accrual.commissionVatAmount,
      expensesAmount,
      carryForwardAmount,
    );

    const id = newId();
    const { number } = await this.numbering.nextNumber(
      tx,
      organizationId,
      'OWNER_STATEMENT',
      periodStart,
    );
    await tx.owner_statements.create({
      data: {
        id,
        organization_id: organizationId,
        landlord_id: mandate.landlord_id,
        mandate_id: mandate.id,
        property_id: mandate.property_id,
        statement_number: number,
        status: 'DRAFT',
        period_start: periodStart,
        period_end: periodEndForMandate,
        rent_due_amount: rentDueAmount,
        rent_collected_amount: accrual.rentCollectedAmount,
        charges_collected_amount: chargesCollectedAmount,
        commission_amount: accrual.commissionAmount,
        commission_vat_amount: accrual.commissionVatAmount,
        expenses_amount: expensesAmount,
        deposits_held_amount: depositsHeldAmount,
        carry_forward_amount: carryForwardAmount,
        net_payable_amount: netPayableAmount,
        currency: 'XAF',
        collection_rate_bps: computeCollectionRateBps(accrual.rentCollectedAmount, rentDueAmount),
        generated_by_job: jobLabel,
      },
    });

    await this.writeLines(tx, organizationId, id, {
      accrual,
      expenses,
      carryForwardAmount,
      periodStart,
      periodEnd: periodEndForMandate,
    });
    await this.commissions.attachToStatement(tx, accrual.commissionIds, id);
    await this.expenseReader.attachToStatement(
      tx,
      expenses.map((e) => e.id),
      id,
    );

    await audit(this.auditService, tx, {
      organizationId,
      actorLabel: `job.${jobLabel}`,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.OWNER_STATEMENT_GENERATED,
      entityType: 'owner_statements',
      entityId: id,
      newState: toJsonState({
        landlordId: mandate.landlord_id,
        mandateId: mandate.id,
        statementNumber: number,
        netPayableAmount: netPayableAmount.toString(),
      }),
    });
    return 'CREATED';
  }

  /**
   * Mandat résilié PENDANT la période (contrat, § Mandats) : dernier relevé
   * au prorata des encaissements perçus AVANT `terminated_at`. `eligibleMandates`
   * ne sélectionne déjà que les résiliations DANS la période — cette méthode
   * ne fait que borner la fin de période au jour de résiliation.
   */
  private effectivePeriodEnd(mandate: MandateRow, periodStart: Date, periodEnd: Date): Date {
    if (mandate.status !== 'TERMINATED' || !mandate.terminated_at) return periodEnd;
    const terminated = new Date(
      Date.UTC(
        mandate.terminated_at.getUTCFullYear(),
        mandate.terminated_at.getUTCMonth(),
        mandate.terminated_at.getUTCDate(),
      ),
    );
    const bounded = terminated < periodEnd ? terminated : periodEnd;
    // Garde `commissions_period_chk`/`owner_statements_period_chk` (period_start < period_end)
    // dans le cas limite d'une résiliation le jour même du début de période.
    return bounded > periodStart ? bounded : new Date(periodStart.getTime() + 86_400_000);
  }

  /**
   * Idempotence (contrat, arbitrage n°1) : `(organization_id, landlord_id,
   * period_start)` SANS filtrer sur `property_id` pour un mandat PORTEFEUILLE
   * — la contrainte SQL `owner_statements_period_uk` ne le protège pas, deux
   * `NULL` n'étant jamais égaux.
   */
  private async alreadyGenerated(
    tx: TenantClient,
    organizationId: string,
    mandate: MandateRow,
    periodStart: Date,
  ): Promise<boolean> {
    if (mandate.property_id === null) {
      const any = await tx.owner_statements.findFirst({
        where: {
          organization_id: organizationId,
          landlord_id: mandate.landlord_id,
          period_start: periodStart,
          status: { not: 'CANCELLED' },
        },
        select: { id: true },
      });
      return Boolean(any);
    }
    const exact = await tx.owner_statements.findFirst({
      where: {
        organization_id: organizationId,
        landlord_id: mandate.landlord_id,
        property_id: mandate.property_id,
        period_start: periodStart,
        status: { not: 'CANCELLED' },
      },
      select: { id: true },
    });
    return Boolean(exact);
  }

  /** Contrat, arbitrage n°5 : seul un solde NÉGATIF se reporte, jamais un solde positif. */
  private async previousCarryForward(
    tx: TenantClient,
    organizationId: string,
    mandate: MandateRow,
    periodStart: Date,
  ): Promise<bigint> {
    const previous = await tx.owner_statements.findFirst({
      where: {
        organization_id: organizationId,
        landlord_id: mandate.landlord_id,
        property_id: mandate.property_id,
        status: { not: 'CANCELLED' },
        period_start: { lt: periodStart },
      },
      orderBy: { period_start: 'desc' },
      select: { net_payable_amount: true },
    });
    return previous && previous.net_payable_amount < 0n ? previous.net_payable_amount : 0n;
  }

  /**
   * `rent_due_amount` : somme des `rent_invoices.rent_amount` appelées sur le
   * mois civil (statut ni `DRAFT` ni `CANCELLED`), périmètre du mandat.
   * Sert uniquement au taux de recouvrement (§ Campagne, étape 8) — jamais à
   * la commission, qui reste assise sur l'encaissé (arbitrage n°3).
   */
  private async rentDueAmount(
    tx: TenantClient,
    organizationId: string,
    mandate: MandateRow,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<bigint> {
    const agg = await tx.rent_invoices.aggregate({
      where: {
        organization_id: organizationId,
        landlord_id: mandate.landlord_id,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        period_start: { gte: periodStart, lte: periodEnd },
        ...(mandate.property_id ? { property_id: mandate.property_id } : {}),
      },
      _sum: { rent_amount: true },
    });
    return agg._sum.rent_amount ?? 0n;
  }

  /**
   * `deposits_held_amount` : approximation documentée — somme des dépôts de
   * garantie des baux encore en cours (`ACTIVE`/`NOTICE_GIVEN`) du périmètre,
   * PAS un solde de trésorerie réel des cautions (hors périmètre de cette
   * campagne, voir rapport de livraison).
   */
  private async depositsHeld(
    tx: TenantClient,
    organizationId: string,
    mandate: MandateRow,
  ): Promise<bigint> {
    const agg = await tx.leases.aggregate({
      where: {
        organization_id: organizationId,
        landlord_id: mandate.landlord_id,
        status: { in: ['ACTIVE', 'NOTICE_GIVEN'] },
        ...(mandate.property_id ? { property_id: mandate.property_id } : {}),
      },
      _sum: { deposit_amount: true },
    });
    return agg._sum.deposit_amount ?? 0n;
  }

  /** Construit et insère les lignes (contrat, § Campagne, étape 3). */
  private async writeLines(
    tx: TenantClient,
    organizationId: string,
    statementId: string,
    input: {
      accrual: AccrualTotals;
      expenses: readonly ExpenseForStatement[];
      carryForwardAmount: bigint;
      periodStart: Date;
      periodEnd: Date;
    },
  ): Promise<void> {
    const lines: StatementLineInput[] = [];

    for (const payment of input.accrual.payments) {
      lines.push({
        lineType: 'RENT_COLLECTED',
        label: 'Loyer encaissé',
        amount: payment.allocatedAmount,
        isDebit: false,
        propertyId: payment.propertyId,
        leaseId: payment.leaseId,
        paymentId: payment.paymentId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });
    }

    const commissionRows = await this.commissions.listByIds(tx, input.accrual.commissionIds);
    for (const commission of commissionRows) {
      lines.push({
        lineType: 'COMMISSION',
        label: 'Honoraires de gestion',
        amount: commission.amount,
        isDebit: true,
        propertyId: commission.property_id,
        leaseId: commission.lease_id,
        paymentId: commission.payment_id,
        commissionId: commission.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });
      if (commission.vat_amount > 0n) {
        lines.push({
          lineType: 'VAT',
          label: 'TVA sur honoraires',
          amount: commission.vat_amount,
          isDebit: true,
          propertyId: commission.property_id,
          commissionId: commission.id,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        });
      }
    }

    for (const expense of input.expenses) {
      lines.push({
        lineType: 'EXPENSE',
        label: expense.label,
        amount: expense.totalAmount,
        isDebit: true,
        propertyId: expense.propertyId,
        expenseId: expense.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });
    }

    if (input.carryForwardAmount < 0n) {
      lines.push({
        lineType: 'CARRY_FORWARD',
        label: 'Report du solde négatif de la période précédente',
        amount: -input.carryForwardAmount,
        isDebit: true,
      });
    }

    await insertStatementLines(tx, organizationId, statementId, lines);
  }
}
