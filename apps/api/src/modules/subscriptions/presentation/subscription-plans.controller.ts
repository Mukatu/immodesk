import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionPlansService } from '../application/subscription-plans.service';
import type { SubscriptionPlanView } from '../application/subscription-views';

/**
 * `GET /v1/subscription-plans` (contrat phase 10) : authentifié, sans
 * contexte d'organisation — le catalogue est le même pour tout le monde.
 * Ni `@Roles`, ni `@RequireOrganization` : `OrganizationGuard` laisse alors
 * passer toute requête authentifiée sans exiger `X-Organization-Id`.
 */
@ApiTags('Abonnement')
@ApiBearerAuth()
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(private readonly plans: SubscriptionPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Catalogue des offres publiques et actives' })
  async list(): Promise<{ items: SubscriptionPlanView[] }> {
    return this.plans.listPublic();
  }
}
