import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
} from 'class-validator';
import { toBoolean } from '../../../billing/presentation/dto/billing.dto';
import { Transform } from 'class-transformer';
import { DUNNING_STEP_STATUSES, DUNNING_TRIGGERS } from '../../domain/dunning-types';

const AMOUNT = { type: 'integer', format: 'int64', minimum: 0, example: 50_000 } as const;
const CHANNELS = ['WHATSAPP', 'SMS', 'EMAIL', 'PUSH', 'IN_APP'];

export class DunningRuleInputDto {
  @ApiProperty({ example: 'Relance J+3' }) @IsString() @Length(2, 120) name!: string;
  @ApiProperty({ example: 1, minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) stepOrder!: number;

  @ApiPropertyOptional({ enum: DUNNING_TRIGGERS, default: 'DAYS_AFTER_DUE' })
  @IsOptional()
  @IsIn([...DUNNING_TRIGGERS])
  triggerType?: string;

  @ApiPropertyOptional({ default: 0, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offsetDays?: number;

  @ApiPropertyOptional({ enum: CHANNELS, default: 'WHATSAPP' })
  @IsOptional()
  @IsIn(CHANNELS)
  channel?: string;

  @ApiPropertyOptional({ enum: CHANNELS, nullable: true })
  @IsOptional()
  @IsIn(CHANNELS)
  fallbackChannel?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templateId?: string;

  @ApiPropertyOptional({ ...AMOUNT, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBalanceAmount?: number;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() notifyLandlord?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() notifyCollector?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() applyPenalty?: boolean;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() penaltyRuleId?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() escalateToLegal?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 23, default: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  sendHourLocal?: number;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() skipWeekends?: boolean;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateDunningRuleDto extends PartialType(DunningRuleInputDto) {}

export class ActivateDunningRuleDto {
  @ApiProperty() @IsBoolean() isActive!: boolean;
}

export class DunningRuleDto extends DunningRuleInputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['XAF'] }) currency!: 'XAF';
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class DunningRuleListDto {
  @ApiProperty({ type: [DunningRuleDto] }) items!: DunningRuleDto[];
}

export class ListDunningRunsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() ruleId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() invoiceId?: string;
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Historique des relances pour un locataire (emprunte dunning_runs_tenant_idx) — écart ' +
      'assumé au contrat écrit, ajouté à la demande du produit mobile.',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
  @ApiPropertyOptional({ enum: DUNNING_STEP_STATUSES })
  @IsOptional()
  @IsIn([...DUNNING_STEP_STATUSES])
  status?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: false }) to?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(512) cursor?: string;
}

export class TriggerDunningRunDto {
  @ApiPropertyOptional({ default: false, description: 'Simule sans envoyer ni écrire.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  dryRun?: boolean;
}
