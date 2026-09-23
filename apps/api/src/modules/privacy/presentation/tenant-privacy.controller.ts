import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import { requireUser } from '../../parties/presentation/landlords.controller';
import {
  CurrentTenantLeases,
  TenantPortal,
} from '../../tenant-portal/presentation/tenant-portal.decorator';
import { TenantPortalGuard } from '../../tenant-portal/presentation/tenant-portal.guard';
import { TenantPrivacyActionsService } from '../application/tenant-privacy-actions.service';
import {
  TenantPrivacyService,
  type TenantChannelView,
  type TenantPrivacyStateView,
} from '../application/tenant-privacy.service';
import { TenantChannelPatchDto, TenantConsentDto } from './dto/privacy.dto';

/**
 * Portail locataire — vie privée (contrat, § « Consentement et portail
 * locataire »). Même garde que le reste du portail (`TenantPortalGuard`,
 * `TENANT_PORTAL`), pas d'en-tête d'organisation : la session porte
 * potentiellement plusieurs organisations (`groupLeasesByOrganization`).
 */
@ApiTags('Portail locataire — vie privée')
@ApiBearerAuth()
@TenantPortal()
@UseGuards(TenantPortalGuard)
@Controller('tenant/privacy')
export class TenantPrivacyController {
  constructor(
    private readonly tenantPrivacy: TenantPrivacyService,
    private readonly actions: TenantPrivacyActionsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'État de confidentialité du locataire connecté' })
  @ApiResponse({ status: 200, description: 'TenantPrivacyState' })
  async me(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
  ): Promise<TenantPrivacyStateView> {
    return this.tenantPrivacy.me(leases, requireUser(user));
  }

  @Post('consents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Accepte les mentions légales en vigueur' })
  @ApiResponse({ status: 201, description: '{ legalVersion, acceptedAt }' })
  @ApiResponse({ status: 422, description: 'PRIVACY.CONSENT_VERSION_UNKNOWN' })
  async acceptConsent(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Body() dto: TenantConsentDto,
    @Req() req: Request,
  ): Promise<{ legalVersion: string; acceptedAt: string }> {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.ip ??
      null;
    return this.tenantPrivacy.acceptConsent(
      leases,
      requireUser(user),
      dto.legalVersion,
      ip ?? null,
    );
  }

  @Patch('channels/:id')
  @ApiOperation({ summary: 'Ouvre ou ferme un canal de contact' })
  @ApiResponse({ status: 200, description: 'ContactChannel' })
  @ApiResponse({ status: 422, description: 'PRIVACY.LAST_CHANNEL_PROTECTED' })
  async updateChannel(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Param('id') id: string,
    @Body() dto: TenantChannelPatchDto,
  ): Promise<TenantChannelView> {
    return this.actions.updateChannel(leases, requireUser(user), id, dto.optIn);
  }

  @Post('erasure-requests')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Demande un effacement (une demande, jamais une exécution)',
    description:
      'Notifie les OWNER de chaque organisation et journalise la demande ; la validation reste au gestionnaire.',
  })
  @ApiResponse({ status: 202, description: '{ requestRef }' })
  async requestErasure(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
  ): Promise<{ requestRef: string }> {
    return this.actions.requestErasure(leases, requireUser(user));
  }
}
