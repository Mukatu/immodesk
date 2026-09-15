import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { LandlordPortalActivationService } from '../application/landlord-portal-activation.service';
import {
  PortalOtpRequestDto,
  PortalOtpRequestResponseDto,
  PortalOtpVerifyDto,
  PortalSessionDto,
} from './dto/activation.dto';

/**
 * Activation du portail bailleur (contrat, § « Portail bailleur »).
 * Public : ces deux routes précèdent toute authentification. L'invitation
 * elle-même est envoyée par le module `mandates`
 * (`POST /v1/management-mandates/{id}/landlord-invitation`) — rien à
 * refaire ici, seule l'activation par OTP est du ressort de ce contrôleur.
 */
@ApiTags('Portail bailleur — activation')
@Controller('portal/activation')
export class PortalActivationController {
  constructor(private readonly activation: LandlordPortalActivationService) {}

  @Post('otp/request')
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Demander un code d’activation du portail bailleur',
    description:
      'Refuse 404 `AGENCY.PORTAL_NOT_INVITED` sans aucune fiche bailleur en attente pour ce numéro, ' +
      "toutes agences confondues ; sinon délègue à l'OTP générique (WhatsApp puis repli SMS).",
  })
  @ApiBody({ type: PortalOtpRequestDto })
  @ApiResponse({ status: 201, type: PortalOtpRequestResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'AGENCY.PORTAL_NOT_INVITED' })
  async requestOtp(
    @Body() dto: PortalOtpRequestDto,
    @Req() request: Request,
  ): Promise<PortalOtpRequestResponseDto> {
    const result = await this.activation.requestOtp(
      dto.phone,
      dto.channel ?? 'WHATSAPP',
      clientIp(request),
    );
    return {
      requestId: result.requestId,
      channel: result.channel as 'SMS' | 'WHATSAPP',
      expiresInSeconds: result.expiresInSeconds,
      resendAfterSeconds: result.resendAfterSeconds,
    };
  }

  @Post('otp/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier le code et activer le portail bailleur',
    description:
      "Authentifie via l'OTP générique puis lie TOUTES les fiches bailleur en attente pour ce " +
      'numéro (toutes agences confondues) au compte obtenu. Jetons génériques, identiques à ' +
      '`/v1/auth/otp/verify`.',
  })
  @ApiResponse({ status: 200, type: PortalSessionDto })
  @ApiResponse({
    status: 401,
    type: ErrorResponseDto,
    description: 'IAM.OTP_INVALID / IAM.OTP_EXPIRED',
  })
  async verifyOtp(
    @Body() dto: PortalOtpVerifyDto,
    @Req() request: Request,
  ): Promise<PortalSessionDto> {
    return this.activation.verifyOtp(dto.phone, dto.code, device(request, dto.deviceName));
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
