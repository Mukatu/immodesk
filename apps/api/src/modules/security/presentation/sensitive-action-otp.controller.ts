import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { OtpAuthService } from '../../identity/application/otp-auth.service';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import {
  SensitiveActionOtpRequestDto,
  SensitiveActionOtpResponseDto,
} from './dto/sensitive-action-otp.dto';

/**
 * Demande d'un code de confirmation pour action sensible.
 *
 * DIVERGENCE ASSUMÉE avec la table de routes du contrat de la phase 11, qui
 * exige l'en-tête `X-Otp-Code` sur la révocation globale d'organisation sans
 * ouvrir de route pour obtenir ce code : la route de révocation serait sinon
 * impossible à appeler. Le numéro n'est jamais fourni par l'appelant, il est
 * lu sur le compte authentifié.
 */
@ApiTags('Sécurité — sessions')
@ApiBearerAuth()
@Controller('me/security/otp')
export class SensitiveActionOtpController {
  constructor(private readonly otp: OtpAuthService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Demander un code de confirmation pour action sensible',
    description:
      'Envoie un code à 6 chiffres sur le numéro du compte connecté, à présenter dans ' +
      'l’en-tête `X-Otp-Code` d’une action sensible (révocation globale d’organisation). ' +
      'Reste accessible pendant un gel en lecture seule, sans quoi la révocation — elle-même ' +
      'autorisée pendant un gel — serait impossible à déclencher.',
  })
  @ApiResponse({ status: 201, type: SensitiveActionOtpResponseDto })
  @ApiResponse({
    status: 429,
    type: ErrorResponseDto,
    description: 'IAM.RATE_LIMITED ou IAM.OTP_RESEND_TOO_SOON',
  })
  async request(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: SensitiveActionOtpRequestDto,
  ): Promise<SensitiveActionOtpResponseDto> {
    if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
    const result = await this.otp.requestSensitiveActionOtp(user.userId, dto.channel ?? 'WHATSAPP');
    return {
      requestId: result.requestId,
      channel: result.channel === 'SMS' ? 'SMS' : 'WHATSAPP',
      expiresInSeconds: result.expiresInSeconds,
      resendAfterSeconds: result.resendAfterSeconds,
    };
  }
}
