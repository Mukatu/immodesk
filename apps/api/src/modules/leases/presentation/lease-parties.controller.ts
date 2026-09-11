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
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { LeaseDocumentsService } from '../application/lease-documents.service';
import { LeasePartiesService } from '../application/lease-parties.service';
import type { LeasePartyRole } from '../domain/lease-status';
import {
  AttachLeaseDocumentDto,
  CreateLeasePartyDto,
  UpdateLeasePartyDto,
} from './dto/lease-actions.dto';
import { LeaseDocumentDto, LeaseDocumentListDto, LeasePartyDto } from './dto/lease-response.dto';
import type { LeaseDocumentKind } from '../domain/lease-status';

@ApiTags('Baux')
@ApiBearerAuth()
@Controller('leases/:id')
export class LeasePartiesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parties: LeasePartiesService,
    private readonly documents: LeaseDocumentsService,
  ) {}

  @Get('parties')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Parties au bail : preneur principal, co-locataires, garants' })
  @ApiResponse({ status: 200, type: [LeasePartyDto] })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LeasePartyDto[]> {
    return this.prisma.withTenant(organizationId, requireUser(user), (tx) =>
      this.parties.listFor(tx, id),
    ) as Promise<LeasePartyDto[]>;
  }

  @Post('parties')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Ajouter une partie au bail' })
  @ApiResponse({ status: 201, type: LeasePartyDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'LEASES.PARTY_DUPLICATE' })
  async add(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLeasePartyDto,
  ): Promise<LeasePartyDto> {
    return this.parties.add(organizationId, requireUser(user), id, {
      ...dto,
      role: dto.role as LeasePartyRole,
    }) as Promise<LeasePartyDto>;
  }

  @Patch('parties/:partyId')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier la quote-part ou la solidarité d’une partie' })
  @ApiResponse({ status: 200, type: LeasePartyDto })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partyId', ParseUUIDPipe) partyId: string,
    @Body() dto: UpdateLeasePartyDto,
  ): Promise<LeasePartyDto> {
    return this.parties.update(
      organizationId,
      requireUser(user),
      id,
      partyId,
      dto,
    ) as Promise<LeasePartyDto>;
  }

  @Delete('parties/:partyId')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Retirer une partie (le preneur principal est protégé)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'LEASES.PRIMARY_TENANT_PROTECTED',
  })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partyId', ParseUUIDPipe) partyId: string,
  ): Promise<void> {
    await this.parties.remove(organizationId, requireUser(user), id, partyId);
  }

  @Get('documents')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Versions de documents du bail' })
  @ApiResponse({ status: 200, type: LeaseDocumentListDto })
  async listDocuments(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LeaseDocumentListDto> {
    return { items: (await this.documents.list(organizationId, requireUser(user), id)) as never };
  }

  @Post('documents')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Rattacher un document au bail',
    description: 'La version s’incrémente par type : un avenant ne décale pas les contrats.',
  })
  @ApiResponse({ status: 201, type: LeaseDocumentDto })
  async attachDocument(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachLeaseDocumentDto,
  ): Promise<LeaseDocumentDto> {
    return this.documents.attach(organizationId, requireUser(user), id, {
      ...dto,
      kind: dto.kind as LeaseDocumentKind,
    }) as Promise<LeaseDocumentDto>;
  }
}
