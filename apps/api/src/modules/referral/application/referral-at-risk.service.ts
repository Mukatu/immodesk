import { Injectable } from '@nestjs/common';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';

export interface AtRiskSubscriptionView {
  organizationId: string;
  organizationName: string;
  status: string;
}

/**
 * `GET /v1/admin/subscriptions/at-risk` — voir l'hypothèse documentée sur
 * `TenantDirectoryService.listAtRiskSubscriptions` : le module
 * `subscriptions` n'étant pas encore livré, le critère exact
 * (« proche de la suspension », comparé à `grace_days`) est approximé au
 * statut `PAST_DUE`. À affiner avec le module `subscriptions` une fois
 * disponible.
 */
@Injectable()
export class ReferralAtRiskService {
  constructor(private readonly directory: TenantDirectoryService) {}

  async list(limit = 20): Promise<{ items: AtRiskSubscriptionView[] }> {
    const items = await this.directory.listAtRiskSubscriptions(Math.min(Math.max(limit, 1), 100));
    return { items };
  }
}
