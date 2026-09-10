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
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ContactChannelsService } from '../application/contact-channels.service';
import { ORG_HEADER, requireUser } from './landlords.controller';
import {
  ContactChannelDto,
  ContactChannelListDto,
  CreateContactChannelDto,
  OWNER_PATH_ENUM,
  UpdateContactChannelDto,
} from './dto/contact-channels.dto';

const OWNER_TYPE_PARAM = {
  name: 'ownerType',
  enum: OWNER_PATH_ENUM,
  description: 'Type de tiers porteur : `landlords`, `tenants` ou `guarantors`.',
};

@ApiTags('Canaux de contact')
@ApiBearerAuth()
@Controller()
export class ContactChannelsController {
  constructor(private readonly channels: ContactChannelsService) {}

  @Get('parties/:ownerType/:ownerId/contact-channels')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiParam(OWNER_TYPE_PARAM)
  @ApiOperation({ summary: "Canaux de contact d'un tiers" })
  @ApiResponse({ status: 200, type: ContactChannelListDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ownerType') ownerType: string,
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
  ): Promise<ContactChannelListDto> {
    const items = await this.channels.list(organizationId, requireUser(user), ownerType, ownerId);
    return { items } as ContactChannelListDto;
  }

  @Post('parties/:ownerType/:ownerId/contact-channels')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiParam(OWNER_TYPE_PARAM)
  @ApiOperation({
    summary: 'Ajouter un canal de contact',
    description:
      'Téléphone normalisé en E.164, e-mail en minuscules. Le couple (tiers, type, valeur) ' +
      'est unique : 409 `PARTIES.CHANNEL_DUPLICATE`. `isPrimary` démarque le canal préféré précédent.',
  })
  @ApiResponse({ status: 201, type: ContactChannelDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'PARTIES.CHANNEL_DUPLICATE' })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('ownerType') ownerType: string,
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @Body() dto: CreateContactChannelDto,
  ): Promise<ContactChannelDto> {
    return this.channels.create(
      organizationId,
      requireUser(user),
      ownerType,
      ownerId,
      dto,
    ) as Promise<ContactChannelDto>;
  }

  @Patch('contact-channels/:id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier un canal de contact' })
  @ApiResponse({ status: 200, type: ContactChannelDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PARTIES.CHANNEL_NOT_FOUND' })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactChannelDto,
  ): Promise<ContactChannelDto> {
    return this.channels.update(
      organizationId,
      requireUser(user),
      id,
      dto,
    ) as Promise<ContactChannelDto>;
  }

  @Delete('contact-channels/:id')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Supprimer un canal de contact' })
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.channels.remove(organizationId, requireUser(user), id);
  }
}
