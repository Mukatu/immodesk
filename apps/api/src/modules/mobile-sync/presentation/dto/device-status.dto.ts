import { ApiProperty } from '@nestjs/swagger';

export class DeviceStatusDto {
  @ApiProperty() deviceId!: string;
  @ApiProperty({ nullable: true }) devicePlatform!: string | null;
  @ApiProperty({ nullable: true }) appVersion!: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true }) collector!: {
    userId: string;
    fullName: string;
  };
  @ApiProperty({ format: 'date-time' }) lastBatchAt!: string;
  @ApiProperty() lastBatchStatus!: string;
  @ApiProperty() pendingConflicts!: number;
  @ApiProperty() totalApplied!: number;
}

export class DeviceStatusPageDto {
  @ApiProperty({ type: [DeviceStatusDto] }) items!: DeviceStatusDto[];
}

export class MobileConfigDto {
  @ApiProperty() maxPhotoBytes!: number;
  @ApiProperty() photoMaxDimension!: number;
  @ApiProperty() photoQuality!: number;
  @ApiProperty() maxSignatureBytes!: number;
  @ApiProperty() retentionHours!: number;
  @ApiProperty() syncIntervalSeconds!: number;
  @ApiProperty() maxOperationsPerBatch!: number;
  @ApiProperty() offlineWritesEnabled!: boolean;
}
