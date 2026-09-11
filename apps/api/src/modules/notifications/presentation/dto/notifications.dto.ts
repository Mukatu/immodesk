import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PageInfoDto } from '../../../parties/presentation/dto/landlords.dto';
import { MessageLogDto } from '../../../receipts/presentation/dto/receipts.dto';
import { NOTIFICATION_CHANNELS } from '../../../receipts/presentation/dto/receipt-summary.dto';

const MESSAGE_STATUSES = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'REJECTED',
  'EXPIRED',
] as const;
const NULLABLE = { nullable: true, type: String } as const;

export class NotificationTemplateDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'RECEIPT_ISSUED' }) code!: string;
  @ApiProperty({ enum: NOTIFICATION_CHANNELS }) channel!: string;
  @ApiProperty({ example: 'fr-CG' }) locale!: string;
  @ApiProperty() name!: string;
  @ApiProperty(NULLABLE) subject!: string | null;
  @ApiProperty() body!: string;
  @ApiProperty({ ...NULLABLE, example: 'receipt_ready_fr' }) providerTemplateName!: string | null;
  @ApiProperty({ ...NULLABLE, example: 'fr' }) providerTemplateLang!: string | null;
  @ApiProperty({ type: [String] }) variables!: string[];
  @ApiProperty() isActive!: boolean;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty({ format: 'date-time', ...NULLABLE }) approvedAt!: string | null;
}

export class NotificationTemplateListDto {
  @ApiProperty({ type: [NotificationTemplateDto] }) items!: NotificationTemplateDto[];
}

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 2000) body?: string;
  @ApiPropertyOptional(NULLABLE)
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(200)
  subject?: string | null;
  @ApiPropertyOptional(NULLABLE)
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(120)
  providerTemplateName?: string | null;

  @ApiPropertyOptional(NULLABLE)
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(16)
  providerTemplateLang?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class TestTemplateDto {
  @ApiProperty({ example: '+242066000001' }) @IsString() @MaxLength(24) phone!: string;
}

export class ListMessageLogsQueryDto {
  @ApiPropertyOptional({ enum: NOTIFICATION_CHANNELS })
  @IsOptional()
  @IsIn([...NOTIFICATION_CHANNELS])
  channel?: string;
  @ApiPropertyOptional({ enum: MESSAGE_STATUSES })
  @IsOptional()
  @IsIn([...MESSAGE_STATUSES])
  status?: string;
  @ApiPropertyOptional({ example: 'receipt' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  relatedEntityType?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() relatedEntityId?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: false }) to?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class MessageLogPageDto {
  @ApiProperty({ type: [MessageLogDto] }) items!: MessageLogDto[];
  @ApiProperty({ type: PageInfoDto }) pageInfo!: PageInfoDto;
}

export class WebhookAckDto {
  @ApiProperty({ example: true }) received!: boolean;
  @ApiProperty({ description: 'Évènement déjà reçu : aucun retraitement.' }) duplicate!: boolean;
}
