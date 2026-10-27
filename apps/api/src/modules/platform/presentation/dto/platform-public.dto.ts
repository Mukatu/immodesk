import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReadOnlyStateDto {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ nullable: true }) reason!: string | null;
  @ApiProperty({ nullable: true }) since!: string | null;
  @ApiProperty({ nullable: true }) expectedEndAt!: string | null;
  @ApiProperty({ nullable: true }) incidentRef!: string | null;
}

export class IncidentUpdateEntryDto {
  @ApiProperty() at!: string;
  @ApiProperty() message!: string;
}

export class PlatformIncidentDto {
  @ApiProperty() reference!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ['MINOR', 'MAJOR', 'CRITICAL'] }) severity!: 'MINOR' | 'MAJOR' | 'CRITICAL';
  @ApiProperty() startedAt!: string;
  @ApiProperty({ nullable: true }) resolvedAt!: string | null;
  @ApiProperty({ type: [IncidentUpdateEntryDto] }) updates!: IncidentUpdateEntryDto[];
}

export class PlannedMaintenanceDto {
  @ApiProperty() startsAt!: string;
  @ApiProperty() endsAt!: string;
  @ApiProperty() message!: string;
}

export class PlatformHealthChecksDto {
  @ApiProperty() database!: string;
  @ApiProperty() redis!: string;
  @ApiProperty() storage!: string;
  @ApiProperty() mobileMoney!: string;
}

export class PlatformStatusDto {
  @ApiProperty({ enum: ['ok', 'degraded', 'down'] }) status!: 'ok' | 'degraded' | 'down';
  @ApiProperty({ type: ReadOnlyStateDto }) readOnly!: ReadOnlyStateDto;
  @ApiProperty({ type: PlatformHealthChecksDto }) checks!: PlatformHealthChecksDto;
  @ApiPropertyOptional({ type: PlatformIncidentDto, nullable: true })
  incident!: PlatformIncidentDto | null;
  @ApiPropertyOptional({ type: PlannedMaintenanceDto, nullable: true })
  plannedMaintenance!: PlannedMaintenanceDto | null;
}

export class ReadinessCheckDto {
  @ApiProperty({ enum: ['up', 'down', 'skipped'] }) status!: string;
  @ApiPropertyOptional() latencyMs?: number;
  @ApiPropertyOptional() detail?: string;
}

export class ReadinessChecksDto {
  @ApiProperty({ type: ReadinessCheckDto }) database!: ReadinessCheckDto;
  @ApiProperty({ type: ReadinessCheckDto }) redis!: ReadinessCheckDto;
  @ApiProperty({ type: ReadinessCheckDto }) storage!: ReadinessCheckDto;
  @ApiProperty({ type: ReadinessCheckDto }) mobileMoney!: ReadinessCheckDto;
}

export class ReadinessResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] }) status!: 'ok' | 'degraded';
  @ApiProperty({ type: ReadinessChecksDto }) checks!: ReadinessChecksDto;
}

export class LegalDocumentDto {
  @ApiProperty({ enum: ['TERMS', 'PRIVACY_POLICY'] }) code!: 'TERMS' | 'PRIVACY_POLICY';
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() updatedAt!: string;
}

export class LegalTermsDto {
  @ApiProperty() legalVersion!: string;
  @ApiProperty() publishedAt!: string;
  @ApiProperty({ enum: ['fr-CG'] }) locale!: 'fr-CG';
  @ApiProperty({ type: [LegalDocumentDto] }) documents!: LegalDocumentDto[];
  @ApiPropertyOptional({ nullable: true }) dpoContact!: string | null;
  @ApiPropertyOptional({ nullable: true }) supportContact!: string | null;
}
