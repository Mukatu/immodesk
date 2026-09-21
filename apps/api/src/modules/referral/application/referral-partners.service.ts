import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { generatePartnerCode } from '../domain/referral-partner-code';

export interface ReferralPartnerView {
  id: string;
  partnerCode: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  displayName: string | null;
  totalAccruedAmount: string;
  totalPaidAmount: string;
  createdAt: string;
}

const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class ReferralPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inscription (contrat § Apport d'affaires) : « tout utilisateur
   * authentifié peut le demander ». `referral_partners_user_uk` interdit un
   * second compte partenaire pour le même utilisateur.
   */
  async register(userId: string, displayName?: string): Promise<ReferralPartnerView> {
    const existing = await this.prisma.withUser(userId, (tx) =>
      tx.referral_partners.findUnique({ where: { user_id: userId } }),
    );
    if (existing) {
      throw new DomainError('REFERRALS.PARTNER_ALREADY_EXISTS');
    }

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const partnerCode = generatePartnerCode();
      try {
        const created = await this.prisma.withUser(userId, (tx) =>
          tx.referral_partners.create({
            data: {
              id: newId(),
              user_id: userId,
              partner_code: partnerCode,
              display_name: displayName?.trim() || null,
            },
          }),
        );
        return toPartnerView(created);
      } catch (error) {
        // Hint = nom de COLONNE, pas de contrainte : `create()` (API modèle,
        // pas SQL brut) rapporte `meta.target` comme la liste des champs en
        // conflit (`['partner_code']`), jamais le nom `referral_partners_code_uk`
        // du `map:` Prisma — voir la docstring d'`isUniqueViolation`.
        if (isUniqueViolation(error, 'partner_code')) continue;
        throw error;
      }
    }
    throw new Error('Impossible de générer un code partenaire unique après plusieurs essais.');
  }

  async getMe(userId: string): Promise<ReferralPartnerView> {
    const partner = await this.prisma.withUser(userId, (tx) =>
      tx.referral_partners.findUnique({ where: { user_id: userId } }),
    );
    if (!partner) throw new DomainError('REFERRALS.PARTNER_NOT_FOUND');
    return toPartnerView(partner);
  }
}

function toPartnerView(row: {
  id: string;
  partner_code: string;
  status: string;
  display_name: string | null;
  total_accrued_amount: bigint;
  total_paid_amount: bigint;
  created_at: Date;
}): ReferralPartnerView {
  return {
    id: row.id,
    partnerCode: row.partner_code,
    status: row.status as ReferralPartnerView['status'],
    displayName: row.display_name,
    totalAccruedAmount: row.total_accrued_amount.toString(),
    totalPaidAmount: row.total_paid_amount.toString(),
    createdAt: row.created_at.toISOString(),
  };
}
