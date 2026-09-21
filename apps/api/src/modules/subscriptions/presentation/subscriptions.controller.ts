import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { SubscriptionsService } from '../application/subscriptions.service';
import type { SubscriptionView } from '../application/subscription-views';
import { CancelSubscriptionDto, SubscribeDto } from './dto/subscriptions.dto';

const ORG_HEADER = {
  name: 'X-Organization-Id',
  required: true,
  description: 'Organisation courante. Doit correspondre à `:id`.',
};

function requireUser(user: AuthenticatedUser | undefined): string {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user.userId;
}

/**
 * Abonnement d'une organisation (contrat phase 10, arbitrage 1) : une seule
 * ligne pour toujours. `POST` sert aussi bien la souscription initiale que le
 * changement de plan — jamais une seconde ligne.
 */
@ApiTags('Abonnement')
@ApiBearerAuth()
@Controller('organizations')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get(':id/subscription')
  @Roles('OWNER', 'MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Abonnement courant de l'organisation" })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<SubscriptionView> {
    return this.subscriptions.get(id, requireUser(user));
  }

  @Post(':id/subscription')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Souscrire ou changer de plan',
    description:
      'Souscription initiale si aucune ligne, changement de plan sinon (jamais une seconde ligne).',
  })
  async subscribe(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: SubscribeDto,
  ): Promise<SubscriptionView> {
    return this.subscriptions.subscribe(id, requireUser(user), {
      planCode: dto.planCode,
      momoMsisdn: dto.momoMsisdn,
    });
  }

  @Post(':id/subscription/cancel')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Demander la résiliation',
    description:
      'Le statut ne bascule à CANCELLED qu’à la fin de la période courante, jamais immédiatement.',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<SubscriptionView> {
    return this.subscriptions.cancel(id, requireUser(user), dto.reason);
  }
}
