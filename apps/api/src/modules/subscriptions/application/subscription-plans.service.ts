import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  toSubscriptionPlanView,
  type SubscriptionPlanRow,
  type SubscriptionPlanView,
} from './subscription-views';

/**
 * Catalogue des offres (contrat phase 10, § « Abonnement SaaS » et route
 * `GET /v1/subscription-plans`). `subscription_plans` est une table GLOBALE
 * (`PrismaService.GLOBAL_TABLES`) : aucune organisation à ouvrir, la lecture
 * passe par `withGlobal`, jamais par `withTenant`.
 */
@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seuls les plans publics ET actifs sont exposés aux clients. */
  async listPublic(): Promise<{ items: SubscriptionPlanView[] }> {
    const rows = await this.prisma.withGlobal((tx) =>
      tx.subscription_plans.findMany({
        where: { is_public: true, is_active: true },
        orderBy: [{ position: 'asc' }, { created_at: 'asc' }],
      }),
    );
    return { items: rows.map((row) => toSubscriptionPlanView(row as SubscriptionPlanRow)) };
  }

  /**
   * Résout un plan par code, pour la souscription ou le changement de plan.
   * Un plan désactivé (`is_active = false`) ne peut plus être choisi, même
   * par son code exact — `is_public` en revanche n'est pas exigé ici : un
   * plan retiré du catalogue public mais encore actif reste assignable
   * explicitement (offre négociée, par exemple).
   */
  async requireActiveByCode(code: string): Promise<SubscriptionPlanRow> {
    const row = await this.prisma.withGlobal((tx) =>
      tx.subscription_plans.findUnique({ where: { code } }),
    );
    if (!row || !row.is_active) {
      throw new DomainError('SUBSCRIPTIONS.PLAN_NOT_FOUND', { code });
    }
    return row as SubscriptionPlanRow;
  }

  async requireById(id: string): Promise<SubscriptionPlanRow> {
    const row = await this.prisma.withGlobal((tx) =>
      tx.subscription_plans.findUnique({
        where: { id },
      }),
    );
    if (!row) throw new DomainError('SUBSCRIPTIONS.PLAN_NOT_FOUND', { id });
    return row as SubscriptionPlanRow;
  }
}
