import { Injectable } from '@nestjs/common';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { runWithTenant } from '../../../shared/tenant/tenant-context';
import { businessToday } from '../../../shared/time/business-date';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { OrganizationView } from '../../identity/application/profile.service';
import { MandatesService, type MandateInput } from '../../mandates/application/mandates.service';
import type { MandateView } from '../../mandates/application/mandate-views';
import { LandlordsService, type LandlordInput } from '../../parties/application/landlords.service';
import type { LandlordView } from '../../parties/application/party-views';
import type { PropertyView } from '../../portfolio/application/portfolio-views';
import {
  PropertiesService,
  type PropertyInput,
} from '../../portfolio/application/properties.service';
import { OrganizationsService, type CreateOrganizationInput } from './organizations.service';

/** Organisation de l'onboarding : identique à la création directe, moins `type` (imposé). */
export type OnboardingOrganizationInput = Omit<CreateOrganizationInput, 'type'>;

/** Mandat de l'onboarding : `landlordId`/`propertyIds` déduits, `startDate` par défaut. */
export type OnboardingMandateInput = Omit<
  MandateInput,
  'landlordId' | 'propertyIds' | 'startDate'
> & { startDate?: string };

export interface OnboardingInput {
  organization: OnboardingOrganizationInput;
  landlord: LandlordInput;
  property: Omit<PropertyInput, 'landlordId'>;
  mandate?: OnboardingMandateInput;
}

export interface OnboardingResult {
  organization: OrganizationView;
  landlord: LandlordView;
  property: PropertyView;
  mandate: MandateView;
}

/**
 * Onboarding du gestionnaire indépendant (docs/api/phase7-contract.md, §
 * « Portail bailleur et onboarding »). Crée organisation, bailleur, bien et
 * mandat EN UNE SEULE TRANSACTION, en réutilisant les `createInTx` déjà
 * extraits de chaque service métier plutôt que leurs façades `create()`
 * (qui ouvriraient chacune leur propre transaction).
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly landlords: LandlordsService,
    private readonly properties: PropertiesService,
    private readonly mandates: MandatesService,
    private readonly auditService: AuditService,
  ) {}

  async onboardIndependentManager(
    userId: string,
    input: OnboardingInput,
  ): Promise<OnboardingResult> {
    const organizationId = newId();
    const slug = await this.organizations.resolveSlug(
      input.organization.tradeName || input.organization.legalName,
    );

    // `audit()` (appelé par `landlords`/`properties`/`mandates`.createInTx)
    // lit l'organisation, l'utilisateur et le rôle courants dans le contexte
    // `AsyncLocalStorage` ouvert par `TenantContextInterceptor`. Cette route
    // n'a NI `@Roles(...)` ni `@RequireOrganization()` (l'appelant n'est pas
    // encore membre), donc `OrganizationGuard` n'ouvre pas ce contexte : on
    // l'ouvre nous-mêmes, le temps de l'onboarding. `membershipId` n'est lu
    // par aucun consommateur de ce contexte ; seule sa présence est requise.
    return runWithTenant(
      { organizationId, userId, role: 'OWNER', membershipId: 'onboarding' },
      () =>
        this.prisma.withTenant(organizationId, userId, async (tx) => {
          const organization = await this.organizations.createInTx(tx, organizationId, userId, {
            ...input.organization,
            type: 'INDEPENDENT_MANAGER',
            slug,
          });

          const landlord = await this.landlords.createInTx(
            tx,
            organizationId,
            userId,
            input.landlord,
          );

          const property = await this.properties.createInTx(tx, organizationId, userId, {
            ...input.property,
            landlordId: landlord.id,
          });

          const mandate = await this.mandates.createInTx(tx, organizationId, userId, {
            ...input.mandate,
            landlordId: landlord.id,
            propertyIds: [property.id],
            startDate: input.mandate?.startDate ?? businessToday().toISOString().slice(0, 10),
          });

          await audit(this.auditService, tx, {
            action: 'CREATE',
            operation: AUDIT_OPERATIONS.INDEPENDENT_MANAGER_ONBOARDED,
            entityType: 'organizations',
            entityId: organizationId,
            actorUserId: userId,
            actorRole: 'OWNER',
            newState: toJsonState({
              organizationId,
              landlordId: landlord.id,
              propertyId: property.id,
              mandateId: mandate.id,
            }),
          });

          return { organization, landlord, property, mandate };
        }),
    );
  }
}
