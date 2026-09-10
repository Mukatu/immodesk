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
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { ErrorResponseDto, OrganizationDto } from '../../identity/presentation/dto/auth.dto';
import { InvitationsService } from '../application/invitations.service';
import { MembersService } from '../application/members.service';
import { OrganizationsService } from '../application/organizations.service';
import {
  CreateInvitationDto,
  CreateOrganizationDto,
  InvitationDto,
  InvitationListDto,
  MemberDto,
  MemberListDto,
  OrganizationSettingsDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
  UpdateOrganizationSettingsDto,
} from './dto/organizations.dto';

const ORG_HEADER = {
  name: 'X-Organization-Id',
  required: true,
  description: "Organisation courante. Positionne `app.current_organization_id` (RLS).",
};

@ApiTags('Organisations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly members: MembersService,
    private readonly invitations: InvitationsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une organisation',
    description:
      "Le créateur devient automatiquement OWNER. Un `slug` unique est dérivé du nom commercial (ou de la raison sociale) et sert ensuite à la numérotation des reçus : il n'est plus modifiable.",
  })
  @ApiResponse({ status: 201, type: OrganizationDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationDto> {
    return this.organizations.create(requireUser(user), dto);
  }

  @Get(':id')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Détail d'une organisation" })
  @ApiResponse({ status: 200, type: OrganizationDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'ORG.NOT_MEMBER' })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<OrganizationDto> {
    return this.organizations.get(id, requireUser(user));
  }

  @Patch(':id')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Mettre à jour une organisation' })
  @ApiResponse({ status: 200, type: OrganizationDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationDto> {
    return this.organizations.update(id, requireUser(user), dto);
  }

  @Get(':id/settings')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Paramètres de l'organisation" })
  @ApiResponse({ status: 200, type: OrganizationSettingsDto })
  async getSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<OrganizationSettingsDto> {
    return this.organizations.getSettings(id, requireUser(user));
  }

  @Patch(':id/settings')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Mettre à jour les paramètres',
    description: 'La devise est verrouillée à XAF par contrainte SQL et ne peut pas être modifiée.',
  })
  @ApiResponse({ status: 200, type: OrganizationSettingsDto })
  async updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateOrganizationSettingsDto,
  ): Promise<OrganizationSettingsDto> {
    return this.organizations.updateSettings(id, requireUser(user), dto);
  }

  @Get(':id/members')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les membres' })
  @ApiResponse({ status: 200, type: MemberListDto })
  async listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<MemberListDto> {
    return { items: await this.members.list(id, requireUser(user)) };
  }

  @Patch(':id/members/:memberId')
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: "Changer le rôle d'un membre",
    description: "Le dernier OWNER actif ne peut pas être rétrogradé : 409 `ORG.LAST_OWNER`.",
  })
  @ApiResponse({ status: 200, type: MemberDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'ORG.LAST_OWNER' })
  async changeMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberDto> {
    return this.members.changeRole(id, requireUser(user), memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Retirer un membre',
    description: "Le dernier OWNER actif ne peut pas être retiré : 409 `ORG.LAST_OWNER`.",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'ORG.LAST_OWNER' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.members.remove(id, requireUser(user), memberId);
  }

  @Get(':id/invitations')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les invitations' })
  @ApiResponse({ status: 200, type: InvitationListDto })
  async listInvitations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<InvitationListDto> {
    return { items: await this.invitations.list(id, requireUser(user)) };
  }

  @Post(':id/invitations')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Inviter un collaborateur',
    description:
      "Un jeton de 32 octets est envoyé par SMS ; seul son condensat SHA-256 est stocké. L'invitation est nominative : seul le titulaire du numéro peut l'accepter.",
  })
  @ApiResponse({ status: 201, type: InvitationDto })
  async createInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationDto> {
    return this.invitations.create(id, requireUser(user), dto);
  }

  @Delete(':id/invitations/:invitationId')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Annuler une invitation' })
  @ApiResponse({ status: 204 })
  async revokeInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.invitations.revoke(id, requireUser(user), invitationId);
  }
}

function requireUser(user: AuthenticatedUser | undefined): string {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user.userId;
}
