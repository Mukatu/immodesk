import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PortalOtpRequestDto {
  @ApiProperty({
    example: '+242066000001',
    description: 'Numéro de téléphone du bailleur invité, normalisé en E.164.',
  })
  @IsString()
  @MaxLength(24)
  phone!: string;

  @ApiPropertyOptional({
    enum: ['SMS', 'WHATSAPP'],
    default: 'WHATSAPP',
    description:
      'Canal tenté en premier, avec repli SMS automatique (identique à `/v1/auth/otp/request`).',
  })
  @IsOptional()
  @IsIn(['SMS', 'WHATSAPP'])
  channel?: 'SMS' | 'WHATSAPP';
}

export class PortalOtpRequestResponseDto {
  @ApiProperty({ format: 'uuid' }) requestId!: string;
  @ApiProperty({ enum: ['SMS', 'WHATSAPP'] }) channel!: 'SMS' | 'WHATSAPP';
  @ApiProperty({ example: 300 }) expiresInSeconds!: number;
  @ApiProperty({ example: 60 }) resendAfterSeconds!: number;
}

export class PortalOtpVerifyDto {
  @ApiProperty({ example: '+242066000001' })
  @IsString()
  @MaxLength(24)
  phone!: string;

  @ApiProperty({ example: '123456', description: 'Code à 6 chiffres reçu par WhatsApp ou SMS.' })
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'Le code doit être composé de 4 à 8 chiffres.' })
  code!: string;

  @ApiPropertyOptional({ example: 'iPhone 13 — Paris' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}

/**
 * Jetons génériques de session (mêmes que `/v1/auth/otp/verify`) : le
 * portail bailleur ne porte AUCUN rôle propre dans le jeton, c'est
 * `LandlordPortalGuard` qui distingue un accès portail à chaque requête.
 */
export class PortalSessionDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ example: 900 }) expiresInSeconds!: number;
}
