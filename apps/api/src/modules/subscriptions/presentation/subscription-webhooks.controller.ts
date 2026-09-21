import { Controller, HttpCode, HttpStatus, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../shared/auth/auth.contracts';
import { SubscriptionWebhookIngestService } from '../application/subscription-webhook-ingest.service';

/**
 * `POST /v1/webhooks/mobile-money/subscription` (contrat phase 10). DOIT
 * s'enregistrer avant `POST /v1/webhooks/mobile-money/:provider`
 * (`webhooks/presentation/mobile-money-webhooks.controller.ts`) : c'est
 * l'ordre d'import de `SubscriptionsModule` avant `WebhooksModule` dans
 * `AppModule` qui le garantit (voir le commentaire à cet endroit).
 */
@ApiTags('Abonnement')
@Controller('webhooks/mobile-money')
export class SubscriptionWebhooksController {
  constructor(private readonly ingest: SubscriptionWebhookIngestService) {}

  @Post('subscription')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Réception du webhook Mobile Money de l'abonnement" })
  async receive(@Req() req: RawBodyRequest<Request>): Promise<Record<string, never>> {
    await this.ingest.ingest(
      req.rawBody ?? Buffer.alloc(0),
      req.headers as Record<string, string | string[] | undefined>,
      req.ip ?? null,
      req.path,
    );
    return {};
  }
}
