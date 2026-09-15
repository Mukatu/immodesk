import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { CommissionCanceller } from '../../payments/domain/ports';
import { assertSupportedBasis, computeCommissionAmounts } from '../domain/commission-rules';
import { toCommissionView, type CommissionRow, type CommissionView } from './commission-views';

/** Mandat minimal requis pour accruer des commissions sur une période. */
export interface AccrualMandate {
  id: string;
  landlordId: string;
  propertyId: string | null;
  commissionBasis: string;
  commissionRateBps: number | null;
  vatRateBps: number;
}

export interface AccruedPaymentLine {
  paymentId: string;
  /** Part du paiement imputée à ce bailleur sur la période (pas le montant brut). */
  allocatedAmount: bigint;
  leaseId: string | null;
  propertyId: string | null;
}

export interface AccrualTotals {
  commissionIds: string[];
  rentCollectedAmount: bigint;
  commissionAmount: bigint;
  commissionVatAmount: bigint;
  /** Une entrée par paiement, pour que l'appelant construise ses lignes `RENT_COLLECTED`. */
  payments: AccruedPaymentLine[];
}

/**
 * Module `commissions` : honoraires de gestion, propriétaire exclusif de la
 * table `commissions`.
 *
 * Implémente aussi le port `COMMISSION_CANCELLER` de `payments` (voir
 * `payments/domain/ports.ts`), à l'image d'`ExpensesService` vis-à-vis
 * d'`EXPENSE_READER` : ce service est le SEUL point d'écriture sur
 * `commissions`, y compris pour `owner-statements`, qui l'injecte
 * directement (les deux modules sont volontairement couplés, voir
 * `owner-statements/application/owner-statements-campaign.service.ts`).
 */
@Injectable()
export class CommissionsService implements CommissionCanceller {
  constructor(private readonly auditService: AuditService) {}

  async require(tx: TenantClient, id: string): Promise<CommissionRow> {
    const row = (await tx.commissions.findFirst({
      where: { id },
    })) as unknown as CommissionRow | null;
    if (!row) throw new DomainError('AGENCY.COMMISSION_NOT_FOUND', { commissionId: id });
    return row;
  }

