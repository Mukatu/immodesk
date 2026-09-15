import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import { toAmount } from '../../../shared/money/amount';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { MatchesService, type MatchReader } from '../application/matches.service';
import type { MatchTargetType } from '../domain/match-target';
import { CreateMatchDto, MatchReasonDto } from './dto/reconciliation.dto';

function readerOf(tenant: TenantContext): MatchReader {
  return { userId: tenant.userId, role: tenant.role };
}

/**
 * `POST /reconciliation-matches` et transitions (docs/api/phase6-contract.md,
 * § « Routes »). Rôle ACCOUNTANT sur les quatre routes.
 */
@ApiTags('Rapprochement bancaire')
@ApiBearerAuth()
@Controller('reconciliation-matches')
export class ReconciliationMatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Rapprocher manuellement une ligne de relevé et une cible',
    description:
      'Naît directement `CONFIRMED` (`match_type MANUAL`, `confidence_score 100`) : les effets ' +
      'complets sur la cible, la ligne et le relevé sont appliqués tout de suite.',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'BANK.OVER_MATCHED, BANK.LINE_IGNORED',
  })
  @ApiResponse({ status: 422, type: ErrorResponseDto, description: 'BANK.MATCH_TARGET_INVALID' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateMatchDto) {
    return this.matches.create(tenant.organizationId, readerOf(tenant), {
      statementLineId: dto.statementLineId,
      targetType: dto.targetType as MatchTargetType,
      targetId: dto.targetId,
      matchedAmount: toAmount(dto.matchedAmount),
      reason: dto.reason ?? null,
    });
  }

  @Post(':id/confirm')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Confirmer un rapprochement suggéré' })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'BANK.MATCH_ALREADY_CONFIRMED, BANK.OVER_MATCHED, BANK.LINE_IGNORED',
  })
  async confirm(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.matches.confirm(tenant.organizationId, readerOf(tenant), id);
  }

  @Post(':id/reject')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rejeter un rapprochement suggéré (motif obligatoire)' })
  @ApiResponse({ status: 200 })
  async reject(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MatchReasonDto,
  ) {
    return this.matches.reject(tenant.organizationId, readerOf(tenant), id, dto.reason);
  }

  @Post(':id/reverse')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Annuler un rapprochement confirmé',
    description:
      'Écriture miroir `REVERSED`, ligne libérée, paiement contre-passé s’il avait été confirmé ' +
      'par ce rapprochement (facture rouverte `ISSUED`/`OVERDUE`).',
  })
  @ApiResponse({ status: 200 })
  async reverse(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MatchReasonDto,
  ) {
    return this.matches.reverse(tenant.organizationId, readerOf(tenant), id, dto.reason);
  }
}
