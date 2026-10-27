import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class SensitiveActionOtpRequestDto {
  @ApiPropertyOptional({
    enum: ['WHATSAPP', 'SMS'],
    default: 'WHATSAPP',
    description: 'Canal de remise. WhatsApp par défaut, repli SMS automatique.',
  })
  @IsOptional()
  @IsIn(['WHATSAPP', 'SMS'])
  channel?: 'WHATSAPP' | 'SMS';
}

export class SensitiveActionOtpResponseDto {
  @ApiProperty({ description: 'Identifiant de la demande (ligne `otp_codes`).' })
  requestId!: string;

  @ApiProperty({ enum: ['WHATSAPP', 'SMS'] })
  channel!: 'WHATSAPP' | 'SMS';

  @ApiProperty({ description: 'Durée de validité du code, en secondes.' })
  expiresInSeconds!: number;

  @ApiProperty({ description: 'Délai avant une nouvelle demande, en secondes.' })
  resendAfterSeconds!: number;
}
