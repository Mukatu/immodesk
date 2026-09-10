import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { PortfolioDetailsService } from '../application/portfolio-details.service';
import { UnitsService } from '../application/units.service';
import { ListUnitsQueryDto, UpdateUnitDto } from './dto/portfolio.dto';
import { UnitDetailDto, UnitDto, UnitPageDto } from './dto/unit.dto';

@ApiTags('Lots')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(
    private readonly units: UnitsService,
    private readonly details: PortfolioDetailsService,
  ) {}

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les lots, filtrables par immeuble et par statut' })
  @ApiResponse({ status: 200, type: UnitPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListUnitsQueryDto,
  ): Promise<UnitPageDto> {
    return this.units.list(organizationId, requireUser(user), query) as Promise<UnitPageDto>;
  }

  @Get(':id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Fiche d'un lot : immeuble et pièces jointes" })
  @ApiResponse({ status: 200, type: UnitDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PORTFOLIO.UNIT_NOT_FOUND' })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UnitDetailDto> {
    return this.details.unitDetail(organizationId, requireUser(user), id) as Promise<UnitDetailDto>;
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Mettre à jour un lot' })
  @ApiResponse({ status: 200, type: UnitDto })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
  ): Promise<UnitDto> {
    return this.units.update(organizationId, requireUser(user), id, dto) as Promise<UnitDto>;
  }

  @Delete(':id')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Supprimer un lot (suppression logique)',
    description:
      'Un lot rattaché à un bail ACTIF ne peut pas être supprimé : 409 ' +
      '`PORTFOLIO.UNIT_HAS_ACTIVE_LEASE`, et `deletedAt` reste nul.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'PORTFOLIO.UNIT_HAS_ACTIVE_LEASE',
  })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.units.softDelete(organizationId, requireUser(user), id);
  }
}
