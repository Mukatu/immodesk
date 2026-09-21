import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import { ReferralProgramsService } from './referral-programs.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import type { ReferralView } from './referral-queries.service';
import { toReferralView } from './referral-queries.service';

/**
 * Rattachement d'un filleul par code, à l'inscription/onboarding d'une
 * organisation (docs/api/phase10-contract.md, § Apport d'affaires,
 * source `CODE_AT_SIGNUP`). `POST /v1/organizations/{id}/referral-code`.
 *
 * L'appelant est le PROPRIÉTAIRE DE L'ORGANISATION FILLEULE, jamais le
 * partenaire cité par son code : la policy RLS `partner_self` (migration
 * `0_init`) restreint `referral_partners`/`referrals` au seul partenaire
 * (`user_id = app.current_user_id`), donc un rattachement par un tiers ne
 * peut aboutir sous ce rôle. Cette écriture passe par
 * `PrismaService.withAdmin` (BYPASSRLS), comme `TenantDirectoryService` pour
 * la même raison.
 */
@Injectable()
export class ReferralCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: TenantDirectoryService,
    private readonly programs: ReferralProgramsService,
  ) {}

  async attach(organizationId: string, code: string): Promise<ReferralView> {
    const partner = await this.prisma.withAdmin((tx) =>
      tx.referral_partners.findUnique({ where: { partner_code: code.trim().toUpperCase() } }),
    );
    if (!partner) {
      throw new DomainError('REFERRALS.PARTNER_NOT_FOUND');
    }

    // Anti-abus (contrat) : ni auto-parrainage de sa propre organisation, ni
    // parrainage d'une organisation dont le partenaire est déjà membre.
    if (partner.organization_id === organizationId) {
      throw new DomainError('REFERRALS.SELF_REFERRAL');
    }
    const memberships = await this.directory.listActiveMemberships(partner.user_id);
    if (memberships.some((m) => m.organizationId === organizationId)) {
      throw new DomainError('REFERRALS.SELF_REFERRAL');
    }

    const program = await this.programs.getActiveDefault();

    try {
      const referral = await this.prisma.withAdmin((tx) =>
        tx.referrals.create({
          data: {
            id: newId(),
            partner_id: partner.id,
            referred_organization_id: organizationId,
            program_id: program.id,
            source: 'CODE_AT_SIGNUP',
            status: 'PENDING',
            code_used: code.trim().toUpperCase(),
          },
        }),
      );
      return toReferralView(referral);
    } catch (error) {
      // Sans hint de colonne : `referrals` ne porte qu'UNE contrainte
      // d'unicité (`referrals_org_uk`), et `meta.target` peut d'ailleurs être
      // absent selon le chemin d'exécution Prisma — voir `isUniqueViolation`
      // et la docstring équivalente dans `ReferralPropertyLeadService.confirm`.
      if (isUniqueViolation(error)) {
        throw new DomainError('REFERRALS.ALREADY_REFERRED');
      }
      throw error;
    }
  }
}
