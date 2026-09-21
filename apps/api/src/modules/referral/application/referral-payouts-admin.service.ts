import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface ReferralPayoutView {
  id: string;
  partnerId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: string;
  status: string;
  msisdn: string | null;
  requestedAt: string;
}

/**
 * Versement groupé des commissions APPROVED (contrat § Apport d'affaires,
 * seuil `referral_programs.min_payout_amount`). Le règlement Mobile Money
 * effectif (transition PENDING → PAID) n'est PAS dans le périmètre de cette
 * tranche : seules la création du lot et sa consultation sont demandées
 * (voir rapport de livraison). `referral_commissions.payout_id` est
 * renseigné dès la création, mais le statut des commissions reste APPROVED
 * jusqu'au règlement réel (`referral_commissions_paid_chk` exige `paid_at`
 * ET `payout_id` pour passer PAID : les deux devront être posés ensemble par
 * l'intégration Mobile Money, hors périmètre ici).
 *
 * Opération d'administration plateforme : passe par `PrismaService.withAdmin`
 * (BYPASSRLS), comme `ReferralCommissionsAdminService` et pour la même
 * raison (la policy `partner_self` ne porte que sur l'appelant lui-même).
 */
@Injectable()
export class ReferralPayoutsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayouts(options: { partnerId?: string }): Promise<string[]> {
    const partnerIds = options.partnerId
      ? [options.partnerId]
      : await this.distinctApprovedPartners();

    const payoutIds: string[] = [];
    for (const partnerId of partnerIds) {
      const payoutId = await this.createPayoutForPartner(partnerId);
      if (payoutId) payoutIds.push(payoutId);
    }
    return payoutIds;
  }

  private async distinctApprovedPartners(): Promise<string[]> {
    const rows = await this.prisma.withAdmin((tx) =>
      tx.referral_commissions.findMany({
        where: { status: 'APPROVED', payout_id: null },
        select: { partner_id: true },
        distinct: ['partner_id'],
      }),
    );
    return rows.map((r) => r.partner_id);
  }

  private async createPayoutForPartner(partnerId: string): Promise<string | null> {
    return this.prisma.withAdmin(async (tx) => {
      const partner = await tx.referral_partners.findUnique({ where: { id: partnerId } });
      if (!partner) return null;

      const commissions = await tx.referral_commissions.findMany({
        where: { partner_id: partnerId, status: 'APPROVED', payout_id: null },
        orderBy: { accrued_at: 'asc' },
      });
      if (commissions.length === 0) return null;

      const referral = await tx.referrals.findUnique({
        where: { id: commissions[0].referral_id },
        select: { program_id: true },
      });
      const program = referral
        ? await tx.referral_programs.findUnique({ where: { id: referral.program_id } })
        : null;

      const totalAmount = commissions.reduce((sum, c) => sum + c.commission_amount, 0n);
      if (program && totalAmount < program.min_payout_amount) {
        throw new DomainError('REFERRALS.PAYOUT_THRESHOLD_NOT_REACHED', {
          partnerId,
          totalAmount: totalAmount.toString(),
          minPayoutAmount: program.min_payout_amount.toString(),
        });
      }

      const periods = commissions.map((c) => c.accrued_at);
      const periodStart = new Date(Math.min(...periods.map((d) => d.getTime())));
      const periodEnd = new Date(Math.max(...periods.map((d) => d.getTime())));
      const payoutId = newId();

      await tx.$transaction([
        tx.referral_payouts.create({
          data: {
            id: payoutId,
            partner_id: partnerId,
            period_start: periodStart,
            period_end: periodEnd,
            total_amount: totalAmount,
            currency: commissions[0].currency,
            status: 'PENDING',
            momo_provider: partner.payout_momo_provider,
            msisdn: partner.payout_msisdn,
          },
        }),
        tx.referral_commissions.updateMany({
          where: { id: { in: commissions.map((c) => c.id) } },
          data: { payout_id: payoutId },
        }),
      ]);

      return payoutId;
    });
  }

  async getById(id: string): Promise<ReferralPayoutView> {
    const payout = await this.prisma.withAdmin((tx) =>
      tx.referral_payouts.findUnique({ where: { id } }),
    );
    if (!payout) throw new DomainError('REFERRALS.NOT_FOUND');
    return {
      id: payout.id,
      partnerId: payout.partner_id,
      periodStart: payout.period_start.toISOString().slice(0, 10),
      periodEnd: payout.period_end.toISOString().slice(0, 10),
      totalAmount: payout.total_amount.toString(),
      status: payout.status,
      msisdn: payout.msisdn,
      requestedAt: payout.requested_at.toISOString(),
    };
  }
}
