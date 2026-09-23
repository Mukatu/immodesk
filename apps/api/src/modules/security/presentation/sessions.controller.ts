import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { SessionsService } from '../application/sessions.service';
import { RevokeAllSessionsResponseDto, SessionListDto } from './dto/sessions.dto';

/**
 * Sessions personnelles (`/v1/me/security/sessions`). `AuthenticatedUser`
 * porte `sessionId`, qui est le `family_id` du refresh token courant (voir
 * `identity/infrastructure/jwt-token.service.ts`, claim `sid`) : c'est ce qui
 * permet de marquer `isCurrent` sans exposer le jeton lui-même.
 */
@ApiTags('Sécurité — sessions')
@ApiBearerAuth()
@Controller('me/security/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Sessions actives de l’utilisateur connecté' })
  @ApiResponse({ status: 200, type: SessionListDto })
  async list(@CurrentUser() user: AuthenticatedUser | undefined): Promise<SessionListDto> {
    const authed = requireUser(user);
    return { items: await this.sessions.list(authed.userId, authed.sessionId) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Révoquer une session (famille entière)',
    description: 'Idempotent : révoquer une famille déjà révoquée renvoie 204, jamais une erreur.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'SECURITY.SESSION_NOT_FOUND' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.sessions.revoke(requireUser(user).userId, id);
  }

  @Post('revoke-all')
  @ApiOperation({
    summary: 'Révocation globale personnelle',
    description:
      'Déconnecte l’utilisateur de tous ses appareils et de toutes ses organisations. ' +
      'Un jeton d’accès déjà délivré reste valable jusqu’à `accessTokenGraceSeconds`.',
  })
  @ApiResponse({ status: 200, type: RevokeAllSessionsResponseDto })
  async revokeAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<RevokeAllSessionsResponseDto> {
    const userId = requireUser(user).userId;
    const revokedSessions = await this.sessions.revokeAllForUser(userId);
    return { revokedSessions, accessTokenGraceSeconds: this.sessions.accessTokenGraceSeconds };
  }
}

function requireUser(user: AuthenticatedUser | undefined): AuthenticatedUser {
  if (!user) throw new DomainError('IAM.UNAUTHENTICATED');
  return user;
}
