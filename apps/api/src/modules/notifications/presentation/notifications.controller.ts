import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentTenant, Public, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { NotificationAcceptedDto } from '../../receipts/presentation/dto/receipts.dto';
import { MessageLogsService } from '../application/message-logs.service';
import { TemplatesService } from '../application/templates.service';
import { WebhooksService } from '../application/webhooks.service';
import {
  ListMessageLogsQueryDto,
  MessageLogPageDto,
  NotificationTemplateDto,
  NotificationTemplateListDto,
  TestTemplateDto,
  UpdateNotificationTemplateDto,
  WebhookAckDto,
} from './dto/notifications.dto';

@ApiTags('Messagerie')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly logs: MessageLogsService,
  ) {}

  @Get('notification-templates')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modèles de messages (WhatsApp et SMS)' })
  @ApiResponse({ status: 200, type: NotificationTemplateListDto })
  async listTemplates(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<NotificationTemplateListDto> {
    return this.templates.list(tenant.organizationId, tenant.userId);
  }

  @Patch('notification-templates/:id')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Modifier un modèle',
    description:
      'Un modèle WhatsApp modifié exige une nouvelle approbation Meta avant usage en production.',
  })
  @ApiResponse({ status: 200, type: NotificationTemplateDto })
  async updateTemplate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplateDto> {
    return this.templates.update(tenant.organizationId, tenant.userId, id, dto);
  }

  @Post('notification-templates/:id/test')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Envoi d’essai d’un modèle' })
  @ApiResponse({ status: 202, type: NotificationAcceptedDto })
  async testTemplate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestTemplateDto,
  ): Promise<NotificationAcceptedDto> {
    return this.templates.test(tenant.organizationId, tenant.userId, id, dto.phone);
  }

  @Get('message-logs')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Journal des messages et de leurs statuts de remise' })
  @ApiResponse({ status: 200, type: MessageLogPageDto })
  async listLogs(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListMessageLogsQueryDto,
  ): Promise<MessageLogPageDto> {
    return this.logs.list(
      tenant.organizationId,
      tenant.userId,
      query,
    ) as Promise<MessageLogPageDto>;
  }

  @Post('message-logs/:id/retry')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Relancer un envoi (nouvelle notification, à partir du canal du message)',
  })
  @ApiResponse({ status: 202, type: NotificationAcceptedDto })
  async retry(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationAcceptedDto> {
    return this.logs.retry(tenant.organizationId, tenant.userId, id);
  }
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get('whatsapp')
  @Public()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Vérification du webhook par Meta (hub.challenge)' })
  @ApiResponse({ status: 200, description: 'Renvoie `hub.challenge`.' })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: 'WEBHOOKS.VERIFY_TOKEN_INVALID',
  })
  verify(@Query() query: Record<string, string>): string {
    return this.webhooks.verifyChallenge(
      query['hub.mode'],
      query['hub.verify_token'],
      query['hub.challenge'],
    );
  }

  @Post('whatsapp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Statuts WhatsApp (signés X-Hub-Signature-256)' })
  @ApiResponse({ status: 200, type: WebhookAckDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'WEBHOOKS.SIGNATURE_INVALID' })
  async whatsapp(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ): Promise<WebhookAckDto> {
    const result = await this.webhooks.ingestWhatsApp(req.rawBody, signature, req.path);
    return { received: true, duplicate: result.duplicate };
  }

  @Post('sms')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Statuts SMS de la passerelle Android (sms:sent, sms:delivered, sms:failed)',
  })
  @ApiResponse({ status: 200, type: WebhookAckDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'WEBHOOKS.SIGNATURE_INVALID' })
  async sms(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-timestamp') timestamp: string | undefined,
    @Headers('x-webhook-secret') secret: string | undefined,
  ): Promise<WebhookAckDto> {
    const result = await this.webhooks.ingestSms(
      req.rawBody,
      { signature, timestamp, secret },
      req.path,
    );
    return { received: true, duplicate: result.duplicate };
  }
}
