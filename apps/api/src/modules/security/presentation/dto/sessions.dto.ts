import { ApiProperty } from '@nestjs/swagger';

export class SessionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) familyId!: string;
  @ApiProperty({ nullable: true, type: String }) deviceLabel!: string | null;
  @ApiProperty({ nullable: true, type: String }) userAgent!: string | null;
  @ApiProperty({ nullable: true, type: String }) ipAddress!: string | null;
  @ApiProperty({ format: 'date-time' }) issuedAt!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty() isCurrent!: boolean;
}

export class SessionListDto {
  @ApiProperty({ type: [SessionDto] }) items!: SessionDto[];
}

export class RevokeAllSessionsResponseDto {
  @ApiProperty({ example: 3 }) revokedSessions!: number;
  @ApiProperty({ example: 900 }) accessTokenGraceSeconds!: number;
}

export class OrgRevokeAllResponseDto extends RevokeAllSessionsResponseDto {
  @ApiProperty({ example: 3 }) revokedApiKeys!: number;
  @ApiProperty({ example: 5 }) affectedMembers!: number;
}
