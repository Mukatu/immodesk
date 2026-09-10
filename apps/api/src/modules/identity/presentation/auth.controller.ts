import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser, Public, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { OtpAuthService } from '../application/otp-auth.service';
import { ProfileService } from '../application/profile.service';
import { SessionService, type DeviceInfo } from '../application/session.service';
import {
  ErrorResponseDto,
  LogoutDto,
  OtpRequestDto,
  OtpRequestResponseDto,
  OtpVerifyDto,
  OtpVerifyResponseDto,
  RefreshDto,
  RefreshResponseDto,
} from './dto/auth.dto';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly otp: OtpAuthService,
    private readonly sessions: SessionService,
    private readonly profile: ProfileService,
  ) {}

  @Post('otp/request')
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Demander un code de connexion',
    description:
      "Génère un code à 6 chiffres, le stocke haché dans `otp_codes` (expiration 5 minutes, 5 tentatives) et l'envoie par SMS. " +
      'La réponse est identique que le numéro soit connu ou non. ' +
      'Limitation : 3 demandes / 10 min par numéro, 20 / heure par adresse IP.',
  })
  @ApiBody({ type: OtpRequestDto })
  @ApiResponse({ status: 201, type: OtpRequestResponseDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto, description: 'IAM.PHONE_INVALID' })
  @ApiResponse({
    status: 429,
    type: ErrorResponseDto,
    description: 'IAM.RATE_LIMITED ou IAM.OTP_RESEND_TOO_SOON',
  })
  async requestOtp(
    @Body() dto: OtpRequestDto,
    @Req() request: Request,
  ): Promise<OtpRequestResponseDto> {
    const result = await this.otp.requestOtp(dto.phone, dto.channel ?? 'SMS', clientIp(request));
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
    summary: 'Vérifier le code et ouvrir une session',
    description:
      "Crée le compte au premier succès. Émet un JWT d'accès (15 min) et un refresh token opaque (30 jours). " +
      "À la 5e erreur, le code est verrouillé, une entrée `OTP_LOCKED` est écrite dans `audit_logs` et l'API répond 429.",
  })
  @ApiResponse({ status: 200, type: OtpVerifyResponseDto })
  @ApiResponse({
    status: 401,
    type: ErrorResponseDto,
    description: 'IAM.OTP_INVALID / IAM.OTP_EXPIRED',
  })
  @ApiResponse({ status: 429, type: ErrorResponseDto, description: 'IAM.OTP_LOCKED' })
  async verifyOtp(
    @Body() dto: OtpVerifyDto,
    @Req() request: Request,
  ): Promise<OtpVerifyResponseDto> {
    const result = await this.otp.verifyOtp(dto.phone, dto.code, device(request, dto.deviceName));
    const [user, organizations] = await Promise.all([
      this.profile.getUser(result.userId),
      this.profile.listMemberships(result.userId),
    ]);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user,
      organizations,
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Faire tourner le refresh token',
    description:
      'Rotation systématique : le jeton présenté est révoqué et un nouveau est émis dans la même famille. ' +
      "Le rejeu d'un jeton déjà révoqué révoque TOUTE la famille et répond 401 `IAM.REFRESH_REVOKED`.",
  })
  @ApiResponse({ status: 200, type: RefreshResponseDto })
  @ApiResponse({
    status: 401,
    type: ErrorResponseDto,
    description: 'IAM.REFRESH_INVALID / IAM.REFRESH_EXPIRED / IAM.REFRESH_REVOKED',
  })
  async refresh(@Body() dto: RefreshDto, @Req() request: Request): Promise<RefreshResponseDto> {
    const session = await this.sessions.rotate(dto.refreshToken, device(request));
    return { accessToken: session.accessToken, refreshToken: session.refreshToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Se déconnecter',
    description: "Révoque toute la famille de jetons de l'appareil. Idempotent.",
  })
  @ApiResponse({ status: 204, description: 'Session fermée.' })
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
    await this.sessions.logout(dto.refreshToken, user.userId);
  }
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  const ip = (first ?? request.ip ?? '').trim();
  return ip.length > 0 ? ip : null;
}

function device(request: Request, deviceName?: string): DeviceInfo {
  return {
    deviceName: deviceName ?? null,
    userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    ipAddress: clientIp(request),
  };
}
