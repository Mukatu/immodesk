import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OrganizationDto } from '../../../identity/presentation/dto/auth.dto';
import { CreateLandlordDto, LandlordDto } from '../../../parties/presentation/dto/landlords.dto';
import { PropertyBodyDto } from '../../../portfolio/presentation/dto/portfolio.dto';
import { PropertyDto } from '../../../portfolio/presentation/dto/unit.dto';
import { MandateDto, MandateInputDto } from '../../../mandates/presentation/dto/mandates.dto';
import { CreateOrganizationDto } from './organizations.dto';

/**
 * Organisation à créer par l'onboarding : mêmes champs que
 * `POST /v1/organizations`, moins `type` (verrouillé sur `INDEPENDENT_MANAGER`
 * côté service — le contrat de ce parcours ne crée que ce type).
 */
export class OnboardingOrganizationDto extends OmitType(CreateOrganizationDto, ['type'] as const) {}

/**
 * Bien de l'onboarding : mêmes champs que `POST /v1/properties`, moins
 * `landlordId` — déduit automatiquement du bailleur créé juste avant, dans
 * la même transaction.
 */
export class OnboardingPropertyDto extends PropertyBodyDto {
  @ApiProperty({ example: 'Résidence Mpila' })
  @IsString()
  @Length(2, 200)
  name!: string;

  @ApiProperty({ example: '45, avenue de la Corniche' })
  @IsString()
  @MaxLength(240)
  addressLine!: string;

  @ApiProperty({ example: 'Mpila', description: 'Quartier — adressage principal au Congo.' })
  @IsString()
  @MaxLength(120)
  district!: string;
}

/**
 * Mandat de l'onboarding : mêmes champs que `POST /v1/management-mandates`,
 * moins `landlordId`/`propertyIds` (déduits du bailleur et du bien créés
 * juste avant) et `startDate` rendu optionnel (défaut : aujourd'hui). La
 * commission par défaut de 10 % s'applique automatiquement pour une
 * organisation `INDEPENDENT_MANAGER` si `commissionRateBps` est omis.
 */
export class OnboardingMandateDto extends OmitType(MandateInputDto, [
  'landlordId',
  'propertyIds',
  'startDate',
] as const) {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  startDate?: string;
}

export class IndependentManagerOnboardingDto {
  @ApiProperty({ type: OnboardingOrganizationDto })
  @ValidateNested()
  @Type(() => OnboardingOrganizationDto)
  organization!: OnboardingOrganizationDto;

  @ApiProperty({ type: CreateLandlordDto })
  @ValidateNested()
  @Type(() => CreateLandlordDto)
  landlord!: CreateLandlordDto;

  @ApiProperty({ type: OnboardingPropertyDto })
  @ValidateNested()
  @Type(() => OnboardingPropertyDto)
  property!: OnboardingPropertyDto;

  @ApiPropertyOptional({ type: OnboardingMandateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingMandateDto)
  mandate?: OnboardingMandateDto;
}

export class IndependentManagerOnboardingResultDto {
  @ApiProperty({ type: OrganizationDto }) organization!: OrganizationDto;
  @ApiProperty({ type: LandlordDto }) landlord!: LandlordDto;
  @ApiProperty({ type: PropertyDto }) property!: PropertyDto;
  @ApiProperty({ type: MandateDto }) mandate!: MandateDto;
}
