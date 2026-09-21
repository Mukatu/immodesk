import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RegisterReferralPartnerDto {
  @ApiPropertyOptional({ example: 'Jean Mabiala' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;
}

export class ReferralPartnerDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'IMD-4K7QRT' }) partnerCode!: string;
  @ApiProperty({ enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED'] })
  status!: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  @ApiPropertyOptional({ nullable: true }) displayName!: string | null;
  @ApiProperty({ example: 0 }) totalAccruedAmount!: string;
  @ApiProperty({ example: 0 }) totalPaidAmount!: string;
  @ApiProperty() createdAt!: string;
}

export class RegisterPropertyLeadDto {
  @ApiProperty({
    example: '+242066000002',
    description: 'Numéro du bailleur rencontré sur le terrain (format E.164).',
  })
  @IsString()
  @MaxLength(24)
  landlordPhone!: string;

  @ApiPropertyOptional({ example: 'Immeuble Bacongo, 12 logements' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({ enum: ['SMS', 'WHATSAPP'], default: 'WHATSAPP' })
  @IsOptional()
  @IsIn(['SMS', 'WHATSAPP'])
  channel?: 'SMS' | 'WHATSAPP';
}

export class RegisterPropertyLeadResponseDto {
  @ApiProperty({ format: 'uuid', description: 'À reporter dans l’URL de confirmation.' })
  id!: string;
  @ApiProperty({ example: '+242066••••02' }) confirmationSentTo!: string;
}

export class ConfirmPropertyLeadDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'Le code doit être composé de 4 à 8 chiffres.' })
  code!: string;
}
