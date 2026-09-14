import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  mergeOperationalSettings,
  readOperationalSettings,
  type OperationalSettingsPatch,
  type PaymentMethodsSettings,
} from '../../../shared/settings/operational-settings';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { FeatureFlagsService } from './feature-flags.service';

export const AGGREGATOR_FLAG_KEY = 'payments.mobile_money_aggregator';

export interface PaymentMethodsView extends PaymentMethodsSettings {
  /** Vrai seulement si le drapeau plateforme est actif pour l'organisation. */
  aggregatorAvailable: boolean;
}

export type PaymentMethodsPatch = NonNullable<OperationalSettingsPatch['paymentMethods']>;

/**
 * Paramètres de moyens de paiement (`settings_json.paymentMethods`),
 * exposés à part de `GET/PATCH .../settings` : rôles différents (lecture
 * MANAGER déjà vraie pour les deux, mais le contrat phase 4 les documente
 * séparément) et réponse enrichie de `aggregatorAvailable`, dérivé du
 * drapeau plateforme `payments.mobile_money_aggregator` — jamais persisté
 * ici, seulement recalculé à la lecture.
 */
@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly auditService: AuditService,
  ) {}

  async get(organizationId: string, userId: string): Promise<PaymentMethodsView> {
    const settings = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.organization_settings.findUnique({ where: { organization_id: organizationId } }),
    );
    if (!settings) throw new DomainError('ORG.SETTINGS_NOT_FOUND', { organizationId });
    const aggregatorAvailable = await this.isAggregatorFlagEnabled(organizationId, userId);
    return {
      ...readOperationalSettings(settings.settings_json).paymentMethods,
      aggregatorAvailable,
    };
  }

  async update(
    organizationId: string,
    userId: string,
    patch: PaymentMethodsPatch,
  ): Promise<PaymentMethodsView> {
    const view = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
      });
      if (!before) throw new DomainError('ORG.SETTINGS_NOT_FOUND', { organizationId });

      const after = await tx.organization_settings.update({
        where: { organization_id: organizationId },
        data: {
          settings_json: mergeOperationalSettings(before.settings_json, {
            paymentMethods: patch,
          }) as object,
          updated_at: new Date(),
        },
      });
      const beforeView = readOperationalSettings(before.settings_json).paymentMethods;
      const afterView = readOperationalSettings(after.settings_json).paymentMethods;
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.PAYMENT_METHODS_UPDATED,
        entityType: 'organization_settings',
        entityId: after.id,
        previousState: toJsonState(beforeView),
        newState: toJsonState(afterView),
      });
      return afterView;
    });
    const aggregatorAvailable = await this.isAggregatorFlagEnabled(organizationId, userId);
    return { ...view, aggregatorAvailable };
  }

  private async isAggregatorFlagEnabled(organizationId: string, userId: string): Promise<boolean> {
    const flags = await this.featureFlags.listForOrganization(organizationId, userId);
    return flags[AGGREGATOR_FLAG_KEY] ?? false;
  }
}
