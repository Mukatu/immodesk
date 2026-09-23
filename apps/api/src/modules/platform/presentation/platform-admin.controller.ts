import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { PlatformAdmin } from '../../../shared/platform-admin/platform-admin.decorator';
import { PlatformAdminGuard } from '../../../shared/platform-admin/platform-admin.guard';
import { FeatureFlagsAdminService } from '../application/feature-flags-admin.service';
import { GoLiveService } from '../application/go-live.service';
import { IncidentsService } from '../application/incidents.service';
import { ReadOnlyModeService } from '../application/read-only-mode.service';
import type { IncidentPayload } from '../domain/incident';
import {
  ActivateWaveBodyDto,
  ActivateWaveResponseDto,
  AddIncidentUpdateBodyDto,
  DeclareIncidentBodyDto,
  FeatureFlagListResponseDto,
  FeatureFlagQueryDto,
  GoLiveBoardDto,
  GoLiveBoardQueryDto,
  ReadOnlyStateResponseDto,
  RollbackWaveResponseDto,
  SetReadOnlyModeDto,
  UpdateFeatureFlagBodyDto,
  UpdateFeatureFlagResponseDto,
} from './dto/platform-admin.dto';
import { PlatformIncidentDto } from './dto/platform-public.dto';
import { requireUser } from './require-user';

/**
 * Console de plateforme (docs/api/phase11-contract.md, § Routes) : toutes
 * ces routes sont gardées par `PLATFORM_ADMIN` (`PlatformAdminGuard`) et
 * exécutées sous `immodesk_admin` par les services applicatifs
 * (arbitrage 2). Aucune ne porte `X-Organization-Id`.
 */
@ApiTags('Plateforme — administration')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminController {
  constructor(
    private readonly readOnlyMode: ReadOnlyModeService,
    private readonly featureFlags: FeatureFlagsAdminService,
    private readonly goLive: GoLiveService,
    private readonly incidents: IncidentsService,
  ) {}

  @Post('read-only-mode')
  @PlatformAdmin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bascule en lecture seule (§ 11.C)' })
  @ApiResponse({ status: 200, type: ReadOnlyStateResponseDto })
  @ApiResponse({ status: 409, description: 'PLATFORM.READ_ONLY_ALREADY_SET' })
  async setReadOnlyMode(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: SetReadOnlyModeDto,
  ): Promise<ReadOnlyStateResponseDto> {
    return this.readOnlyMode.setState({ ...dto, actorUserId: requireUser(user) });
  }

  @Get('feature-flags')
  @PlatformAdmin()
  @ApiOperation({ summary: 'Liste paginée des drapeaux' })
  @ApiResponse({ status: 200, type: FeatureFlagListResponseDto })
  async listFeatureFlags(@Query() query: FeatureFlagQueryDto): Promise<FeatureFlagListResponseDto> {
    const page = await this.featureFlags.list(query);
    return { items: page.items, pageInfo: page.pageInfo };
  }

  @Post('feature-flags/:key')
  @PlatformAdmin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crée ou met à jour un drapeau' })
  @ApiResponse({ status: 200, type: UpdateFeatureFlagResponseDto })
  @ApiResponse({ status: 404, description: 'PLATFORM.FLAG_KEY_UNKNOWN' })
  async updateFeatureFlag(
    @Param('key') key: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateFeatureFlagBodyDto,
  ): Promise<UpdateFeatureFlagResponseDto> {
    return this.featureFlags.update({ ...dto, key, actorUserId: requireUser(user) });
  }

  @Post('go-live/waves/:wave/activate')
  @PlatformAdmin()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Active une vague de go-live' })
  @ApiResponse({ status: 202, type: ActivateWaveResponseDto })
  @ApiResponse({ status: 409, description: 'PLATFORM.SECURITY_CLEARANCE_MISSING' })
  @ApiResponse({ status: 422, description: 'PLATFORM.WAVE_TOO_LARGE' })
  async activateWave(
    @Param('wave') wave: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: ActivateWaveBodyDto,
  ): Promise<ActivateWaveResponseDto> {
    return this.goLive.activateWave(wave, dto.organizationIds, requireUser(user));
  }

  @Post('go-live/waves/:wave/rollback')
  @PlatformAdmin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retour arrière d’une vague de go-live' })
  @ApiResponse({ status: 200, type: RollbackWaveResponseDto })
  @ApiResponse({ status: 404, description: 'PLATFORM.WAVE_UNKNOWN' })
  async rollbackWave(
    @Param('wave') wave: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<RollbackWaveResponseDto> {
    return this.goLive.rollbackWave(wave, requireUser(user));
  }

  @Get('go-live/board')
  @PlatformAdmin()
  @ApiOperation({ summary: 'Tableau de suivi du go-live, entièrement dérivé' })
  @ApiResponse({ status: 200, type: GoLiveBoardDto })
  @ApiResponse({ status: 404, description: 'PLATFORM.WAVE_UNKNOWN' })
  async board(@Query() query: GoLiveBoardQueryDto): Promise<GoLiveBoardDto> {
    return this.goLive.board(query);
  }

  @Post('incidents')
  @PlatformAdmin()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Déclare un incident de plateforme' })
  @ApiResponse({ status: 201, type: PlatformIncidentDto })
  @ApiResponse({ status: 409, description: 'PLATFORM.INCIDENT_ALREADY_OPEN' })
  async declareIncident(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: DeclareIncidentBodyDto,
  ): Promise<IncidentPayload> {
    return this.incidents.declare({ ...dto, actorUserId: requireUser(user) });
  }

  @Post('incidents/current/updates')
  @PlatformAdmin()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajoute une mise à jour à l’incident courant' })
  @ApiResponse({ status: 201, type: PlatformIncidentDto })
  @ApiResponse({ status: 404, description: 'PLATFORM.INCIDENT_NOT_FOUND' })
  async addIncidentUpdate(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: AddIncidentUpdateBodyDto,
  ): Promise<IncidentPayload> {
    return this.incidents.addUpdate({ ...dto, actorUserId: requireUser(user) });
  }

  @Post('incidents/current/resolve')
  @PlatformAdmin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Résout l’incident courant' })
  @ApiResponse({ status: 200, type: PlatformIncidentDto })
  @ApiResponse({ status: 404, description: 'PLATFORM.INCIDENT_NOT_FOUND' })
  async resolveIncident(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<IncidentPayload> {
    return this.incidents.resolve({ actorUserId: requireUser(user) });
  }
}
