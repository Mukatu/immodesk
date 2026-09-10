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
import { DomainError } from '../../../shared/errors/domain-error';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { LandlordsService } from '../application/landlords.service';
import { PartyDetailsService } from '../application/party-details.service';
import {
  CreateLandlordDto,
  LandlordDto,
  LandlordPageDto,
  ListLandlordsQueryDto,
  UpdateLandlordDto,
} from './dto/landlords.dto';

export const ORG_HEADER = {
  name: 'X-Organization-Id',
  required: true,
  description: 'Organisation courante. Positionne `app.current_organization_id` (RLS).',
};

@ApiTags('Bailleurs')
@ApiBearerAuth()
@Controller('landlords')
export class LandlordsController {
  constructor(
    private readonly landlords: LandlordsService,
    private readonly details: PartyDetailsService,
  ) {}

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Créer un bailleur',
    description:
      'Personne physique (`lastName` obligatoire) ou morale (`companyName` obligatoire). ' +
      'Le téléphone est normalisé en E.164 `+242…`.',
  })
  @ApiResponse({ status: 201, type: LandlordDto })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'PARTIES.NAME_REQUIRED, PARTIES.PHONE_INVALID',
  })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateLandlordDto,
  ): Promise<LandlordDto> {
    return this.landlords.create(organizationId, requireUser(user), dto) as Promise<LandlordDto>;
  }

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Lister et rechercher les bailleurs',
    description:
      'Recherche `q` sur le nom, la raison sociale et les téléphones, insensible à la casse ' +
      'et aux accents. Pagination par curseur signé.',
  })
  @ApiResponse({ status: 200, type: LandlordPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListLandlordsQueryDto,
  ): Promise<LandlordPageDto> {
    return this.landlords.list(
      organizationId,
      requireUser(user),
      query,
    ) as Promise<LandlordPageDto>;
  }

  @Get(':id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: "Fiche d'un bailleur",
    description:
      'Bailleur, ses biens avec taux d’occupation, ses comptes bancaires et ses canaux de contact.',
  })
  @ApiResponse({ status: 200, type: LandlordDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PARTIES.LANDLORD_NOT_FOUND' })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LandlordDto> {
    return this.details.landlordDetail(
      organizationId,
      requireUser(user),
      id,
    ) as Promise<LandlordDto>;
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Mettre à jour un bailleur' })
  @ApiResponse({ status: 200, type: LandlordDto })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandlordDto,
  ): Promise<LandlordDto> {
    return this.landlords.update(
      organizationId,
      requireUser(user),
      id,
      dto,
    ) as Promise<LandlordDto>;
  }

  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Supprimer un bailleur (suppression logique)',
    description:
      'Refusé pour le bailleur « self » de l’organisation (409 `PARTIES.SELF_LANDLORD_PROTECTED`) ' +
      'et pour un bailleur portant encore des biens (409 `PARTIES.LANDLORD_HAS_PROPERTIES`).',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.landlords.softDelete(organizationId, requireUser(user), id);
  }
}

export function requireUser(user: AuthenticatedUser | undefined): string {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user.userId;
}
