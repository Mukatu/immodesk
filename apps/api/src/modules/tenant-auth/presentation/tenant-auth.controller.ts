import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { TenantAuthService } from '../application/tenant-auth.service';
import {
  TenantAuthVerifyResponseDto,
  TenantOtpRequestDto,
  TenantOtpRequestResponseDto,
  TenantOtpVerifyDto,
} from './dto/tenant-auth.dto';

/**
 * Connexion du portail locataire (contrat, § « Portail locataire »).
 * Public : ces deux routes précèdent toute authentification, sur le modèle
 * exact de `PortalActivationController` (portail bailleur, phase 7), avec
 * une forme de réponse propre au contrat de la phase 10 (voir les DTO).
 */
@ApiTags('Portail locataire — connexion')
@Controller('tenant-auth')
export class TenantAuthController {
  constructor(private readonly tenantAuth: TenantAuthService) {}

  @Post('otp/request')
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Demander un code de connexion au portail locataire',
    description:
      'Refuse 403 `PARTIES.PORTAL_NO_ACTIVE_LEASE` sans fiche locataire à bail actif pour ce ' +
      'numéro, ou 403 `PARTIES.PORTAL_NOT_ENABLED` si aucune de ses organisations n’a activé le ' +
      'portail ; sinon délègue à l’OTP générique (`otp_purpose = LOGIN`, WhatsApp puis repli SMS).',
  })
  @ApiBody({ type: TenantOtpRequestDto })
  @ApiResponse({ status: 202, type: TenantOtpRequestResponseDto })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: 'PARTIES.PORTAL_NO_ACTIVE_LEASE / PARTIES.PORTAL_NOT_ENABLED',
  })
  async requestOtp(
    @Body() dto: TenantOtpRequestDto,
    @Req() request: Request,
  ): Promise<TenantOtpRequestResponseDto> {
    return this.tenantAuth.requestOtp(dto.phone, dto.channel ?? 'WHATSAPP', clientIp(request));
  }

  @Post('otp/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier le code et ouvrir la session du portail locataire',
    description:
      'Authentifie via l’OTP générique puis lie la fiche locataire non encore liée pour ce ' +
      'numéro (toutes agences confondues) au compte obtenu. Jeton générique, sans `refreshToken` ' +
      'dans cette réponse (contrat).',
  })
  @ApiResponse({ status: 200, type: TenantAuthVerifyResponseDto })
  @ApiResponse({
    status: 401,
    type: ErrorResponseDto,
    description: 'IAM.OTP_INVALID / IAM.OTP_EXPIRED',
  })
  async verifyOtp(
    @Body() dto: TenantOtpVerifyDto,
    @Req() request: Request,
  ): Promise<TenantAuthVerifyResponseDto> {
    return this.tenantAuth.verifyOtp(dto.phone, dto.code, device(request, dto.deviceName));
  }
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  const ip = (first ?? request.ip ?? '').trim();
  return ip.length > 0 ? ip : null;
}

function device(request: Request, deviceName?: string) {
  return {
    deviceName: deviceName ?? null,
    userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    ipAddress: clientIp(request),
  };
}
