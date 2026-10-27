import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { AccessDenialsService } from '../application/access-denials.service';
import { ApiKeysService } from '../application/api-keys.service';
import { OrgRevokeAllService } from '../application/org-revoke-all.service';
import { SecurityCenterService } from '../application/security-center.service';
import {
  ApiKeyCreatedResponseDto,
  ApiKeyListDto,
  ApiKeyRotatedResponseDto,
  CreateApiKeyDto,
} from './dto/api-keys.dto';
import { AccessDenialPageDto, ListAccessDenialsQueryDto } from './dto/audit.dto';
import { OrgRevokeAllResponseDto } from './dto/sessions.dto';
import { SecurityCenterDto } from './dto/security-center.dto';

const ORG_HEADER = {
  name: 'X-Organization-Id',
  required: true,
  description: 'Organisation courante. Positionne `app.current_organization_id` (RLS).',
};

/** Centre de sécurité d'organisation (contrat phase 11, § Centre de sécurité). */
@ApiTags('Sécurité — organisation')
@ApiBearerAuth()
@Controller('organizations/:id/security')
export class SecurityController {
  constructor(
    private readonly center: SecurityCenterService,
    private readonly apiKeys: ApiKeysService,
    private readonly revokeAllService: OrgRevokeAllService,
    private readonly denials: AccessDenialsService,
  ) {}

  @Get()
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Centre de sécurité de l’organisation' })
  @ApiResponse({ status: 200, type: SecurityCenterDto })
  async get(@CurrentTenant() tenant: TenantContext): Promise<SecurityCenterDto> {
    return this.center.get(tenant.organizationId, tenant.userId);
  }

  @Get('api-keys')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les clés d’API' })
  @ApiResponse({ status: 200, type: ApiKeyListDto })
  async listApiKeys(@CurrentTenant() tenant: TenantContext): Promise<ApiKeyListDto> {
    return { items: await this.apiKeys.list(tenant.organizationId, tenant.userId) };
  }

  @Post('api-keys')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Créer une clé d’API',
    description: 'Le secret n’est rendu qu’une seule fois, dans cette réponse.',
  })
  @ApiResponse({ status: 201, type: ApiKeyCreatedResponseDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'SECURITY.API_KEY_LIMIT_REACHED',
  })
  async createApiKey(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    return this.apiKeys.create(tenant.organizationId, tenant.userId, dto);
  }

  @Post('api-keys/:keyId/rotate')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Faire tourner une clé d’API',
    description:
      'Reprend nom, scopes et adresses autorisées. L’ancienne clé reste ACTIVE jusqu’à ' +
      '`SECURITY_API_KEY_ROTATION_GRACE_HOURS` (0 = coupure immédiate).',
  })
  @ApiResponse({ status: 201, type: ApiKeyRotatedResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'SECURITY.API_KEY_NOT_FOUND' })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'SECURITY.API_KEY_REVOKED' })
  async rotateApiKey(
    @CurrentTenant() tenant: TenantContext,
    @Param('keyId', ParseUUIDPipe) keyId: string,
  ): Promise<ApiKeyRotatedResponseDto> {
    return this.apiKeys.rotate(tenant.organizationId, tenant.userId, keyId);
  }

  @Delete('api-keys/:keyId')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Révoquer une clé d’API' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'SECURITY.API_KEY_NOT_FOUND' })
  async revokeApiKey(
    @CurrentTenant() tenant: TenantContext,
    @Param('keyId', ParseUUIDPipe) keyId: string,
  ): Promise<void> {
    await this.apiKeys.revoke(tenant.organizationId, tenant.userId, keyId);
  }

  @Post('revoke-all')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiHeader({
    name: 'X-Otp-Code',
    required: true,
    description: 'Code à usage unique, motif SENSITIVE_ACTION.',
  })
  @ApiOperation({
    summary: 'Révocation globale de l’organisation',
    description: 'Déconnecte tous les membres actifs et révoque toutes les clés d’API.',
  })
  @ApiResponse({ status: 200, type: OrgRevokeAllResponseDto })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: 'SECURITY.SENSITIVE_ACTION_OTP_REQUIRED',
  })
  async revokeAll(
    @CurrentTenant() tenant: TenantContext,
    @Headers('x-otp-code') otpCode: string | undefined,
  ): Promise<OrgRevokeAllResponseDto> {
    return this.revokeAllService.revokeAll(tenant.organizationId, tenant.userId, otpCode);
  }

  @Get('access-denials')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Journal des accès refusés',
    description: 'Fenêtre bornée par SECURITY_DENIAL_LOOKBACK_DAYS.',
  })
  @ApiResponse({ status: 200, type: AccessDenialPageDto })
  async listAccessDenials(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListAccessDenialsQueryDto,
  ): Promise<AccessDenialPageDto> {
    return this.denials.list(tenant.organizationId, tenant.userId, query);
  }
}
