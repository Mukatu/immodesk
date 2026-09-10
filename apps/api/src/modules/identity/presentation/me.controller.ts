import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { ProfileService } from '../application/profile.service';
import { ErrorResponseDto, MeResponseDto, UpdateMeDto, UserDto } from './dto/auth.dto';

@ApiTags('Profil')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'Profil et organisations de l’utilisateur connecté',
    description:
      "Retourne l'utilisateur et la liste de ses adhésions actives. C'est cette liste qui alimente le sélecteur d'organisation des clients web et mobile.",
  })
  @ApiResponse({ status: 200, type: MeResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser | undefined): Promise<MeResponseDto> {
    const userId = requireUser(user);
    const [profile, organizations] = await Promise.all([
      this.profile.getUser(userId),
      this.profile.listMemberships(userId),
    ]);
    return { user: profile, organizations };
  }

  @Patch()
  @ApiOperation({
    summary: 'Mettre à jour son profil',
    description:
      "`fullName`, `email` et `locale` sont persistés. `timezone` est lu depuis les paramètres de l'organisation principale et n'est pas modifiable ici en phase 0.",
  })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 422, type: ErrorResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateMeDto,
  ): Promise<UserDto> {
    const userId = requireUser(user);
    return this.profile.updateUser(userId, {
      fullName: dto.fullName,
      email: dto.email,
      locale: dto.locale,
    });
  }
}

function requireUser(user: AuthenticatedUser | undefined): string {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user.userId;
}
