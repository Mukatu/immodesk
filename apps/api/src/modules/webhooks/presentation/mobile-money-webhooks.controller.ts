import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../shared/auth/auth.contracts';
import { MomoWebhookIngestService } from '../application/momo-webhook-ingest.service';

/**
 * `POST /v1/webhooks/mobile-money/{provider}` (contrat phase 4) : public,
 * signé. Répond `200` en moins de 500 ms, quel que soit le résultat de la
 * vérification — la persistance brute prime sur le traitement.
 */
@ApiTags('Webhooks')
@Controller('webhooks/mobile-money')
export class MobileMoneyWebhooksController {
  constructor(private readonly ingest: MomoWebhookIngestService) {}

  @Post(':provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réception des webhooks Mobile Money agrégateur' })
  async receive(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
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
