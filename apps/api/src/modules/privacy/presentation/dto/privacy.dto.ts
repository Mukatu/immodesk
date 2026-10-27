import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { SUBJECT_TYPES } from '../../domain/subject';

/** Corps commun à `POST /v1/privacy/subject-exports` et aux routes d'effacement. */
export class SubjectRefDto {
  @ApiProperty({ enum: SUBJECT_TYPES })
  @IsIn(SUBJECT_TYPES)
  subjectType!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subjectId!: string;
}

export class PrivacySettingsPatchDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(600) identityMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(3650) messageLogsDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(3650) notificationsDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(1200) auditLogsMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) financialYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dpoName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() dpoContact?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() legalVersion?: string;
}

export class TenantConsentDto {
  @ApiProperty({
    description: 'Version des mentions légales acceptée (doit être la version courante).',
  })
  @IsString()
  legalVersion!: string;
}

export class TenantChannelPatchDto {
  @ApiProperty({ description: 'Consentement à être contacté sur ce canal.' })
  @IsBoolean()
  optIn!: boolean;
}
