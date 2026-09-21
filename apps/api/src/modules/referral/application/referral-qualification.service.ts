import { Injectable, Logger } from '@nestjs/common';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  computeCommissionAmount,
  computeReferralExpiry,
  periodMonthOf,
} from '../domain/commission-math';
import { ReferralProgramsService } from './referral-programs.service';

/**
 * Entrée du point d'intégration exposé au module `subscriptions`
 * (docs/api/phase10-contract.md, § Apport d'affaires, arbitrage 6 : la
 * qualification ne se déclenche QUE sur un encaissement réel, jamais à
 * l'inscription).
 */
export interface PaidSubscriptionInvoiceEvent {
  invoiceId: string;
  organizationId: string;
  /** Montant hors taxe réellement encaissé (`subtotal_amount`), en XAF. */
  subtotalAmount: bigint;
  paidAt: Date;
}

/**
 * POINT D'INTÉGRATION — appelé par `SubscriptionPaymentsService.verifyStatus`
 * (module `subscriptions`) juste après qu'une `subscription_invoices` passe
 * réellement à PAID (après re-interrogation de l'agrégateur, jamais sur le
 * seul webhook — arbitrage 8 du contrat), avec :
 *   - `invoiceId`        : `subscription_invoices.id` ;
 *   - `organizationId`   : organisation filleule potentielle ;
 *   - `subtotalAmount`   : `subscription_invoices.subtotal_amount` (assiette
 *                          hors taxe, PAS `total_amount` qui inclut la TVA) ;
 *   - `paidAt`           : `subscription_invoices.paid_at`.
 *
 * Idempotent : `referral_commissions_invoice_uk` (index unique partiel sur
 * `subscription_invoice_id` où `reversal_of_id IS NULL`) empêche une double
 * commission pour la même facture — un second appel pour la même facture est
 * un no-op silencieux. Effet nul si l'organisation n'est pas parrainée.
 *
 * Déclenché par le module `subscriptions` (jamais par une requête HTTP d'un
 * partenaire ou d'un gestionnaire), donc sans `app.current_user_id` à
 * positionner pour la policy RLS `partner_self` : passe par
 * `PrismaService.withAdmin` (BYPASSRLS), comme le contrat le documente
 * (« constatation... passe par immodesk_admin », migration `0_init`).
 */
@Injectable()
export class ReferralQualificationService {
  private readonly logger = new Logger(ReferralQualificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly programs: ReferralProgramsService,
  ) {}

  async onSubscriptionInvoicePaid(event: PaidSubscriptionInvoiceEvent): Promise<void> {
    await this.prisma.withAdmin(async (tx) => {
      const referral = await tx.referrals.findUnique({
        where: { referred_organization_id: event.organizationId },
      });
      if (!referral) return; // Organisation non parrainée : rien à faire.
      if (referral.status === 'CANCELLED') return;

      const already = await tx.referral_commissions.findFirst({
        where: { subscription_invoice_id: event.invoiceId, reversal_of_id: null },
        select: { id: true },
      });
      if (already) return; // Idempotence (référence unique partielle en base).

      const program =
        (await this.programs.getById(referral.program_id)) ??
        (await this.programs.getActiveDefault());

      let qualifiedAt = referral.qualified_at;
      let expiresAt = referral.expires_at;
      let status = referral.status;

      if (referral.status === 'PENDING') {
        // Premier encaissement réel : qualification ET activation immédiates
        // (aucune étape manuelle décrite entre QUALIFIED et ACTIVE dans le
        // contrat — hypothèse documentée, à ajuster si un futur arbitrage
        // introduit une revue manuelle intermédiaire).
        qualifiedAt = event.paidAt;
        expiresAt = computeReferralExpiry(event.paidAt, program.durationMonths);
        status = 'ACTIVE';
      }

      if (expiresAt && event.paidAt > expiresAt) {
        // Hors fenêtre de commissionnement : la facture ne génère aucune
        // commission, et le parrainage est marqué EXPIRED s'il ne l'est pas.
        if (referral.status !== 'EXPIRED') {
          await tx.referrals.update({ where: { id: referral.id }, data: { status: 'EXPIRED' } });
        }
        return;
      }

      const commissionAmount = computeCommissionAmount(event.subtotalAmount, program.rateBps);

      await tx.$transaction([
        tx.referrals.update({
          where: { id: referral.id },
          data: {
            status,
            qualified_at: qualifiedAt,
            activated_at: referral.activated_at ?? event.paidAt,
            expires_at: expiresAt,
          },
        }),
        tx.referral_commissions.create({
          data: {
            id: newId(),
            referral_id: referral.id,
            partner_id: referral.partner_id,
            subscription_invoice_id: event.invoiceId,
            base_amount: event.subtotalAmount,
            rate_bps: program.rateBps,
            commission_amount: commissionAmount,
            currency: program.currency,
            status: 'ACCRUED',
            period_month: periodMonthOf(event.paidAt),
            accrued_at: event.paidAt,
          },
        }),
        tx.referral_partners.update({
          where: { id: referral.partner_id },
          data: { total_accrued_amount: { increment: commissionAmount } },
        }),
      ]);

      this.logger.log(
        `Commission de parrainage constatée : referral=${referral.id} facture=${event.invoiceId} montant=${commissionAmount}`,
      );
    });
  }

  /**
   * Contre-passation d'une commission déjà PAID/APPROVED/ACCRUED (arbitrage
   * 7 : une commission ne se modifie jamais, elle se contre-passe). À
   * appeler par le module `subscriptions` quand une facture réglée est
   * remboursée ou annulée après coup.
   */
  async reverseCommissionForInvoice(invoiceId: string, reason: string): Promise<void> {
    await this.prisma.withAdmin(async (tx) => {
      const original = await tx.referral_commissions.findFirst({
        where: { subscription_invoice_id: invoiceId, reversal_of_id: null },
      });
      if (!original) return;

      const alreadyReversed = await tx.referral_commissions.findFirst({
        where: { reversal_of_id: original.id },
        select: { id: true },
      });
      if (alreadyReversed) return;

      await tx.$transaction([
        tx.referral_commissions.create({
          data: {
            id: newId(),
            referral_id: original.referral_id,
            partner_id: original.partner_id,
            subscription_invoice_id: original.subscription_invoice_id,
            base_amount: original.base_amount,
            rate_bps: original.rate_bps,
            commission_amount: original.commission_amount,
            currency: original.currency,
            status: 'REVERSED',
            period_month: original.period_month,
            accrued_at: new Date(),
            reversal_of_id: original.id,
            reason,
          },
        }),
        tx.referral_partners.update({
          where: { id: original.partner_id },
          data: { total_accrued_amount: { decrement: original.commission_amount } },
        }),
      ]);
    });
  }
}
