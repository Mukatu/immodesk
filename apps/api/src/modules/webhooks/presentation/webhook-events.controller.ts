import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { MomoWebhookIngestService } from '../application/momo-webhook-ingest.service';
import { WebhookEventsService } from '../application/webhook-events.service';
import { WebhookListQueryDto } from './dto/webhook-events.dto';

/**
 * Journal des `webhook_events`, réservé OWNER (contrat phase 4, § « Routes »).
 * Un événement sans organisation résolue n'apparaît dans aucune liste tenant
 * — la RLS l'exclut, il ne reste visible que de l'administration plateforme.
 */
@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhook-events')
export class WebhookEventsController {
  constructor(
    private readonly events: WebhookEventsService,
    private readonly ingest: MomoWebhookIngestService,
  ) {}

  @Get()
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Journal des webhooks reçus' })
  async list(@CurrentTenant() tenant: TenantContext, @Query() query: WebhookListQueryDto) {
    return this.events.list(tenant.organizationId, tenant.userId, query);
  }

  @Post(':id/replay')
  @Roles('OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rejouer un événement (retraitement idempotent)' })
  async replay(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.events.logReplay(tenant.organizationId, tenant.userId, id);
    await this.ingest.replay(tenant.organizationId, tenant.userId, id);
  }
}
