import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { toAmount } from '../../../shared/money/amount';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { DunningRulesService, type DunningRuleInput } from '../application/dunning-rules.service';
import type { DunningTrigger } from '../domain/dunning-types';
import {
  ActivateDunningRuleDto,
  DunningRuleDto,
  DunningRuleInputDto,
  DunningRuleListDto,
  UpdateDunningRuleDto,
} from './dto/dunning.dto';

function toRuleInput(dto: Partial<DunningRuleInputDto>): Partial<DunningRuleInput> {
  return {
    ...(dto.name !== undefined ? { name: dto.name } : {}),
    ...(dto.stepOrder !== undefined ? { stepOrder: dto.stepOrder } : {}),
    ...(dto.triggerType !== undefined ? { triggerType: dto.triggerType as DunningTrigger } : {}),
    ...(dto.offsetDays !== undefined ? { offsetDays: dto.offsetDays } : {}),
    ...(dto.channel !== undefined ? { channel: dto.channel } : {}),
    ...(dto.fallbackChannel !== undefined ? { fallbackChannel: dto.fallbackChannel } : {}),
    ...(dto.templateId !== undefined ? { templateId: dto.templateId } : {}),
    ...(dto.minBalanceAmount !== undefined
      ? { minBalanceAmount: toAmount(dto.minBalanceAmount) }
      : {}),
    ...(dto.notifyLandlord !== undefined ? { notifyLandlord: dto.notifyLandlord } : {}),
    ...(dto.notifyCollector !== undefined ? { notifyCollector: dto.notifyCollector } : {}),
    ...(dto.applyPenalty !== undefined ? { applyPenalty: dto.applyPenalty } : {}),
    ...(dto.penaltyRuleId !== undefined ? { penaltyRuleId: dto.penaltyRuleId } : {}),
    ...(dto.escalateToLegal !== undefined ? { escalateToLegal: dto.escalateToLegal } : {}),
    ...(dto.sendHourLocal !== undefined ? { sendHourLocal: dto.sendHourLocal } : {}),
    ...(dto.skipWeekends !== undefined ? { skipWeekends: dto.skipWeekends } : {}),
    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
  };
}

@ApiTags('Relances — règles')
@ApiBearerAuth()
@Controller('dunning-rules')
export class DunningRulesController {
  constructor(private readonly rules: DunningRulesService) {}

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Règles de relance de l’organisation' })
  @ApiResponse({ status: 200, type: DunningRuleListDto })
  async list(@CurrentTenant() tenant: TenantContext): Promise<DunningRuleListDto> {
    return this.rules.list(tenant.organizationId, tenant.userId) as Promise<DunningRuleListDto>;
  }

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer un palier de relance' })
  @ApiResponse({ status: 201, type: DunningRuleDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'DUNNING.STEP_ORDER_TAKEN' })
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: DunningRuleInputDto,
  ): Promise<DunningRuleDto> {
    return this.rules.create(
      tenant.organizationId,
      tenant.userId,
      toRuleInput(dto) as DunningRuleInput,
    ) as Promise<DunningRuleDto>;
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier un palier de relance' })
  @ApiResponse({ status: 200, type: DunningRuleDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'DUNNING.STEP_ORDER_TAKEN' })
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDunningRuleDto,
  ): Promise<DunningRuleDto> {
    return this.rules.update(
      tenant.organizationId,
      tenant.userId,
      id,
      toRuleInput(dto),
    ) as Promise<DunningRuleDto>;
  }

  @Post(':id/activate')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Activer ou désactiver une règle',
    description:
      'Arbitrage 3 du contrat : une règle ne se supprime jamais. N’affecte ni les relances ' +
      'déjà envoyées ni les pénalités déjà émises.',
  })
  @ApiResponse({ status: 200, type: DunningRuleDto })
  async activate(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateDunningRuleDto,
  ): Promise<DunningRuleDto> {
    return this.rules.setActive(
      tenant.organizationId,
      tenant.userId,
      id,
      dto.isActive,
    ) as Promise<DunningRuleDto>;
  }
}
