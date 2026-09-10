import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CONTACT_CHANNEL_TYPES,
  CONTACT_OWNER_TYPES,
  OWNER_PATH_SEGMENTS,
} from '../../domain/party-rules';

const CHANNEL_TYPE_VALUES = [...CONTACT_CHANNEL_TYPES];
const OWNER_TYPE_VALUES = [...CONTACT_OWNER_TYPES];

export class CreateContactChannelDto {
  @ApiProperty({ enum: CHANNEL_TYPE_VALUES })
  @IsIn(CHANNEL_TYPE_VALUES)
  channelType!: 'PHONE' | 'MOBILE' | 'WHATSAPP' | 'EMAIL' | 'FAX';

  @ApiProperty({
    example: '066123456',
    description:
      'Téléphone normalisé en E.164 `+242…` ; adresse e-mail mise en minuscules. ' +
      'Le couple (tiers, type, valeur) est unique : 409 `PARTIES.CHANNEL_DUPLICATE`.',
  })
  @IsString()
  @MaxLength(320)
  value!: string;

  @ApiPropertyOptional({ example: 'Numéro de la boutique' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({
    description:
      "Canal préféré pour ce type. Un seul par tiers et par type : l'ancien est démarqué.",
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Consentement aux relances et quittances.' })
  @IsOptional()
  @IsBoolean()
  optIn?: boolean;
}

export class UpdateContactChannelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) label?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() optIn?: boolean;
}

export class ContactChannelDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: OWNER_TYPE_VALUES }) ownerType!: string;
  @ApiProperty({ format: 'uuid' }) ownerId!: string;
  @ApiProperty({ enum: CHANNEL_TYPE_VALUES }) channelType!: string;
  @ApiProperty({ example: '+242066123456' }) value!: string;
  @ApiProperty({ nullable: true, type: String }) label!: string | null;
  @ApiProperty() isPrimary!: boolean;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty({ nullable: true, type: String }) verifiedAt!: string | null;
  @ApiProperty() optIn!: boolean;
  @ApiProperty({ nullable: true, type: String }) optOutAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ContactChannelListDto {
  @ApiProperty({ type: [ContactChannelDto] }) items!: ContactChannelDto[];
}

/** Valeurs acceptées par `/v1/parties/{ownerType}/…`. */
export const OWNER_PATH_ENUM = [...OWNER_PATH_SEGMENTS];
