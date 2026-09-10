import { Injectable } from '@nestjs/common';
import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type {
  OrganizationCreatedEvent,
  OrganizationLifecycleListener,
} from '../../organizations/domain/ports';

/**
 * Types d'organisation qui SONT elles-mêmes le bailleur de leur patrimoine.
 * Une `AGENCY` gère des biens de tiers sous mandat : elle n'a pas de « self ».
 */
const SELF_LANDLORD_TYPES: ReadonlySet<string> = new Set([
  'INDEPENDENT_LANDLORD',
  'INDEPENDENT_MANAGER',
]);

/**
 * Abonné au cycle de vie des organisations : crée le bailleur « self ».
 *
 * C'est le module `parties` qui possède la table `landlords`, donc c'est lui
 * qui écrit. `organizations` ne connaît que le port
 * `OrganizationLifecycleListener` : aucun import croisé, la règle du contrat
 * de phase 1 reste testable seule.
 *
 * L'écriture se fait dans la transaction de création de l'organisation :
 * l'index unique partiel `landlords_self_uk` garantit qu'il ne peut jamais y
 * avoir deux bailleurs « self » vivants par organisation.
 */
@Injectable()
export class SelfLandlordProvisioner implements OrganizationLifecycleListener {
  constructor(private readonly auditService: AuditService) {}

  async onOrganizationCreated(tx: TenantClient, event: OrganizationCreatedEvent): Promise<void> {
    if (!SELF_LANDLORD_TYPES.has(event.type)) return;

    const id = newId();
    const name = event.tradeName ?? event.legalName;

    await tx.landlords.create({
      data: {
        id,
        organization_id: event.organizationId,
        // Personne morale : le tiers, c'est l'organisation elle-même. Sa
        // raison sociale satisfait `landlords_name_chk` sans inventer un
        // patronyme que l'utilisateur n'a pas saisi.
        party_type: 'COMPANY',
        is_self: true,
        company_name: name,
        primary_phone: event.contactPhone,
        city: event.city,
        district: event.district,
        country_code: 'CG',
        payout_method: 'MOBILE_MONEY',
        notes: "Bailleur « self » créé automatiquement à la création de l'organisation.",
      },
    });

    await this.auditService.record(tx, {
      organizationId: event.organizationId,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.SELF_LANDLORD_PROVISIONED,
      entityType: 'landlords',
      entityId: id,
      actorUserId: event.actorUserId,
      actorRole: 'OWNER',
      newState: toJsonState({
        isSelf: true,
        companyName: name,
        primaryPhone: event.contactPhone,
        organizationType: event.type,
      }),
    });

    // La colonne `organizations.default_landlord_id` existe pour cela :
    // toute création de bien pourra pré-sélectionner ce bailleur.
    await tx.organizations.update({
      where: { id: event.organizationId },
      data: { default_landlord_id: id },
    });
  }
}
