import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * DTO du portail locataire (contrat, § « Portail locataire »).
 *
 * Réponses volontairement DIFFÉRENTES de `/v1/auth/otp/*` et de
 * `/v1/portal/activation/otp/*` (phase 7) : le contrat de la phase 10 fixe
 * une forme propre (`{ expiresAt, resendAfter }` puis `{ accessToken, tenant }`),
 * jamais celle de l'auth générique ou du portail bailleur.
 */
export class TenantOtpRequestDto {
  @ApiProperty({
    example: '+242066000001',
    description: 'Numéro de téléphone du locataire, normalisé en E.164.',
  })
  @IsString()
  @MaxLength(24)
  phone!: string;

  @ApiPropertyOptional({
    enum: ['SMS', 'WHATSAPP'],
    default: 'WHATSAPP',
    description: 'Canal tenté en premier, avec repli SMS automatique.',
  })
  @IsOptional()
  @IsIn(['SMS', 'WHATSAPP'])
  channel?: 'SMS' | 'WHATSAPP';
}

export class TenantOtpRequestResponseDto {
  @ApiProperty({ format: 'date-time', description: 'Expiration du code demandé.' })
  expiresAt!: string;

  @ApiProperty({ example: 60, description: 'Secondes avant un nouvel envoi possible.' })
  resendAfter!: number;
}

export class TenantOtpVerifyDto {
  @ApiProperty({ example: '+242066000001' })
  @IsString()
  @MaxLength(24)
  phone!: string;

  @ApiProperty({ example: '123456', description: 'Code à 6 chiffres reçu par WhatsApp ou SMS.' })
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'Le code doit être composé de 4 à 8 chiffres.' })
  code!: string;

  @ApiPropertyOptional({ example: 'Android — Pointe-Noire' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}

export class TenantAuthTenantDto {
  @ApiProperty({ format: 'uuid', description: 'Fiche locataire principale (première trouvée).' })
  id!: string;

  @ApiProperty({ example: 'Bernadette Loemba' })
  displayName!: string;

  @ApiProperty({
    example: 2,
    description: 'Nombre de baux actifs dans le périmètre de la session.',
  })
  leaseCount!: number;
}

/**
 * Jeton générique de session (même mécanisme que `/v1/auth/otp/verify`) :
 * PAS de `refreshToken` dans cette réponse (contrat, tableau des routes,
 * ligne `/v1/tenant-auth/otp/verify`) — écart assumé avec le portail
 * bailleur, documenté dans le rapport de livraison.
 */
export class TenantAuthVerifyResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: TenantAuthTenantDto }) tenant!: TenantAuthTenantDto;
}
