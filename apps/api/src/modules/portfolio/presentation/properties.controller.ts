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
  Post,
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
import { PropertiesService } from '../application/properties.service';
import { UnitsService } from '../application/units.service';
import {
  BulkUnitsDto,
  CreatePropertyDto,
  CreateUnitDto,
  ListPropertiesQueryDto,
  PropertyPageDto,
  UpdatePropertyDto,
} from './dto/portfolio.dto';
import { BulkUnitsResultDto, PropertyDetailDto, PropertyDto, UnitDto } from './dto/unit.dto';

@ApiTags('Patrimoine')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly properties: PropertiesService,
    private readonly units: UnitsService,
    private readonly details: PortfolioDetailsService,
  ) {}

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Créer un immeuble',
    description:
      "Localisation congolaise : ville, arrondissement, quartier et repère, l'adressage " +
      'postal étant peu fiable. Le bailleur doit exister dans l’organisation.',
  })
  @ApiResponse({ status: 201, type: PropertyDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PARTIES.LANDLORD_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'PORTFOLIO.PROPERTY_CODE_TAKEN',
  })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreatePropertyDto,
  ): Promise<PropertyDto> {
    return this.properties.create(organizationId, requireUser(user), dto) as Promise<PropertyDto>;
  }

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Lister les immeubles avec leur taux d’occupation',
    description: '`occupancyRateBps` : 100 % = 10 000 points de base, jamais un flottant.',
  })
  @ApiResponse({ status: 200, type: PropertyPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListPropertiesQueryDto,
  ): Promise<PropertyPageDto> {
    return this.properties.list(
      organizationId,
      requireUser(user),
      query,
    ) as Promise<PropertyPageDto>;
  }

  @Get(':id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Fiche d'un immeuble : bailleur, lots et occupation" })
  @ApiResponse({ status: 200, type: PropertyDetailDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PORTFOLIO.PROPERTY_NOT_FOUND' })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropertyDetailDto> {
    return this.details.propertyDetail(
      organizationId,
      requireUser(user),
      id,
    ) as Promise<PropertyDetailDto>;
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Mettre à jour un immeuble' })
  @ApiResponse({ status: 200, type: PropertyDto })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyDto> {
    return this.properties.update(
      organizationId,
      requireUser(user),
      id,
      dto,
    ) as Promise<PropertyDto>;
  }

  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Supprimer un immeuble (suppression logique)',
    description: '409 `PORTFOLIO.PROPERTY_HAS_UNITS` tant que des lots non supprimés subsistent.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'PORTFOLIO.PROPERTY_HAS_UNITS' })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.properties.softDelete(organizationId, requireUser(user), id);
  }

  @Post(':id/units')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer un lot' })
  @ApiResponse({ status: 201, type: UnitDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'PORTFOLIO.UNIT_CODE_TAKEN' })
  async createUnit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateUnitDto,
  ): Promise<UnitDto> {
    return this.units.create(organizationId, requireUser(user), id, dto) as Promise<UnitDto>;
  }

  @Post(':id/units/bulk')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Créer des lots en série',
    description:
      '« A », 1 → 12 engendre A1…A12 ; `padding: 2` donne A01…A12. TOUT OU RIEN : ' +
      'un seul code déjà pris annule toute la série (409 `PORTFOLIO.UNIT_CODE_TAKEN`).',
  })
  @ApiResponse({ status: 201, type: BulkUnitsResultDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'PORTFOLIO.UNIT_CODE_TAKEN' })
  @ApiResponse({ status: 422, type: ErrorResponseDto, description: 'PORTFOLIO.BULK_RANGE_INVALID' })
  async createUnitsBulk(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BulkUnitsDto,
  ): Promise<BulkUnitsResultDto> {
    const created = await this.units.createBulk(organizationId, requireUser(user), id, dto);
    return { created } as BulkUnitsResultDto;
  }
}
