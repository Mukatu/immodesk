import {
  Controller,
  Logger,
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
import {
  SkipWebhookRateLimit,
  WebhookRateLimitGuard,
} from '../../../shared/throttler/webhook-rate-limit.guard';
import { OpenPayApiLimiter } from '../../mobile-money/infrastructure/openpay.client';
import { OpenPayCallbackGate } from '../../mobile-money/infrastructure/openpay-callback.gate';
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
    private readonly openPayGate: OpenPayCallbackGate,
    private readonly openPayLimiter: OpenPayApiLimiter,
  ) {}

  private readonly logger = new Logger(MobileMoneyWebhooksController.name);

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

  /**
   * Callback OpenPay (NON signé) : segment secret dans l'URL. Répond TOUJOURS
   * `200 {}` rapidement (référence connue ou non, secret bon ou mauvais, corps
   * valide ou non) : rien ne permet de sonder l'API. Un mauvais segment renvoie
   * le même 200 qu'un bon (un 404 révélerait qu'un segment secret existe et
   * permettrait de distinguer les essais) ; l'appel est seulement journalisé
   * comme non signé. Le chemin enregistré est le gabarit, jamais le secret.
   */
  @Post('openpay/:secret')
  @Public()
  @SkipWebhookRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Callback OpenPay (non signé, segment secret)' })
  async receiveOpenPay(
    @Param('secret') secret: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<Record<string, never>> {
    try {
      // Limite propre à la route (par IP, voir `SkipWebhookRateLimit`) : au-delà, l'appel est
      // ignoré, jamais refusé.
      if (!(await this.openPayLimiter.tryAcquireCallbackRequest(req.ip ?? 'inconnue'))) {
        this.logger.warn(`MOMO.OPENPAY_CALLBACK_RATE_LIMITED ip=${req.ip ?? '-'}`);
        return {};
      }
      await this.ingest.ingestTrigger(
        'openpay',
        this.openPayGate.check(secret, req.ip ?? null),
        req.rawBody ?? Buffer.alloc(0),
        req.headers as Record<string, string | string[] | undefined>,
        req.ip ?? null,
        '/webhooks/mobile-money/openpay/:secret',
      );
    } catch (error) {
      // Jamais d'erreur renvoyée à l'appelant : OpenPay relancerait, et un
      // attaquant sonderait le comportement.
      this.logger.error(`Callback OpenPay non traité : ${(error as Error).message}`);
    }
    return {};
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
