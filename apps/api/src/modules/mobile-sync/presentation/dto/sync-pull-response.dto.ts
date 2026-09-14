import { ApiProperty } from '@nestjs/swagger';

export class SyncPullChangedDto {
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  properties!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  units!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  tenants!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  leases!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  invoices!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  cashReceipts!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  remittances!: unknown[];
}

export class SyncPullResultDto {
  @ApiProperty({ format: 'date-time' }) serverTime!: string;
  @ApiProperty() nextCursor!: string;
  @ApiProperty() hasMore!: boolean;
  @ApiProperty() retentionHours!: number;
  @ApiProperty({ type: SyncPullChangedDto }) changed!: SyncPullChangedDto;
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  deleted!: Array<{ resourceType: string; id: string }>;
}
