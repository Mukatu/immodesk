import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface ActiveProgram {
  id: string;
  code: string;
  rateBps: number;
  durationMonths: number;
  minPayoutAmount: bigint;
  monthlyCapAmount: bigint | null;
  currency: string;
}

/**
 * Résolution du barème en vigueur (`referral_programs`, table GLOBALE).
 * `REFERRAL_DEFAULT_PROGRAM_CODE` (docs/api/phase10-contract.md, § variables
 * d'environnement) désigne le programme standard ; à défaut, le programme
 * actif le plus récent sert de repli, pour ne jamais bloquer un rattachement
 * faute de configuration explicite.
 */
@Injectable()
export class ReferralProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async getActiveDefault(now: Date = new Date()): Promise<ActiveProgram> {
    const byCode = await this.prisma.referral_programs.findFirst({
      where: {
        code: this.config.REFERRAL_DEFAULT_PROGRAM_CODE,
        is_active: true,
        valid_from: { lte: now },
        OR: [{ valid_to: null }, { valid_to: { gte: now } }],
      },
    });
    const program =
      byCode ??
      (await this.prisma.referral_programs.findFirst({
        where: {
          is_active: true,
          valid_from: { lte: now },
          OR: [{ valid_to: null }, { valid_to: { gte: now } }],
        },
        orderBy: { valid_from: 'desc' },
      }));

    if (!program) {
      throw new Error(
        'Aucun programme de parrainage actif configuré (referral_programs). ' +
          'Vérifier REFERRAL_DEFAULT_PROGRAM_CODE et la table de barèmes.',
      );
    }

    return {
      id: program.id,
      code: program.code,
      rateBps: program.rate_bps,
      durationMonths: program.duration_months,
      minPayoutAmount: program.min_payout_amount,
      monthlyCapAmount: program.monthly_cap_amount,
      currency: program.currency,
    };
  }

  async getById(programId: string): Promise<ActiveProgram | null> {
    const program = await this.prisma.referral_programs.findUnique({ where: { id: programId } });
    if (!program) return null;
    return {
      id: program.id,
      code: program.code,
      rateBps: program.rate_bps,
      durationMonths: program.duration_months,
      minPayoutAmount: program.min_payout_amount,
      monthlyCapAmount: program.monthly_cap_amount,
      currency: program.currency,
    };
  }
}
