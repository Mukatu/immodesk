import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { splitByMonthlyCap } from '../domain/commission-math';
import { ReferralProgramsService } from './referral-programs.service';

/**
 * Campagne mensuelle d'approbation (contrat § Apport d'affaires, cycle :
 * « ACCRUED devient APPROVED par une campagne mensuelle »). Le plafond
 * mensuel du programme (`monthly_cap_amount`) n'est appliqué qu'ICI, pas à
 * la constatation (`ReferralQualificationService`) : l'excédent reste
 * ACCRUED et se reporte à une prochaine campagne (arbitrage explicite).
 *
 * Opération d'administration plateforme (`OWNER plateforme`, jamais le
 * partenaire lui-même) : passe par `PrismaService.withAdmin` (BYPASSRLS),
 * conformément au contrat (« approbation... passe par immodesk_admin »,
 * migration `0_init`) — la policy `partner_self` ne laisserait de toute
 * façon voir/modifier que les lignes du SEUL appelant, jamais celles de
 * tous les partenaires d'une campagne.
 */
@Injectable()
export class ReferralCommissionsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programs: ReferralProgramsService,
  ) {}

  async approve(options: {
    partnerId?: string;
    periodMonth?: string; // 'AAAA-MM'
    approvedByUserId: string;
  }): Promise<{ approved: number; heldByCap: number }> {
    const periodStart = options.periodMonth
      ? new Date(`${options.periodMonth}-01T00:00:00.000Z`)
      : startOfCurrentUtcMonth();

    const partnerIds = options.partnerId
      ? [options.partnerId]
      : await this.distinctAccruedPartners(periodStart);

    let approved = 0;
    let heldByCap = 0;

    for (const partnerId of partnerIds) {
      const result = await this.approveForPartner(partnerId, periodStart, options.approvedByUserId);
      approved += result.approved;
      heldByCap += result.heldByCap;
    }

    return { approved, heldByCap };
  }

  private async distinctAccruedPartners(periodStart: Date): Promise<string[]> {
    const rows = await this.prisma.withAdmin((tx) =>
      tx.referral_commissions.findMany({
        where: { status: 'ACCRUED', period_month: periodStart },
        select: { partner_id: true },
        distinct: ['partner_id'],
      }),
    );
    return rows.map((r) => r.partner_id);
  }

  private async approveForPartner(
    partnerId: string,
    periodStart: Date,
    approvedByUserId: string,
  ): Promise<{ approved: number; heldByCap: number }> {
    return this.prisma.withAdmin(async (tx) => {
      const commissions = await tx.referral_commissions.findMany({
        where: { partner_id: partnerId, status: 'ACCRUED', period_month: periodStart },
        orderBy: { accrued_at: 'asc' },
      });
      if (commissions.length === 0) return { approved: 0, heldByCap: 0 };

      const referrals = await tx.referrals.findMany({
        where: { id: { in: [...new Set(commissions.map((c) => c.referral_id))] } },
        select: { id: true, program_id: true },
      });
      const programIdByReferral = new Map(referrals.map((r) => [r.id, r.program_id]));

      const alreadyApprovedAgg = await tx.referral_commissions.aggregate({
        where: {
          partner_id: partnerId,
          period_month: periodStart,
          status: { in: ['APPROVED', 'PAID'] },
        },
        _sum: { commission_amount: true },
      });
      let runningApproved = alreadyApprovedAgg._sum.commission_amount ?? 0n;

      let approved = 0;
      let heldByCap = 0;
      const now = new Date();

      for (const commission of commissions) {
        const programId = programIdByReferral.get(commission.referral_id);
        const program = programId ? await this.programs.getById(programId) : null;
        const { approvable, heldByCap: held } = splitByMonthlyCap(
          commission.commission_amount,
          runningApproved,
          program?.monthlyCapAmount ?? null,
        );

        if (approvable === commission.commission_amount) {
          await tx.referral_commissions.update({
            where: { id: commission.id },
            data: { status: 'APPROVED', approved_at: now, approved_by_user_id: approvedByUserId },
          });
          runningApproved += approvable;
          approved += 1;
        } else {
          // Granularité par ligne (simplification assumée) : une commission
          // qui ne tient pas ENTIÈREMENT dans le plafond restant reste ACCRUED
          // en totalité plutôt que d'être scindée en deux lignes — elle se
          // reporte à une prochaine campagne, conformément au contrat.
          void held;
          heldByCap += 1;
        }
      }

      return { approved, heldByCap };
    });
  }
}

function startOfCurrentUtcMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
