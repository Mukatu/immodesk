import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import {
  UtilityTariffsService,
  type UtilityTariffInput,
} from '../application/utility-tariffs.service';
import {
  ListUtilityTariffsQueryDto,
  UtilityTariffDto,
  UtilityTariffInputDto,
  UtilityTariffUpdateDto,
} from './dto/utilities.dto';

@ApiTags('Grilles tarifaires')
@ApiBearerAuth()
@Controller('utility-tariffs')
export class UtilityTariffsController {
  constructor(private readonly tariffs: UtilityTariffsService) {}

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les grilles tarifaires actives et historiques' })
  @ApiResponse({ status: 200, type: [UtilityTariffDto] })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListUtilityTariffsQueryDto,
  ): Promise<{ items: UtilityTariffDto[] }> {
    return this.tariffs.list(organizationId, requireUser(user), query) as Promise<{
      items: UtilityTariffDto[];
    }>;
  }

  @Post()
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer une grille tarifaire' })
  @ApiResponse({ status: 201, type: UtilityTariffDto })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UtilityTariffInputDto,
  ): Promise<UtilityTariffDto> {
    return this.tariffs.create(
      organizationId,
      requireUser(user),
      dto as unknown as UtilityTariffInput,
    ) as Promise<UtilityTariffDto>;
  }

  @Patch(':id')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier une grille tarifaire' })
  @ApiResponse({ status: 200, type: UtilityTariffDto })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UtilityTariffUpdateDto,
  ): Promise<UtilityTariffDto> {
    return this.tariffs.update(
      organizationId,
      requireUser(user),
      id,
      dto,
    ) as Promise<UtilityTariffDto>;
  }
}
