import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { MeterReadingsService } from '../application/meter-readings.service';
import { MetersService } from '../application/meters.service';
import { toMeterReadingView } from '../application/meter-views';
import {
  ListMetersQueryDto,
  ListReadingsQueryDto,
  MeterDto,
  MeterInputDto,
  MeterPageDto,
  MeterReadingDto,
  MeterReadingInputDto,
  MeterReadingPageDto,
  MeterUpdateDto,
} from './dto/meters.dto';

@ApiTags('Compteurs')
@ApiBearerAuth()
@Controller('meters')
export class MetersController {
  constructor(
    private readonly meters: MetersService,
    private readonly readings: MeterReadingsService,
  ) {}

  @Post()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Créer un compteur' })
  @ApiResponse({ status: 201, type: MeterDto })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: MeterInputDto,
  ): Promise<MeterDto> {
    return this.meters.create(organizationId, requireUser(user), dto) as Promise<MeterDto>;
  }

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les compteurs' })
  @ApiResponse({ status: 200, type: MeterPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListMetersQueryDto,
  ): Promise<MeterPageDto> {
    return this.meters.list(organizationId, requireUser(user), query) as Promise<MeterPageDto>;
  }

  @Get(':id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Détail d'un compteur" })
  @ApiResponse({ status: 200, type: MeterDto })
  async findOne(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MeterDto> {
    return this.meters.findById(organizationId, requireUser(user), id) as Promise<MeterDto>;
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier un compteur' })
  @ApiResponse({ status: 200, type: MeterDto })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MeterUpdateDto,
  ): Promise<MeterDto> {
    return this.meters.update(organizationId, requireUser(user), id, dto) as Promise<MeterDto>;
  }

  @Post(':id/readings')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Enregistrer un relevé (index précédent et consommation calculés par le serveur)',
  })
  @ApiResponse({ status: 201, type: MeterReadingDto })
  @ApiResponse({ status: 422, description: 'METERS.INDEX_REGRESSION' })
  @ApiResponse({ status: 409, description: 'METERS.READING_DUPLICATE_DATE' })
  async createReading(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MeterReadingInputDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeterReadingDto> {
    const { reading, replayed } = await this.readings.create(
      organizationId,
      requireUser(user),
      id,
      dto,
    );
    if (replayed) res.status(HttpStatus.OK);
    return toMeterReadingView(reading) as MeterReadingDto;
  }

  @Get(':id/readings')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Historique des relevés d'un compteur" })
  @ApiResponse({ status: 200, type: MeterReadingPageDto })
  async listReadings(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListReadingsQueryDto,
  ): Promise<MeterReadingPageDto> {
    return this.readings.history(
      organizationId,
      requireUser(user),
      id,
      query,
    ) as Promise<MeterReadingPageDto>;
  }
}

@ApiTags('Compteurs')
@ApiBearerAuth()
@Controller('meter-readings')
export class MeterReadingsController {
  constructor(private readonly readings: MeterReadingsService) {}

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Confirmer un relevé estimé, avant facturation' })
  @ApiResponse({ status: 200, type: MeterReadingDto })
  async confirm(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MeterReadingDto> {
    const row = await this.readings.confirm(organizationId, requireUser(user), id);
    return toMeterReadingView(row) as MeterReadingDto;
  }
}
