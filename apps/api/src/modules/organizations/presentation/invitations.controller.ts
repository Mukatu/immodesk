import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { toOrganizationView } from '../../identity/application/profile.service';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { InvitationsService } from '../application/invitations.service';
import { AcceptedMembershipDto, PublicInvitationDto } from './dto/organizations.dto';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':token')
  @Public()
  @ApiOperation({
    summary: "Consulter une invitation avant de l'accepter",
    description:
      "Route publique : la connaissance du jeton (32 octets) vaut autorisation de lire l'entête de l'invitation. Aucune donnée métier de l'organisation n'est exposée.",
  })
  @ApiResponse({ status: 200, type: PublicInvitationDto })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description: 'INVITATION.NOT_FOUND',
  })
  @ApiResponse({ status: 410, type: ErrorResponseDto, description: 'INVITATION.EXPIRED' })
  async peek(@Param('token') token: string): Promise<PublicInvitationDto> {
    return this.invitations.peek(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accepter une invitation',
    description:
      "L'utilisateur connecté doit être le titulaire du numéro invité. L'acceptation est atomique : un lien ne peut être consommé qu'une fois.",
  })
  @ApiResponse({ status: 200, type: AcceptedMembershipDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto, description: 'INVITATION.PHONE_MISMATCH' })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'INVITATION.ALREADY_USED' })
  async accept(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<AcceptedMembershipDto> {
    if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
    const membership = await this.invitations.accept(token, user.userId);

    const organization = await this.prisma.withTenant(
      membership.organizationId,
      user.userId,
      (tx) =>
        tx.organizations.findUnique({
          where: { id: membership.organizationId },
          select: {
            id: true,
            type: true,
            status: true,
            legal_name: true,
            trade_name: true,
            slug: true,
            city: true,
            district: true,
            contact_phone: true,
            contact_email: true,
            created_at: true,
          },
        }),
    );
    if (!organization) throw new DomainError('ORG.NOT_FOUND');

    return {
      organization: toOrganizationView(organization),
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  }
}
