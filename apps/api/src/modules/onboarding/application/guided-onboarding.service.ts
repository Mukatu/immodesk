import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import {
  InvitationsService,
  type InvitationView,
} from '../../organizations/application/invitations.service';
import type { CreateLeaseInput } from '../../leases/application/lease-input';
import type { LeaseView } from '../../leases/application/lease-views';
import { LeasesService } from '../../leases/application/leases.service';
import type { PropertyInput } from '../../portfolio/application/properties.service';
import { PropertiesService } from '../../portfolio/application/properties.service';
import type { PropertyView } from '../../portfolio/application/portfolio-views';
import { computeOnboardingState, type OnboardingStateView } from '../domain/state';

export interface InviteInput {
  phone: string;
  role: MemberRole;
  fullName?: string;
}

/**
 * Onboarding guidé en trois étapes (contrat phase 10, § « Onboarding
 * guidé ») : premier bien, premier bail, première invitation. Chaque étape
 * délègue ENTIÈREMENT à son module (portfolio, leases, organizations) — cette
 * classe n'ajoute que la garde d'idempotence (409
 * `ONBOARDING.STEP_ALREADY_DONE`) et la lecture de l'état dérivé.
 *
 * À NE PAS CONFONDRE avec `OnboardingService`/`OnboardingController` du
 * module `organizations` (`/organizations/independent-manager/onboarding`,
 * phase 7) : cet assistant-là couvre la création d'une organisation
 * indépendante et ses propres formalités, un périmètre disjoint de celui-ci.
 */
@Injectable()
export class GuidedOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly leases: LeasesService,
    private readonly invitations: InvitationsService,
  ) {}

  async firstProperty(
    organizationId: string,
    userId: string,
    input: PropertyInput,
  ): Promise<PropertyView> {
    await this.assertStepNotDone(organizationId, userId, 'properties', 'first-property');
    return this.properties.create(organizationId, userId, input);
  }

  async firstLease(
    organizationId: string,
    userId: string,
    input: CreateLeaseInput,
  ): Promise<LeaseView> {
    await this.assertStepNotDone(organizationId, userId, 'leases', 'first-lease');
    return this.leases.create(organizationId, userId, input);
  }

  async invite(
    organizationId: string,
    userId: string,
    input: InviteInput,
  ): Promise<InvitationView> {
    await this.assertStepNotDone(organizationId, userId, 'invitations', 'invite');
    return this.invitations.create(organizationId, userId, input);
  }

  async state(organizationId: string, userId: string): Promise<OnboardingStateView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const [propertiesCount, leasesCount, invitationsCount] = await Promise.all([
        tx.properties.count({ where: { deleted_at: null } }),
        tx.leases.count({ where: { deleted_at: null } }),
        tx.invitations.count(),
      ]);
      return computeOnboardingState({ propertiesCount, leasesCount, invitationsCount });
    });
  }

  /**
   * Chaque étape n'est jouable qu'une fois : la rejouer une fois l'entité
   * créée répond 409 plutôt que d'en créer une seconde silencieusement.
   */
  private async assertStepNotDone(
    organizationId: string,
    userId: string,
    table: 'properties' | 'leases' | 'invitations',
    step: string,
  ): Promise<void> {
    const count = await this.prisma.withTenant(organizationId, userId, (tx) => {
      if (table === 'properties') return tx.properties.count({ where: { deleted_at: null } });
      if (table === 'leases') return tx.leases.count({ where: { deleted_at: null } });
      return tx.invitations.count();
    });
    if (count > 0) throw new DomainError('ONBOARDING.STEP_ALREADY_DONE', { step });
  }
}
