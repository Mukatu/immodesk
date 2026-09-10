import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class OtpRequestDto {
  @ApiProperty({
    example: '+242066000001',
    description:
      "Numéro de téléphone. Les formes nationales (066000001, 06 600 00 01) et internationales (00242..., 242...) sont normalisées en E.164 avec l'indicatif +242.",
  })
  @IsString()
  @MaxLength(24)
  phone!: string;

  @ApiPropertyOptional({ enum: ['SMS', 'WHATSAPP'], default: 'SMS' })
  @IsOptional()
  @IsIn(['SMS', 'WHATSAPP'])
  channel?: 'SMS' | 'WHATSAPP';
}

export class OtpRequestResponseDto {
  @ApiProperty({ format: 'uuid' }) requestId!: string;
  @ApiProperty({ enum: ['SMS', 'WHATSAPP'] }) channel!: 'SMS' | 'WHATSAPP';
  @ApiProperty({ example: 300 }) expiresInSeconds!: number;
  @ApiProperty({ example: 60 }) resendAfterSeconds!: number;
}

export class OtpVerifyDto {
  @ApiProperty({ example: '+242066000001' })
  @IsString()
  @MaxLength(24)
  phone!: string;

  @ApiProperty({ example: '123456', description: 'Code à 6 chiffres reçu par SMS.' })
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'Le code doit être composé de 4 à 8 chiffres.' })
  code!: string;

  @ApiPropertyOptional({ example: 'Samsung A14 — Brazzaville' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token opaque émis par /v1/auth/otp/verify.' })
  @IsString()
  @Length(16, 512)
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ description: "Refresh token de l'appareil à déconnecter." })
  @IsString()
  @Length(16, 512)
  refreshToken!: string;
}

export class RefreshResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
}

export class UserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: '+242066000001' }) phone!: string;
  @ApiProperty({ example: 'Jean Mabiala' }) fullName!: string;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ example: 'fr-CG' }) locale!: string;
  @ApiProperty({ example: 'Africa/Brazzaville' }) timezone!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class OrganizationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['AGENCY', 'INDEPENDENT_LANDLORD', 'INDEPENDENT_MANAGER'] })
  type!: 'AGENCY' | 'INDEPENDENT_LANDLORD' | 'INDEPENDENT_MANAGER';
  @ApiProperty() legalName!: string;
  @ApiProperty({ nullable: true, type: String }) tradeName!: string | null;
  @ApiProperty() slug!: string;
  @ApiProperty({ example: 'Brazzaville' }) city!: string;
  @ApiProperty({ nullable: true, type: String }) district!: string | null;
  @ApiProperty() contactPhone!: string;
  @ApiProperty({ nullable: true, type: String }) contactEmail!: string | null;
  @ApiProperty({ nullable: true, type: String }) logoUrl!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] }) status!: 'ACTIVE' | 'SUSPENDED';
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class OrganizationMembershipDto {
  @ApiProperty({ type: OrganizationDto }) organization!: OrganizationDto;
  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'COLLECTOR', 'ACCOUNTANT', 'VIEWER'] })
  role!: string;
  @ApiProperty({ format: 'date-time' }) joinedAt!: string;
}

export class OtpVerifyResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: UserDto }) user!: UserDto;
  @ApiProperty({ type: [OrganizationMembershipDto] })
  organizations!: OrganizationMembershipDto[];
}

export class MeResponseDto {
  @ApiProperty({ type: UserDto }) user!: UserDto;
  @ApiProperty({ type: [OrganizationMembershipDto] })
  organizations!: OrganizationMembershipDto[];
}

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Jean Mabiala' })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  fullName?: string;

  @ApiPropertyOptional({ example: 'jean.mabiala@example.cg' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email?: string;

  @ApiPropertyOptional({ example: 'fr-CG' })
  @IsOptional()
  @IsString()
  @Length(2, 12)
  locale?: string;

  @ApiPropertyOptional({
    example: 'Africa/Brazzaville',
    description:
      "Lecture seule en phase 0 : `users` ne porte pas de fuseau, celui de l'organisation principale fait foi. La valeur transmise est ignorée.",
  })
  @IsOptional()
  @IsString()
  @Length(3, 64)
  timezone?: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 'IAM.OTP_INVALID', description: 'Code stable `DOMAINE.RAISON`.' })
  code!: string;
  @ApiProperty({ example: 'Code incorrect.', description: 'Message en français (fr-CG).' })
  message!: string;
  @ApiProperty({ type: Object, example: { remainingAttempts: 3 } })
  details!: Record<string, unknown>;
}
