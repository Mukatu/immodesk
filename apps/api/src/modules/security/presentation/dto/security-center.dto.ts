import { ApiProperty } from '@nestjs/swagger';
import { MEMBER_ROLES } from '../../../../shared/tenant/roles';
import { AccessDenialDto } from './audit.dto';
import { ApiKeySummaryDto } from './api-keys.dto';

export class SecurityCenterMemberDto {
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ enum: [...MEMBER_ROLES] }) role!: string;
  @ApiProperty({ example: 2 }) activeSessions!: number;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) lastLoginAt!: string | null;
}

export class ReadOnlyStateDto {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) since!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) expectedEndAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) incidentRef!: string | null;
}

export class SecurityCenterDto {
  @ApiProperty({ type: [SecurityCenterMemberDto] }) members!: SecurityCenterMemberDto[];
  @ApiProperty({ type: [ApiKeySummaryDto] }) apiKeys!: ApiKeySummaryDto[];
  @ApiProperty({ type: [AccessDenialDto] }) recentDenials!: AccessDenialDto[];
  @ApiProperty({ type: ReadOnlyStateDto }) readOnly!: ReadOnlyStateDto;
}
