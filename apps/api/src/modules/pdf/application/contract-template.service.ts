import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  CONTRACT_TEMPLATE_KEY,
  mergeContractTemplate,
  patchContractTemplate,
  type ContractTemplate,
} from '../domain/contract-template';

/**
 * Gabarit de contrat de l'organisation, logé dans
 * `organization_settings.settings_json.contractTemplate`.
 *
 * POURQUOI `settings_json` ET NON DES COLONNES — le gabarit est une structure
 * libre et mouvante (liste de clauses, chacune activable), destinée à évoluer
 * avec les retours du conseil juridique. Lui donner sept colonnes figerait
 * une forme que la phase 2 ne connaît pas encore, et chaque ajustement
 * coûterait une migration. Le JSONB est ici le bon outil ; les données
 * financières, elles, restent en colonnes typées.
 */
@Injectable()
export class ContractTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async get(organizationId: string, userId: string): Promise<ContractTemplate> {
    return this.prisma.withTenant(organizationId, userId, (tx) => this.getIn(tx, organizationId));
  }

  /** Lecture dans une transaction déjà ouverte (rendu du contrat). */
  async getIn(tx: TenantClient, organizationId: string): Promise<ContractTemplate> {
    const settings = await tx.organization_settings.findUnique({
      where: { organization_id: organizationId },
      select: { settings_json: true },
    });
    const json = (settings?.settings_json ?? {}) as Record<string, unknown>;
    return mergeContractTemplate(json[CONTRACT_TEMPLATE_KEY]);
  }

  async patch(
    organizationId: string,
    userId: string,
    patch: Partial<ContractTemplate>,
  ): Promise<ContractTemplate> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const settings = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
      });
      if (!settings) throw new DomainError('ORG.SETTINGS_NOT_FOUND', { organizationId });

      const json = (settings.settings_json ?? {}) as Record<string, unknown>;
      const before = mergeContractTemplate(json[CONTRACT_TEMPLATE_KEY]);
      const after = patchContractTemplate(before, patch);

      await tx.organization_settings.update({
        where: { organization_id: organizationId },
        data: {
          settings_json: {
            ...json,
            [CONTRACT_TEMPLATE_KEY]: after,
          } as unknown as Prisma.InputJsonValue,
          updated_at: new Date(),
        },
      });

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.CONTRACT_TEMPLATE_UPDATED,
        entityType: 'organization_settings',
        entityId: settings.id,
        previousState: toJsonState(before),
        newState: toJsonState(after),
      });
      return after;
    });
  }
}
