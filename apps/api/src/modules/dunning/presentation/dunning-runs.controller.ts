import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { DunningEngineService } from '../application/dunning-engine.service';
import { DunningRunsQueryService } from '../application/dunning-runs-query.service';
import { ListDunningRunsQueryDto, TriggerDunningRunDto } from './dto/dunning.dto';
import {
  DunningRunDto,
  DunningRunPageDto,
  DunningTriggerAcceptedDto,
} from './dto/dunning-response.dto';

@ApiTags('Relances — exécutions')
@ApiBearerAuth()
@Controller()
export class DunningRunsController {
  constructor(private readonly runsQuery: DunningRunsQueryService) {}

  @Get('dunning-runs')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Historique des relances, pagination par curseur' })
  @ApiResponse({ status: 200, type: DunningRunPageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListDunningRunsQueryDto,
  ): Promise<DunningRunPageDto> {
    return this.runsQuery.list(tenant.organizationId, tenant.userId, query);
  }

  @Get('dunning-runs/:id')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Détail d’une relance' })
  @ApiResponse({ status: 200, type: DunningRunDto })
  async get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DunningRunDto> {
    return this.runsQuery.get(tenant.organizationId, tenant.userId, id);
  }
}

/**
 * Montée sous `/organizations/:id/...` : `OrganizationGuard` vérifie que ce
 * `:id` correspond bien à l'en-tête `X-Organization-Id` (même convention que
 * `ContractTemplateController`, phase 2).
 */
@ApiTags('Relances — exécutions')
@ApiBearerAuth()
@Controller('organizations/:id/dunning-runs')
export class DunningTriggerController {
  constructor(private readonly engine: DunningEngineService) {}

  @Post('trigger')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Rejouer le scan de relance à la demande',
    description:
      'Mêmes garanties d’idempotence que le cron quotidien. `dryRun` simule le comptage sans ' +
      'rien envoyer ni écrire. Ignore l’heure d’envoi configurée sur chaque règle (déclenchement ' +
      'explicite), contrairement au cron horaire qui la respecte.',
  })
  @ApiResponse({ status: 202, type: DunningTriggerAcceptedDto })
  async trigger(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() dto: TriggerDunningRunDto,
  ): Promise<DunningTriggerAcceptedDto> {
    void _id;
    return this.engine.scanOrganization(tenant.organizationId, {
      dryRun: dto.dryRun ?? false,
      ignoreHourGate: true,
      actorUserId: tenant.userId,
    });
  }
}
