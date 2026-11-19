import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AppConfigService } from '../../../shared/config/config.module';
import { Public } from '../../../shared/auth/auth.contracts';
import { WebhookRateLimitGuard } from '../../../shared/throttler/webhook-rate-limit.guard';
import { MomoWebhookIngestService } from '../application/momo-webhook-ingest.service';

/**
 * `POST /v1/webhooks/mobile-money/{provider}` (contrat phase 4) : public,
 * signé. Répond `200` en moins de 500 ms, quel que soit le résultat de la
 * vérification — la persistance brute prime sur le traitement.
 */
@ApiTags('Webhooks')
@Controller('webhooks/mobile-money')
@UseGuards(WebhookRateLimitGuard)
export class MobileMoneyWebhooksController {
  constructor(
    private readonly ingest: MomoWebhookIngestService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Compatibilité : ancienne URL du webhook d'abonnement. Converge vers la
   * même ingestion que `/:provider` (fournisseur `MOMO_PROVIDER_DEFAULT`) ; le
   * routage se fait par `purpose`. DOIT être déclarée avant `:provider`.
   */
  @Post('subscription')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Mobile Money (URL historique, fournisseur par défaut)' })
  async receiveSubscription(@Req() req: RawBodyRequest<Request>): Promise<Record<string, never>> {
    return this.forward(this.config.get('MOMO_PROVIDER_DEFAULT'), req);
  }

  @Post(':provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réception des webhooks Mobile Money agrégateur' })
  async receive(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<Record<string, never>> {
    return this.forward(provider, req);
  }

  private async forward(
    provider: string,
    req: RawBodyRequest<Request>,
  ): Promise<Record<string, never>> {
    await this.ingest.ingest(
      provider,
      req.rawBody ?? Buffer.alloc(0),
      req.headers as Record<string, string | string[] | undefined>,
      req.ip ?? null,
      req.path,
    );
    return {};
  }
}
