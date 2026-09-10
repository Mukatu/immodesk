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
import { GuarantorsService } from '../application/guarantors.service';
import { PartyDetailsService } from '../application/party-details.service';
import { TenantsService } from '../application/tenants.service';
import { ORG_HEADER, requireUser } from './landlords.controller';
import {
  CreateGuarantorDto,
  CreateTenantDto,
  GuarantorDto,
  ListTenantsQueryDto,
  TenantDto,
  TenantPageDto,
  UpdateTenantDto,
} from './dto/tenants.dto';

@ApiTags('Locataires')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly guarantors: GuarantorsService,
    private readonly details: PartyDetailsService,
  ) {}

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Créer un locataire',
    description:
      'Un numéro déjà porté par un autre locataire de l’organisation déclenche un ' +
      'AVERTISSEMENT : 409 `PARTIES.PHONE_ALREADY_USED` avec `details.existingTenantId`. ' +
      'Renvoyer la même requête avec `confirmDuplicatePhone: true` la valide — les foyers ' +
      'partagent couramment un téléphone.',
  })
  @ApiResponse({ status: 201, type: TenantDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'PARTIES.PHONE_ALREADY_USED' })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateTenantDto,
  ): Promise<TenantDto> {
    return this.tenants.create(organizationId, requireUser(user), dto) as Promise<TenantDto>;
  }

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister et rechercher les locataires' })
  @ApiResponse({ status: 200, type: TenantPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListTenantsQueryDto,
  ): Promise<TenantPageDto> {
    return this.tenants.list(organizationId, requireUser(user), query) as Promise<TenantPageDto>;
  }

  @Get(':id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: "Fiche d'un locataire",
    description: 'Locataire, ses garants, ses canaux de contact et ses pièces jointes.',
  })
  @ApiResponse({ status: 200, type: TenantDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PARTIES.TENANT_NOT_FOUND' })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantDto> {
    return this.details.tenantDetail(organizationId, requireUser(user), id) as Promise<TenantDto>;
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Mettre à jour un locataire' })
  @ApiResponse({ status: 200, type: TenantDto })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantDto> {
    return this.tenants.update(organizationId, requireUser(user), id, dto) as Promise<TenantDto>;
  }

  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Supprimer un locataire (suppression logique)' })
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.tenants.softDelete(organizationId, requireUser(user), id);
  }

  @Post(':id/guarantors')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Ajouter un garant à un locataire' })
  @ApiResponse({ status: 201, type: GuarantorDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PARTIES.TENANT_NOT_FOUND' })
  async addGuarantor(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGuarantorDto,
  ): Promise<GuarantorDto> {
    return this.guarantors.create(
      organizationId,
      requireUser(user),
      id,
      dto,
    ) as Promise<GuarantorDto>;
  }
}