  /**
   * Accrue les commissions d'un mandat pour une période (contrat, § Campagne
   * mensuelle, étape 1) : une ligne `commissions` PAR PAIEMENT `CONFIRMED`
   * `INBOUND` de la période, rattaché à un bail du périmètre du mandat.
   * `propertyId = null` (mandat portefeuille) ne filtre pas sur le bien.
   *
   * BASE DE CALCUL — PAS `payments.lease_id` : cette colonne est NULLE pour
   * un encaissement saisi au comptoir (espèces, Mobile Money déclaré), tant
   * qu'il n'a pas été imputé à une facture précise. Le rattachement réel au
   * bail (et donc au bien, et donc au mandat) passe TOUJOURS par
   * `payment_allocations.invoice_id → rent_invoices.lease_id` — `rent_invoices`
   * porte aussi `landlord_id` et `property_id` en direct, ce qui évite même
   * de rejoindre `leases`. `base_amount` est la somme des `payment_allocations
   * .amount` imputées à ce bailleur sur la période, PAS le montant brut du
   * paiement (`payments.amount`) : un paiement partiellement affecté (reliquat
   * en avoir locataire, `tenant_credit_id`) ne doit compter que sa part
   * réellement imputée à une facture de ce bailleur.
   *
   * Une ligne `commissions` PAR PAIEMENT (contrat, § Campagne, étape 1) :
   * un même paiement peut porter plusieurs allocations (plusieurs factures,
   * éventuellement plusieurs baux) — elles sont regroupées par `payment_id`.
   * Si ces allocations touchent plusieurs baux DIFFÉRENTS de CE bailleur
   * (rare : versement groupé), `lease_id`/`property_id` de la commission
   * restent `NULL` (ambigus) plutôt que d'en choisir un arbitrairement ; un
   * seul bail concerné les reporte tels quels.
   *
   * Idempotent au niveau du paiement : un paiement qui porte déjà une
   * commission non annulée pour ce bailleur n'en reçoit pas une seconde
   * (reprise après une campagne interrompue) — son montant existant est
   * repris dans les totaux renvoyés à l'appelant plutôt que recalculé.
   *
   * Ne couvre que `RATE_BPS_ON_RENT_COLLECTED` (contrat, arbitrage n°3) :
   * toute autre base lève `AGENCY.COMMISSION_BASIS_UNSUPPORTED`, à charge de
   * l'appelant (`OwnerStatementsCampaignService`) de la capturer par mandat
   * sans interrompre la campagne.
   */
  async accrueForPeriod(
    tx: TenantClient,
    organizationId: string,
    mandate: AccrualMandate,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<AccrualTotals> {
    assertSupportedBasis(mandate.commissionBasis as never);
    if (mandate.commissionRateBps == null) {
      throw new DomainError('AGENCY.COMMISSION_BASIS_UNSUPPORTED', {
        mandateId: mandate.id,
        reason: 'RATE_BPS_MISSING',
      });
    }
    const rateBps = mandate.commissionRateBps;

    const allocated = await tx.$queryRawUnsafe<
      Array<{
        payment_id: string;
        allocated_amount: bigint;
        lease_id: string | null;
        property_id: string | null;
      }>
    >(
      // sum(bigint) renvoie NUMERIC en PostgreSQL (jamais bigint) : sans le
      // cast explicite, Prisma renverrait une chaîne/Decimal que le typage
      // `$queryRawUnsafe<...>` prétend faussement être un `bigint`, et
      // `rentCollectedAmount += row.allocated_amount` planterait
      // (« Cannot mix BigInt and other types »).
      `SELECT pa.payment_id,
              sum(pa.amount)::bigint AS allocated_amount,
              -- PostgreSQL n'a pas d'agrégat max()/min() pour le type uuid :
              -- passage par text le temps de l'agrégation. Sans danger ici,
              -- count(DISTINCT ...) = 1 garantit qu'une seule valeur existe.
              CASE WHEN count(DISTINCT ri.lease_id) = 1 THEN max(ri.lease_id::text)::uuid ELSE NULL END AS lease_id,
              CASE WHEN count(DISTINCT ri.property_id) = 1 THEN max(ri.property_id::text)::uuid ELSE NULL END AS property_id
         FROM payment_allocations pa
         JOIN payments p ON p.id = pa.payment_id
         JOIN rent_invoices ri ON ri.id = pa.invoice_id
        WHERE pa.organization_id = $1::uuid
          AND ri.landlord_id = $2::uuid
          AND p.status = 'CONFIRMED' AND p.direction = 'INBOUND'
          AND p.payment_date BETWEEN $3::date AND $4::date
          AND NOT pa.is_reversal
          AND NOT EXISTS (SELECT 1 FROM payment_allocations r WHERE r.reversal_of_id = pa.id)
          AND ($5::uuid IS NULL OR ri.property_id = $5::uuid)
        GROUP BY pa.payment_id
        ORDER BY pa.payment_id`,
      organizationId,
      mandate.landlordId,
      periodStart,
      periodEnd,
      mandate.propertyId,
    );

    let rentCollectedAmount = 0n;
    let commissionAmount = 0n;
    let commissionVatAmount = 0n;
    const commissionIds: string[] = [];
    const paymentLines: AccruedPaymentLine[] = [];

    if (allocated.length === 0) {
      return {
        commissionIds,
        rentCollectedAmount,
        commissionAmount,
        commissionVatAmount,
        payments: paymentLines,
      };
    }

    const existingByPayment = new Map(
      (
        await tx.commissions.findMany({
          where: {
            organization_id: organizationId,
            landlord_id: mandate.landlordId,
            payment_id: { in: allocated.map((a) => a.payment_id) },
            status: { not: 'CANCELLED' },
          },
          select: { id: true, payment_id: true, amount: true, vat_amount: true },
        })
      ).map((c) => [c.payment_id as string, c]),
    );

    for (const row of allocated) {
      rentCollectedAmount += row.allocated_amount;
      paymentLines.push({
        paymentId: row.payment_id,
        allocatedAmount: row.allocated_amount,
        leaseId: row.lease_id,
        propertyId: row.property_id,
      });

      const existing = existingByPayment.get(row.payment_id);
      if (existing) {
        commissionAmount += existing.amount;
        commissionVatAmount += existing.vat_amount;
        commissionIds.push(existing.id);
        continue;
      }

      const { amount, vatAmount, totalAmount } = computeCommissionAmounts(
        row.allocated_amount,
        rateBps,
        mandate.vatRateBps,
      );
      const id = newId();
      await tx.commissions.create({
        data: {
          id,
          organization_id: organizationId,
          mandate_id: mandate.id,
          landlord_id: mandate.landlordId,
          lease_id: row.lease_id,
          property_id: row.property_id,
          payment_id: row.payment_id,
          status: 'ACCRUED',
          basis: mandate.commissionBasis as never,
          period_start: periodStart,
          period_end: periodEnd,
          base_amount: row.allocated_amount,
          rate_bps: rateBps,
          amount,
          vat_rate_bps: mandate.vatRateBps,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          currency: 'XAF',
          accrued_at: new Date(),
        },
      });
      await audit(this.auditService, tx, {
        organizationId,
        actorLabel: 'job.agency-monthly',
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.COMMISSION_ACCRUED,
        entityType: 'commissions',
        entityId: id,
        newState: toJsonState({
          mandateId: mandate.id,
          paymentId: row.payment_id,
          amount: amount.toString(),
          vatAmount: vatAmount.toString(),
        }),
      });
      commissionAmount += amount;
      commissionVatAmount += vatAmount;
      commissionIds.push(id);
    }

    return {
      commissionIds,
      rentCollectedAmount,
      commissionAmount,
      commissionVatAmount,
      payments: paymentLines,
    };
  }

  // --- Consommé par `owner-statements` (couplage direct, voir commissions.module.ts) ---

  /** Relit les commissions accruées, pour construire les lignes `COMMISSION`/`VAT` du relevé. */
  async listByIds(tx: TenantClient, ids: readonly string[]): Promise<CommissionRow[]> {
    if (!ids.length) return [];
    return (await tx.commissions.findMany({
      where: { id: { in: [...ids] } },
    })) as unknown as CommissionRow[];
  }

  /** Rattache définitivement les commissions au relevé généré (contrat, § Campagne, étape 4). */
  async attachToStatement(
    tx: TenantClient,
    commissionIds: readonly string[],
    statementId: string,
  ): Promise<void> {
    if (!commissionIds.length) return;
    await tx.commissions.updateMany({
      where: { id: { in: [...commissionIds] } },
      data: { owner_statement_id: statementId, updated_at: new Date() },
    });
  }

  /** Libère les commissions d'un relevé annulé (contrat, § Machine à états, `CANCELLED`). */
  async detachFromStatement(tx: TenantClient, statementId: string): Promise<void> {
    await tx.commissions.updateMany({
      where: { owner_statement_id: statementId },
      data: { owner_statement_id: null, updated_at: new Date() },
    });
  }

  // --- Port COMMISSION_CANCELLER, consommé par `payments/reversal.service.ts` ---

  /**
   * Contre-passation d'une commission après contre-passation de son
   * paiement (contrat, arbitrage n°3 : « annule sa commission par une
   * commission miroir »). Calqué sur `ReversalService` : le montant de la
   * commission miroir reste POSITIF (`commissions.amount >= 0` en base), et
   * c'est le couple `status = CANCELLED` + `reversal_of_id` qui porte
   * l'annulation — jamais un montant négatif.
   *
   * DÉCISIONS (contrat laissé à notre jugement) :
   * - Commission déjà rattachée à un relevé (`owner_statement_id` non nul,
   *   émis ou non) : le relevé n'est JAMAIS modifié (append-only, et de
   *   toute façon `commissions` n'écrit jamais dans `owner_statements`) ;
   *   la commission d'origine reste ACCRUED et rattachée telle quelle, seul
   *   le miroir naît, SANS `owner_statement_id` — il sera repris par la
   *   PROCHAINE campagne comme un ajustement hors relevé courant.
   * - Commission encore ACCRUED et SANS relevé : l'originale bascule aussi
   *   à CANCELLED (en plus du miroir), pour ne pas laisser une commission
   *   ACCRUED fantôme sur un paiement contre-passé. Sans risque de reprise
   *   erronée par une campagne ultérieure : le paiement contre-passé perd
   *   son statut `CONFIRMED`, condition sine qua non d'`accrueForPeriod`.
   */
  async cancelForPayment(
    tx: TenantClient,
    input: { organizationId: string; paymentId: string; reason: string },
  ): Promise<void> {
    const originals = (await tx.commissions.findMany({
      where: {
        organization_id: input.organizationId,
        payment_id: input.paymentId,
        status: 'ACCRUED',
      },
    })) as unknown as CommissionRow[];

    for (const original of originals) {
      const mirrorId = newId();
      await tx.commissions.create({
        data: {
          id: mirrorId,
          organization_id: original.organization_id,
          mandate_id: original.mandate_id,
          landlord_id: original.landlord_id,
          lease_id: original.lease_id,
          property_id: original.property_id,
          invoice_id: original.invoice_id,
          payment_id: original.payment_id,
          status: 'CANCELLED',
          basis: original.basis as never,
          period_start: original.period_start,
          period_end: original.period_end,
          base_amount: original.base_amount,
          rate_bps: original.rate_bps,
          flat_amount: original.flat_amount,
          amount: original.amount,
          vat_rate_bps: original.vat_rate_bps,
          vat_amount: original.vat_amount,
          total_amount: original.total_amount,
          currency: original.currency,
          reversal_of_id: original.id,
          notes: input.reason,
        },
      });
      if (!original.owner_statement_id) {
        await tx.commissions.update({
          where: { id: original.id },
          data: { status: 'CANCELLED', updated_at: new Date() },
        });
      }
      await audit(this.auditService, tx, {
        organizationId: input.organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.COMMISSION_REVERSED,
        entityType: 'commissions',
        entityId: original.id,
        previousState: toJsonState({ status: 'ACCRUED' }),
        newState: toJsonState({
          mirrorId,
          reason: input.reason,
          originalCancelled: !original.owner_statement_id,
        }),
      });
    }
  }

  toView(row: CommissionRow): CommissionView {
    return toCommissionView(row);
  }
}
