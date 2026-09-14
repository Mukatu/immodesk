import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncOperationResultDto {
  @ApiProperty() clientRef!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ enum: ['APPLIED', 'DUPLICATE', 'REJECTED', 'CONFLICT', 'SKIPPED'] })
  outcome!: string;
  @ApiPropertyOptional() resourceType?: string;
  @ApiPropertyOptional() resourceId?: string;
  @ApiPropertyOptional() code?: string;
  @ApiPropertyOptional() message?: string;
  @ApiPropertyOptional() retryable?: boolean;
}

export class SyncBatchResultDto {
  @ApiProperty() batchId!: string;
  @ApiProperty() batchRef!: string;
  @ApiProperty({ enum: ['APPLIED', 'PARTIALLY_APPLIED', 'REJECTED', 'FAILED'] }) status!: string;
  @ApiProperty() operationsCount!: number;
  @ApiProperty() appliedCount!: number;
  @ApiProperty() rejectedCount!: number;
  @ApiProperty() conflictsCount!: number;
  @ApiProperty({ format: 'date-time' }) receivedAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) appliedAt!: string | null;
  @ApiProperty({ type: [SyncOperationResultDto] }) results!: SyncOperationResultDto[];
}

export class SyncBatchSummaryDto {
  @ApiProperty() batchId!: string;
  @ApiProperty() batchRef!: string;
  @ApiProperty() deviceId!: string;
  @ApiPropertyOptional({ nullable: true }) devicePlatform!: string | null;
  @ApiPropertyOptional({ nullable: true }) appVersion!: string | null;
  @ApiProperty() collectorUserId!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) collector!: {
    userId: string;
    fullName: string;
  };
  @ApiProperty() status!: string;
  @ApiProperty() operationsCount!: number;
  @ApiProperty() appliedCount!: number;
  @ApiProperty() rejectedCount!: number;
  @ApiProperty() conflictsCount!: number;
  @ApiProperty({ format: 'date-time' }) receivedAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) appliedAt!: string | null;
}

export class SyncBatchPageDto {
  @ApiProperty({ type: [SyncBatchSummaryDto] }) items!: SyncBatchSummaryDto[];
  @ApiProperty({ type: 'object', additionalProperties: true }) pageInfo!: unknown;
}
